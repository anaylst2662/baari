"use server";

import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { refresh, revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { isOpenNow, recomputeRating } from "@/lib/salons";
import { getFreeSlots, type Slot } from "@/lib/slots";
import { appUrl, sendMessage } from "@/lib/notify";
import { addDays, formatDate, formatTime, localNow } from "@/lib/time";

const NO_SHOW_LIMIT = 3;
const NO_SHOW_WINDOW_DAYS = 90;
const MAX_DAYS_AHEAD = 14;

async function loadSalon(salonId: number) {
  const [salon] = await db.select().from(schema.salons).where(eq(schema.salons.id, salonId));
  if (!salon || salon.status !== "approved") throw new Error("Salon not available");
  return salon;
}

export async function joinQueue(formData: FormData) {
  const salonId = Number(formData.get("salonId"));
  const serviceId = Number(formData.get("serviceId")) || null;
  const salon = await loadSalon(salonId);
  const user = await requireUser(`/s/${salon.slug}/queue`);
  if (salon.mode === "booking" || !isOpenNow(salon)) redirect(`/s/${salon.slug}`);

  const [existing] = await db
    .select({ id: schema.queueEntries.id })
    .from(schema.queueEntries)
    .where(
      and(
        eq(schema.queueEntries.salonId, salonId),
        eq(schema.queueEntries.userId, user.id),
        inArray(schema.queueEntries.status, ["waiting", "called"]),
      ),
    );
  if (existing) redirect(`/q/${existing.id}`);

  if (serviceId) {
    const [svc] = await db
      .select({ id: schema.services.id })
      .from(schema.services)
      .where(and(eq(schema.services.id, serviceId), eq(schema.services.salonId, salonId)));
    if (!svc) throw new Error("Invalid service");
  }

  const [entry] = await db
    .insert(schema.queueEntries)
    .values({ salonId, userId: user.id, serviceId })
    .returning();

  await sendMessage(
    user.phone,
    `Baari: you've joined the queue at ${salon.name}. Track your turn live: ${appUrl(`/q/${entry.id}`)}`,
  );
  redirect(`/q/${entry.id}`);
}

export async function leaveQueue(formData: FormData) {
  const id = Number(formData.get("id"));
  const user = await requireUser(`/q/${id}`);
  await db
    .update(schema.queueEntries)
    .set({ status: "left", finishedAt: new Date() })
    .where(
      and(
        eq(schema.queueEntries.id, id),
        eq(schema.queueEntries.userId, user.id),
        inArray(schema.queueEntries.status, ["waiting", "called"]),
      ),
    );
  refresh();
}

export async function fetchSlots(
  salonId: number,
  serviceId: number,
  date: string,
  staffId?: number,
): Promise<Slot[]> {
  const salon = await loadSalon(salonId);
  const today = localNow().date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today || date > addDays(today, MAX_DAYS_AHEAD)) return [];
  const [svc] = await db
    .select()
    .from(schema.services)
    .where(and(eq(schema.services.id, serviceId), eq(schema.services.salonId, salonId)));
  if (!svc) return [];
  return getFreeSlots(salon, svc.durationMin, date, staffId);
}

const bookingSchema = z.object({
  salonId: z.coerce.number().int().positive(),
  serviceId: z.coerce.number().int().positive(),
  staffId: z.coerce.number().int().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startsAt: z.string().datetime(),
  note: z.string().max(300).optional(),
});

export type BookingState = { error?: string } | undefined;

