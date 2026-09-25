"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useI18n } from "@/lib/i18n/client";
import { fetchSlots, requestBooking } from "@/lib/actions/customer";
import type { Slot } from "@/lib/slots";
import { SubmitButton } from "@/components/client";
import { Notice } from "@/components/ui";

type Props = {
  salonId: number;
  services: { id: number; name: string; price: number; durationMin: number }[];
  staff: { id: number; name: string }[];
  dates: { date: string; label: string }[];
  initialServiceId?: number;
};

function slotLabel(minutes: number, lang: string) {
  const d = new Date(Date.UTC(2026, 0, 1, 0, minutes));
  return new Intl.DateTimeFormat(lang === "ur" ? "ur-PK" : "en-PK", {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function BookingForm({ salonId, services, staff, dates, initialServiceId }: Props) {
  const { t, lang } = useI18n();
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [staffId, setStaffId] = useState<number | undefined>();
  const [date, setDate] = useState(dates[0].date);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [startsAt, setStartsAt] = useState<string>();
  const [loading, startLoading] = useTransition();
  const [state, action] = useActionState(requestBooking, undefined);

  useEffect(() => {
    if (!serviceId) return;
    let cancelled = false;
    startLoading(async () => {
      const result = await fetchSlots(salonId, serviceId, date, staffId);
      if (!cancelled) {
        setSlots(result);
        setStartsAt(undefined);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [salonId, serviceId, date, staffId]);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="salonId" value={salonId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="startsAt" value={startsAt ?? ""} />
      {staffId && <input type="hidden" name="staffId" value={staffId} />}

      <section>
        <h2 className="label">{t.chooseService}</h2>
        <select
          name="serviceId"
          className="input"
          value={serviceId}
          onChange={(e) => setServiceId(Number(e.target.value))}
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {t.pkr} {s.price.toLocaleString("en-PK")} · {s.durationMin} {t.minutes}
            </option>
          ))}
        </select>
      </section>

      {staff.length > 1 && (
        <section>
          <h2 className="label">{t.chooseStaff}</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setStaffId(undefined)} className={!staffId ? "chip-active" : "chip"}>
              {t.anyStaff}
            </button>
            {staff.map((s) => (
              <button key={s.id} type="button" onClick={() => setStaffId(s.id)} className={staffId === s.id ? "chip-active" : "chip"}>
                {s.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="label">{t.chooseDate}</h2>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {dates.map((d) => (
            <button
              key={d.date}
              type="button"
              onClick={() => setDate(d.date)}
              className={`${date === d.date ? "chip-active" : "chip"} shrink-0`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="label">{t.chooseTime}</h2>
        {loading || slots === null ? (
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-200" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-slate-500">{t.noSlots}</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {slots.map((s) => (
              <button
                key={s.startsAt}
                type="button"
                onClick={() => setStartsAt(s.startsAt)}
                className={`num rounded-lg border px-2 py-2 text-sm ${startsAt === s.startsAt ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white hover:border-brand-600"}`}
              >
                {slotLabel(s.minutes, lang)}
              </button>
            ))}
          </div>
        )}
      </section>

      <label className="block">
        <span className="label">{t.noteOptional}</span>
        <textarea name="note" rows={2} maxLength={300} className="input" />
      </label>

      {state?.error && <Notice tone="error">{state.error === "noShows" ? t.tooManyNoShows : state.error}</Notice>}

      <SubmitButton className="btn-primary w-full py-3 text-base" disabled={!startsAt}>
        {t.confirmBooking}
      </SubmitButton>
    </form>
  );
}
