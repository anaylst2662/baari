import Link from "next/link";
import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { searchSalons } from "@/lib/salons";
import { Empty, SalonCard } from "@/components/ui";
import { NearMeButton } from "@/components/client";
import { SalonMap } from "@/components/map";
import { SearchIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Search" };

function num(v: string | string[] | undefined) {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) && v !== undefined && v !== "" ? n : undefined;
}
function str(v: string | string[] | undefined) {
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || undefined;
}

/** Customer app → Search: by name or area, filters for price, rating and open now; list or map. */
export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const { t } = await getDict();
  const group = sp.group === "bridal" || sp.group === "spa" ? (sp.group as "bridal" | "spa") : undefined;
  const filters = {
    q: str(sp.q),
    type: str(sp.type),
    group,
    maxPrice: num(sp.max),
    minRating: num(sp.rating),
    openNow: sp.open === "1",
    area: str(sp.area),
    lat: num(sp.lat),
    lng: num(sp.lng),
  };
  const view = sp.view === "map" ? "map" : "list";
  const salons = await searchSalons(filters);

  const link = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string") next.set(k, v);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    return qs ? `/search?${qs}` : "/search";
  };
  const activeFilters = [filters.maxPrice, filters.minRating, filters.openNow || undefined].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{t.navSearch}</h1>
      <form className="flex gap-2">
        {Object.entries(sp).map(([k, v]) => (k !== "q" && typeof v === "string" ? <input key={k} type="hidden" name={k} value={v} /> : null))}
        <label className="relative flex-1">
          <span className="sr-only">{t.search}</span>
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input name="q" type="search" defaultValue={filters.q} placeholder={t.searchPlaceholder} className="input ps-10" />
        </label>
        <button className="btn-primary">{t.search}</button>
      </form>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <NearMeButton />
        {(["all", "men", "women", "unisex"] as const).map((ty) => {
          const active = (filters.type ?? "all") === ty;
          const label = ty === "all" ? t.allTypes : ty === "men" ? t.forMen : ty === "women" ? t.forWomen : t.unisex;
          return (
            <Link key={ty} href={link({ type: ty === "all" ? undefined : ty })} className={`${active ? "chip-active" : "chip"} shrink-0`}>
              {label}
            </Link>
          );
        })}
        {group && (
          <Link href={link({ group: undefined })} className="chip-active shrink-0">
            {group === "bridal" ? t.catBridal : t.catSpa} ✕
          </Link>
        )}
        {filters.area && (
          <Link href={link({ area: undefined })} className="chip-active shrink-0">
            {filters.area} ✕
          </Link>
        )}
      </div>

      <details className="card" open={activeFilters > 0}>
        <summary className="flex min-h-12 cursor-pointer items-center px-4 font-semibold">
          {t.filters}
          {activeFilters > 0 && <span className="num ms-2 rounded-full bg-brand-700 px-2 text-xs text-white">{activeFilters}</span>}
        </summary>
        <form className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-3">
          {["q", "type", "group", "area", "lat", "lng", "view"].map((k) =>
            typeof sp[k] === "string" ? <input key={k} type="hidden" name={k} value={sp[k] as string} /> : null,
          )}
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
            <span className="label">{t.rating}</span>
            <select name="rating" defaultValue={filters.minRating ?? ""} className="input">
              <option value="">{t.any}</option>
              {[3.5, 4, 4.5].map((r) => (
                <option key={r} value={r}>
                  ★ {r}+
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 self-end">
            <input type="checkbox" name="open" value="1" defaultChecked={filters.openNow} className="h-5 w-5 accent-brand-700" />
            {t.openNow}
          </label>
          <div className="flex gap-2 sm:col-span-3">
            <button className="btn-primary flex-1">{t.apply}</button>
            <Link href="/search" className="btn-secondary">
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
          <Link href={link({ view: undefined })} className={`flex min-h-10 items-center rounded-lg px-4 ${view === "list" ? "bg-brand-700 text-white" : ""}`}>
            {t.listView}
          </Link>
          <Link href={link({ view: "map" })} className={`flex min-h-10 items-center rounded-lg px-4 ${view === "map" ? "bg-brand-700 text-white" : ""}`}>
            {t.mapView}
          </Link>
        </div>
      </div>

      {salons.length === 0 ? (
        <Empty>
          {t.noResults}{" "}
          <Link href="/search" className="font-semibold text-brand-700">
            {t.clear}
          </Link>
        </Empty>
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
