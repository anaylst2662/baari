import "server-only";
import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { normalizePkPhone } from "./phone";

/**
 * ADMIN_PHONES is the only source of admin rights. It is checked on every request,
 * so removing a number takes away access immediately. Numbers may be written as
 * 0300 1234567 or +923001234567.
 */
export function adminPhones(): string[] {
  const raw = process.env.ADMIN_PHONES?.trim();
  if (raw) {
    return raw
      .split(",")
      .map((p) => normalizePkPhone(p))
      .filter((p): p is string => p !== null);
  }
  // Local testing only (built-in database, dev server): the seeded demo admin.
  if (process.env.NODE_ENV !== "production" && !process.env.DATABASE_URL) return ["+923000000000"];
  return [];
}

export function isAdmin(user: Pick<User, "phone"> | null | undefined): boolean {
  return Boolean(user && adminPhones().includes(user.phone));
}

export async function ownedSalons(userId: number) {
  return db
    .select({
      id: schema.salons.id,
      name: schema.salons.name,
      slug: schema.salons.slug,
      status: schema.salons.status,
      mode: schema.salons.mode,
    })
    .from(schema.salons)
    .where(eq(schema.salons.ownerId, userId))
    .orderBy(asc(schema.salons.id));
}

export type Viewer = {
  user: User;
  admin: boolean;
  salons: Awaited<ReturnType<typeof ownedSalons>>;
};

/** Cached per request, so every layout and page can ask cheaply. */
export const viewerFor = cache(async (user: User | null): Promise<Viewer | null> => {
  if (!user) return null;
  return { user, admin: isAdmin(user), salons: await ownedSalons(user.id) };
});

/** Which of the three experiences this person may switch to (the avatar menu). */
export function experiencesFor(viewer: Viewer) {
  return { customer: true, business: viewer.salons.length > 0, admin: viewer.admin };
}

/**
 * Where to go after logging in:
 * - admins go to /admin, salon owners to /business
 *   (unless they were already heading somewhere inside their own area);
 * - customers go back to the page they were on.
 */
export function landingFor(viewer: Viewer, next: string | undefined): string {
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const inAdmin = safe === "/admin" || safe.startsWith("/admin/");
  const inBusiness = safe === "/business" || safe.startsWith("/business/");
  if (viewer.admin) return inAdmin || inBusiness ? safe : "/admin";
  if (viewer.salons.length > 0) return inBusiness && safe !== "/business" ? safe : `/business/${viewer.salons[0].id}`;
  if (inAdmin) return "/";
  if (inBusiness && !safe.startsWith("/business/join")) return "/business/join";
  return safe;
}
