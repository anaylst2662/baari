"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import type { OpeningHours } from "@/db/schema";
import { requireSalonAccess, requireUser } from "@/lib/auth";
import { adminPhones } from "@/lib/roles";
import { sendNearAlerts } from "@/lib/queue";
import { appUrl, sendMessage } from "@/lib/notify";
import { slugify, touchSalon } from "@/lib/salons";
import { normalizePkPhone } from "@/lib/phone";
import { formatDate, formatTime } from "@/lib/time";

function idOf(formData: FormData, key = "salonId") {
  const n = Number(formData.get(key));
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Invalid ${key}`);
  return n;
}

async function access(formData: FormData) {
  const ctx = await requireSalonAccess(idOf(formData));
  await touchSalon(ctx.salon.id);
  return ctx;
}

function done(salonId: number) {
  revalidatePath(`/partner/${salonId}`, "layout");
}

// ---------- status & queue ----------

export async function toggleOpen(formData: FormData) {
  const { salon } = await access(formData);
  await db.update(schema.salons).set({ isOpen: !salon.isOpen }).where(eq(schema.salons.id, salon.id));
  done(salon.id);
}

export async function addWalkIn(formData: FormData) {
  const { salon } = await access(formData);
  const name = String(formData.get("name") ?? "").trim().slice(0, 40) || "Walk-in";
  const serviceId = Number(formData.get("serviceId")) || null;
  await db.insert(schema.queueEntries).values({ salonId: salon.id, walkInName: name, serviceId });
  done(salon.id);
}

export async function callNext(formData: FormData) {
  const { salon } = await access(formData);
  const [next] = await db
    .select({ entry: schema.queueEntries, phone: schema.users.phone })
    .from(schema.queueEntries)
    .leftJoin(schema.users, eq(schema.users.id, schema.queueEntries.userId))
    .where(and(eq(schema.queueEntries.salonId, salon.id), eq(schema.queueEntries.status, "waiting")))
    .orderBy(asc(schema.queueEntries.joinedAt), asc(schema.queueEntries.id))
    .limit(1);
  if (next) {
    await db
      .update(schema.queueEntries)
      .set({ status: "called", calledAt: new Date() })
      .where(eq(schema.queueEntries.id, next.entry.id));
    if (next.phone) {
      await sendMessage(next.phone, `Baari: it's your turn at ${salon.name}! Please come to the counter.`);
    }
    await sendNearAlerts(salon.id, salon.name);
  }
  done(salon.id);
}

export async function setQueueStatus(formData: FormData) {
  const { salon } = await access(formData);
  const id = idOf(formData, "entryId");
  const status = z.enum(["served", "no_show", "left"]).parse(formData.get("status"));
  await db
    .update(schema.queueEntries)
    .set({ status, finishedAt: new Date() })
    .where(and(eq(schema.queueEntries.id, id), eq(schema.queueEntries.salonId, salon.id)));
  await sendNearAlerts(salon.id, salon.name);
  done(salon.id);
}

// ---------- bookings ----------

export async function updateBooking(formData: FormData) {
  const { salon } = await access(formData);
  const id = idOf(formData, "bookingId");
  const action = z.enum(["accept", "decline", "complete", "no_show"]).parse(formData.get("action"));
  const transitions = {
    accept: { from: ["pending"], to: "confirmed" },
    decline: { from: ["pending", "confirmed"], to: "rejected" },
    complete: { from: ["pending", "confirmed"], to: "completed" },
    no_show: { from: ["confirmed"], to: "no_show" },
  } as const;
  const { from, to } = transitions[action];
  const [booking] = await db
    .update(schema.bookings)
    .set({ status: to })
    .where(
      and(eq(schema.bookings.id, id), eq(schema.bookings.salonId, salon.id), inArray(schema.bookings.status, [...from])),
    )
    .returning();

  if (booking && (to === "confirmed" || to === "rejected")) {
    const [customer] = await db.select().from(schema.users).where(eq(schema.users.id, booking.userId));
    const when = `${formatDate(booking.startsAt)} ${formatTime(booking.startsAt)}`;
    await sendMessage(
      customer.phone,
      to === "confirmed"
        ? `Baari: ✅ your booking at ${salon.name} on ${when} is confirmed. ${salon.address}. Need to cancel? ${appUrl("/bookings")}`
        : `Baari: sorry, ${salon.name} can't take your booking on ${when}. Pick another time: ${appUrl(`/s/${salon.slug}/book`)}`,
    );
  }
  done(salon.id);
}

