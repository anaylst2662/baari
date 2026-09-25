import Link from "next/link";
import { requireSalonAccess } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { ownedSalons } from "@/lib/roles";
import { BusinessNav } from "@/experiences/business/shell";

/** One salon's Baari Business pages. Only its owner or an admin gets past requireSalonAccess. */
export default async function SalonBusinessLayout({ children, params }: LayoutProps<"/business/[id]">) {
  const { id } = await params;
  const { user, salon, viewingAsAdmin } = await requireSalonAccess(Number(id));
  const { t } = await getDict();
  const mine = viewingAsAdmin ? [] : await ownedSalons(user.id);

  return (
    <>
      {viewingAsAdmin && (
        <div className="-mx-4 -mt-4 mb-4 flex flex-wrap items-center justify-between gap-2 bg-blue-600 px-4 py-2 text-white">
          <span className="font-semibold">🛡️ {t.viewingAsAdmin}</span>
          <Link href="/admin/salons" className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-bold text-blue-700">
            ← {t.backToAdmin}
          </Link>
        </div>
      )}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold">{salon.name}</h1>
          <p className="truncate text-sm text-zinc-500">
            {salon.area}, {salon.city}
          </p>
        </div>
        {mine.length > 1 && (
          <details className="relative shrink-0">
            <summary className="chip cursor-pointer list-none">{t.switchSalon} ▾</summary>
            <ul className="card absolute end-0 z-20 mt-1 w-64 p-1">
              {mine.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/business/${s.id}`}
                    className={`flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-slate-50 ${s.id === salon.id ? "font-bold text-brand-800" : ""}`}
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
      {children}
      <BusinessNav salonId={salon.id} />
    </>
  );
}
