import Link from "next/link";
import { requireSalonAccess } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { isAdmin, ownedSalons } from "@/lib/roles";
import { Notice } from "@/components/ui";

export default async function PartnerLayout({ children, params }: LayoutProps<"/partner/[id]">) {
  const { id } = await params;
  const { user, salon } = await requireSalonAccess(Number(id));
  const { t } = await getDict();
  const mine = await ownedSalons(user.id);
  const viewingAsAdmin = salon.ownerId !== user.id && isAdmin(user);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold">{salon.name}</h1>
          <p className="text-sm text-slate-500">
            {salon.area}, {salon.city}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mine.length > 1 && (
            <details className="relative">
              <summary className="chip min-h-10 cursor-pointer list-none">{t.switchSalon} ▾</summary>
              <ul className="card absolute end-0 z-20 mt-1 w-60 p-1">
                {mine.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/partner/${s.id}`}
                      className={`block rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50 ${s.id === salon.id ? "font-bold text-brand-800" : ""}`}
                    >
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <Link href={`/s/${salon.slug}`} className="chip min-h-10">
            👁 {t.viewPublicPage}
          </Link>
        </div>
      </div>
      {viewingAsAdmin && <Notice tone="info">🛡️ {t.viewingAsAdmin}</Notice>}
      {salon.status === "pending" && <Notice tone="warn">{t.pendingApproval}</Notice>}
      {salon.status === "rejected" && <Notice tone="error">{t.rejectedNote}</Notice>}
      {children}
    </div>
  );
}
