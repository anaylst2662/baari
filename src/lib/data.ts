import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { isAdmin } from "./roles";

/** Approved salons are public; pending ones are visible to their owner and admins only. */
export async function getSalonBySlug(slug: string, viewer: User | null) {
  const [salon] = await db.select().from(schema.salons).where(eq(schema.salons.slug, slug));
  if (!salon) notFound();
  if (salon.status !== "approved" && viewer?.id !== salon.ownerId && !isAdmin(viewer)) notFound();
  return salon;
}

export async function getServices(salonId: number) {
  return db
    .select()
    .from(schema.services)
    .where(and(eq(schema.services.salonId, salonId), eq(schema.services.active, true)))
    .orderBy(asc(schema.services.category), asc(schema.services.price));
}

export async function getStaff(salonId: number) {
  return db
    .select()
    .from(schema.staff)
    .where(and(eq(schema.staff.salonId, salonId), eq(schema.staff.active, true)))
    .orderBy(asc(schema.staff.name));
}

export async function getReviews(salonId: number, limit = 10) {
  return db
    .select({ review: schema.reviews, userName: schema.users.name })
    .from(schema.reviews)
    .innerJoin(schema.users, eq(schema.users.id, schema.reviews.userId))
    .where(and(eq(schema.reviews.salonId, salonId), eq(schema.reviews.hidden, false)))
    .orderBy(desc(schema.reviews.createdAt))
    .limit(limit);
}

export async function isSaved(userId: number | undefined, salonId: number) {
  if (!userId) return false;
  const [row] = await db
    .select({ salonId: schema.favorites.salonId })
    .from(schema.favorites)
    .where(and(eq(schema.favorites.userId, userId), eq(schema.favorites.salonId, salonId)));
  return Boolean(row);
}

export async function getSavedSalons(userId: number) {
  return db
    .select({ salon: schema.salons })
    .from(schema.favorites)
    .innerJoin(schema.salons, eq(schema.salons.id, schema.favorites.salonId))
    .where(and(eq(schema.favorites.userId, userId), eq(schema.salons.status, "approved")))
    .orderBy(desc(schema.favorites.createdAt));
}
