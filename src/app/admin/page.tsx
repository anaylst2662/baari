import Link from "next/link";
import type { Metadata } from "next";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { formatDate, formatTime } from "@/lib/time";
import { displayPhone } from "@/lib/phone";
import { setSalonStatus, toggleFeatured, toggleReviewHidden } from "@/lib/actions/admin";
import { SubmitButton } from "@/components/client";
import { Empty, Stars, typeLabel } from "@/components/ui";

export const metadata: Metadata = { title: "Admin" };

async function stats() {
  const since = sql`now() - interval '30 days'`;
  const [row] = await db.execute<{
    active_salons: number;
    pending_salons: number;
    bookings: number;
    queue_joins: number;
    no_shows: number;
    finished: number;
    customers: number;
    repeat_customers: number;
    users: number;
  }>(sql`
    select
      (select count(*)::int from salons where status = 'approved' and last_active_at > now() - interval '7 days') as active_salons,
      (select count(*)::int from salons where status = 'pending') as pending_salons,
      (select count(*)::int from bookings where created_at > ${since}) as bookings,
      (select count(*)::int from queue_entries where joined_at > ${since}) as queue_joins,
      (select count(*)::int from bookings where status = 'no_show' and starts_at > ${since}) as no_shows,
      (select count(*)::int from bookings where status in ('completed', 'no_show') and starts_at > ${since}) as finished,
      (select count(distinct user_id)::int from bookings where created_at > ${since}) as customers,
      (select count(*)::int from (select user_id from bookings where created_at > now() - interval '60 days' group by user_id having count(*) > 1) r) as repeat_customers,
      (select count(*)::int from users) as users
  `).then((r) => r.rows);
  return row;
}

export default async function AdminPage() {
  await requireAdmin();
  const { t, lang } = await getDict();
  const [s, salons, reviews, outbox, recentUsers] = await Promise.all([
    stats(),
    db
      .select({ salon: schema.salons, ownerPhone: schema.users.phone })
      .from(schema.salons)
      .leftJoin(schema.users, eq(schema.users.id, schema.salons.ownerId))
      .orderBy(sql`case when ${schema.salons.status} = 'pending' then 0 else 1 end`, desc(schema.salons.createdAt)),
    db
      .select({ review: schema.reviews, salonName: schema.salons.name, userName: schema.users.name })
      .from(schema.reviews)
      .innerJoin(schema.salons, eq(schema.salons.id, schema.reviews.salonId))
      .innerJoin(schema.users, eq(schema.users.id, schema.reviews.userId))
      .orderBy(desc(schema.reviews.createdAt))
      .limit(20),
    db.select().from(schema.notifications).orderBy(desc(schema.notifications.id)).limit(25),
    db.select().from(schema.users).orderBy(desc(schema.users.createdAt)).limit(10),
  ]);

  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
  const tiles = [
    [t.activeSalons, String(s.active_salons)],
    [t.bookingsThisMonth, String(s.bookings)],
    [t.queueJoins, String(s.queue_joins)],
    [t.noShowRate, pct(s.no_shows, s.finished)],
    [t.repeatCustomers, pct(s.repeat_customers, s.customers)],
    [t.users, String(s.users)],
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold">{t.adminTitle}</h1>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="num text-2xl font-extrabold">{value}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="section-title">
          {t.allSalons} {s.pending_salons > 0 && <span className="num text-sm text-amber-700">({s.pending_salons} pending)</span>}
        </h2>
        <ul className="space-y-2">
          {salons.map(({ salon, ownerPhone }) => (
            <li key={salon.id} className={`card p-3 ${salon.status === "pending" ? "border-amber-300 bg-amber-50/50" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/s/${salon.slug}`} className="font-semibold hover:text-brand-700">
                    {salon.name}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {typeLabel(salon.type, t)} · {salon.area}, {salon.city}
                    {ownerPhone && <span className="num"> · {displayPhone(ownerPhone)}</span>}
                    {" · "}
                    <span className={salon.status === "approved" ? "text-emerald-700" : salon.status === "pending" ? "text-amber-700" : "text-red-700"}>
                      {salon.status}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {salon.status !== "approved" && (
                    <form action={setSalonStatus}>
                      <input type="hidden" name="salonId" value={salon.id} />
                      <input type="hidden" name="status" value="approved" />
                      <SubmitButton className="btn-primary btn-sm">{t.approve}</SubmitButton>
                    </form>
                  )}
                  {salon.status !== "rejected" && (
                    <form action={setSalonStatus}>
                      <input type="hidden" name="salonId" value={salon.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <SubmitButton className="btn-danger btn-sm" confirm={`${t.reject} ${salon.name}?`}>
                        {t.reject}
                      </SubmitButton>
                    </form>
                  )}
                  <form action={toggleFeatured}>
                    <input type="hidden" name="salonId" value={salon.id} />
                    <SubmitButton className={salon.featured ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>★ {t.featured}</SubmitButton>
                  </form>
                  <Link href={`/partner/${salon.id}`} className="btn-secondary btn-sm">
                    {t.navPartner}
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="section-title">{t.reviews}</h2>
        {reviews.length === 0 ? (
          <Empty>{t.noReviews}</Empty>
        ) : (
          <ul className="space-y-2">
            {reviews.map(({ review, salonName, userName }) => (
              <li key={review.id} className={`card flex items-start justify-between gap-3 p-3 ${review.hidden ? "opacity-50" : ""}`}>
                <div className="text-sm">
                  <p className="font-semibold">
                    {salonName} <Stars value={review.rating} />
                  </p>
                  <p className="text-xs text-slate-500">
                    {userName} {review.anonymous && "(anonymous)"} · {formatDate(review.createdAt, lang)}
                  </p>
                  {review.comment && <p className="mt-1">{review.comment}</p>}
                </div>
                <form action={toggleReviewHidden}>
                  <input type="hidden" name="reviewId" value={review.id} />
                  <SubmitButton className="btn-secondary btn-sm">{review.hidden ? t.unhide : t.hide}</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="section-title">{t.outbox}</h2>
          <ul className="card max-h-96 divide-y divide-slate-100 overflow-y-auto text-xs">
            {outbox.map((n) => (
              <li key={n.id} className="p-3">
                <p className="num text-slate-500" dir="ltr">
                  {displayPhone(n.phone)} · {formatTime(n.createdAt, lang)} · {n.status}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap" dir="ltr">
                  {n.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="section-title">{t.users}</h2>
          <ul className="card divide-y divide-slate-100 text-sm">
            {recentUsers.map((u) => (
              <li key={u.id} className="flex justify-between p-3">
                <span>{u.name ?? "—"}</span>
                <span className="num text-slate-500" dir="ltr">
                  {displayPhone(u.phone)} · {u.role}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
