"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { useI18n } from "@/lib/i18n/client";
import { logout, setLanguage } from "@/app/actions";
import {
  CalendarIcon,
  ChartIcon,
  GlobeIcon,
  HomeIcon,
  ListIcon,
  LogoutIcon,
  MoreIcon,
  SearchIcon,
  StarIcon,
  StoreIcon,
  SunIcon,
  UserIcon,
  UsersIcon,
} from "@/components/icons";
import type { Experience, IconName, NavItem, ShellViewer } from "./types";

const ICONS: Record<IconName, (p: { className?: string }) => React.ReactNode> = {
  home: HomeIcon,
  search: SearchIcon,
  calendar: CalendarIcon,
  user: UserIcon,
  sun: SunIcon,
  list: ListIcon,
  store: StoreIcon,
  chart: ChartIcon,
  users: UsersIcon,
  star: ({ className }) => <StarIcon filled={false} className={className} />,
  more: MoreIcon,
};

function isActive(item: NavItem, path: string) {
  return path === item.href || (item.match ?? []).some((m) => path === m || path.startsWith(m.endsWith("/") ? m : `${m}/`));
}

type Theme = { bar: string; active: string; idle: string };
export const NAV_THEMES: Record<Experience, Theme> = {
  customer: { bar: "bg-white/95 border-slate-200", active: "text-brand-800 bg-brand-50", idle: "text-slate-500 hover:text-slate-900" },
  business: { bar: "bg-zinc-900 border-zinc-800", active: "text-amber-300 bg-white/10", idle: "text-zinc-400 hover:text-white" },
  admin: { bar: "bg-white/95 border-slate-200", active: "text-blue-900 bg-blue-50", idle: "text-slate-500 hover:text-slate-900" },
};

/** Bottom menu for phones: big icons with labels, at least 56px tall. */
export function BottomNav({ items, experience, label, className = "" }: { items: NavItem[]; experience: Experience; label: string; className?: string }) {
  const path = usePathname();
  const theme = NAV_THEMES[experience];
  return (
    <nav
      aria-label={label}
      className={`fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur ${theme.bar} ${className}`}
    >
      <ul className="mx-auto grid max-w-3xl" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const on = isActive(item, path);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={`m-1 flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-center text-xs font-semibold leading-tight ${on ? theme.active : theme.idle}`}
              >
                <Icon className="h-6 w-6" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Left-hand menu for wide screens (used by Admin). */
export function SideNav({ items, label }: { items: NavItem[]; label: string }) {
  const path = usePathname();
  return (
    <nav aria-label={label} className="sticky top-20 hidden self-start md:block">
      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const on = isActive(item, path);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${on ? "bg-blue-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function LanguageButton({ className = "" }: { className?: string }) {
  const { lang, t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => setLanguage(lang === "en" ? "ur" : "en"))}
      className={`inline-flex min-h-11 items-center gap-2 ${className}`}
      aria-label={t.switchLanguage}
    >
      <GlobeIcon className="h-5 w-5" />
      {lang === "en" ? "اردو" : "English"}
    </button>
  );
}

/**
 * The round avatar button in every header. Holds the person's details, language,
 * the "Switch to" list (only experiences they can use — normal customers never see
 * it) and log out. Guests get a "Log in" button instead.
 */
export function AccountMenu({ viewer, current, dark = false }: { viewer: ShellViewer; current: Experience; dark?: boolean }) {
  const { t } = useI18n();
  const path = usePathname();
  if (!viewer) {
    return (
      <Link href={`/login?next=${encodeURIComponent(path)}`} className={`btn btn-sm min-h-11 ${dark ? "bg-white text-slate-900" : "btn-primary"}`}>
        {t.login}
      </Link>
    );
  }
  const options = (
    [
      { key: "customer", href: "/", label: t.customerApp, allowed: true },
      { key: "business", href: "/business", label: t.mySalon, allowed: viewer.access.business },
      { key: "admin", href: "/admin", label: t.adminTitle, allowed: viewer.access.admin },
    ] as const
  ).filter((o) => o.allowed);
  const initial = (viewer.name ?? "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <details className="group relative">
      <summary
        className={`grid h-11 w-11 cursor-pointer list-none place-items-center rounded-full text-base font-bold ring-2 ${dark ? "bg-white text-slate-900 ring-white/30" : "bg-brand-700 text-white ring-brand-100"}`}
        aria-label={t.accountMenu}
      >
        {initial}
      </summary>
      <div className="absolute end-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 text-slate-800 shadow-xl">
        <div className="px-3 py-2">
          <p className="font-semibold">{viewer.name ?? "—"}</p>
          <p className="num text-sm text-slate-500" dir="ltr">
            {viewer.phone.replace(/^\+92/, "0")}
          </p>
        </div>
        {options.length > 1 && (
          <div className="border-t border-slate-100 py-2">
            <p className="px-3 pb-1 text-xs font-bold uppercase tracking-wide text-slate-400">{t.switchTo}</p>
            {options.map((o) => (
              <Link
                key={o.key}
                href={o.href}
                aria-current={o.key === current ? "true" : undefined}
                className={`flex min-h-11 items-center justify-between rounded-xl px-3 text-sm font-semibold ${o.key === current ? "bg-slate-100 text-slate-900" : "hover:bg-slate-50"}`}
              >
                {o.label}
                {o.key === current && <span className="text-xs font-bold text-emerald-600">✓ {t.youAreHere}</span>}
              </Link>
            ))}
          </div>
        )}
        <div className="border-t border-slate-100 pt-2">
          <LanguageButton className="w-full rounded-xl px-3 text-sm font-semibold hover:bg-slate-50" />
          <form action={logout}>
            <button className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-red-700 hover:bg-red-50">
              <LogoutIcon className="h-5 w-5" /> {t.logout}
            </button>
          </form>
        </div>
      </div>
    </details>
  );
}
