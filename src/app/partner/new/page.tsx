import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { registerSalon } from "@/lib/actions/partner";
import { SalonForm } from "../salon-form";

export const metadata: Metadata = { title: "Register your salon" };

export default async function NewSalonPage() {
  await requireUser("/partner/new");
  const { t } = await getDict();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{t.registerSalon}</h1>
      <p className="text-sm text-slate-600">{t.forSalonsBody}</p>
      <SalonForm action={registerSalon} submitLabel={t.registerSalon} />
    </div>
  );
}
