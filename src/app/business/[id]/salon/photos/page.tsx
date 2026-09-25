import { requireSalonAccess } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { updatePhotos } from "@/lib/actions/business";
import { SectionHeader } from "@/experiences/business/section-header";
import { PhotosField, SaveForm } from "@/experiences/business/salon-fields";
import { Empty } from "@/components/ui";

function PhotoPreview({ photos }: { photos: string[] }) {
  if (photos.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((p) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={p} src={p} alt="" className="aspect-square w-full rounded-xl object-cover" />
      ))}
    </div>
  );
}

export default async function BusinessPhotos({ params }: PageProps<"/business/[id]/salon/photos">) {
  const { id } = await params;
  const { salon } = await requireSalonAccess(Number(id));
  const { t } = await getDict();
  return (
    <div>
      <SectionHeader salonId={salon.id} title={t.photos} backLabel={t.mySalon} />
      {salon.photos.length === 0 && <div className="mb-4"><Empty>{t.noPhotosYet}</Empty></div>}
      <SaveForm salonId={salon.id} action={updatePhotos}>
        <><PhotoPreview photos={salon.photos} /><div className="card p-4"><PhotosField salon={salon} /></div></>
      </SaveForm>
    </div>
  );
}
