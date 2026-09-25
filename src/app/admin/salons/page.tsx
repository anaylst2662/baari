import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { SalonRow } from "../salon-row";

export default async function AdminSalons() {
  await requireAdmin();
  const { t } = await getDict();
  const salons = await db
    .select({ salon: schema.salons, ownerPhone: schema.users.phone })
    .from(schema.salons)
    .leftJoin(schema.users, eq(schema.users.id, schema.salons.ownerId))
    .orderBy(sql`case when ${schema.salons.status} = 'pending' then 0 else 1 end`, desc(schema.salons.createdAt));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">
        {t.allSalons} <span className="num text-slate-400">({salons.length})</span>
      </h1>
      <ul className="space-y-2">
        {salons.map(({ salon, ownerPhone }) => (
          <SalonRow key={salon.id} salon={salon} ownerPhone={ownerPhone} t={t} />
        ))}
      </ul>
    </div>
  );
}
