import { requireSalonAccess } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { updateDetails } from "@/lib/actions/business";
import { SectionHeader } from "@/experiences/business/section-header";
import { BasicsFields, LocationFields, SaveForm } from "@/experiences/business/salon-fields";




export default async function BusinessDetails({ params }: PageProps<"/business/[id]/salon/details">) {
  const { id } = await params;
  const { salon } = await requireSalonAccess(Number(id));
  const { t } = await getDict();
  return (
    <div>
      <SectionHeader salonId={salon.id} title={t.salonDetails} backLabel={t.mySalon} />
      
      <SaveForm salonId={salon.id} action={updateDetails}>
        <div className="card space-y-6 p-4"><BasicsFields salon={salon} /><LocationFields salon={salon} /></div>
      </SaveForm>
    </div>
  );
}
