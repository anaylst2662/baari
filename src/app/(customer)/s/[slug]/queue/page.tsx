import Link from "next/link";
import { redirect } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import { requireUser } from "@/lib/auth";
import { getSalonBySlug, getServices } from "@/lib/data";
import { isOpenNow } from "@/lib/salons";
import { estimateWait, getLiveQueue } from "@/lib/queue";
import { joinQueue } from "@/lib/actions/customer";
import { Price, WaitPill } from "@/components/ui";
import { SubmitButton } from "@/components/client";

export default async function JoinQueuePage({ params }: PageProps<"/s/[slug]/queue">) {
  const { slug } = await params;
  const user = await requireUser(`/s/${slug}/queue`);
  const { t } = await getDict();
  const salon = await getSalonBySlug(slug, user);
  if (salon.mode === "booking" || !isOpenNow(salon)) redirect(`/s/${slug}`);

  const [services, queue] = await Promise.all([getServices(salon.id), getLiveQueue(salon.id)]);
  const mine = [...queue.called, ...queue.waiting].find((r) => r.entry.userId === user.id);
  if (mine) redirect(`/q/${mine.entry.id}`);
  const wait = estimateWait(queue);

  return (
    <div className="space-y-4">
      <Link href={`/s/${slug}`} className="text-sm text-brand-700">
        ← {salon.name}
      </Link>
      <h1 className="text-2xl font-extrabold">{t.joinQueue}</h1>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="num font-semibold">{queue.waiting.length}</span> {t.inQueue}
        <WaitPill low={wait.low} high={wait.high} t={t} />
      </div>
      <form action={joinQueue} className="space-y-4">
        <input type="hidden" name="salonId" value={salon.id} />
        <fieldset className="card divide-y divide-slate-100">
          <legend className="sr-only">{t.chooseService}</legend>
          {services.map((s, i) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-3 p-4 has-[:checked]:bg-brand-50">
              <input type="radio" name="serviceId" value={s.id} defaultChecked={i === 0} className="accent-brand-700" />
              <span className="flex-1 text-sm">
                {s.name}
                <span className="num ms-2 text-xs text-slate-400">
                  {s.durationMin} {t.minutes}
                </span>
              </span>
              <span className="text-sm font-semibold">
                <Price value={s.price} t={t} />
              </span>
            </label>
          ))}
        </fieldset>
        <SubmitButton className="btn-primary w-full py-3 text-base">{t.joinNow}</SubmitButton>
        <p className="text-center text-xs text-slate-500">{t.liveUpdates}</p>
      </form>
    </div>
  );
}