export async function requestBooking(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const parsed = bookingSchema.safeParse({
    salonId: formData.get("salonId"),
    serviceId: formData.get("serviceId"),
    staffId: formData.get("staffId") || undefined,
    date: formData.get("date"),
    startsAt: formData.get("startsAt"),
    note: (formData.get("note") as string) || undefined,
  });
  if (!parsed.success) return { error: "Please choose a service, date and time." };
  const input = parsed.data;
  const salon = await loadSalon(input.salonId);
  const user = await requireUser(`/s/${salon.slug}/book`);
  if (salon.mode === "queue") return { error: "This salon only takes walk-ins." };

  const [{ noShows }] = await db
    .select({ noShows: sql<number>`count(*)::int` })
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.userId, user.id),
        eq(schema.bookings.status, "no_show"),
        gt(schema.bookings.startsAt, new Date(Date.now() - NO_SHOW_WINDOW_DAYS * 86_400_000)),
      ),
    );
  if (noShows >= NO_SHOW_LIMIT) return { error: "noShows" };

  // Re-check availability server-side; the slot may have been taken meanwhile.
  const slots = await fetchSlots(input.salonId, input.serviceId, input.date, input.staffId);
  const slot = slots.find((s) => s.startsAt === new Date(input.startsAt).toISOString());
  if (!slot) return { error: "That time was just taken — please pick another." };

  const [svc] = await db.select().from(schema.services).where(eq(schema.services.id, input.serviceId));
  const startsAt = new Date(slot.startsAt);
  const [booking] = await db
    .insert(schema.bookings)
    .values({
      userId: user.id,
      salonId: salon.id,
      serviceId: svc.id,
      staffId: input.staffId ?? null,
      startsAt,
      endsAt: new Date(startsAt.getTime() + svc.durationMin * 60_000),
      note: input.note,
    })
    .returning();

  const when = `${formatDate(startsAt)} ${formatTime(startsAt)}`;
  await sendMessage(
    user.phone,
    `Baari: your request for ${svc.name} at ${salon.name} on ${when} was sent. We'll message you when the salon confirms.`,
  );
  if (salon.ownerId) {
    const [owner] = await db.select().from(schema.users).where(eq(schema.users.id, salon.ownerId));
    if (owner) {
      await sendMessage(
        owner.phone,
        `Baari: new booking request — ${svc.name}, ${when}, from ${user.name ?? user.phone}. Accept: ${appUrl("/partner/bookings")}`,
      );
    }
  }
  redirect(`/bookings?new=${booking.id}`);
}

export async function cancelBooking(formData: FormData) {
  const id = Number(formData.get("id"));
  const user = await requireUser("/bookings");
  const [booking] = await db
    .update(schema.bookings)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(schema.bookings.id, id),
        eq(schema.bookings.userId, user.id),
        inArray(schema.bookings.status, ["pending", "confirmed"]),
      ),
    )
    .returning();
  if (booking) {
    const [salon] = await db.select().from(schema.salons).where(eq(schema.salons.id, booking.salonId));
    const [owner] = salon?.ownerId
      ? await db.select().from(schema.users).where(eq(schema.users.id, salon.ownerId))
      : [];
    if (owner) {
      await sendMessage(
        owner.phone,
        `Baari: booking on ${formatDate(booking.startsAt)} ${formatTime(booking.startsAt)} was cancelled by the customer.`,
      );
    }
  }
  revalidatePath("/bookings");
}

const reviewSchema = z.object({
  kind: z.enum(["booking", "queue"]),
  id: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  anonymous: z.boolean(),
});

export async function submitReview(formData: FormData) {
  const user = await requireUser("/bookings");
  const parsed = reviewSchema.safeParse({
    kind: formData.get("kind"),
    id: formData.get("id"),
    rating: formData.get("rating"),
    comment: (formData.get("comment") as string)?.trim() || undefined,
    anonymous: formData.get("anonymous") === "on",
  });
  if (!parsed.success) return;
  const r = parsed.data;

  let salonId: number | undefined;
  if (r.kind === "booking") {
    const [b] = await db
      .select()
      .from(schema.bookings)
      .where(and(eq(schema.bookings.id, r.id), eq(schema.bookings.userId, user.id), eq(schema.bookings.status, "completed")));
    salonId = b?.salonId;
  } else {
    const [q] = await db
      .select()
      .from(schema.queueEntries)
      .where(
        and(eq(schema.queueEntries.id, r.id), eq(schema.queueEntries.userId, user.id), eq(schema.queueEntries.status, "served")),
      );
    salonId = q?.salonId;
  }
  if (!salonId) return;

  await db
    .insert(schema.reviews)
    .values({
      salonId,
      userId: user.id,
      bookingId: r.kind === "booking" ? r.id : null,
      queueEntryId: r.kind === "queue" ? r.id : null,
      rating: r.rating,
      comment: r.comment,
      anonymous: r.anonymous,
    })
    .onConflictDoNothing();
  await recomputeRating(salonId);
  revalidatePath("/bookings");
}
