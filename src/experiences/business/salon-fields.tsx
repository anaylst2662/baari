"use client";

import { useActionState } from "react";
import type { Salon } from "@/db/schema";
import { useI18n } from "@/lib/i18n/client";
import type { ProfileState } from "@/lib/actions/business";
import { LocationPicker } from "@/components/map";
import { SubmitButton } from "@/components/client";
import { Notice } from "@/components/ui";

const CITIES = ["Islamabad", "Rawalpindi", "Gilgit", "Hunza", "Lahore", "Karachi"];
const DEFAULT_HOURS = Array(7).fill({ open: "10:00", close: "21:00" });

/** Salon name, who it serves and how customers come. */
export function BasicsFields({ salon }: { salon?: Salon }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-4">
      <label className="block">
        <span className="label">{t.salonName} *</span>
        <input name="name" required minLength={2} maxLength={80} defaultValue={salon?.name} className="input" />
      </label>
      <fieldset>
        <legend className="label">{t.salonType} *</legend>
        <div className="grid grid-cols-3 gap-2">
          {(["men", "women", "unisex"] as const).map((v) => (
            <label key={v} className="chip min-h-12 cursor-pointer justify-center has-[:checked]:border-brand-700 has-[:checked]:bg-brand-700 has-[:checked]:text-white">
              <input type="radio" name="type" value={v} defaultChecked={(salon?.type ?? "men") === v} className="sr-only" />
              {v === "men" ? t.forMen : v === "women" ? t.forWomen : t.unisex}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">{t.salonMode} *</legend>
        <div className="grid gap-2">
          {(["queue", "booking", "both"] as const).map((v) => (
            <label key={v} className="chip min-h-12 cursor-pointer has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50">
              <input type="radio" name="mode" value={v} defaultChecked={(salon?.mode ?? "both") === v} className="accent-brand-700" />
              {v === "queue" ? t.walkInShop : v === "booking" ? t.appointmentsOnly : t.queueAndAppointments}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="label">{t.description}</span>
        <textarea name="description" rows={2} maxLength={500} defaultValue={salon?.description ?? ""} className="input" />
      </label>
    </div>
  );
}

/** Address, area, city, phone and map pin. */
export function LocationFields({ salon }: { salon?: Salon }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-4">
      <label className="block">
        <span className="label">{t.address} *</span>
        <input name="address" required minLength={3} defaultValue={salon?.address} className="input" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">{t.area} *</span>
          <input name="area" required placeholder="G-9 Markaz" defaultValue={salon?.area} className="input" />
        </label>
        <label className="block">
          <span className="label">{t.city} *</span>
          <select name="city" defaultValue={salon?.city ?? "Islamabad"} className="input">
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="label">{t.salonPhone}</span>
        <input name="phone" type="tel" dir="ltr" placeholder="0300 1234567" defaultValue={salon?.phone?.replace(/^\+92/, "0") ?? ""} className="input num" />
      </label>
      <div>
        <span className="label">{t.pinLocation}</span>
        <LocationPicker lat={salon?.lat} lng={salon?.lng} />
      </div>
    </div>
  );
}

export function HoursFields({ salon }: { salon?: Salon }) {
  const { t } = useI18n();
  const days = [t.sun, t.mon, t.tue, t.wed, t.thu, t.fri, t.sat];
  const hours = salon?.hours ?? DEFAULT_HOURS;
  return (
    <div className="space-y-2">
      <p className="text-sm text-zinc-500">{t.hoursHelp}</p>
      {days.map((day, d) => (
        <div key={d} className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-2 text-sm ring-1 ring-zinc-200">
          <span className="w-20 font-semibold">{day}</span>
          <input type="time" name={`open_${d}`} defaultValue={hours[d]?.open ?? "10:00"} className="input w-auto" aria-label={`${day} ${t.opensAt}`} />
          <span>–</span>
          <input type="time" name={`close_${d}`} defaultValue={hours[d]?.close ?? "21:00"} className="input w-auto" aria-label={`${day} ${t.closesAt}`} />
          <label className="ms-auto inline-flex min-h-11 items-center gap-2 px-2">
            <input type="checkbox" name={`closed_${d}`} defaultChecked={hours[d] === null} className="h-5 w-5 accent-brand-700" />
            {t.closedDay}
          </label>
        </div>
      ))}
    </div>
  );
}

export function PhotosField({ salon }: { salon?: Salon }) {
  const { t } = useI18n();
  return (
    <label className="block">
      <span className="label">{t.photoUrls}</span>
      <textarea name="photos" rows={4} dir="ltr" placeholder="https://…" defaultValue={salon?.photos.join("\n")} className="input font-mono text-xs" />
      <span className="mt-1 block text-xs text-zinc-500">{t.photosHelp}</span>
    </label>
  );
}

/** A form that saves one My Salon section and shows "Saved" or a simple error. */
export function SaveForm({
  salonId,
  action,
  children,
}: {
  salonId: number;
  action: (prev: ProfileState, formData: FormData) => Promise<ProfileState>;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="salonId" value={salonId} />
      {children}
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.saved && <Notice tone="success">✓ {t.saved}</Notice>}
      <SubmitButton className="btn-primary w-full">{t.save}</SubmitButton>
    </form>
  );
}
