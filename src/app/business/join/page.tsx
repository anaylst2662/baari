import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { JoinWizard } from "./wizard";

export const metadata: Metadata = { title: "List your salon" };

/**
 * New salon signup. The one /business page open to any logged-in person (it's how
 * customers become salon owners); it shows no business data.
 */
export default async function JoinPage() {
  await requireUser("/business/join");
  const { t } = await getDict();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">{t.registerSalon}</h1>
        <p className="text-zinc-600">{t.joinIntro}</p>
      </div>
      <JoinWizard />
    </div>
  );
}
