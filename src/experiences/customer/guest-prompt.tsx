import Link from "next/link";
import type { Dict } from "@/lib/i18n/dict";

/** Shown to guests on pages that need an account — friendly, never a forced redirect. */
export function GuestPrompt({ title, body, next, t }: { title: string; body: string; next: string; t: Dict }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <div className="card space-y-3 p-6 text-center">
        <p className="text-4xl">👋</p>
        <p className="text-slate-700">{body}</p>
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn-primary w-full">
          {t.login}
        </Link>
        <Link href="/search" className="btn-secondary w-full">
          {t.findASalon}
        </Link>
      </div>
    </div>
  );
}
