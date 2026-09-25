import { requireSalonAccess } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { updateHours } from "@/lib/actions/business";
import { SectionHeader } from "@/experiences/business/section-header";
import { HoursFields, SaveForm } from "@/experiences/business/salon-fields";




export default async function BusinessHours({ params }: PageProps<"/business/[id]/salon/hours">) {
  const { id } = await params;
  const { salon } = await requireSalonAccess(Number(id));
  const { t } = await getDict();
  return (
    <div>
      <SectionHeader salonId={salon.id} title={t.hours} backLabel={t.mySalon} />
      
      <SaveForm salonId={salon.id} action={updateHours}>
        <HoursFields salon={salon} />
      </SaveForm>
    </div>
  );
}
