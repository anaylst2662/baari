import Link from "next/link";
import type { Metadata } from "next";
import { desc, eq, sql } from "drizzle-orm";
import { db, rowsOf, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { Empty } from "@/components/ui";
import { SalonRow } from "./salon-row";

export const metadata: Metadata = { title: "Admin" };

async function stats() {
  const since = sql`now() - interval '30 days'`;
  type Stats = {
    active_salons: number;
    pending_salons: number;
    bookings: number;
    queue_joins: number;
    no_shows: number;
    finished: number;
    customers: number;
    repeat_customers: number;
    users: number;
  };
  const result = await db.execute(sql`
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
  `);
  return rowsOf<Stats>(result)[0];
}

export default async function AdminOverview() {
  await requireAdmin();
  const { t } = await getDict();
  const [s, pending] = await Promise.all([
    stats(),
    db
      .select({ salon: schema.salons, ownerPhone: schema.users.phone })
      .from(schema.salons)
      .leftJoin(schema.users, eq(schema.users.id, schema.salons.ownerId))
      .where(eq(schema.salons.status, "pending"))
      .orderBy(desc(schema.salons.createdAt)),
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
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">{t.navOverview}</h1>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="num text-2xl font-extrabold">{value}</p>
          </div>
        ))}
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title mb-0">
            {t.pendingSalons} <span className="num text-amber-700">({pending.length})</span>
          </h2>
          <Link href="/admin/salons" className="text-sm font-semibold text-brand-700">
            {t.seeAll} →
          </Link>
        </div>
        {pending.length === 0 ? (
          <Empty>{t.nothingPending}</Empty>
        ) : (
          <ul className="space-y-2">
            {pending.map(({ salon, ownerPhone }) => (
              <SalonRow key={salon.id} salon={salon} ownerPhone={ownerPhone} t={t} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
