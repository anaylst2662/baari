import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getDict } from "@/lib/i18n/server";
import { requireUser } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { estimateWait, getLiveQueue } from "@/lib/queue";
import { leaveQueue } from "@/lib/actions/customer";
import { WaitPill } from "@/components/ui";
import { AutoRefresh, SubmitButton } from "@/components/client";

export default async function TicketPage({ params }: PageProps<"/q/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/q/${id}`);
  const { t } = await getDict();
  const [row] = await db
    .select({ entry: schema.queueEntries, salon: schema.salons, serviceName: schema.services.name })
    .from(schema.queueEntries)
    .innerJoin(schema.salons, eq(schema.salons.id, schema.queueEntries.salonId))
    .leftJoin(schema.services, eq(schema.services.id, schema.queueEntries.serviceId))
    .where(eq(schema.queueEntries.id, Number(id)));
  if (!row || (row.entry.userId !== user.id && !isAdmin(user))) notFound();
  const { entry, salon } = row;

  const active = entry.status === "waiting" || entry.status === "called";
  const queue = active ? await getLiveQueue(salon.id) : null;
  const wait = queue && entry.status === "waiting" ? estimateWait(queue, entry.id) : null;
  const position = wait ? wait.ahead + 1 : 0;

  return (
    <div className="space-y-4">
      {active && <AutoRefresh seconds={10} />}
      <Link href={`/s/${salon.slug}`} className="text-sm text-brand-700">
        ← {salon.name}
      </Link>
      <section
        className={`rounded-3xl p-6 text-center shadow-lg ${entry.status === "called" ? "bg-saffron-400 text-slate-900" : active ? "bg-brand-800 text-white" : "bg-slate-200 text-slate-700"}`}
      >
        <p className="text-sm font-medium opacity-80">{t.yourTicket}</p>
        <p className="text-lg font-bold">{salon.name}</p>
        {row.serviceName && <p className="text-sm opacity-80">{row.serviceName}</p>}

        {entry.status === "waiting" && wait && (
          <>
            <p className="num mt-4 text-7xl font-black">#{position}</p>
            <p className="mt-1 text-sm">
              {wait.ahead === 0 ? t.youAreNext : (
                <>
                  <span className="num">{wait.ahead}</span> {t.peopleAhead}
                </>
              )}
            </p>
            <div className="mt-4 flex justify-center">
              <WaitPill low={wait.low} high={wait.high} t={t} />
            </div>
          </>
        )}
        {entry.status === "called" && <p className="mt-4 text-2xl font-extrabold">{t.itsYourTurn}</p>}
        {entry.status === "served" && <p className="mt-4 text-2xl font-bold">✓ {t.served}</p>}
        {entry.status === "left" && <p className="mt-4 text-xl font-bold">{t.leftQueue}</p>}
        {entry.status === "no_show" && <p className="mt-4 text-xl font-bold">{t.markedNoShow}</p>}
      </section>

      {active && (
        <>
          <p className="text-center text-xs text-slate-500">{t.liveUpdates}</p>
          <form action={leaveQueue} className="text-center">
            <input type="hidden" name="id" value={entry.id} />
            <SubmitButton className="btn-danger" confirm={`${t.leaveQueue}?`}>
              {t.leaveQueue}
            </SubmitButton>
          </form>
        </>
      )}
      {!active && (
        <div className="text-center">
          <Link href="/bookings" className="btn-secondary">
            {t.navBookings}
          </Link>
        </div>
      )}
    </div>
  );
}
