"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { endSession, getUser } from "@/lib/auth";
import { LANG_COOKIE } from "@/lib/i18n/server";
import { refresh } from "next/cache";

export async function setLanguage(lang: "en" | "ur") {
  const value = lang === "ur" ? "ur" : "en";
  (await cookies()).set(LANG_COOKIE, value, { path: "/", maxAge: 365 * 86_400, sameSite: "lax" });
  const user = await getUser();
  if (user) await db.update(schema.users).set({ language: value }).where(eq(schema.users.id, user.id));
  refresh();
}

export async function logout() {
  await endSession();
  redirect("/");
}
