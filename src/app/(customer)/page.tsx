import Link from "next/link";
import { Suspense } from "react";
import { PageLoading } from "@/experiences/shared/states";
import { getDict } from "@/lib/i18n/server";
import { searchSalons } from "@/lib/salons";
import { estimateWait, getLiveQueue } from "@/lib/queue";
import { Empty, SalonCard, SalonThumb, WaitPill } from "@/components/ui";
import { NearMeButton } from "@/components/client";
import { ArrowIcon, SearchIcon, StarIcon } from "@/components/icons";

function num(v: string | string[] | undefined) {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return v !== undefined && v !== "" && Number.isFinite(n) ? n : undefined;
}

/** Customer app → Home. */
async function HomeContent({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const { t } = await getDict();
  const lat = num(sp.lat);
  const lng = num(sp.lng);
  const near = lat !== undefined && lng !== undefined;

  const all = await searchSalons({ lat, lng });
  const nearby = (near ? all : all.filter((s) => s.openNow)).slice(0, 5);
  const featured = all.filter((s) => s.featured).slice(0, 6);
  const queueSalons = all.filter((s) => s.openNow && s.mode !== "booking").slice(0, 6);
  const waits = await Promise.all(queueSalons.map(async (s) => ({ salon: s, wait: estimateWait(await getLiveQueue(s.id)) })));
  waits.sort((a, b) => a.wait.high - b.wait.high);

  const categories = [
    { href: "/search?type=men", emoji: "💈", label: t.forMen },
    { href: "/search?type=women", emoji: "💅", label: t.forWomen },
    { href: "/search?group=bridal", emoji: "👰", label: t.catBridal },
    { href: "/search?group=spa", emoji: "🧖", label: t.catSpa },
  ];

  return (
    <div className="space-y-7">
      <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-5 py-6 text-white shadow-lg">
        <p className="text-sm font-medium text-brand-100">{t.tagline}</p>
        <h1 className="mt-1 text-3xl font-extrabold leading-tight">{t.heroTitle}</h1>
        <form action="/search" className="mt-4 flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">{t.search}</span>
            <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input name="q" placeholder={t.searchPlaceholder} className="input ps-10 text-slate-900" />
          </label>
          <button className="btn bg-saffron-400 text-slate-900 hover:bg-saffron-500">{t.search}</button>
        </form>
      </section>

      <section>
        <h2 className="section-title">{t.categories}</h2>
        <div className="grid grid-cols-4 gap-2">
          {categories.map((c) => (
            <Link key={c.href} href={c.href} className="card flex min-h-20 flex-col items-center justify-center gap-1 p-2 text-center text-sm font-semibold hover:border-brand-500">
              <span className="text-2xl" aria-hidden>
                {c.emoji}
              </span>
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title mb-0">{near ? t.nearbySalons : t.openNow}</h2>
          <NearMeButton />
        </div>
        {nearby.length === 0 ? (
          <Empty>{t.nothingOpenNow}</Empty>
        ) : (
          <div className="grid gap-3">
            {nearby.map((s) => (
              <SalonCard key={s.id} salon={s} t={t} />
            ))}
          </div>
        )}
        <Link href="/search" className="mt-3 flex min-h-11 items-center justify-center gap-1 text-sm font-semibold text-brand-700">
          {t.browseAll} <ArrowIcon className="h-4 w-4 rtl:rotate-180" />
        </Link>
      </section>

      {waits.length > 0 && (
        <section>
          <h2 className="section-title">⏱️ {t.liveQueueStatus}</h2>
          <ul className="card divide-y divide-slate-100">
            {waits.map(({ salon, wait }) => (
              <li key={salon.id}>
                <Link href={`/s/${salon.slug}`} className="flex min-h-14 items-center gap-3 px-4 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{salon.name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {salon.area} · <span className="num">{salon.queueLength}</span> {t.inQueue}
                    </span>
                  </span>
                  <WaitPill low={wait.low} high={wait.high} t={t} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {featured.length > 0 && (
        <section>
          <h2 className="section-title">★ {t.featuredSalons}</h2>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
            {featured.map((s) => (
              <Link key={s.id} href={`/s/${s.slug}`} className="card w-60 shrink-0 snap-start overflow-hidden">
                <SalonThumb salon={s} className="h-28 w-full text-3xl" />
                <div className="p-3">
                  <p className="truncate font-semibold">{s.name}</p>
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    {s.ratingCount > 0 && (
                      <>
                        <StarIcon className="h-3.5 w-3.5 text-saffron-500" />
                        <span className="num font-semibold">{s.ratingAvg.toFixed(1)}</span> ·
                      </>
                    )}
                    <span className="truncate">{s.area}</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** Loading skeleton lives here (not in a group-wide loading.tsx) so logins and "not found" still work as real redirects/404s. */
export default function Home(props: PageProps<"/">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <HomeContent {...props} />
    </Suspense>
  );
}
