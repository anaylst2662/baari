"use client";

import { useActionState } from "react";
import type { Salon } from "@/db/schema";
import { useI18n } from "@/lib/i18n/client";
import type { ProfileState } from "@/lib/actions/partner";
import { LocationPicker } from "@/components/map";
import { SubmitButton } from "@/components/client";
import { Notice } from "@/components/ui";

const DEFAULT_HOURS = Array(7).fill({ open: "10:00", close: "21:00" });

export function SalonForm({
  salon,
  action,
  submitLabel,
}: {
  salon?: Salon;
  action: (prev: ProfileState, formData: FormData) => Promise<ProfileState>;
  submitLabel: string;
}) {
  const { t } = useI18n();
  const [state, formAction] = useActionState(action, undefined);
  const days = [t.sun, t.mon, t.tue, t.wed, t.thu, t.fri, t.sat];
  const hours = salon?.hours ?? DEFAULT_HOURS;

  return (
    <form action={formAction} className="space-y-5">
      {salon && <input type="hidden" name="salonId" value={salon.id} />}
      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="label">{t.salonName} *</span>
          <input name="name" required minLength={2} maxLength={80} defaultValue={salon?.name} className="input" />
        </label>
        <label className="block">
          <span className="label">{t.salonType} *</span>
          <select name="type" defaultValue={salon?.type ?? "men"} className="input">
            <option value="men">{t.forMen}</option>
            <option value="women">{t.forWomen}</option>
            <option value="unisex">{t.unisex}</option>
          </select>
        </label>
        <label className="block">
          <span className="label">{t.salonMode} *</span>
          <select name="mode" defaultValue={salon?.mode ?? "both"} className="input">
            <option value="queue">{t.walkInShop}</option>
            <option value="booking">{t.appointmentsOnly}</option>
            <option value="both">{t.queueAndAppointments}</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="label">{t.address} *</span>
          <input name="address" required minLength={3} defaultValue={salon?.address} className="input" />
        </label>
        <label className="block">
          <span className="label">{t.area} *</span>
          <input name="area" required placeholder="G-9 Markaz" defaultValue={salon?.area} className="input" />
        </label>
        <label className="block">
          <span className="label">{t.city} *</span>
          <select name="city" defaultValue={salon?.city ?? "Islamabad"} className="input">
            {["Islamabad", "Rawalpindi", "Gilgit", "Hunza", "Lahore", "Karachi"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">{t.salonPhone}</span>
          <input
            name="phone"
            type="tel"
            dir="ltr"
            placeholder="0300 1234567"
            defaultValue={salon?.phone?.replace(/^\+92/, "0") ?? ""}
            className="input num"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">{t.description}</span>
          <textarea name="description" rows={2} maxLength={500} defaultValue={salon?.description ?? ""} className="input" />
        </label>
      </div>

      <fieldset className="card p-5">
        <legend className="px-1 text-sm font-semibold">{t.hours}</legend>
        <p className="mb-3 text-xs text-slate-500">Closing time earlier than opening time means open past midnight.</p>
        <div className="space-y-2">
          {days.map((day, d) => (
            <div key={d} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="w-20 font-medium">{day}</span>
              <input type="time" name={`open_${d}`} defaultValue={hours[d]?.open ?? "10:00"} className="input w-auto py-1.5" />
              <span>–</span>
              <input type="time" name={`close_${d}`} defaultValue={hours[d]?.close ?? "21:00"} className="input w-auto py-1.5" />
              <label className="ms-2 inline-flex items-center gap-1">
                <input type="checkbox" name={`closed_${d}`} defaultChecked={hours[d] === null} className="accent-brand-700" />
                {t.closedDay}
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      <div className="card space-y-2 p-5">
        <span className="label">{t.pinLocation}</span>
        <LocationPicker lat={salon?.lat} lng={salon?.lng} />
      </div>

      <label className="card block p-5">
        <span className="label">{t.photoUrls}</span>
        <textarea
          name="photos"
          rows={3}
          dir="ltr"
          placeholder="https://…"
          defaultValue={salon?.photos.join("\n")}
          className="input font-mono text-xs"
        />
      </label>

      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.saved && <Notice tone="success">{t.saved} ✓</Notice>}
      <SubmitButton className="btn-primary w-full py-3">{submitLabel}</SubmitButton>
    </form>
  );
}
