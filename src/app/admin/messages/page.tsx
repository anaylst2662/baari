import { desc, isNotNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { isAdmin } from "@/lib/roles";
import { formatDate, formatTime } from "@/lib/time";
import { displayPhone } from "@/lib/phone";

export default async function AdminMessages() {
  await requireAdmin();
  const { t, lang } = await getDict();
  const [outbox, users, owners] = await Promise.all([
    db.select().from(schema.notifications).orderBy(desc(schema.notifications.id)).limit(50),
    db.select().from(schema.users).orderBy(desc(schema.users.createdAt)).limit(30),
    db.selectDistinct({ id: schema.salons.ownerId }).from(schema.salons).where(isNotNull(schema.salons.ownerId)),
  ]);
  const ownerIds = new Set(owners.map((o) => o.id));
  const roleOf = (u: (typeof users)[number]) => (isAdmin(u) ? t.roleAdmin : ownerIds.has(u.id) ? t.roleOwner : t.roleCustomer);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="section-title text-2xl">{t.outbox}</h1>
        <ul className="card max-h-[28rem] divide-y divide-slate-100 overflow-y-auto text-xs">
          {outbox.map((n) => (
            <li key={n.id} className="p-3">
              <p className="num text-slate-500" dir="ltr">
                {displayPhone(n.phone)} · {formatDate(n.createdAt, lang)} {formatTime(n.createdAt, lang)} · {n.status}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap" dir="ltr">
                {n.body}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="section-title">{t.users}</h2>
        <ul className="card divide-y divide-slate-100 text-sm">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-2 p-3">
              <span>{u.name ?? "—"}</span>
              <span className="num text-end text-slate-500" dir="ltr">
                {displayPhone(u.phone)} · {roleOf(u)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
