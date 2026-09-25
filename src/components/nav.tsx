"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import type { User } from "@/db/schema";
import { useI18n } from "@/lib/i18n/client";
import { setLanguage } from "@/app/actions";
import { CalendarIcon, GlobeIcon, SearchIcon, ShieldIcon, StoreIcon, UserIcon } from "./icons";

export function LanguageToggle() {
  const { lang } = useI18n();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => setLanguage(lang === "en" ? "ur" : "en"))}
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
      aria-label="Switch language"
    >
      <GlobeIcon className="h-4 w-4" />
      {lang === "en" ? "اردو" : "English"}
    </button>
  );
}

export function Header({ user }: { user: User | null }) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-700 text-lg font-black text-white">ب</span>
          <span className="text-xl font-extrabold tracking-tight text-brand-800">{t.appName}</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          {!user && (
            <Link href="/login" className="btn-primary btn-sm">
              {t.login}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function BottomNav({ user }: { user: User | null }) {
  const { t } = useI18n();
  const path = usePathname();
  const items = [
    { href: "/", label: t.navExplore, icon: SearchIcon, match: (p: string) => p === "/" || p.startsWith("/salons") || p.startsWith("/s/") },
    { href: "/bookings", label: t.navBookings, icon: CalendarIcon, match: (p: string) => p.startsWith("/bookings") || p.startsWith("/q/") },
    { href: "/partner", label: t.navPartner, icon: StoreIcon, match: (p: string) => p.startsWith("/partner") },
    user?.role === "admin"
      ? { href: "/admin", label: t.navAdmin, icon: ShieldIcon, match: (p: string) => p.startsWith("/admin") }
      : { href: "/account", label: t.navAccount, icon: UserIcon, match: (p: string) => p.startsWith("/account") || p.startsWith("/login") },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-3xl grid-cols-4">
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match(path);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? "text-brand-700" : "text-slate-500 hover:text-slate-800"}`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
