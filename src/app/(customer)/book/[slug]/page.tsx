import Link from "next/link";
import type { Metadata } from "next";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { getDict } from "@/lib/i18n/server";
import { requireUser } from "@/lib/auth";
import { getSalonBySlug, getServices, getStaff } from "@/lib/data";
import { addDays, formatDate, formatTime, localNow } from "@/lib/time";
import { Empty, Notice } from "@/components/ui";
import { BackIcon } from "@/components/icons";
import { BookingWizard } from "./booking-form";

export const metadata: Metadata = { title: "Book" };

/** Customer app → Book: service, stylist, date & time, confirm. Login is asked for here. */
export default async function BookPage({ params, searchParams }: PageProps<"/book/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/book/${slug}${typeof sp.reschedule === "string" ? `?reschedule=${sp.reschedule}` : ""}`);
  const { t, lang } = await getDict();
  const salon = await getSalonBySlug(slug, user);
  const [services, staff] = await Promise.all([getServices(salon.id), getStaff(salon.id)]);

  // Rescheduling one of this customer's own bookings at this salon.
  const rescheduleId = Number(sp.reschedule) || undefined;
  const [old] = rescheduleId
    ? await db
        .select()
        .from(schema.bookings)
        .where(
          and(
            eq(schema.bookings.id, rescheduleId),
            eq(schema.bookings.userId, user.id),
            eq(schema.bookings.salonId, salon.id),
            inArray(schema.bookings.status, ["pending", "confirmed"]),
          ),
        )
    : [];

  const today = localNow().date;
  const dates = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(today, i);
    return { date, label: i === 0 ? t.today : i === 1 ? t.tomorrow : formatDate(date, lang) };
  });
  const preselect = old?.serviceId ?? (Number(sp.service) || undefined);

  return (
    <div className="space-y-4">
      <Link href={`/s/${slug}`} className="-ms-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-brand-700">
        <BackIcon className="h-5 w-5 rtl:rotate-180" /> {salon.name}
      </Link>
      <h1 className="text-2xl font-extrabold">{old ? t.changeBooking : t.bookAppointment}</h1>
      {old && (
        <Notice tone="info">
          {t.changingFrom} <span className="num font-semibold">{formatDate(old.startsAt, lang)} · {formatTime(old.startsAt, lang)}</span>
        </Notice>
      )}
      {salon.mode === "queue" ? (
        <Empty>{t.walkInOnlyNote}</Empty>
      ) : services.length === 0 ? (
        <Empty>{t.noServicesYet}</Empty>
      ) : (
        <BookingWizard
          salon={{ id: salon.id, name: salon.name, address: salon.address }}
          services={services.map((s) => ({ id: s.id, name: s.name, price: s.price, durationMin: s.durationMin }))}
          staff={staff.map((s) => ({ id: s.id, name: s.name }))}
          dates={dates}
          initialServiceId={services.some((s) => s.id === preselect) ? preselect : undefined}
          initialStaffId={old?.staffId ?? undefined}
          rescheduleId={old?.id}
        />
      )}
    </div>
  );
}
