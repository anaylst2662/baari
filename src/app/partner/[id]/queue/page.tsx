import { redirect } from "next/navigation";
import { requireSalonAccess } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { estimateWait, getLiveQueue } from "@/lib/queue";
import { getServices } from "@/lib/data";
import { formatTime } from "@/lib/time";
import { addWalkIn, callNext, setQueueStatus } from "@/lib/actions/partner";
import { AutoRefresh, SubmitButton } from "@/components/client";
import { Empty, WaitPill } from "@/components/ui";
import { WorkSwitch } from "../work-switch";

export default async function PartnerQueue({ params }: PageProps<"/partner/[id]/queue">) {
  const { id } = await params;
  const { salon } = await requireSalonAccess(Number(id));
  if (salon.mode === "booking") redirect(`/partner/${salon.id}/bookings`);
  const { t, lang } = await getDict();
  const [queue, services] = await Promise.all([getLiveQueue(salon.id), getServices(salon.id)]);
  const wait = estimateWait(queue);

  const hidden = <input type="hidden" name="salonId" value={salon.id} />;
  const nameOf = (r: (typeof queue.waiting)[number]) => r.userName ?? r.entry.walkInName ?? "—";

  return (
    <div className="space-y-4">
      <AutoRefresh seconds={20} />
      <WorkSwitch salonId={salon.id} mode={salon.mode} active="queue" t={t} />
      <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="section-title mb-0">{t.queue}</h2>
            <WaitPill low={wait.low} high={wait.high} t={t} />
          </div>

          {queue.called.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">{t.nowServing}</h3>
              {queue.called.map((r) => (
                <div key={r.entry.id} className="card flex flex-wrap items-center justify-between gap-2 border-saffron-400 bg-saffron-400/10 p-3">
                  <div>
                    <p className="font-semibold">{nameOf(r)}</p>
                    <p className="text-xs text-slate-600">{r.serviceName ?? "—"}</p>
                  </div>
                  <div className="flex gap-2">
                    {(["served", "no_show"] as const).map((status) => (
                      <form key={status} action={setQueueStatus}>
                        {hidden}
                        <input type="hidden" name="entryId" value={r.entry.id} />
                        <input type="hidden" name="status" value={status} />
                        <SubmitButton className={status === "served" ? "btn-primary btn-sm" : "btn-danger btn-sm"}>
                          {status === "served" ? `✓ ${t.done}` : t.noShow}
                        </SubmitButton>
                      </form>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <form action={callNext}>
            {hidden}
            <SubmitButton className="btn-primary w-full py-4 text-lg" disabled={queue.waiting.length === 0}>
              📣 {t.callNext}
            </SubmitButton>
          </form>

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              {t.waiting} (<span className="num">{queue.waiting.length}</span>)
            </h3>
            {queue.waiting.length === 0 ? (
              <Empty>{t.queueEmpty}</Empty>
            ) : (
              <ol className="card divide-y divide-slate-100">
                {queue.waiting.map((r, i) => (
                  <li key={r.entry.id} className="flex items-center gap-3 p-3">
                    <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {nameOf(r)} {r.entry.userId && <span className="text-xs font-normal text-brand-600">· Baari</span>}
                      </p>
                      <p className="text-xs text-slate-500">
                        {r.serviceName ?? "—"} · <span className="num">{formatTime(r.entry.joinedAt, lang)}</span>
                      </p>
                    </div>
                    <form action={setQueueStatus}>
                      {hidden}
                      <input type="hidden" name="entryId" value={r.entry.id} />
                      <input type="hidden" name="status" value="left" />
                      <SubmitButton className="btn-secondary btn-sm" aria-label={t.remove}>
                        ✕
                      </SubmitButton>
                    </form>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <form action={addWalkIn} className="card flex flex-wrap items-end gap-2 p-3">
            {hidden}
            <label className="min-w-32 flex-1">
              <span className="label">{t.walkInName}</span>
              <input name="name" maxLength={40} className="input" placeholder="Walk-in" />
            </label>
            <label className="min-w-32 flex-1">
              <span className="label">{t.service}</span>
              <select name="serviceId" className="input">
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton className="btn-secondary">+ {t.addWalkIn}</SubmitButton>
          </form>
        </section>
    </div>
  );
}
