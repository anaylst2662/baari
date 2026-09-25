import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireSalonAccess } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { formatHHMM, localNow } from "@/lib/time";
import { CameraIcon, ClipboardIcon, ClockIcon, StarIcon, TagIcon, UsersIcon } from "@/components/icons";

/** Baari Business → My Salon: everything about the salon, one tap away. */
export default async function MySalon({ params }: PageProps<"/business/[id]/salon">) {
  const { id } = await params;
  const { salon } = await requireSalonAccess(Number(id));
  const { t, lang } = await getDict();
  const [[svc], [stf]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.services).where(and(eq(schema.services.salonId, salon.id), eq(schema.services.active, true))),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.staff).where(and(eq(schema.staff.salonId, salon.id), eq(schema.staff.active, true))),
  ]);
  const todayHours = salon.hours[localNow().dow];
  const base = `/business/${salon.id}/salon`;
  const sections = [
    { href: `${base}/services`, icon: TagIcon, title: t.navPrices, info: `${svc.n} ${t.servicesCount}` },
    { href: `${base}/staff`, icon: UsersIcon, title: t.staff, info: `${stf.n} ${t.peopleCount}` },
    {
      href: `${base}/hours`,
      icon: ClockIcon,
      title: t.hours,
      info: `${t.today}: ${todayHours ? `${formatHHMM(todayHours.open, lang)} – ${formatHHMM(todayHours.close, lang)}` : t.closedDay}`,
    },
    { href: `${base}/photos`, icon: CameraIcon, title: t.photos, info: `${salon.photos.length} ${t.photosCount}` },
    {
      href: `${base}/reviews`,
      icon: ({ className }: { className?: string }) => <StarIcon filled={false} className={className} />,
      title: t.reviews,
      info: salon.ratingCount ? `★ ${salon.ratingAvg.toFixed(1)} · ${salon.ratingCount}` : t.noReviews,
    },
    { href: `${base}/details`, icon: ClipboardIcon, title: t.salonDetails, info: `${salon.address}` },
  ];
  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-extrabold">{t.mySalon}</h2>
      <ul className="grid gap-2">
        {sections.map(({ href, icon: Icon, title, info }) => (
          <li key={href}>
            <Link href={href} className="card flex min-h-16 items-center gap-3 p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-zinc-900 text-amber-300">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{title}</span>
                <span className="block truncate text-sm text-zinc-500">{info}</span>
              </span>
              <span className="text-zinc-400 rtl:rotate-180">→</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href={`/s/${salon.slug}`} className="btn-secondary w-full">
        👁 {t.viewPublicPage}
      </Link>
    </div>
  );
}
