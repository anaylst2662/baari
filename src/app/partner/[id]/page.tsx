import Link from "next/link";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireSalonAccess } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { estimateWait, getLiveQueue } from "@/lib/queue";
import { localDateToUtc, localNow, withinHours } from "@/lib/time";
import { toggleOpen } from "@/lib/actions/partner";
import { AutoRefresh, SubmitButton } from "@/components/client";
import { Notice } from "@/components/ui";
import { ArrowIcon, CalendarIcon, ListIcon, TagIcon } from "@/components/icons";

/** Salon owner's home: open/close, today's numbers, and big buttons to the daily tasks. */
export default async function PartnerDashboard({ params }: PageProps<"/partner/[id]">) {
  const { id } = await params;
  const { salon } = await requireSalonAccess(Number(id));
  const { t } = await getDict();
  const today = localNow().date;
  const takesQueue = salon.mode !== "booking";
  const takesBookings = salon.mode !== "queue";

  const [queue, [counts]] = await Promise.all([
    getLiveQueue(salon.id),
    db
      .select({
        today: sql<number>`count(*) filter (where ${schema.bookings.status} in ('pending', 'confirmed') and ${schema.bookings.startsAt} >= ${localDateToUtc(today, 0)} and ${schema.bookings.startsAt} < ${localDateToUtc(today, 24 * 60)})::int`,
        pending: sql<number>`count(*) filter (where ${schema.bookings.status} = 'pending')::int`,
      })
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.salonId, salon.id),
          gte(schema.bookings.endsAt, localDateToUtc(today, 0)),
          lt(schema.bookings.startsAt, localDateToUtc(today, 60 * 24 * 60)),
        ),
      ),
  ]);
  const wait = estimateWait(queue);
  const base = `/partner/${salon.id}`;

  const stats = [
    ...(takesQueue ? [{ label: t.waitingNow, value: queue.waiting.length, href: `${base}/queue` }] : []),
    ...(takesBookings
      ? [
          { label: t.bookingRequests, value: counts.pending, href: `${base}/bookings`, alert: counts.pending > 0 },
          { label: t.todayCount, value: counts.today, href: `${base}/bookings` },
        ]
      : []),
  ];

  const actions = [
    ...(takesQueue ? [{ href: `${base}/queue`, label: t.manageQueue, icon: ListIcon }] : []),
    ...(takesBookings ? [{ href: `${base}/bookings`, label: t.seeBookings, icon: CalendarIcon }] : []),
    { href: `${base}/services`, label: t.editPrices, icon: TagIcon },
  ];

  return (
    <div className="space-y-5">
      <AutoRefresh seconds={30} />

      <form action={toggleOpen}>
        <input type="hidden" name="salonId" value={salon.id} />
        <SubmitButton
          className={`flex w-full flex-col items-center rounded-2xl py-6 text-white shadow-md transition ${salon.isOpen ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-500 hover:bg-slate-600"}`}
        >
          <span className="text-2xl font-extrabold">{salon.isOpen ? t.salonOpen : t.salonClosed}</span>
          <span className="text-sm opacity-90">{salon.isOpen ? t.tapToClose : t.tapToOpen}</span>
        </SubmitButton>
      </form>
      {salon.isOpen && !withinHours(salon.hours) && (
        <Notice tone="warn">Outside your opening hours — customers see you as closed. Change hours in {t.navSettings}.</Notice>
      )}

      <section className={`grid gap-3 ${stats.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={`card p-3 text-center ${"alert" in s && s.alert ? "border-amber-400 bg-amber-50" : ""}`}
          >
            <p className="num text-3xl font-extrabold">{s.value}</p>
            <p className="text-xs font-medium text-slate-600">{s.label}</p>
          </Link>
        ))}
        {takesQueue && stats.length < 3 && (
          <Link href={`${base}/queue`} className="card p-3 text-center">
            <p className="num text-3xl font-extrabold">{wait.high === 0 ? "0" : `${wait.low}–${wait.high}`}</p>
            <p className="text-xs font-medium text-slate-600">
              {t.estimatedWait} ({t.minutes})
            </p>
          </Link>
        )}
      </section>

      <section className="grid gap-2">
        {actions.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="card flex items-center gap-3 p-4 text-base font-semibold hover:border-brand-500">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <Icon className="h-5 w-5" />
            </span>
            <span className="flex-1">{label}</span>
            <ArrowIcon className="h-5 w-5 text-slate-400 rtl:rotate-180" />
          </Link>
        ))}
      </section>
    </div>
  );
}
