import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { getAreas, searchSalons } from "@/lib/salons";
import { SalonCard } from "@/components/ui";
import { NearMeButton } from "@/components/client";
import { ArrowIcon, SearchIcon } from "@/components/icons";

export default async function Home() {
  const { t } = await getDict();
  const [openSalons, areas] = await Promise.all([searchSalons({ openNow: true }), getAreas()]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 px-5 py-8 text-white shadow-lg">
        <p className="text-sm font-medium text-brand-100">{t.tagline}</p>
        <h1 className="mt-1 text-3xl font-extrabold leading-tight sm:text-4xl">{t.heroTitle}</h1>
        <p className="mt-2 max-w-xl text-sm text-brand-100">{t.heroSub}</p>
        <form action="/salons" className="mt-5 flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">{t.search}</span>
            <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input name="q" placeholder={t.searchPlaceholder} className="input ps-9 text-slate-900" />
          </label>
          <button className="btn bg-saffron-400 text-slate-900 hover:bg-saffron-500">{t.search}</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2 [&_.chip]:border-white/30 [&_.chip]:bg-white/10 [&_.chip]:text-white">
          <NearMeButton />
          <Link href="/salons?type=men" className="chip">
            ✂️ {t.forMen}
          </Link>
          <Link href="/salons?type=women" className="chip">
            💅 {t.forWomen}
          </Link>
          <Link href="/salons?open=1" className="chip">
            🟢 {t.openNow}
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title mb-0">{t.openNow}</h2>
          <Link href="/salons" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
            {t.browseAll} <ArrowIcon className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>
        <div className="grid gap-3">
          {openSalons.slice(0, 5).map((s) => (
            <SalonCard key={s.id} salon={s} t={t} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title">{t.popularAreas}</h2>
        <div className="flex flex-wrap gap-2">
          {areas.map((a) => (
            <Link key={a.area} href={`/salons?area=${encodeURIComponent(a.area)}`} className="chip">
              {a.area} <span className="text-slate-400">· {a.city}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title">{t.howItWorks}</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {[
            [t.step1Title, t.step1Body],
            [t.step2Title, t.step2Body],
            [t.step3Title, t.step3Body],
          ].map(([title, body], i) => (
            <li key={title} className="card p-4">
              <span className="num grid h-8 w-8 place-items-center rounded-full bg-brand-50 font-bold text-brand-700">{i + 1}</span>
              <h3 className="mt-2 font-semibold">{title}</h3>
              <p className="text-sm text-slate-600">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="card flex flex-col items-start gap-3 bg-saffron-400/10 p-5">
        <h2 className="text-lg font-bold">{t.forSalonsTitle}</h2>
        <p className="text-sm text-slate-700">{t.forSalonsBody}</p>
        <Link href="/partner/new" className="btn-primary">
          {t.listYourSalon}
        </Link>
      </section>
    </div>
  );
}
