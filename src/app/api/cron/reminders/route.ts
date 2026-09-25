import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { appUrl, sendMessage } from "@/lib/notify";
import { formatTime } from "@/lib/time";

const REMIND_BEFORE_MIN = 120;

/**
 * Sends WhatsApp reminders for confirmed bookings starting within the next two hours.
 * Call every 10–15 minutes from a scheduler (e.g. Vercel Cron) with
 * `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const due = await db
    .select({ booking: schema.bookings, phone: schema.users.phone, salon: schema.salons, serviceName: schema.services.name })
    .from(schema.bookings)
    .innerJoin(schema.users, eq(schema.users.id, schema.bookings.userId))
    .innerJoin(schema.salons, eq(schema.salons.id, schema.bookings.salonId))
    .innerJoin(schema.services, eq(schema.services.id, schema.bookings.serviceId))
    .where(
      and(
        eq(schema.bookings.status, "confirmed"),
        isNull(schema.bookings.reminderSentAt),
        gt(schema.bookings.startsAt, now),
        lt(schema.bookings.startsAt, new Date(now.getTime() + REMIND_BEFORE_MIN * 60_000)),
      ),
    );

  for (const { booking, phone, salon, serviceName } of due) {
    await db.update(schema.bookings).set({ reminderSentAt: now }).where(eq(schema.bookings.id, booking.id));
    await sendMessage(
      phone,
      `Baari reminder: ${serviceName} at ${salon.name} today at ${formatTime(booking.startsAt)}. ${salon.address}. Can't make it? Cancel here: ${appUrl("/bookings")}`,
    );
  }
  return Response.json({ sent: due.length });
}
