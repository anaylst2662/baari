import "server-only";
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

export async function viewerFor(user: User | null): Promise<Viewer | null> {
  if (!user) return null;
  return { user, admin: isAdmin(user), salons: await ownedSalons(user.id) };
}

/** Where each person lands after logging in: admins → admin area, owners → their salon, everyone else → home. */
export function homeFor(viewer: Viewer): string {
  if (viewer.admin) return "/admin";
  if (viewer.salons.length > 0) return `/partner/${viewer.salons[0].id}`;
  return "/";
}

/**
 * Honours a `next` link from before login (e.g. "book this salon") when the person
 * is allowed there; otherwise sends them to their role's home page.
 */
export function landingFor(viewer: Viewer, next: string | undefined): string {
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  if (!safe || safe === "/") return homeFor(viewer);
  if (safe.startsWith("/admin") && !viewer.admin) return homeFor(viewer);
  return safe;
}
