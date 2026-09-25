import Link from "next/link";
import type { Salon } from "@/db/schema";
import type { Dict } from "@/lib/i18n/dict";

/** For salons that take both walk-ins and appointments: a big two-way switch between them. */
export function WorkSwitch({ salonId, mode, active, t }: { salonId: number; mode: Salon["mode"]; active: "queue" | "bookings"; t: Dict }) {
  if (mode !== "both") return null;
  const tab = (on: boolean) =>
    `flex-1 rounded-lg py-2.5 text-center text-sm font-bold ${on ? "bg-brand-700 text-white shadow" : "text-slate-600 hover:text-slate-900"}`;
  return (
    <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
      <Link href={`/partner/${salonId}/queue`} className={tab(active === "queue")} aria-current={active === "queue" ? "page" : undefined}>
        {t.navQueue}
      </Link>
      <Link href={`/partner/${salonId}/bookings`} className={tab(active === "bookings")} aria-current={active === "bookings" ? "page" : undefined}>
        {t.navBookingsOnly}
      </Link>
    </div>
  );
}
