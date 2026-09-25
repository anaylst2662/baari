import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { formatDate } from "@/lib/time";
import { toggleReviewHidden } from "@/lib/actions/admin";
import { SubmitButton } from "@/components/client";
import { Empty, Stars } from "@/components/ui";

export default async function AdminReviews() {
  await requireAdmin();
  const { t, lang } = await getDict();
  const reviews = await db
    .select({ review: schema.reviews, salonName: schema.salons.name, userName: schema.users.name })
    .from(schema.reviews)
    .innerJoin(schema.salons, eq(schema.salons.id, schema.reviews.salonId))
    .innerJoin(schema.users, eq(schema.users.id, schema.reviews.userId))
    .orderBy(desc(schema.reviews.createdAt))
    .limit(100);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{t.reviews}</h1>
      {reviews.length === 0 ? (
        <Empty>{t.noReviews}</Empty>
      ) : (
        <ul className="space-y-2">
          {reviews.map(({ review, salonName, userName }) => (
            <li key={review.id} className={`card flex items-start justify-between gap-3 p-3 ${review.hidden ? "opacity-50" : ""}`}>
              <div className="text-sm">
                <p className="font-semibold">{salonName}</p>
                <Stars value={review.rating} />
                <p className="text-xs text-slate-500">
                  {userName} {review.anonymous && "(anonymous)"} · {formatDate(review.createdAt, lang)}
                </p>
                {review.comment && <p className="mt-1">{review.comment}</p>}
              </div>
              <form action={toggleReviewHidden}>
                <input type="hidden" name="reviewId" value={review.id} />
                <SubmitButton className="btn-secondary btn-sm min-h-9">{review.hidden ? t.unhide : t.hide}</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
