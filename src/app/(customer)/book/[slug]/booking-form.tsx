"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useI18n } from "@/lib/i18n/client";
import { fetchSlots, requestBooking } from "@/lib/actions/customer";
import type { Slot } from "@/lib/slots";
import { StepProgress } from "@/experiences/shared/progress";
import { SubmitButton } from "@/components/client";
import { Empty, Notice } from "@/components/ui";

type Service = { id: number; name: string; price: number; durationMin: number };
type Props = {
  salon: { id: number; name: string; address: string };
  services: Service[];
  staff: { id: number; name: string }[];
  dates: { date: string; label: string }[];
  initialServiceId?: number;
  initialStaffId?: number;
  rescheduleId?: number;
};

function timeLabel(minutes: number, lang: string) {
  return new Intl.DateTimeFormat(lang === "ur" ? "ur-PK" : "en-PK", { timeZone: "UTC", hour: "numeric", minute: "2-digit" }).format(
    new Date(Date.UTC(2026, 0, 1, 0, minutes)),
  );
}

const choice = (on: boolean) =>
  `flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-start ${on ? "border-brand-700 bg-brand-50 ring-2 ring-brand-200" : "border-slate-200 bg-white hover:border-brand-500"}`;

/** Four clear steps with a progress bar: service → stylist → date & time → confirm. */
export function BookingWizard({ salon, services, staff, dates, initialServiceId, initialStaffId, rescheduleId }: Props) {
  const { t, lang } = useI18n();
  const [step, setStep] = useState(initialServiceId ? 1 : 0);
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [staffId, setStaffId] = useState<number | undefined>(initialStaffId);
  const [date, setDate] = useState(dates[0].date);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<Slot>();
  const [loading, startLoading] = useTransition();
  const [state, action] = useActionState(requestBooking, undefined);
  const steps = [t.stepService, t.stepStylist, t.stepDateTime, t.stepConfirm];
  const service = services.find((s) => s.id === serviceId);
  const stylist = staff.find((s) => s.id === staffId);

  useEffect(() => {
    if (!serviceId || step !== 2) return;
    let cancelled = false;
    startLoading(async () => {
      try {
        const result = await fetchSlots(salon.id, serviceId, date, staffId);
        if (!cancelled) setSlots(result);
      } catch {
        if (!cancelled) setSlots([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [salon.id, serviceId, date, staffId, step]);

  const go = (n: number) => {
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-5">
      <StepProgress steps={steps} current={step} label={t.step} />

      {step === 0 && (
        <ul className="space-y-2">
          {services.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={choice(serviceId === s.id)}
                onClick={() => {
                  setServiceId(s.id);
                  setSlot(undefined);
                  go(1);
                }}
              >
                <span>
                  <span className="block font-semibold">{s.name}</span>
                  <span className="num text-xs text-slate-500">
                    {s.durationMin} {t.minutes}
                  </span>
                </span>
                <span className="num font-bold">
                  {t.pkr} {s.price.toLocaleString("en-PK")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {step === 1 && (
        <ul className="space-y-2">
          {[{ id: undefined as number | undefined, name: t.anyStaff }, ...staff].map((s) => (
            <li key={s.id ?? "any"}>
              <button
                type="button"
                className={choice(staffId === s.id)}
                onClick={() => {
                  setStaffId(s.id);
                  setSlot(undefined);
                  go(2);
                }}
              >
                <span className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 font-bold text-brand-800">
                    {s.id ? s.name.charAt(0) : "✦"}
                  </span>
                  <span className="font-semibold">{s.name}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {dates.map((d) => (
              <button
                key={d.date}
                type="button"
                onClick={() => {
                  setDate(d.date);
                  setSlot(undefined);
                }}
                className={`${date === d.date ? "chip-active" : "chip"} shrink-0`}
              >
                {d.label}
              </button>
            ))}
          </div>
          {loading || slots === null ? (
            <div className="grid grid-cols-3 gap-2" aria-busy="true" aria-label={t.loading}>
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-200" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <Empty>{t.noSlots}</Empty>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((s) => (
                <button
                  key={s.startsAt}
                  type="button"
                  onClick={() => {
                    setSlot(s);
                    go(3);
                  }}
                  className={`num min-h-12 rounded-xl border text-sm font-semibold ${slot?.startsAt === s.startsAt ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white hover:border-brand-600"}`}
                >
                  {timeLabel(s.minutes, lang)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 3 && service && slot && (
        <form action={action} className="space-y-4">
          <input type="hidden" name="salonId" value={salon.id} />
          <input type="hidden" name="serviceId" value={service.id} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="startsAt" value={slot.startsAt} />
          {staffId && <input type="hidden" name="staffId" value={staffId} />}
          {rescheduleId && <input type="hidden" name="rescheduleId" value={rescheduleId} />}
          <dl className="card divide-y divide-slate-100">
            {[
              [t.salon, `${salon.name} — ${salon.address}`],
              [t.service, service.name],
              [t.stylist, stylist?.name ?? t.anyStaff],
              [t.dateTime, `${dates.find((d) => d.date === date)?.label} · ${timeLabel(slot.minutes, lang)}`],
              [t.price, `${t.pkr} ${service.price.toLocaleString("en-PK")}`],
            ].map(([k, v]) => (
              <div key={k} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2">
                <dt className="text-sm text-slate-500">{k}</dt>
                <dd className="text-end font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <label className="block">
            <span className="label">{t.noteOptional}</span>
            <textarea name="note" rows={2} maxLength={300} className="input" />
          </label>
          <p className="text-sm text-slate-500">{t.payAtSalon}</p>
          {state?.error && <Notice tone="error">{state.error === "noShows" ? t.tooManyNoShows : state.error}</Notice>}
          <SubmitButton className="btn-primary min-h-14 w-full text-base">{rescheduleId ? t.confirmChange : t.confirmBooking}</SubmitButton>
        </form>
      )}

      {step > 0 && (
        <button type="button" onClick={() => go(step - 1)} className="btn-secondary w-full">
          {t.back}
        </button>
      )}
    </div>
  );
}
