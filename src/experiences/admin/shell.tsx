import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { AccountMenu, BottomNav, SideNav } from "../shared/nav";
import type { NavItem, ShellViewer } from "../shared/types";

/** Admin: navy header with an "Admin" badge; side menu on desktop, bottom menu on phones. */
export async function AdminShell({ viewer, children }: { viewer: ShellViewer; children: React.ReactNode }) {
  const { t } = await getDict();
  const items: NavItem[] = [
    { href: "/admin", label: t.navOverview, icon: "chart" },
    { href: "/admin/salons", label: t.navSalons, icon: "store", match: ["/admin/salons"] },
    { href: "/admin/users", label: t.users, icon: "users", match: ["/admin/users"] },
    { href: "/admin/reviews", label: t.reviews, icon: "star", match: ["/admin/reviews"] },
    { href: "/admin/more", label: t.navMore, icon: "more", match: ["/admin/more", "/admin/messages", "/admin/settings"] },
  ];
  return (
    <div data-experience="admin" className="min-h-dvh bg-slate-100">
      <header className="sticky top-0 z-30 bg-blue-950 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
          <Link href="/admin" className="flex min-h-11 items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-lg font-black text-blue-950">ب</span>
            <span className="text-lg font-extrabold">{t.appName}</span>
            <span className="rounded-md bg-amber-400 px-2 py-0.5 text-xs font-extrabold uppercase tracking-wider text-blue-950">
              {t.adminTitle}
            </span>
          </Link>
          <AccountMenu viewer={viewer} current="admin" dark />
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-28 pt-4 md:grid-cols-[220px_minmax(0,1fr)] md:pb-10">
        <SideNav items={items} label={t.adminTitle} />
        <main className="min-w-0">{children}</main>
      </div>
      <BottomNav items={items} experience="admin" label={t.adminTitle} className="md:hidden" />
    </div>
  );
}