// ---------- services & staff ----------

const serviceSchema = z.object({
  name: z.string().trim().min(1).max(60),
  category: z.string().trim().min(1).max(40),
  price: z.coerce.number().int().min(0).max(1_000_000),
  durationMin: z.coerce.number().int().min(5).max(600),
});

export async function addService(formData: FormData) {
  const { salon } = await access(formData);
  const data = serviceSchema.parse(Object.fromEntries(formData));
  await db.insert(schema.services).values({ ...data, salonId: salon.id });
  done(salon.id);
}

export async function updateService(formData: FormData) {
  const { salon } = await access(formData);
  const id = idOf(formData, "serviceId");
  if (formData.get("intent") === "toggle") {
    const [svc] = await db
      .select()
      .from(schema.services)
      .where(and(eq(schema.services.id, id), eq(schema.services.salonId, salon.id)));
    if (svc) await db.update(schema.services).set({ active: !svc.active }).where(eq(schema.services.id, id));
  } else {
    const data = serviceSchema.parse(Object.fromEntries(formData));
    await db
      .update(schema.services)
      .set(data)
      .where(and(eq(schema.services.id, id), eq(schema.services.salonId, salon.id)));
  }
  done(salon.id);
}

export async function addStaff(formData: FormData) {
  const { salon } = await access(formData);
  const name = z.string().trim().min(1).max(40).parse(formData.get("name"));
  await db.insert(schema.staff).values({ salonId: salon.id, name });
  done(salon.id);
}

export async function updateStaff(formData: FormData) {
  const { salon } = await access(formData);
  const id = idOf(formData, "staffId");
  const intent = z.enum(["duty", "remove"]).parse(formData.get("intent"));
  const where = and(eq(schema.staff.id, id), eq(schema.staff.salonId, salon.id));
  if (intent === "remove") {
    await db.update(schema.staff).set({ active: false }).where(where);
  } else {
    const [member] = await db.select().from(schema.staff).where(where);
    if (member) await db.update(schema.staff).set({ onDuty: !member.onDuty }).where(where);
  }
  done(salon.id);
}

// ---------- profile & onboarding ----------

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(["men", "women", "unisex"]),
  mode: z.enum(["queue", "booking", "both"]),
  address: z.string().trim().min(3).max(200),
  area: z.string().trim().min(2).max(60),
  city: z.string().trim().min(2).max(60),
  description: z.string().trim().max(500).optional(),
  phone: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

function parseHours(formData: FormData): OpeningHours {
  return Array.from({ length: 7 }, (_, d) => {
    if (formData.get(`closed_${d}`) === "on") return null;
    const open = String(formData.get(`open_${d}`) ?? "");
    const close = String(formData.get(`close_${d}`) ?? "");
    return /^\d{2}:\d{2}$/.test(open) && /^\d{2}:\d{2}$/.test(close) ? { open, close } : null;
  });
}

function parseProfile(formData: FormData) {
  const raw = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string" && v !== "").map(([k, v]) => [k, v]),
  );
  const data = profileSchema.parse(raw);
  const photos = String(formData.get("photos") ?? "")
    .split(/\s+/)
    .filter((u) => /^https:\/\/\S+$/.test(u))
    .slice(0, 10);
  return {
    ...data,
    phone: data.phone ? normalizePkPhone(data.phone) : null,
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    description: data.description ?? null,
    hours: parseHours(formData),
    photos,
  };
}

export type ProfileState = { error?: string; saved?: boolean } | undefined;

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const { salon } = await access(formData);
  try {
    await db.update(schema.salons).set(parseProfile(formData)).where(eq(schema.salons.id, salon.id));
  } catch {
    return { error: "Please check the required fields." };
  }
  done(salon.id);
  return { saved: true };
}

export async function registerSalon(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser("/partner/new");
  let data;
  try {
    data = parseProfile(formData);
  } catch {
    return { error: "Please check the required fields." };
  }
  const [salon] = await db
    .insert(schema.salons)
    .values({ ...data, slug: slugify(data.name), ownerId: user.id, status: "pending" })
    .returning();
  if (user.role === "customer") {
    await db.update(schema.users).set({ role: "partner" }).where(eq(schema.users.id, user.id));
  }
  for (const phone of adminPhones()) {
    await sendMessage(phone, `Baari admin: new salon "${salon.name}" (${salon.area}) awaits approval. ${appUrl("/admin")}`);
  }
  redirect(`/partner/${salon.id}/services?welcome=1`);
}
