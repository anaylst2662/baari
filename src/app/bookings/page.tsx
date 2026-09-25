import Link from "next/link";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { formatDate, formatTime } from "@/lib/time";
import { cancelBooking, submitReview } from "@/lib/actions/customer";
import { Empty, Notice } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import type { Dict } from "@/lib/i18n/dict";

export const metadata: Metadata = { title: "My bookings" };

const statusTone: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800",
  confirmed: "bg-emerald-50 text-emerald-700",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-slate-100 text-slate-500",
  rejected: "bg-red-50 text-red-700",
  no_show: "bg-red-50 text-red-700",
  waiting: "bg-amber-50 text-amber-800",
  called: "bg-saffron-400/30 text-amber-900",
  served: "bg-slate-100 text-slate-700",
  left: "bg-slate-100 text-slate-500",
};

function ReviewForm({ kind, id, t }: { kind: "booking" | "queue"; id: number; t: Dict }) {
  return (
    <details className="mt-3 rounded-xl bg-slate-50 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-brand-700">★ {t.rateVisit}</summary>
      <form action={submitReview} className="mt-3 space-y-3">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <fieldset>
          <legend className="label">{t.yourRating}</legend>
          <div className="flex gap-2" dir="ltr">
            {[1, 2, 3, 4, 5].map((n) => (
              <label
                key={n}
                className="num cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm has-[:checked]:border-saffron-500 has-[:checked]:bg-saffron-400 has-[:checked]:font-bold"
              >
                <input type="radio" name="rating" value={n} required className="sr-only" />
                {n}★
              </label>
            ))}
          </div>
        </fieldset>
        <textarea name="comment" rows={2} maxLength={1000} placeholder={t.commentOptional} className="input" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="anonymous" className="accent-brand-700" /> {t.postAnonymously}
        </label>
        <SubmitButton className="btn-primary btn-sm">{t.submit}</SubmitButton>
      </form>
    </details>
  );
}

