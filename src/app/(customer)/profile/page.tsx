import Link from "next/link";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { getUser, requireUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { getSavedSalons } from "@/lib/data";
import { displayPhone } from "@/lib/phone";
import { ownedSalons } from "@/lib/roles";
import { logout } from "@/app/actions";
import { SubmitButton } from "@/components/client";
import { Empty, SalonThumb } from "@/components/ui";
import { HeartIcon, HelpIcon, LogoutIcon, StoreIcon } from "@/components/icons";
import { LanguageButton } from "@/experiences/shared/nav";

export const metadata: Metadata = { title: "Profile" };

async function saveName(formData: FormData) {
  "use server";
  const user = await requireUser("/profile");
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (!name) return;
  await db.update(schema.users).set({ name }).where(eq(schema.users.id, user.id));
  revalidatePath("/profile");
}

const row = "card flex min-h-14 items-center gap-3 px-4 py-3 font-semibold";

/** Customer app → Profile. Guests see language, help and a log-in button. */
export default async function ProfilePage() {
  const { t } = await getDict();
  const user = await getUser();
  const [saved, owns] = user ? await Promise.all([getSavedSalons(user.id), ownedSalons(user.id)]) : [[], []];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">{t.navProfile}</h1>

      {user ? (
        <form action={saveName} className="card space-y-3 p-4">
          <label className="block">
            <span className="label">{t.yourName}</span>
            <input name="name" defaultValue={user.name ?? ""} required maxLength={60} className="input" />
          </label>
          <p className="text-sm text-slate-500">
            {t.phoneNumber}:{" "}
            <span className="num font-semibold text-slate-800" dir="ltr">
              {displayPhone(user.phone)}
            </span>
          </p>
          <SubmitButton className="btn-primary w-full">{t.save}</SubmitButton>
        </form>
      ) : (
        <div className="card space-y-3 p-5 text-center">
          <p className="text-slate-700">{t.guestProfileBody}</p>
          <Link href="/login?next=/profile" className="btn-primary w-full">
            {t.login}
          </Link>
        </div>
      )}

      <div className={row}>
        <span className="flex-1">{t.language}</span>
        <LanguageButton className="rounded-xl border border-slate-300 px-4 text-sm" />
      </div>

      {user && (
        <section>
          <h2 className="section-title flex items-center gap-2">
            <HeartIcon filled className="h-5 w-5 text-rose-500" /> {t.savedSalons}
          </h2>
          {saved.length === 0 ? (
            <Empty>{t.noSavedSalons}</Empty>
          ) : (
            <ul className="grid gap-2">
              {saved.map(({ salon }) => (
                <li key={salon.id}>
                  <Link href={`/s/${salon.slug}`} className="card flex min-h-16 items-center gap-3 p-3">
                    <SalonThumb salon={salon} className="h-12 w-12 shrink-0 rounded-xl text-sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{salon.name}</span>
                      <span className="block truncate text-sm text-slate-500">{salon.area}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <Link href="/profile/help" className={row}>
        <HelpIcon className="h-5 w-5 text-brand-700" />
        <span className="flex-1">{t.help}</span>
        <span className="text-slate-400 rtl:rotate-180">→</span>
      </Link>

      <Link href={owns.length > 0 ? "/business" : "/business/join"} className="card flex min-h-16 items-center gap-3 bg-zinc-900 px-4 py-3 text-white">
        <StoreIcon className="h-6 w-6 text-amber-300" />
        <span className="flex-1">
          <span className="block font-bold">{owns.length > 0 ? t.openBaariBusiness : t.listYourSalon}</span>
          <span className="block text-sm text-zinc-300">{t.listYourSalonSub}</span>
        </span>
        <span className="rtl:rotate-180">→</span>
      </Link>

      {user && (
        <form action={logout}>
          <button className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white font-semibold text-red-700">
            <LogoutIcon className="h-5 w-5" /> {t.logout}
          </button>
        </form>
      )}
    </div>
  );
}
