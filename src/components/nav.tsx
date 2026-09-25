"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import type { Salon } from "@/db/schema";
import type { Dict } from "@/lib/i18n/dict";
import { useI18n } from "@/lib/i18n/client";
import { logout, setLanguage } from "@/app/actions";
import {
  CalendarIcon,
  ChartIcon,
  GlobeIcon,
  HomeIcon,
  ListIcon,
  MessageIcon,
  SearchIcon,
  SettingsIcon,
  StarIcon,
  StoreIcon,
  TagIcon,
  UserIcon,
} from "./icons";

/** What the navigation needs to know about the logged-in person (computed on the server). */
export type NavViewer = {
  name: string | null;
  phone: string;
  admin: boolean;
  salons: { id: number; name: string; mode: Salon["mode"] }[];
} | null;

type Mode = { kind: "customer" } | { kind: "salon"; salonId: number } | { kind: "admin" };

/**
 * Picks which menu to show. Admins see the admin menu, salon owners see their salon
 * tools, and everyone else sees the customer menu. An admin who owns a salon (or
 * opens one from the admin area) gets the salon menu while on salon pages.
 */
function modeFor(viewer: NavViewer, path: string): Mode {
  const salonMatch = path.match(/^\/partner\/(\d+)/);
  if (viewer && salonMatch) {
    const salonId = Number(salonMatch[1]);
    if (viewer.admin || viewer.salons.some((s) => s.id === salonId)) return { kind: "salon", salonId };
  }
  if (viewer?.admin) return { kind: "admin" };
  if (viewer && viewer.salons.length > 0) return { kind: "salon", salonId: viewer.salons[0].id };
  return { kind: "customer" };
}

function homeOf(mode: Mode) {
  return mode.kind === "admin" ? "/admin" : mode.kind === "salon" ? `/partner/${mode.salonId}` : "/";
}

type Item = { href: string; label: string; icon: (p: { className?: string }) => React.ReactNode; active: (p: string) => boolean };

function itemsFor(mode: Mode, viewer: NavViewer, t: Dict): Item[] {
  if (mode.kind === "admin") {
    return [
      { href: "/admin", label: t.navOverview, icon: ChartIcon, active: (p) => p === "/admin" },
      { href: "/admin/salons", label: t.navSalons, icon: StoreIcon, active: (p) => p.startsWith("/admin/salons") },
      { href: "/admin/reviews", label: t.reviews, icon: ({ className }) => <StarIcon filled={false} className={className} />, active: (p) => p.startsWith("/admin/reviews") },
      { href: "/admin/messages", label: t.navMessages, icon: MessageIcon, active: (p) => p.startsWith("/admin/messages") },
    ];
  }
  if (mode.kind === "salon") {
    const base = `/partner/${mode.salonId}`;
    const salonMode = viewer?.salons.find((s) => s.id === mode.salonId)?.mode;
    const work =
      salonMode === "queue"
        ? { href: `${base}/queue`, label: t.navQueue }
        : salonMode === "booking"
          ? { href: `${base}/bookings`, label: t.navBookingsOnly }
          : { href: `${base}/queue`, label: t.navQueueBookings };
    return [
      { href: base, label: t.navDashboard, icon: HomeIcon, active: (p) => p === base },
      { ...work, icon: ListIcon, active: (p) => p === `${base}/queue` || p === `${base}/bookings` },
      { href: `${base}/services`, label: t.navPrices, icon: TagIcon, active: (p) => p === `${base}/services` },
      { href: `${base}/settings`, label: t.navSettings, icon: SettingsIcon, active: (p) => p === `${base}/settings` },
    ];
  }
  return [
    { href: "/", label: t.navHome, icon: HomeIcon, active: (p) => p === "/" },
    { href: "/salons", label: t.navFind, icon: SearchIcon, active: (p) => p.startsWith("/salons") || p.startsWith("/s/") },
    { href: "/bookings", label: t.navBookings, icon: CalendarIcon, active: (p) => p.startsWith("/bookings") || p.startsWith("/q/") },
    {
      href: viewer ? "/account" : "/login?next=/account",
      label: t.navProfile,
      icon: UserIcon,
      active: (p) => p.startsWith("/account") || p.startsWith("/login"),
    },
  ];
}

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { lang } = useI18n();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => setLanguage(lang === "en" ? "ur" : "en"))}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-current/20 px-3 text-sm"
      aria-label="Switch language / زبان تبدیل کریں"
    >
      <GlobeIcon className="h-4 w-4" />
      {compact ? (lang === "en" ? "اردو" : "EN") : lang === "en" ? "اردو" : "English"}
    </button>
  );
}

