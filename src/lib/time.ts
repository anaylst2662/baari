import type { OpeningHours } from "@/db/schema";

/** Pakistan Standard Time is a fixed UTC+5 with no daylight saving. */
export const TZ = "Asia/Karachi";
const OFFSET_MIN = 5 * 60;

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Current local date (YYYY-MM-DD), weekday (0 = Sunday) and minutes since midnight in PKT. */
export function localNow(now = new Date()) {
  const shifted = new Date(now.getTime() + OFFSET_MIN * 60_000);
  return {
    date: shifted.toISOString().slice(0, 10),
    dow: shifted.getUTCDay(),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

export function localDateToUtc(date: string, minutes: number): Date {
  const [y, mo, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, 0, minutes - OFFSET_MIN));
}

export function addDays(date: string, days: number): string {
  const [y, mo, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d + days)).toISOString().slice(0, 10);
}

export function dayOfWeek(date: string): number {
  const [y, mo, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
}

export function localDateOf(instant: Date): string {
  return localNow(instant).date;
}

/**
 * Whether the salon is inside its opening hours. A window whose close is not after
 * its open (e.g. 14:00–01:00) runs past midnight, which is common for barbershops.
 */
export function withinHours(hours: OpeningHours, now = new Date()): boolean {
  const { dow, minutes } = localNow(now);
  const today = hours[dow];
  if (today) {
    const open = toMinutes(today.open);
    const close = toMinutes(today.close);
    if (close > open ? minutes >= open && minutes < close : minutes >= open) return true;
  }
  const yesterday = hours[(dow + 6) % 7];
  if (yesterday) {
    const open = toMinutes(yesterday.open);
    const close = toMinutes(yesterday.close);
    if (close <= open && minutes < close) return true;
  }
  return false;
}

export function formatTime(d: Date, lang: string = "en") {
  return new Intl.DateTimeFormat(lang === "ur" ? "ur-PK" : "en-PK", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function formatDate(d: Date | string, lang: string = "en") {
  const date = typeof d === "string" ? localDateToUtc(d, 12 * 60) : d;
  return new Intl.DateTimeFormat(lang === "ur" ? "ur-PK" : "en-PK", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatHHMM(hhmm: string, lang: string = "en") {
  return formatTime(localDateToUtc("2026-01-01", toMinutes(hhmm)), lang);
}
