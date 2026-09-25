"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PartnerTabs({
  base,
  labels,
  showQueue,
  showBookings,
}: {
  base: string;
  labels: Record<"queue" | "bookings" | "services" | "staff" | "profile", string>;
  showQueue: boolean;
  showBookings: boolean;
}) {
  const path = usePathname();
  const tabs = [
    { href: base, label: showQueue ? labels.queue : "⌂" },
    ...(showBookings ? [{ href: `${base}/bookings`, label: labels.bookings }] : []),
    { href: `${base}/services`, label: labels.services },
    { href: `${base}/staff`, label: labels.staff },
    { href: `${base}/profile`, label: labels.profile },
  ];
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-slate-200 px-4">
      {tabs.map((tab) => {
        const active = path === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-semibold ${active ? "border-brand-700 text-brand-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
