import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { AccountMenu, BottomNav } from "../shared/nav";
import type { NavItem, ShellViewer } from "../shared/types";

/** Baari (customer app): light teal header and Home · Search · Bookings · Profile. */
export async function CustomerShell({ viewer, children }: { viewer: ShellViewer; children: React.ReactNode }) {
  const { t } = await getDict();
  const items: NavItem[] = [
    { href: "/", label: t.navHome, icon: "home" },
    { href: "/search", label: t.navSearch, icon: "search", match: ["/search", "/s/", "/book/"] },
    { href: "/bookings", label: t.navBookings, icon: "calendar", match: ["/bookings", "/q/"] },
    { href: "/profile", label: t.navProfile, icon: "user", match: ["/profile"] },
  ];
  return (
    <div data-experience="customer" className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2">
          <Link href="/" className="flex min-h-11 items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 text-lg font-black text-white">ب</span>
            <span className="text-xl font-extrabold tracking-tight text-brand-800">{t.appName}</span>
          </Link>
          <AccountMenu viewer={viewer} current="customer" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4">{children}</main>
      <BottomNav items={items} experience="customer" label={t.appName} />
    </div>
  );
}
