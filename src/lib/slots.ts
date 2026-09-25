import "server-only";
import { and, eq, gt, inArray, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Salon } from "@/db/schema";
import { dayOfWeek, localDateToUtc, localNow, toMinutes } from "./time";

const SLOT_STEP_MIN = 30;
const MIN_LEAD_MIN = 30;

export type Slot = { minutes: number; startsAt: string; staffIds: number[] };

/**
 * Free appointment slots for a service on a local date. A slot is free when at least
 * one active staff member (or the chosen one) has no overlapping pending/confirmed
 * booking. Bookings without a staff member take up one unit of shared capacity.
 */
export async function getFreeSlots(
  salon: Salon,
  serviceDurationMin: number,
  date: string,
  staffId?: number,
): Promise<Slot[]> {
  const window = salon.hours[dayOfWeek(date)];
  if (!window) return [];
  const open = toMinutes(window.open);
  let close = toMinutes(window.close);
  if (close <= open) close += 24 * 60;

  const staffRows = await db
    .select({ id: schema.staff.id })
    .from(schema.staff)
    .where(and(eq(schema.staff.salonId, salon.id), eq(schema.staff.active, true)));
  const staffIds = staffRows.map((s) => s.id);
  const pool = staffId ? staffIds.filter((id) => id === staffId) : staffIds;
  const capacity = Math.max(1, staffIds.length);
  if (staffId && pool.length === 0) return [];

  const dayStart = localDateToUtc(date, open);
  const dayEnd = localDateToUtc(date, close);
  const existing = await db
    .select({
      staffId: schema.bookings.staffId,
      startsAt: schema.bookings.startsAt,
      endsAt: schema.bookings.endsAt,
    })
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.salonId, salon.id),
        inArray(schema.bookings.status, ["pending", "confirmed"]),
        lt(schema.bookings.startsAt, dayEnd),
        gt(schema.bookings.endsAt, dayStart),
      ),
    );

  const now = localNow();
  const earliest = date === now.date ? now.minutes + MIN_LEAD_MIN : -Infinity;
  const slots: Slot[] = [];

  for (let m = open; m + serviceDurationMin <= close; m += SLOT_STEP_MIN) {
    if (m < earliest) continue;
    const start = localDateToUtc(date, m);
    const end = localDateToUtc(date, m + serviceDurationMin);
    const overlapping = existing.filter((b) => b.startsAt < end && b.endsAt > start);
    if (overlapping.length >= capacity) continue;
    const busy = new Set(overlapping.map((b) => b.staffId).filter((id): id is number => id !== null));
    const unassigned = overlapping.filter((b) => b.staffId === null).length;
    const free = pool.filter((id) => !busy.has(id));
    // Unassigned bookings will be taken by whichever staff member is free.
    if (staffIds.length > 0 && free.length - (staffId ? 0 : unassigned) <= 0) continue;
    if (staffId && staffIds.filter((id) => !busy.has(id)).length - unassigned <= 0) continue;
    slots.push({ minutes: m, startsAt: start.toISOString(), staffIds: free });
  }
  return slots;
}
