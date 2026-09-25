import Link from "next/link";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireSalonAccess } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { addDays, formatDate, formatTime, localDateToUtc, localNow } from "@/lib/time";
import { displayPhone } from "@/lib/phone";
import { updateBooking } from "@/lib/actions/partner";
import { AutoRefresh, SubmitButton } from "@/components/client";
import { Empty } from "@/components/ui";

export default async function PartnerBookings({ params, searchParams }: PageProps<"/partner/[id]/bookings">) {
  const { id } = await params;
  const sp = await searchParams;
  const { salon } = await requireSalonAccess(Number(id));
  const { t, lang } = await getDict();
  const today = localNow().date;
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;

  const rows = await db
    .select({
      booking: schema.bookings,
      serviceName: schema.services.name,
      price: schema.services.price,
      userName: schema.users.name,
      userPhone: schema.users.phone,
      staffName: schema.staff.name,
    })
    .from(schema.bookings)
    .innerJoin(schema.services, eq(schema.services.id, schema.bookings.serviceId))
    .innerJoin(schema.users, eq(schema.users.id, schema.bookings.userId))
    .leftJoin(schema.staff, eq(schema.staff.id, schema.bookings.staffId))
    .where(
      and(
        eq(schema.bookings.salonId, salon.id),
        gte(schema.bookings.startsAt, localDateToUtc(date, 0)),
        lt(schema.bookings.startsAt, localDateToUtc(date, 24 * 60)),
      ),
    )
    .orderBy(asc(schema.bookings.startsAt));

  const days = Array.from({ length: 10 }, (_, i) => addDays(today, i - 2));
  const statusTone: Record<string, string> = {
    pending: "text-amber-700",
    confirmed: "text-emerald-700",
    completed: "text-slate-500",
    cancelled: "text-slate-400 line-through",
    rejected: "text-slate-400 line-through",
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

  return (
    <div className="space-y-4">
      <AutoRefresh seconds={30} />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {days.map((d) => (
          <Link key={d} href={`?date=${d}`} className={`${d === date ? "chip-active" : "chip"} shrink-0`}>
            {d === today ? t.today : formatDate(d, lang)}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <Empty>{t.noBookings}</Empty>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ booking, serviceName, price, userName, userPhone, staffName }) => (
            <li key={booking.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="num text-lg font-bold">
                    {formatTime(booking.startsAt, lang)} – {formatTime(booking.endsAt, lang)}
                  </p>
                  <p className="text-sm font-semibold">
                    {userName ?? "—"}{" "}
                    <a href={`tel:${userPhone}`} className="num font-normal text-brand-700" dir="ltr">
                      {displayPhone(userPhone)}
                    </a>
                  </p>
                  <p className="text-sm text-slate-600">
                    {serviceName} · {t.pkr} <span className="num">{price.toLocaleString("en-PK")}</span>
                    {staffName ? ` · ${staffName}` : ""}
                  </p>
                  {booking.note && <p className="mt-1 rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">“{booking.note}”</p>}
                </div>
                <span className={`text-xs font-bold ${statusTone[booking.status]}`}>{t[`status_${booking.status}` as const]}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {booking.status === "pending" && (
                  <>
                    <Action bookingId={booking.id} action="accept" label={t.accept} tone="btn-primary" />
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
          ))}
        </ul>
      )}
    </div>
  );
}
