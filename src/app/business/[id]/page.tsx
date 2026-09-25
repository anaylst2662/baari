import Link from "next/link";
import { and, asc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Salon } from "@/db/schema";
import type { Dict } from "@/lib/i18n/dict";
import { requireSalonAccess } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { estimateWait, getLiveQueue } from "@/lib/queue";
import { formatTime, localDateToUtc, localNow, withinHours } from "@/lib/time";
import { callNext, toggleOpen, updateBooking } from "@/lib/actions/business";
import { AutoRefresh, SubmitButton } from "@/components/client";
import { Empty, Notice } from "@/components/ui";
import { CameraIcon, ClockIcon, TagIcon, UsersIcon } from "@/components/icons";

async function todayNumbers(salonId: number) {
  const today = localNow().date;
  const start = localDateToUtc(today, 0);
  const end = localDateToUtc(today, 24 * 60);
  const [[fromBookings], [fromQueue], appointments] = await Promise.all([
    db
      .select({ total: sql<number>`coalesce(sum(${schema.services.price}), 0)::int` })
      .from(schema.bookings)
      .innerJoin(schema.services, eq(schema.services.id, schema.bookings.serviceId))
      .where(
        and(
          eq(schema.bookings.salonId, salonId),
          eq(schema.bookings.status, "completed"),
          gte(schema.bookings.startsAt, start),
          lt(schema.bookings.startsAt, end),
        ),
      ),
    db
      .select({ total: sql<number>`coalesce(sum(${schema.services.price}), 0)::int` })
      .from(schema.queueEntries)
      .innerJoin(schema.services, eq(schema.services.id, schema.queueEntries.serviceId))
      .where(
        and(
          eq(schema.queueEntries.salonId, salonId),
          eq(schema.queueEntries.status, "served"),
          gte(schema.queueEntries.finishedAt, start),
          lt(schema.queueEntries.finishedAt, end),
        ),
      ),
    db
      .select({ booking: schema.bookings, serviceName: schema.services.name, userName: schema.users.name, staffName: schema.staff.name })
      .from(schema.bookings)
      .innerJoin(schema.services, eq(schema.services.id, schema.bookings.serviceId))
      .innerJoin(schema.users, eq(schema.users.id, schema.bookings.userId))
      .leftJoin(schema.staff, eq(schema.staff.id, schema.bookings.staffId))
      .where(
        and(
          eq(schema.bookings.salonId, salonId),
          inArray(schema.bookings.status, ["pending", "confirmed", "completed"]),
          gte(schema.bookings.startsAt, start),
          lt(schema.bookings.startsAt, end),
        ),
      )
      .orderBy(asc(schema.bookings.startsAt)),
  ]);
  return { earnings: fromBookings.total + fromQueue.total, appointments };
}

