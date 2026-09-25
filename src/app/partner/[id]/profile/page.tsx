import { requireSalonAccess } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { updateProfile } from "@/lib/actions/partner";
import { SalonForm } from "../../salon-form";

export default async function PartnerProfile({ params }: PageProps<"/partner/[id]/profile">) {
  const { id } = await params;
  const { salon } = await requireSalonAccess(Number(id));
  const { t } = await getDict();
  return <SalonForm salon={salon} action={updateProfile} submitLabel={t.save} />;
}
