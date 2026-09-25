"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";

/** Skeleton shown while a page loads. */
export function PageLoading() {
  const { t } = useI18n();
  return (
    <div className="space-y-3" aria-busy="true" aria-label={t.loading}>
      <div className="h-8 w-1/2 animate-pulse rounded-lg bg-slate-200" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200" />
      ))}
    </div>
  );
}

/** Friendly error with a "try again" button (used by each experience's error.tsx). */
export function PageError({ reset, homeHref }: { reset: () => void; homeHref: string }) {
  const { t } = useI18n();
  return (
    <div className="card space-y-3 p-6 text-center">
      <p className="text-4xl">😕</p>
      <h1 className="text-xl font-bold">{t.errorTitle}</h1>
      <p className="text-slate-600">{t.errorBody}</p>
      <button onClick={reset} className="btn-primary w-full">
        {t.tryAgain}
      </button>
      <Link href={homeHref} className="btn-secondary w-full">
        {t.goHome}
      </Link>
    </div>
  );
}
