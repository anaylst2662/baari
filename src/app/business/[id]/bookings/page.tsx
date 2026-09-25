import Link from "next/link";
import { and, asc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireSalonAccess } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { addDays, dayOfWeek, formatDate, formatTime, localDateOf, localDateToUtc, localNow } from "@/lib/time";
import { displayPhone } from "@/lib/phone";
import { updateBooking } from "@/lib/actions/business";
import { AutoRefresh, SubmitButton } from "@/components/client";
import { Empty } from "@/components/ui";

const bookingSelect = {
  booking: schema.bookings,
  serviceName: schema.services.name,
  price: schema.services.price,
  userName: schema.users.name,
  userPhone: schema.users.phone,
  staffName: schema.staff.name,
};

function bookingsQuery() {
  return db
    .select(bookingSelect)
    .from(schema.bookings)
    .innerJoin(schema.services, eq(schema.services.id, schema.bookings.serviceId))
    .innerJoin(schema.users, eq(schema.users.id, schema.bookings.userId))
    .leftJoin(schema.staff, eq(schema.staff.id, schema.bookings.staffId));
}

/** Baari Business → Bookings: new requests first, then a calendar or a day-by-day list. */
export default async function BusinessBookings({ params, searchParams }: PageProps<"/business/[id]/bookings">) {
  const { id } = await params;
  const sp = await searchParams;
  const { salon } = await requireSalonAccess(Number(id));
  const { t, lang } = await getDict();
  if (salon.mode === "queue") return <Empty>{t.bookingsOffNote}</Empty>;

  const base = `/business/${salon.id}/bookings`;
  const today = localNow().date;
  const view = sp.view === "calendar" ? "calendar" : "list";
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  const month = date.slice(0, 7);
  const monthStart = `${month}-01`;
  const nextMonth = addDays(monthStart, 32).slice(0, 7) + "-01";

  const [requests, dayRows, monthCounts] = await Promise.all([
    bookingsQuery()
      .where(
        and(
          eq(schema.bookings.salonId, salon.id),
          eq(schema.bookings.status, "pending"),
          gte(schema.bookings.startsAt, new Date()),
        ),
      )
      .orderBy(asc(schema.bookings.startsAt)),
    bookingsQuery()
      .where(
        and(
          eq(schema.bookings.salonId, salon.id),
          gte(schema.bookings.startsAt, localDateToUtc(date, 0)),
          lt(schema.bookings.startsAt, localDateToUtc(date, 24 * 60)),
        ),
      )
      .orderBy(asc(schema.bookings.startsAt)),
    db
      .select({ startsAt: schema.bookings.startsAt, pending: sql<boolean>`${schema.bookings.status} = 'pending'` })
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.salonId, salon.id),
          inArray(schema.bookings.status, ["pending", "confirmed", "completed"]),
          gte(schema.bookings.startsAt, localDateToUtc(monthStart, 0)),
          lt(schema.bookings.startsAt, localDateToUtc(nextMonth, 0)),
        ),
      ),
  ]);

  const statusTone: Record<string, string> = {
    pending: "text-amber-700",
    confirmed: "text-emerald-700",
    completed: "text-zinc-500",
    cancelled: "text-zinc-400 line-through",
    rejected: "text-zinc-400 line-through",
    no_show: "text-red-600",
  };

  const Action = ({ bookingId, action, label, tone }: { bookingId: number; action: string; label: string; tone: string }) => (
    <form action={updateBooking}>
      <input type="hidden" name="salonId" value={salon.id} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="action" value={action} />
      <SubmitButton className={`${tone} btn-sm`}>{label}</SubmitButton>
    </form>
  );

  const Card = ({ row, showDate = false }: { row: (typeof dayRows)[number]; showDate?: boolean }) => {
    const { booking } = row;
    return (
      <li className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="num text-lg font-bold">
              {showDate && `${formatDate(booking.startsAt, lang)} · `}
              {formatTime(booking.startsAt, lang)}
            </p>
            <p className="text-sm font-semibold">
              {row.userName ?? "—"}{" "}
              <a href={`tel:${row.userPhone}`} className="num font-normal text-brand-700" dir="ltr">
                {displayPhone(row.userPhone)}
              </a>
            </p>
            <p className="text-sm text-zinc-600">
              {row.serviceName} · {t.pkr} <span className="num">{row.price.toLocaleString("en-PK")}</span>
              {row.staffName ? ` · ${row.staffName}` : ""}
            </p>
            {booking.note && <p className="mt-1 rounded bg-zinc-50 px-2 py-1 text-xs text-zinc-600">“{booking.note}”</p>}
          </div>
          <span className={`text-xs font-bold ${statusTone[booking.status]}`}>{t[`status_${booking.status}` as const]}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {booking.status === "pending" && (
            <>
              <Action bookingId={booking.id} action="accept" label={`✓ ${t.accept}`} tone="btn-primary" />
              <Action bookingId={booking.id} action="decline" label={t.decline} tone="btn-danger" />
            </>
          )}
          {booking.status === "confirmed" && (
            <>
              <Action bookingId={booking.id} action="complete" label={`✓ ${t.complete}`} tone="btn-primary" />
              <Action bookingId={booking.id} action="no_show" label={t.noShow} tone="btn-danger" />
            </>
          )}
        </div>
      </li>
    );
  };

  // Month grid (Sunday first), with the number of bookings on each day.
  const counts = new Map<string, { total: number; pending: number }>();
  for (const b of monthCounts) {
    const d = localDateOf(b.startsAt);
    const c = counts.get(d) ?? { total: 0, pending: 0 };
    c.total++;
    if (b.pending) c.pending++;
    counts.set(d, c);
  }
  const lead = dayOfWeek(monthStart);
  const daysInMonth = Number(addDays(nextMonth, -1).slice(8, 10));
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => addDays(monthStart, i))];
  const weekdays = [t.sun, t.mon, t.tue, t.wed, t.thu, t.fri, t.sat];
  const monthLabel = new Intl.DateTimeFormat(lang === "ur" ? "ur-PK" : "en-PK", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${monthStart}T00:00:00Z`),
  );
  const stripDays = Array.from({ length: 14 }, (_, i) => addDays(today, i - 2));

  return (
    <div className="space-y-5">
      <AutoRefresh seconds={30} />

      {requests.length > 0 && (
        <section>
          <h2 className="section-title">
            🔔 {t.bookingRequests} <span className="num text-amber-700">({requests.length})</span>
          </h2>
          <ul className="space-y-2">
            {requests.map((r) => (
              <Card key={r.booking.id} row={r} showDate />
            ))}
          </ul>
        </section>
      )}

      <div className="flex gap-1 rounded-xl border border-zinc-200 bg-white p-1">
        {(["list", "calendar"] as const).map((v) => (
          <Link
            key={v}
            href={`${base}?view=${v}&date=${date}`}
            aria-current={view === v ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-lg text-sm font-bold ${view === v ? "bg-zinc-900 text-white" : "text-zinc-600"}`}
          >
            {v === "list" ? `☰ ${t.listView}` : `📅 ${t.calendarView}`}
          </Link>
        ))}
      </div>

      {view === "calendar" ? (
        <section className="card p-3">
          <div className="mb-2 flex items-center justify-between">
            <Link href={`${base}?view=calendar&date=${addDays(monthStart, -1)}`} className="chip" aria-label="Previous month">
              <span className="rtl:rotate-180">‹</span>
            </Link>
            <h2 className="font-bold">{monthLabel}</h2>
            <Link href={`${base}?view=calendar&date=${nextMonth}`} className="chip" aria-label="Next month">
              <span className="rtl:rotate-180">›</span>
            </Link>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {weekdays.map((w) => (
              <span key={w} className="py-1 font-semibold text-zinc-500">
                {w}
              </span>
            ))}
            {cells.map((d, i) =>
              d === null ? (
                <span key={`e${i}`} />
              ) : (
                <Link
                  key={d}
                  href={`${base}?view=list&date=${d}`}
                  className={`flex min-h-12 flex-col items-center justify-center rounded-lg border ${d === today ? "border-zinc-900" : "border-transparent"} ${counts.get(d)?.pending ? "bg-amber-50" : counts.get(d) ? "bg-emerald-50" : "hover:bg-zinc-50"}`}
                >
                  <span className="num font-semibold">{Number(d.slice(8))}</span>
                  {counts.get(d) && <span className="num text-[10px] font-bold text-zinc-600">{counts.get(d)!.total}</span>}
                </Link>
              ),
            )}
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {stripDays.map((d) => (
              <Link key={d} href={`${base}?date=${d}`} className={`${d === date ? "chip-active" : "chip"} shrink-0`}>
                {d === today ? t.today : formatDate(d, lang)}
              </Link>
            ))}
          </div>
          {dayRows.length === 0 ? (
            <Empty>{t.noBookingsThisDay}</Empty>
          ) : (
            <ul className="space-y-2">
              {dayRows.map((r) => (
                <Card key={r.booking.id} row={r} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