/** Friendly screen shown to a new salon until the Baari team approves it. */
function WaitingForApproval({ salon, t, welcome }: { salon: Salon; t: Dict; welcome: boolean }) {
  const base = `/business/${salon.id}/salon`;
  const steps = [
    { href: `${base}/services`, label: t.setupServices, icon: TagIcon },
    { href: `${base}/staff`, label: t.setupStaff, icon: UsersIcon },
    { href: `${base}/photos`, label: t.setupPhotos, icon: CameraIcon },
    { href: `${base}/hours`, label: t.setupHours, icon: ClockIcon },
  ];
  return (
    <section className="space-y-4">
      <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
        <p className="text-5xl">⏳</p>
        <h2 className="mt-3 text-2xl font-extrabold">{welcome ? t.thanksForJoining : t.waitingApprovalTitle}</h2>
        <p className="mx-auto mt-2 max-w-md text-zinc-600">{t.waitingApprovalBody}</p>
      </div>
      <h3 className="section-title">{t.getReadyTitle}</h3>
      <ul className="grid gap-2">
        {steps.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="card flex min-h-14 items-center gap-3 p-4 font-semibold">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-800">
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex-1">{label}</span>
              <span className="text-zinc-400 rtl:rotate-180">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Baari Business → Today. */
export default async function BusinessToday({ params, searchParams }: PageProps<"/business/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { salon } = await requireSalonAccess(Number(id));
  const { t, lang } = await getDict();

  if (salon.status !== "approved") {
    return salon.status === "rejected" ? (
      <Notice tone="error">{t.rejectedNote}</Notice>
    ) : (
      <WaitingForApproval salon={salon} t={t} welcome={sp.welcome === "1"} />
    );
  }

  const [queue, numbers] = await Promise.all([getLiveQueue(salon.id), todayNumbers(salon.id)]);
  const wait = estimateWait(queue);
  const base = `/business/${salon.id}`;
  const takesQueue = salon.mode !== "booking";
  const nameOf = (r: (typeof queue.waiting)[number]) => r.userName ?? r.entry.walkInName ?? "—";
  const upcoming = numbers.appointments.filter((a) => a.booking.status !== "completed");
  const pending = upcoming.filter((a) => a.booking.status === "pending").length;

  return (
    <div className="space-y-5">
      <AutoRefresh seconds={30} />

      <form action={toggleOpen}>
        <input type="hidden" name="salonId" value={salon.id} />
        <SubmitButton
          className={`flex min-h-20 w-full flex-col items-center justify-center rounded-2xl text-white shadow-md transition ${salon.isOpen ? "bg-emerald-600 hover:bg-emerald-700" : "bg-zinc-500 hover:bg-zinc-600"}`}
        >
          <span className="text-2xl font-extrabold">{salon.isOpen ? t.salonOpen : t.salonClosed}</span>
          <span className="text-sm opacity-90">{salon.isOpen ? t.tapToClose : t.tapToOpen}</span>
        </SubmitButton>
      </form>
      {salon.isOpen && !withinHours(salon.hours) && <Notice tone="warn">{t.outsideHoursNote}</Notice>}

      <section className="grid grid-cols-3 gap-2">
        <div className="card p-3 text-center">
          <p className="num text-2xl font-extrabold text-emerald-700">
            {t.pkr} {numbers.earnings.toLocaleString("en-PK")}
          </p>
          <p className="text-xs font-medium text-zinc-600">{t.todaysEarnings}</p>
        </div>
        <Link href={`${base}/bookings`} className={`card p-3 text-center ${pending ? "border-amber-400 bg-amber-50" : ""}`}>
          <p className="num text-2xl font-extrabold">{upcoming.length}</p>
          <p className="text-xs font-medium text-zinc-600">{pending ? `${pending} ${t.newRequests}` : t.todayCount}</p>
        </Link>
        <Link href={`${base}/queue`} className="card p-3 text-center">
          <p className="num text-2xl font-extrabold">{queue.waiting.length}</p>
          <p className="text-xs font-medium text-zinc-600">{t.waitingNow}</p>
        </Link>
      </section>

      <section>
        <h2 className="section-title">{t.quickActions}</h2>
        <div className="grid grid-cols-2 gap-2">
          {takesQueue && (
            <form action={callNext}>
              <input type="hidden" name="salonId" value={salon.id} />
              <SubmitButton className="btn-primary min-h-14 w-full text-base" disabled={queue.waiting.length === 0}>
                📣 {t.callNext}
              </SubmitButton>
            </form>
          )}
          {takesQueue && (
            <Link href={`${base}/queue#add-walk-in`} className="btn-secondary min-h-14 text-base">
              + {t.addWalkIn}
            </Link>
          )}
          <Link href={`${base}/bookings`} className="btn-secondary min-h-14 text-base">
            📅 {t.seeBookings}
          </Link>
          <Link href={`${base}/salon/services`} className="btn-secondary min-h-14 text-base">
            🏷️ {t.editPrices}
          </Link>
        </div>
      </section>

      {takesQueue && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="section-title mb-0">{t.liveQueue}</h2>
            <span className="text-sm font-semibold text-zinc-600">
              {wait.high === 0 ? t.noWait : `${t.waitAbout} ${wait.low}–${wait.high} ${t.minutes}`}
            </span>
          </div>
          {queue.called.length === 0 && queue.waiting.length === 0 ? (
            <Empty>{t.queueEmpty}</Empty>
          ) : (
            <ul className="card divide-y divide-zinc-100">
              {queue.called.map((r) => (
                <li key={r.entry.id} className="flex min-h-12 items-center gap-3 bg-amber-50 px-4 py-2">
                  <span className="text-xs font-bold uppercase text-amber-800">{t.nowServing}</span>
                  <span className="flex-1 font-semibold">{nameOf(r)}</span>
                  <span className="text-sm text-zinc-500">{r.serviceName}</span>
                </li>
              ))}
              {queue.waiting.slice(0, 3).map((r, i) => (
                <li key={r.entry.id} className="flex min-h-12 items-center gap-3 px-4 py-2">
                  <span className="num grid h-7 w-7 place-items-center rounded-full bg-zinc-100 text-sm font-bold">{i + 1}</span>
                  <span className="flex-1 font-medium">{nameOf(r)}</span>
                  <span className="text-sm text-zinc-500">{r.serviceName}</span>
                </li>
              ))}
              {queue.waiting.length > 3 && (
                <li>
                  <Link href={`${base}/queue`} className="flex min-h-11 items-center justify-center text-sm font-semibold text-brand-700">
                    +{queue.waiting.length - 3} · {t.manageQueue} →
                  </Link>
                </li>
              )}
            </ul>
          )}
        </section>
      )}

      {salon.mode !== "queue" && (
        <section>
          <h2 className="section-title">{t.todaysAppointments}</h2>
          {upcoming.length === 0 ? (
            <Empty>{t.noAppointmentsToday}</Empty>
          ) : (
            <ul className="card divide-y divide-zinc-100">
              {upcoming.map(({ booking, serviceName, userName, staffName }) => (
                <li key={booking.id} className="flex min-h-14 flex-wrap items-center gap-3 px-4 py-2">
                  <span className="num w-16 font-bold">{formatTime(booking.startsAt, lang)}</span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold">{userName ?? "—"}</p>
                    <p className="text-xs text-zinc-500">
                      {serviceName}
                      {staffName ? ` · ${staffName}` : ""}
                    </p>
                  </div>
                  {booking.status === "pending" ? (
                    <form action={updateBooking}>
                      <input type="hidden" name="salonId" value={salon.id} />
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <input type="hidden" name="action" value="accept" />
                      <SubmitButton className="btn-primary btn-sm">{t.accept}</SubmitButton>
                    </form>
                  ) : (
                    <span className="text-xs font-bold text-emerald-700">✓ {t.status_confirmed}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
