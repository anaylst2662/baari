import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { demoMode, messagingConfigured, sendMessage } from "./notify";
import { isAdmin } from "./roles";

const SESSION_COOKIE = "baari_session";
const SESSION_DAYS = 60;
const OTP_TTL_MIN = 10;
const OTP_MAX_PER_HOUR = 5;
const OTP_MAX_ATTEMPTS = 5;

function hash(value: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set in production");
  return createHash("sha256")
    .update(`${secret || "baari-dev-secret"}:${value}`)
    .digest("hex");
}

export async function requestOtp(
  phone: string,
): Promise<{ ok: true; demoCode?: string } | { ok: false; error: string }> {
  if (!demoMode() && !messagingConfigured()) {
    return { ok: false, error: "Messaging provider is not configured." };
  }
  const since = new Date(Date.now() - 60 * 60_000);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.otpCodes)
    .where(and(eq(schema.otpCodes.phone, phone), gt(schema.otpCodes.createdAt, since)));
  if (count >= OTP_MAX_PER_HOUR) {
    return { ok: false, error: "Too many codes requested. Try again later." };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(schema.otpCodes).values({
    phone,
    codeHash: hash(`${phone}:${code}`),
    expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60_000),
  });
  await sendMessage(phone, `Your Baari code is ${code}. It expires in ${OTP_TTL_MIN} minutes.`);
  return { ok: true, demoCode: demoMode() ? code : undefined };
}

export async function verifyOtp(phone: string, code: string): Promise<User | null> {
  const [otp] = await db
    .select()
    .from(schema.otpCodes)
    .where(
      and(
        eq(schema.otpCodes.phone, phone),
        isNull(schema.otpCodes.usedAt),
        gt(schema.otpCodes.expiresAt, new Date()),
      ),
    )
    .orderBy(sql`${schema.otpCodes.createdAt} desc`)
    .limit(1);
  if (!otp || otp.attempts >= OTP_MAX_ATTEMPTS) return null;

  const expected = Buffer.from(otp.codeHash);
  const actual = Buffer.from(hash(`${phone}:${code.trim()}`));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    await db
      .update(schema.otpCodes)
      .set({ attempts: otp.attempts + 1 })
      .where(eq(schema.otpCodes.id, otp.id));
    return null;
  }
  await db.update(schema.otpCodes).set({ usedAt: new Date() }).where(eq(schema.otpCodes.id, otp.id));

  // Admin rights are not stored on the account; see isAdmin() in roles.ts.
  let [user] = await db.select().from(schema.users).where(eq(schema.users.phone, phone));
  if (!user) {
    [user] = await db.insert(schema.users).values({ phone }).returning();
  }
  return user;
}

export async function startSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(schema.sessions).values({ token: hash(token), userId, expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.token, hash(token)));
  jar.delete(SESSION_COOKIE);
}

/** Cached per request, so layouts and pages can both call it cheaply. */
export const getUser = cache(async function getUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.token, hash(token)), gt(schema.sessions.expiresAt, new Date())));
  return row?.user ?? null;
});

export async function requireUser(next: string): Promise<User> {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/**
 * Guards every admin page and admin action. Anyone who is not an admin, including
 * people who aren't logged in, gets "page not found", so the admin area doesn't
 * even reveal that it exists.
 */
export async function requireAdmin(): Promise<User> {
  const user = await getUser();
  if (!user || !isAdmin(user)) notFound();
  return user;
}

/**
 * Guards every Baari Business page and action for one salon. Only that salon's
 * owner or an admin gets through; not logged in → login page; anyone else gets
 * "page not found" (so other salons' data is never shown or changed).
 */
export async function requireSalonAccess(salonId: number) {
  const user = await requireUser(Number.isInteger(salonId) ? `/business/${salonId}` : "/business");
  const [salon] = Number.isInteger(salonId) && salonId > 0
    ? await db.select().from(schema.salons).where(eq(schema.salons.id, salonId))
    : [];
  if (!salon || (salon.ownerId !== user.id && !isAdmin(user))) notFound();
  return { user, salon, viewingAsAdmin: salon.ownerId !== user.id };
}
