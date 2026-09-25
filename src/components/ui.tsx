import Link from "next/link";
import type { Salon } from "@/db/schema";
import type { Dict } from "@/lib/i18n/dict";
import type { SalonCard as SalonCardData } from "@/lib/salons";
import { ClockIcon, PinIcon, StarIcon, UsersIcon } from "./icons";

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={`inline-flex text-saffron-500 ${className ?? ""}`} aria-label={`${value} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} filled={value >= i - 0.25} className="h-4 w-4" />
      ))}
    </span>
  );
}

export function OpenBadge({ open, t }: { open: boolean; t: Dict }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${open ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${open ? "bg-emerald-500" : "bg-slate-400"}`} />
      {open ? t.open : t.closed}
    </span>
  );
}

export function typeLabel(type: Salon["type"], t: Dict) {
  return type === "men" ? t.forMen : type === "women" ? t.forWomen : t.unisex;
}

export function modeLabel(mode: Salon["mode"], t: Dict) {
  return mode === "queue" ? t.walkInShop : mode === "booking" ? t.appointmentsOnly : t.queueAndAppointments;
}

const gradients = [
  "from-brand-600 to-brand-900",
  "from-rose-500 to-fuchsia-700",
  "from-amber-500 to-orange-700",
  "from-sky-500 to-indigo-700",
  "from-emerald-500 to-teal-800",
];

/** Photo if the salon has one, otherwise a coloured monogram tile. */
export function SalonThumb({ salon, className }: { salon: Pick<Salon, "id" | "name" | "photos">; className?: string }) {
  const photo = salon.photos[0];
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" className={`object-cover ${className ?? ""}`} />;
  }
  const initials = salon.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div className={`grid place-items-center bg-gradient-to-br ${gradients[salon.id % gradients.length]} font-black text-white/90 ${className ?? ""}`}>
      {initials}
    </div>
  );
}

export function Price({ value, t }: { value: number; t: Dict }) {
  return (
    <span className="num whitespace-nowrap">
      {t.pkr} {value.toLocaleString("en-PK")}
    </span>
  );
}

export function SalonCard({ salon, t }: { salon: SalonCardData; t: Dict }) {
  return (
    <Link href={`/s/${salon.slug}`} className="card flex gap-3 p-3 transition hover:border-brand-500">
      <SalonThumb salon={salon} className="h-20 w-20 shrink-0 rounded-xl text-xl" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold text-slate-900">{salon.name}</h3>
          <OpenBadge open={salon.openNow} t={t} />
        </div>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
          <PinIcon className="h-3.5 w-3.5 shrink-0" />
          {salon.area}, {salon.city}
          {salon.distanceKm !== null && (
            <span className="num">
              {" "}
              · {salon.distanceKm.toFixed(1)} {t.kmAway}
            </span>
          )}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
          {salon.ratingCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <StarIcon className="h-3.5 w-3.5 text-saffron-500" />
              <span className="num font-semibold">{salon.ratingAvg.toFixed(1)}</span>
              <span className="num text-slate-400">({salon.ratingCount})</span>
            </span>
          )}
          <span className="rounded bg-slate-100 px-1.5 py-0.5">{typeLabel(salon.type, t)}</span>
          {salon.minPrice !== null && (
            <span>
              {t.from} <Price value={salon.minPrice} t={t} />
            </span>
          )}
          {salon.mode !== "booking" && salon.openNow && (
            <span className="inline-flex items-center gap-1 text-brand-700">
              <UsersIcon className="h-3.5 w-3.5" />
              <span className="num">{salon.queueLength}</span> {t.inQueue}
            </span>
          )}
          {salon.featured && <span className="rounded bg-saffron-400/20 px-1.5 py-0.5 text-amber-800">★ {t.featured}</span>}
        </div>
      </div>
    </Link>
  );
}

export function WaitPill({ low, high, t }: { low: number; high: number; t: Dict }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-800">
      <ClockIcon className="h-4 w-4" />
      {high === 0 ? (
        t.noWait
      ) : (
        <>
          {t.waitAbout}{" "}
          <span className="num">
            {low}–{high}
          </span>{" "}
          {t.minutes}
        </>
      )}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{children}</p>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "success" | "error"; children: React.ReactNode }) {
  const tones = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-red-200 bg-red-50 text-red-800",
  };
  return <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}
