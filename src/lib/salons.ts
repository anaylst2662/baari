import "server-only";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Salon } from "@/db/schema";
import { withinHours } from "./time";

export const SERVICE_CATEGORIES = [
  "Haircut",
  "Beard",
  "Hair colour",
  "Facial",
  "Waxing",
  "Threading",
  "Makeup",
  "Mani & Pedi",
  "Massage",
  "Bridal",
] as const;

/** Salons that haven't shown activity for this long drop out of search (business-plan risk mitigation). */
const INACTIVE_DAYS = 30;

export function isOpenNow(salon: Pick<Salon, "isOpen" | "hours">) {
  return salon.isOpen && withinHours(salon.hours);
}

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export type SalonFilters = {
  q?: string;
  type?: string;
  category?: string;
  maxPrice?: number;
  openNow?: boolean;
  area?: string;
  lat?: number;
  lng?: number;
};

export type SalonCard = Salon & {
  openNow: boolean;
  minPrice: number | null;
  queueLength: number;
  distanceKm: number | null;
};

export async function searchSalons(f: SalonFilters): Promise<SalonCard[]> {
  const conds = [
    eq(schema.salons.status, "approved"),
    sql`${schema.salons.lastActiveAt} > now() - make_interval(days => ${INACTIVE_DAYS})`,
  ];
  if (f.type === "men" || f.type === "women") {
    conds.push(inArray(schema.salons.type, [f.type, "unisex"]));
  } else if (f.type === "unisex") {
    conds.push(eq(schema.salons.type, "unisex"));
  }
  if (f.area) conds.push(eq(schema.salons.area, f.area));
  if (f.q) {
    const like = `%${f.q}%`;
    conds.push(
      or(
        ilike(schema.salons.name, like),
        ilike(schema.salons.area, like),
        ilike(schema.salons.city, like),
        sql`exists (select 1 from ${schema.services} s where s.salon_id = "salons"."id" and s.active and (s.name ilike ${like} or s.category ilike ${like}))`,
      )!,
    );
  }
  if (f.category || f.maxPrice) {
    const catSql = f.category ? sql`and s.category = ${f.category}` : sql``;
    const priceSql = f.maxPrice ? sql`and s.price <= ${f.maxPrice}` : sql``;
    conds.push(
      sql`exists (select 1 from ${schema.services} s where s.salon_id = "salons"."id" and s.active ${catSql} ${priceSql})`,
    );
  }

  const rows = await db
    .select({
      salon: schema.salons,
      minPrice: sql<number | null>`(select min(price)::int from ${schema.services} s where s.salon_id = "salons"."id" and s.active)`,
      queueLength: sql<number>`(select count(*)::int from ${schema.queueEntries} q where q.salon_id = "salons"."id" and q.status = 'waiting')`,
    })
    .from(schema.salons)
    .where(and(...conds))
    .orderBy(desc(schema.salons.featured), desc(schema.salons.ratingAvg), asc(schema.salons.name));

  let cards: SalonCard[] = rows.map((r) => ({
    ...r.salon,
    minPrice: r.minPrice,
    queueLength: r.queueLength,
    openNow: isOpenNow(r.salon),
    distanceKm:
      f.lat !== undefined && f.lng !== undefined && r.salon.lat !== null && r.salon.lng !== null
        ? distanceKm(f.lat, f.lng, r.salon.lat, r.salon.lng)
        : null,
  }));
  if (f.openNow) cards = cards.filter((c) => c.openNow);
  if (f.lat !== undefined) {
    cards.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }
  return cards;
}

export async function getAreas() {
  return db
    .selectDistinct({ area: schema.salons.area, city: schema.salons.city })
    .from(schema.salons)
    .where(eq(schema.salons.status, "approved"))
    .orderBy(asc(schema.salons.city), asc(schema.salons.area));
}

export async function touchSalon(salonId: number) {
  await db.update(schema.salons).set({ lastActiveAt: new Date() }).where(eq(schema.salons.id, salonId));
}

export async function recomputeRating(salonId: number) {
  const [agg] = await db
    .select({
      avg: sql<number>`coalesce(avg(${schema.reviews.rating}), 0)::real`,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.reviews)
    .where(and(eq(schema.reviews.salonId, salonId), eq(schema.reviews.hidden, false)));
  await db
    .update(schema.salons)
    .set({ ratingAvg: agg.avg, ratingCount: agg.count })
    .where(eq(schema.salons.id, salonId));
}

export function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "salon"}-${Math.random().toString(36).slice(2, 6)}`;
}