export default async function BookingsPage({ searchParams }: PageProps<"/bookings">) {
  const user = await requireUser("/bookings");
  const { t, lang } = await getDict();
  const sp = await searchParams;

  const [bookings, tickets, myReviews] = await Promise.all([
    db
      .select({ booking: schema.bookings, salon: schema.salons, serviceName: schema.services.name, staffName: schema.staff.name })
      .from(schema.bookings)
      .innerJoin(schema.salons, eq(schema.salons.id, schema.bookings.salonId))
      .innerJoin(schema.services, eq(schema.services.id, schema.bookings.serviceId))
      .leftJoin(schema.staff, eq(schema.staff.id, schema.bookings.staffId))
      .where(eq(schema.bookings.userId, user.id))
      .orderBy(desc(schema.bookings.startsAt))
      .limit(50),
    db
      .select({ entry: schema.queueEntries, salon: schema.salons, serviceName: schema.services.name })
      .from(schema.queueEntries)
      .innerJoin(schema.salons, eq(schema.salons.id, schema.queueEntries.salonId))
      .leftJoin(schema.services, eq(schema.services.id, schema.queueEntries.serviceId))
      .where(eq(schema.queueEntries.userId, user.id))
      .orderBy(desc(schema.queueEntries.joinedAt))
      .limit(20),
    db
      .select({ bookingId: schema.reviews.bookingId, queueEntryId: schema.reviews.queueEntryId })
      .from(schema.reviews)
      .where(eq(schema.reviews.userId, user.id)),
  ]);
  const reviewedBookings = new Set(myReviews.map((r) => r.bookingId));
  const reviewedTickets = new Set(myReviews.map((r) => r.queueEntryId));

  const now = new Date();
  const upcoming = bookings
    .filter((b) => b.booking.endsAt >= now && ["pending", "confirmed"].includes(b.booking.status))
    .reverse();
  const past = bookings.filter((b) => !upcoming.includes(b));
  const activeTickets = tickets.filter((q) => ["waiting", "called"].includes(q.entry.status));
  const pastTickets = tickets.filter((q) => !activeTickets.includes(q));

  const BookingItem = ({ b }: { b: (typeof bookings)[number] }) => (
    <li className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/s/${b.salon.slug}`} className="font-semibold hover:text-brand-700">
            {b.salon.name}
          </Link>
          <p className="text-sm text-slate-600">
            {b.serviceName}
            {b.staffName ? ` · ${b.staffName}` : ""}
          </p>
          <p className="num text-sm font-medium">
            {formatDate(b.booking.startsAt, lang)} · {formatTime(b.booking.startsAt, lang)}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone[b.booking.status]}`}>
          {t[`status_${b.booking.status}` as const]}
        </span>
      </div>
      {["pending", "confirmed"].includes(b.booking.status) && b.booking.startsAt > now && (
        <form action={cancelBooking} className="mt-3">
          <input type="hidden" name="id" value={b.booking.id} />
          <SubmitButton className="btn-danger btn-sm" confirm={`${t.cancel}?`}>
            {t.cancel}
          </SubmitButton>
        </form>
      )}
      {b.booking.status === "completed" &&
        (reviewedBookings.has(b.booking.id) ? (
          <p className="mt-2 text-xs text-slate-500">✓ {t.thanksReview}</p>
        ) : (
          <ReviewForm kind="booking" id={b.booking.id} t={t} />
        ))}
      {["completed", "cancelled", "rejected"].includes(b.booking.status) && b.salon.mode !== "queue" && (
        <Link href={`/s/${b.salon.slug}/book?service=${b.booking.serviceId}`} className="mt-2 inline-block text-sm font-semibold text-brand-700">
          ↻ {t.bookAgain}
        </Link>
      )}
    </li>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">{t.navBookings}</h1>
      {sp.new && <Notice tone="success">{t.bookingRequested}</Notice>}

      {activeTickets.length > 0 && (
        <section>
          <h2 className="section-title">{t.queueTickets}</h2>
          <ul className="space-y-3">
            {activeTickets.map((q) => (
              <li key={q.entry.id}>
                <Link href={`/q/${q.entry.id}`} className="card flex items-center justify-between p-4 hover:border-brand-500">
                  <span>
                    <span className="font-semibold">{q.salon.name}</span>
                    <span className="block text-sm text-slate-600">{q.serviceName}</span>
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone[q.entry.status]}`}>
                    {t[`q_${q.entry.status}` as const]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="section-title">{t.upcoming}</h2>
        {upcoming.length === 0 ? (
          <Empty>
            {t.noBookings}{" "}
            <Link href="/salons" className="font-semibold text-brand-700">
              {t.browseAll}
            </Link>
          </Empty>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((b) => (
              <BookingItem key={b.booking.id} b={b} />
            ))}
          </ul>
        )}
      </section>

      {(past.length > 0 || pastTickets.length > 0) && (
        <section>
          <h2 className="section-title">{t.past}</h2>
          <ul className="space-y-3">
            {past.map((b) => (
              <BookingItem key={b.booking.id} b={b} />
            ))}
            {pastTickets.map((q) => (
              <li key={`q${q.entry.id}`} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/s/${q.salon.slug}`} className="font-semibold hover:text-brand-700">
                      {q.salon.name}
                    </Link>
                    <p className="text-sm text-slate-600">
                      {t.queue} · {q.serviceName}
                    </p>
                    <p className="num text-sm">{formatDate(q.entry.joinedAt, lang)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone[q.entry.status]}`}>
                    {t[`q_${q.entry.status}` as const]}
                  </span>
                </div>
                {q.entry.status === "served" &&
                  (reviewedTickets.has(q.entry.id) ? (
                    <p className="mt-2 text-xs text-slate-500">✓ {t.thanksReview}</p>
                  ) : (
                    <ReviewForm kind="queue" id={q.entry.id} t={t} />
                  ))}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
