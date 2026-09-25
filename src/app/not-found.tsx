import Link from "next/link";
import { getDict } from "@/lib/i18n/server";

/** Shown for unknown addresses — and to anyone who isn't allowed to see a page. */
export default async function NotFound() {
  const { t } = await getDict();
  return (
    <main className="grid min-h-dvh place-items-center bg-slate-50 p-4">
      <div className="card w-full max-w-sm space-y-3 p-6 text-center">
        <p className="text-5xl">🔍</p>
        <h1 className="text-xl font-bold">{t.notFoundTitle}</h1>
        <p className="text-slate-600">{t.notFoundBody}</p>
        <Link href="/" className="btn-primary w-full">
          {t.goHome}
        </Link>
      </div>
    </main>
  );
}
