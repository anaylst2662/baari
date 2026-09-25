import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireSalonAccess } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { Notice } from "@/components/ui";
import { PartnerTabs } from "./tabs";

export default async function PartnerLayout({ children, params }: LayoutProps<"/partner/[id]">) {
  const { id } = await params;
  const { user, salon } = await requireSalonAccess(Number(id));
  const { t } = await getDict();
  const mine = await db
    .select({ id: schema.salons.id, name: schema.salons.name })
    .from(schema.salons)
    .where(eq(schema.salons.ownerId, user.id))
    .orderBy(asc(schema.salons.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t.partnerTitle}</p>
          <h1 className="text-xl font-extrabold">{salon.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {mine.length > 1 && (
            <details className="relative">
              <summary className="chip cursor-pointer list-none">{t.switchSalon} ▾</summary>
              <ul className="card absolute end-0 z-20 mt-1 w-56 p-1">
                {mine.map((s) => (
                  <li key={s.id}>
                    <Link href={`/partner/${s.id}`} className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50">
                      {s.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/partner/new" className="block rounded-lg px-3 py-2 text-sm text-brand-700 hover:bg-slate-50">
                    + {t.registerSalon}
                  </Link>
                </li>
              </ul>
            </details>
          )}
          <Link href={`/s/${salon.slug}`} className="chip">
            ↗
          </Link>
        </div>
      </div>
      {salon.status === "pending" && <Notice tone="warn">{t.pendingApproval}</Notice>}
      {salon.status === "rejected" && <Notice tone="error">{t.rejectedNote}</Notice>}
      <PartnerTabs
        base={`/partner/${salon.id}`}
        labels={{ queue: t.queue, bookings: t.bookings, services: t.services, staff: t.staff, profile: t.profile }}
        showQueue={salon.mode !== "booking"}
        showBookings={salon.mode !== "queue"}
      />
      {children}
    </div>
  );
}
