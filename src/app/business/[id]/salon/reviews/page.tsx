import { requireSalonAccess } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { getReviews } from "@/lib/data";
import { formatDate } from "@/lib/time";
import { SectionHeader } from "@/experiences/business/section-header";
import { Empty, Stars } from "@/components/ui";

/** My Salon → Reviews (read-only; the Baari team handles complaints). */
export default async function BusinessReviews({ params }: PageProps<"/business/[id]/salon/reviews">) {
  const { id } = await params;
  const { salon } = await requireSalonAccess(Number(id));
  const { t, lang } = await getDict();
  const reviews = await getReviews(salon.id, 50);
  return (
    <div>
      <SectionHeader salonId={salon.id} title={t.reviews} backLabel={t.mySalon} />
      {salon.ratingCount > 0 && (
        <div className="card mb-4 flex items-center gap-3 p-4">
          <span className="num text-4xl font-extrabold">{salon.ratingAvg.toFixed(1)}</span>
          <div>
            <Stars value={salon.ratingAvg} />
            <p className="num text-sm text-zinc-500">
              {salon.ratingCount} {t.reviews}
            </p>
          </div>
        </div>
      )}
      {reviews.length === 0 ? (
        <Empty>{t.noReviewsOwner}</Empty>
      ) : (
        <ul className="space-y-2">
          {reviews.map(({ review, userName }) => (
            <li key={review.id} className="card p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">{review.anonymous ? t.anonymousCustomer : (userName ?? t.anonymousCustomer)}</span>
                <span className="text-xs text-zinc-400">{formatDate(review.createdAt, lang)}</span>
              </div>
              <Stars value={review.rating} />
              {review.comment && <p className="mt-1 text-sm text-zinc-700">{review.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
