import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { displayPhone } from "@/lib/phone";
import { logout } from "@/app/actions";
import { SubmitButton } from "@/components/client";
import { LanguageToggle } from "@/components/nav";

export const metadata: Metadata = { title: "Account" };

async function saveProfile(formData: FormData) {
  "use server";
  const user = await requireUser("/account");
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const city = String(formData.get("city") ?? "").trim().slice(0, 60) || null;
  const gender = String(formData.get("gender") ?? "") || null;
  if (!name) return;
  await db.update(schema.users).set({ name, city, gender }).where(eq(schema.users.id, user.id));
  revalidatePath("/account");
}

export default async function AccountPage() {
  const user = await requireUser("/account");
  const { t } = await getDict();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">{t.accountTitle}</h1>
      <form action={saveProfile} className="card space-y-4 p-5">
        <p className="num text-sm text-slate-500" dir="ltr">
          {displayPhone(user.phone)}
        </p>
        <label className="block">
          <span className="label">{t.yourName}</span>
          <input name="name" defaultValue={user.name ?? ""} required maxLength={60} className="input" />
        </label>
        <label className="block">
          <span className="label">{t.city}</span>
          <select name="city" defaultValue={user.city ?? ""} className="input">
            <option value="">—</option>
            {["Islamabad", "Rawalpindi", "Gilgit", "Hunza", "Lahore", "Karachi"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Gender (optional)</span>
          <select name="gender" defaultValue={user.gender ?? ""} className="input">
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>
        <SubmitButton>{t.save}</SubmitButton>
      </form>
      <div className="card flex items-center justify-between p-5">
        <span className="font-medium">{t.language}</span>
        <LanguageToggle />
      </div>
      <form action={logout}>
        <SubmitButton className="btn-secondary w-full">{t.logout}</SubmitButton>
      </form>
    </div>
  );
}
