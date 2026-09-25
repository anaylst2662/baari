import Link from "next/link";
import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { getUser } from "@/lib/auth";
import { getReviews, getSalonBySlug, getServices, getStaff, isSaved } from "@/lib/data";
import { toggleSaved } from "@/lib/actions/customer";
import { isOpenNow } from "@/lib/salons";
import { estimateWait, getLiveQueue } from "@/lib/queue";
import { formatDate, formatHHMM, localNow } from "@/lib/time";
import { displayPhone } from "@/lib/phone";
import { Notice, OpenBadge, Price, SalonThumb, Stars, WaitPill, modeLabel, typeLabel } from "@/components/ui";
import { SalonMap } from "@/components/map";
import { AutoRefresh, SubmitButton } from "@/components/client";
import { HeartIcon, PhoneIcon, PinIcon, UsersIcon } from "@/components/icons";

export async function generateMetadata({ params }: PageProps<"/s/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const salon = await getSalonBySlug(slug, await getUser());
  return { title: salon.name, description: salon.description ?? `${salon.name} in ${salon.area}, ${salon.city}` };
}

export default async function SalonPage({ params }: PageProps<"/s/[slug]">) {
  const { slug } = await params;
  const [{ t, lang }, user] = await Promise.all([getDict(), getUser()]);
  const salon = await getSalonBySlug(slug, user);
  const [services, staff, reviews, queue, saved] = await Promise.all([
    getServices(salon.id),
    getStaff(salon.id),
    getReviews(salon.id),
    getLiveQueue(salon.id),
    isSaved(user?.id, salon.id),
  ]);
  const open = isOpenNow(salon);
  const wait = estimateWait(queue);
  const today = localNow().dow;
  const days = [t.sun, t.mon, t.tue, t.wed, t.thu, t.fri, t.sat];
  const categories = [...new Set(services.map((s) => s.category))];
  const acceptsQueue = salon.mode !== "booking";
  const acceptsBooking = salon.mode !== "queue";

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={30} />
      {salon.status !== "approved" && <Notice tone="warn">{t.pendingApproval}</Notice>}

      <section className="card overflow-hidden">
        {salon.photos.length > 0 ? (
          <div className="flex snap-x gap-1 overflow-x-auto">
            {salon.photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p} src={p} alt="" className="h-48 w-72 shrink-0 snap-start object-cover" />
            ))}
          </div>
        ) : (
          <SalonThumb salon={salon} className="h-32 w-full text-4xl" />
        )}
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold">{salon.name}</h1>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                <PinIcon className="h-4 w-4" /> {salon.address}, {salon.city}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <OpenBadge open={open} t={t} />
              <form action={toggleSaved}>
                <input type="hidden" name="salonId" value={salon.id} />
                <input type="hidden" name="slug" value={salon.slug} />
                <SubmitButton
                  className={`grid h-11 w-11 place-items-center rounded-full border ${saved ? "border-rose-200 bg-rose-50 text-rose-600" : "border-slate-300 text-slate-500"}`}
                  aria-label={saved ? t.unsaveSalon : t.saveSalon}
                  aria-pressed={saved}
                >
                  <HeartIcon filled={saved} className="h-5 w-5" />
                </SubmitButton>
              </form>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {salon.ratingCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Stars value={salon.ratingAvg} />
                <span className="num font-semibold">{salon.ratingAvg.toFixed(1)}</span>
                <span className="num text-slate-400">({salon.ratingCount})</span>
              </span>
            )}
            <span className="rounded bg-slate-100 px-2 py-0.5">{typeLabel(salon.type, t)}</span>
            <span className="rounded bg-slate-100 px-2 py-0.5">{modeLabel(salon.mode, t)}</span>
          </div>
          {salon.description && <p className="text-sm text-slate-700">{salon.description}</p>}

          {acceptsQueue && open && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                <UsersIcon className="h-4 w-4 text-brand-700" />
                <span className="num">{queue.waiting.length}</span> {t.inQueue}
              </span>
              <WaitPill low={wait.low} high={wait.high} t={t} />
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {acceptsQueue &&
              (open ? (
                <Link href={`/s/${salon.slug}/queue`} className="btn-primary py-3 text-base">
                  {t.joinQueue}
                </Link>
              ) : (
                <p className="rounded-xl bg-slate-100 px-3 py-3 text-center text-sm text-slate-500">{t.queueClosedNote}</p>
              ))}
            {acceptsBooking && (
              <Link
                href={`/book/${salon.slug}`}
                className={`${acceptsQueue ? "btn-secondary" : "btn-primary"} py-3 text-base`}
              >
                {t.bookAppointment}
              </Link>
            )}
          </div>
          <div className="flex gap-2">
            {salon.lat !== null && salon.lng !== null && (
              <a
                className="btn-secondary btn-sm"
                target="_blank"
                rel="noreferrer"
                href={`https://www.google.com/maps/dir/?api=1&destination=${salon.lat},${salon.lng}`}
              >
                <PinIcon className="h-4 w-4" /> {t.directions}
              </a>
            )}
            {salon.phone && (
              <a className="btn-secondary btn-sm" href={`tel:${salon.phone}`}>
                <PhoneIcon className="h-4 w-4" /> <span className="num">{displayPhone(salon.phone)}</span>
              </a>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">{t.services}</h2>
        <div className="card divide-y divide-slate-100">
          {categories.map((cat) => (
            <div key={cat} className="p-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{cat}</h3>
              <ul className="space-y-2">
                {services
                  .filter((s) => s.category === cat)
                  .map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                      <span>
                        {s.name}
                        <span className="num ms-2 text-xs text-slate-400">
                          {s.durationMin} {t.minutes}
                        </span>
                      </span>
                      <span className="font-semibold">
                        <Price value={s.price} t={t} />
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {staff.length > 0 && (
        <section>
          <h2 className="section-title">{t.stylists}</h2>
          <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {staff.map((m) => (
              <li key={m.id} className="card flex w-24 shrink-0 flex-col items-center gap-1 p-3 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-lg font-bold text-brand-800">
                  {m.name.charAt(0)}
                </span>
                <span className="truncate text-sm font-semibold">{m.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="section-title">{t.hours}</h2>
          <ul className="card divide-y divide-slate-100 text-sm">
            {salon.hours.map((h, i) => (
              <li key={i} className={`flex justify-between px-4 py-2 ${i === today ? "font-semibold text-brand-800" : ""}`}>
                <span>{days[i]}</span>
                <span className="num">{h ? `${formatHHMM(h.open, lang)} – ${formatHHMM(h.close, lang)}` : t.closedDay}</span>
              </li>
            ))}
          </ul>

        </div>
        {salon.lat !== null && salon.lng !== null && (
          <div>
            <h2 className="section-title">{t.location}</h2>
            <div className="h-64">
              <SalonMap pins={[{ id: salon.id, lat: salon.lat, lng: salon.lng, label: salon.name, open }]} />
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title">{t.reviews}</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-slate-500">{t.noReviews}</p>
        ) : (
          <ul className="space-y-3">
            {reviews.map(({ review, userName }) => (
              <li key={review.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {review.anonymous ? t.anonymousCustomer : (userName ?? t.anonymousCustomer)}
                  </span>
                  <span className="text-xs text-slate-400">{formatDate(review.createdAt, lang)}</span>
                </div>
                <Stars value={review.rating} className="mt-1" />
                {review.comment && <p className="mt-1 text-sm text-slate-700">{review.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
