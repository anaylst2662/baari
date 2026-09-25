import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { appUrl, sendMessage } from "./notify";

const DEFAULT_SERVICE_MIN = 20;

export type LiveQueue = Awaited<ReturnType<typeof getLiveQueue>>;

/**
 * Loads the active queue (called + waiting, in order) for a salon, with service
 * details and customer names, plus the number of staff on duty.
 */
export async function getLiveQueue(salonId: number) {
  const rows = await db
    .select({
      entry: schema.queueEntries,
      serviceName: schema.services.name,
      durationMin: schema.services.durationMin,
      userName: schema.users.name,
      userPhone: schema.users.phone,
    })
    .from(schema.queueEntries)
    .leftJoin(schema.services, eq(schema.services.id, schema.queueEntries.serviceId))
    .leftJoin(schema.users, eq(schema.users.id, schema.queueEntries.userId))
    .where(
      and(
        eq(schema.queueEntries.salonId, salonId),
        inArray(schema.queueEntries.status, ["waiting", "called"]),
      ),
    )
    .orderBy(asc(schema.queueEntries.joinedAt), asc(schema.queueEntries.id));

  const [{ count: staffOnDuty }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.staff)
    .where(
      and(eq(schema.staff.salonId, salonId), eq(schema.staff.active, true), eq(schema.staff.onDuty, true)),
    );

  const called = rows.filter((r) => r.entry.status === "called");
  const waiting = rows.filter((r) => r.entry.status === "waiting");
  return { called, waiting, staffOnDuty: Math.max(1, staffOnDuty) };
}

/**
 * Wait estimate from the business plan: total minutes of services ahead divided by
 * staff working, shown as a range to stay honest. Customers being served count for
 * half their service time on average.
 */
export function estimateWait(
  queue: LiveQueue,
  aheadOf?: number,
): { low: number; high: number; ahead: number } {
  const idx = aheadOf === undefined ? queue.waiting.length : queue.waiting.findIndex((r) => r.entry.id === aheadOf);
  const ahead = queue.waiting.slice(0, Math.max(0, idx));
  const inChairMin = queue.called.reduce((s, r) => s + (r.durationMin ?? DEFAULT_SERVICE_MIN) / 2, 0);
  const aheadMin = ahead.reduce((s, r) => s + (r.durationMin ?? DEFAULT_SERVICE_MIN), 0);
  const chairsFree = Math.max(0, queue.staffOnDuty - queue.called.length);
  if (ahead.length < chairsFree) return { low: 0, high: 0, ahead: ahead.length };
  const minutes = (aheadMin + inChairMin) / queue.staffOnDuty;
  const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);
  return { low: round5(minutes * 0.8), high: round5(minutes * 1.25), ahead: ahead.length };
}

/** Sends a "your turn is near" WhatsApp alert to the next two customers in line (once each). */
export async function sendNearAlerts(salonId: number, salonName: string) {
  const queue = await getLiveQueue(salonId);
  for (const row of queue.waiting.slice(0, 2)) {
    if (row.entry.nearAlertSent || !row.userPhone) continue;
    await db
      .update(schema.queueEntries)
      .set({ nearAlertSent: true })
      .where(eq(schema.queueEntries.id, row.entry.id));
    await sendMessage(
      row.userPhone,
      `Baari: your turn at ${salonName} is close — please start heading over. Live ticket: ${appUrl(`/q/${row.entry.id}`)}`,
    );
  }
}
