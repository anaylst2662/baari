import Link from "next/link";
import { LanguageButton } from "@/experiences/shared/nav";

/** The shared login screen (one login for all three experiences). */
export default function LoginLayout({ children }: LayoutProps<"/login">) {
  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2">
        <Link href="/" className="flex min-h-11 items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 text-lg font-black text-white">ب</span>
          <span className="text-xl font-extrabold text-brand-800">Baari</span>
        </Link>
        <LanguageButton className="rounded-full border border-slate-300 px-4 text-sm" />
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 pb-16">{children}</main>
    </div>
  );
}