/** Two big buttons so an admin who also owns a salon can jump between the two areas. */
function AreaSwitch({ viewer, mode }: { viewer: NonNullable<NavViewer>; mode: Mode }) {
  const { t } = useI18n();
  const salonId = mode.kind === "salon" ? mode.salonId : viewer.salons[0]?.id;
  if (!salonId) return null;
  const tab = (active: boolean) =>
    `flex-1 rounded-lg px-3 py-1.5 text-center text-sm font-semibold ${active ? "bg-white text-slate-900 shadow" : "text-white/80 hover:text-white"}`;
  return (
    <div className="mx-auto flex max-w-3xl px-4 pb-2">
      <div className="flex w-full gap-1 rounded-xl bg-black/25 p-1" role="tablist">
        <Link href="/admin" role="tab" aria-selected={mode.kind === "admin"} className={tab(mode.kind === "admin")}>
          🛡️ {t.modeAdmin}
        </Link>
        <Link href={`/partner/${salonId}`} role="tab" aria-selected={mode.kind === "salon"} className={tab(mode.kind === "salon")}>
          💈 {t.modeSalon}
        </Link>
      </div>
    </div>
  );
}

function AccountMenu({ viewer }: { viewer: NonNullable<NavViewer> }) {
  const { t } = useI18n();
  const initial = (viewer.name ?? "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <details className="relative">
      <summary
        className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-full bg-white/90 text-sm font-bold text-slate-800 ring-1 ring-black/10"
        aria-label={t.navAccount}
      >
        {initial}
      </summary>
      <div className="card absolute end-0 z-40 mt-2 w-60 p-3 text-slate-800">
        <p className="text-xs text-slate-500">{t.signedInAs}</p>
        <p className="font-semibold">{viewer.name ?? "—"}</p>
        <p className="num text-sm text-slate-500" dir="ltr">
          {viewer.phone.replace(/^\+92/, "0")}
        </p>
        <form action={logout} className="mt-3">
          <button className="btn-secondary w-full">{t.logout}</button>
        </form>
      </div>
    </details>
  );
}

export function Header({ viewer }: { viewer: NavViewer }) {
  const { t } = useI18n();
  const path = usePathname();
  const mode = modeFor(viewer, path);
  const theme =
    mode.kind === "admin"
      ? "bg-slate-900 text-white border-slate-900"
      : mode.kind === "salon"
        ? "bg-brand-800 text-white border-brand-800"
        : "bg-white/90 text-slate-800 border-slate-200 backdrop-blur";
  const badge = mode.kind === "admin" ? `🛡️ ${t.adminArea}` : mode.kind === "salon" ? `💈 ${t.salonArea}` : null;
  const showSwitch = viewer?.admin && (viewer.salons.length > 0 || mode.kind === "salon");

  return (
    <header className={`sticky top-0 z-30 border-b ${theme}`}>
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-2.5">
        <Link href={homeOf(mode)} className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-700 text-lg font-black text-white ring-1 ring-white/20">
            ب
          </span>
          <span className={`text-xl font-extrabold tracking-tight ${mode.kind === "customer" ? "text-brand-800" : ""}`}>{t.appName}</span>
          {badge && (
            <span className="truncate rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide">{badge}</span>
          )}
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageToggle compact />
          {viewer ? (
            <AccountMenu viewer={viewer} />
          ) : (
            <Link href="/login" className="btn-primary btn-sm min-h-9">
              {t.login}
            </Link>
          )}
        </div>
      </div>
      {showSwitch && <AreaSwitch viewer={viewer!} mode={mode} />}
    </header>
  );
}

export function BottomNav({ viewer }: { viewer: NavViewer }) {
  const { t } = useI18n();
  const path = usePathname();
  const mode = modeFor(viewer, path);
  const items = itemsFor(mode, viewer, t);
  return (
    <nav
      aria-label={mode.kind === "admin" ? t.adminArea : mode.kind === "salon" ? t.salonArea : t.appName}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-3xl grid-cols-4">
        {items.map(({ href, label, icon: Icon, active }) => {
          const on = active(path);
          const accent = mode.kind === "admin" ? "text-slate-900 bg-slate-100" : "text-brand-800 bg-brand-50";
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={`mx-1 my-1 flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-center text-xs font-semibold leading-tight ${on ? accent : "text-slate-500 hover:text-slate-800"}`}
              >
                <Icon className="h-6 w-6" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
