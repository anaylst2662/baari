"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db, schema } from "@/db";
import { getUser, requestOtp, startSession, verifyOtp } from "@/lib/auth";
import { normalizePkPhone } from "@/lib/phone";
import { LANG_COOKIE } from "@/lib/i18n/server";

export type LoginState =
  | { step: "phone"; error?: string }
  | { step: "code"; phone: string; demoCode?: string; error?: string }
  | { step: "name"; next: string; error?: string };

function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "/";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

export async function loginStep(prev: LoginState, formData: FormData): Promise<LoginState> {
  const next = safeNext(formData.get("next"));

  if (formData.get("intent") === "restart") return { step: "phone" };

  if (prev.step === "phone") {
    const phone = normalizePkPhone(String(formData.get("phone") ?? ""));
    if (!phone) return { step: "phone", error: "Enter a valid Pakistani mobile number, e.g. 0300 1234567." };
    const res = await requestOtp(phone);
    if (!res.ok) return { step: "phone", error: res.error };
    return { step: "code", phone, demoCode: res.demoCode };
  }

  if (prev.step === "code") {
    const user = await verifyOtp(prev.phone, String(formData.get("code") ?? ""));
    if (!user) return { ...prev, error: "That code is incorrect or has expired." };
    await startSession(user.id);
    (await cookies()).set(LANG_COOKIE, user.language, { path: "/", maxAge: 365 * 86_400, sameSite: "lax" });
    if (!user.name) return { step: "name", next };
    redirect(next);
  }

  if (prev.step === "name") {
    const user = await getUser();
    const name = String(formData.get("name") ?? "").trim().slice(0, 60);
    if (!user) return { step: "phone" };
    if (!name) return { ...prev, error: "Please enter your name." };
    await db.update(schema.users).set({ name }).where(eq(schema.users.id, user.id));
    redirect(prev.next);
  }

  return { step: "phone" };
}
