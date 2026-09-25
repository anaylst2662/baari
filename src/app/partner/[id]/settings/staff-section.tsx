import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Salon } from "@/db/schema";
import type { Dict } from "@/lib/i18n/dict";
import { addStaff, updateStaff } from "@/lib/actions/partner";
import { SubmitButton } from "@/components/client";
import { Empty } from "@/components/ui";

/** Staff list with "on duty" toggles — used by the salon settings page. */
export async function StaffSection({ salon, t }: { salon: Salon; t: Dict }) {
  const staff = await db
    .select()
    .from(schema.staff)
    .where(and(eq(schema.staff.salonId, salon.id), eq(schema.staff.active, true)))
    .orderBy(asc(schema.staff.name));

  return (
    <section className="space-y-3">
      <h2 className="section-title mb-0">{t.staff}</h2>
      <p className="text-sm text-slate-600">
        Staff on duty are used to estimate queue wait times and how many bookings can overlap.
      </p>
      <form action={addStaff} className="card flex gap-2 p-3">
        <input type="hidden" name="salonId" value={salon.id} />
        <input name="name" required maxLength={40} placeholder={t.name} className="input flex-1" />
        <SubmitButton>+ {t.addStaff}</SubmitButton>
      </form>
      {staff.length === 0 ? (
        <Empty>{t.noBookings}</Empty>
      ) : (
        <ul className="card divide-y divide-slate-100">
          {staff.map((s) => (
            <li key={s.id} className="flex items-center gap-3 p-3">
              <span className={`h-2.5 w-2.5 rounded-full ${s.onDuty ? "bg-emerald-500" : "bg-slate-300"}`} />
              <span className="flex-1 font-medium">{s.name}</span>
              {(["duty", "remove"] as const).map((intent) => (
                <form key={intent} action={updateStaff}>
                  <input type="hidden" name="salonId" value={salon.id} />
                  <input type="hidden" name="staffId" value={s.id} />
                  <input type="hidden" name="intent" value={intent} />
                  <SubmitButton
                    className={intent === "duty" ? "btn-secondary btn-sm" : "btn-danger btn-sm"}
                    confirm={intent === "remove" ? `${t.remove} ${s.name}?` : undefined}
                  >
                    {intent === "duty" ? (s.onDuty ? t.onDuty : t.offDuty) : t.remove}
                  </SubmitButton>
                </form>
              ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
