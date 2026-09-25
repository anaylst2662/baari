import { requireSalonAccess } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { updateProfile } from "@/lib/actions/partner";
import { SalonForm } from "../../salon-form";
import { StaffSection } from "./staff-section";

export default async function PartnerSettings({ params }: PageProps<"/partner/[id]/settings">) {
  const { id } = await params;
  const { salon } = await requireSalonAccess(Number(id));
  const { t } = await getDict();
  return (
    <div className="space-y-8">
      <StaffSection salon={salon} t={t} />
      <section className="space-y-3">
        <h2 className="section-title mb-0">{t.profile}</h2>
        <SalonForm salon={salon} action={updateProfile} submitLabel={t.save} />
      </section>
    </div>
  );
}
