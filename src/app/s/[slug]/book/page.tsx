import Link from "next/link";
import { redirect } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import { requireUser } from "@/lib/auth";
import { getSalonBySlug, getServices, getStaff } from "@/lib/data";
import { addDays, formatDate, localNow } from "@/lib/time";
import { BookingForm } from "./booking-form";

export default async function BookPage({ params, searchParams }: PageProps<"/s/[slug]/book">) {
  const { slug } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/s/${slug}/book`);
  const { t, lang } = await getDict();
  const salon = await getSalonBySlug(slug, user);
  if (salon.mode === "queue") redirect(`/s/${slug}`);
  const [services, staff] = await Promise.all([getServices(salon.id), getStaff(salon.id)]);

  const today = localNow().date;
  const dates = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(today, i);
    return { date, label: i === 0 ? t.today : i === 1 ? t.tomorrow : formatDate(date, lang) };
  });
  const preselect = Number(sp.service) || undefined;

  return (
    <div className="space-y-4">
      <Link href={`/s/${slug}`} className="text-sm text-brand-700">
        ← {salon.name}
      </Link>
      <h1 className="text-2xl font-extrabold">{t.bookAppointment}</h1>
      <BookingForm
        salonId={salon.id}
        services={services.map((s) => ({ id: s.id, name: s.name, price: s.price, durationMin: s.durationMin }))}
        staff={staff.map((s) => ({ id: s.id, name: s.name }))}
        dates={dates}
        initialServiceId={services.some((s) => s.id === preselect) ? preselect : services[0]?.id}
      />
    </div>
  );
}
