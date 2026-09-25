import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { AccountMenu, BottomNav } from "../shared/nav";
import type { NavItem, ShellViewer } from "../shared/types";

/** Baari Business header: dark, clearly labelled. Shown on every /business page. */
export async function BusinessHeader({ viewer }: { viewer: ShellViewer }) {
  const { t } = await getDict();
  return (
    <header className="sticky top-0 z-30 bg-zinc-900 text-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2">
        <Link href="/business" className="flex min-h-11 items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400 text-lg font-black text-zinc-900">ب</span>
          <span className="leading-tight">
            <span className="block text-lg font-extrabold">{t.appName}</span>
            <span className="block text-xs font-bold uppercase tracking-wider text-amber-300">{t.business}</span>
          </span>
        </Link>
        <AccountMenu viewer={viewer} current="business" dark />
      </div>
    </header>
  );
}

/** Today · Bookings · Queue · My Salon for one salon. */
export async function BusinessNav({ salonId }: { salonId: number }) {
  const { t } = await getDict();
  const base = `/business/${salonId}`;
  const items: NavItem[] = [
    { href: base, label: t.navToday, icon: "sun" },
    { href: `${base}/bookings`, label: t.navBookings, icon: "calendar", match: [`${base}/bookings`] },
    { href: `${base}/queue`, label: t.navQueue, icon: "list", match: [`${base}/queue`] },
    { href: `${base}/salon`, label: t.mySalon, icon: "store", match: [`${base}/salon`] },
  ];
  return <BottomNav items={items} experience="business" label={`${t.appName} ${t.business}`} />;
}
