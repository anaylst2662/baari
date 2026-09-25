import Link from "next/link";
import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { getAreas, searchSalons, SERVICE_CATEGORIES } from "@/lib/salons";
import { Empty, SalonCard } from "@/components/ui";
import { NearMeButton } from "@/components/client";
import { SalonMap } from "@/components/map";
import { SearchIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Salons" };

function num(v: string | string[] | undefined) {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) && v !== undefined && v !== "" ? n : undefined;
}
function str(v: string | string[] | undefined) {
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || undefined;
}

export default async function SalonsPage({ searchParams }: PageProps<"/salons">) {
  const sp = await searchParams;
  const { t } = await getDict();
  const filters = {
    q: str(sp.q),
    type: str(sp.type),
    category: str(sp.category),
    maxPrice: num(sp.max),
    openNow: sp.open === "1",
    area: str(sp.area),
    lat: num(sp.lat),
    lng: num(sp.lng),
  };
  const view = sp.view === "map" ? "map" : "list";
  const [salons, areas] = await Promise.all([searchSalons(filters), getAreas()]);

  const link = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string") next.set(k, v);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) next.delete(k);
      else next.set(k, v);
    }
    return `/salons?${next}`;
  };

  return (
    <div className="space-y-4">
      <form className="flex gap-2">
        {Object.entries(sp).map(([k, v]) =>
          k !== "q" && typeof v === "string" ? <input key={k} type="hidden" name={k} value={v} /> : null,
        )}
        <label className="relative flex-1">
          <span className="sr-only">{t.search}</span>
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={filters.q} placeholder={t.searchPlaceholder} className="input ps-9" />
        </label>
        <button className="btn-primary">{t.search}</button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <NearMeButton />
        {(["all", "men", "women", "unisex"] as const).map((ty) => {
          const active = (filters.type ?? "all") === ty;
          const label = ty === "all" ? t.allTypes : ty === "men" ? t.forMen : ty === "women" ? t.forWomen : t.unisex;
          return (
            <Link key={ty} href={link({ type: ty === "all" ? undefined : ty })} className={active ? "chip-active" : "chip"}>
              {label}
            </Link>
          );
        })}
        <Link href={link({ open: filters.openNow ? undefined : "1" })} className={filters.openNow ? "chip-active" : "chip"}>
          {t.openNow}
        </Link>
      </div>

      <details className="card p-3" open={Boolean(filters.category || filters.maxPrice || filters.area)}>
        <summary className="cursor-pointer text-sm font-semibold">{t.filters}</summary>
        <form className="mt-3 grid gap-3 sm:grid-cols-3">
          {["q", "type", "open", "lat", "lng", "view"].map((k) =>
            typeof sp[k] === "string" ? <input key={k} type="hidden" name={k} value={sp[k] as string} /> : null,
          )}
          <label>
            <span className="label">{t.service}</span>
            <select name="category" defaultValue={filters.category ?? ""} className="input">
              <option value="">{t.anyService}</option>
              {SERVICE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">{t.maxPrice}</span>
            <select name="max" defaultValue={filters.maxPrice ?? ""} className="input">
              <option value="">{t.any}</option>
              {[500, 1000, 2000, 5000, 10000].map((p) => (
                <option key={p} value={p}>
                  {t.pkr} {p.toLocaleString("en-PK")}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">{t.area}</span>
            <select name="area" defaultValue={filters.area ?? ""} className="input">
              <option value="">{t.any}</option>
              {areas.map((a) => (
                <option key={a.area} value={a.area}>
                  {a.area}, {a.city}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2 sm:col-span-3">
            <button className="btn-primary">{t.apply}</button>
            <Link href="/salons" className="btn-secondary">
              {t.clear}
            </Link>
          </div>
        </form>
      </details>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          <span className="num">{salons.length}</span> {t.results}
        </p>
        <div className="inline-flex rounded-xl border border-slate-300 bg-white p-0.5 text-sm">
          <Link href={link({ view: undefined })} className={`rounded-lg px-3 py-1 ${view === "list" ? "bg-brand-700 text-white" : ""}`}>
            {t.listView}
          </Link>
          <Link href={link({ view: "map" })} className={`rounded-lg px-3 py-1 ${view === "map" ? "bg-brand-700 text-white" : ""}`}>
            {t.mapView}
          </Link>
        </div>
      </div>

      {salons.length === 0 ? (
        <Empty>{t.noResults}</Empty>
      ) : view === "map" ? (
        <div className="h-[60dvh]">
          <SalonMap
            pins={salons
              .filter((s) => s.lat !== null && s.lng !== null)
              .map((s) => ({ id: s.id, lat: s.lat!, lng: s.lng!, label: s.name, href: `/s/${s.slug}`, open: s.openNow }))}
          />
        </div>
      ) : (
        <div className="grid gap-3">
          {salons.map((s) => (
            <SalonCard key={s.id} salon={s} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
