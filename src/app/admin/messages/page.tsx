import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { formatDate, formatTime } from "@/lib/time";
import { displayPhone } from "@/lib/phone";

export default async function AdminMessages() {
  await requireAdmin();
  const { t, lang } = await getDict();
  const outbox = await db.select().from(schema.notifications).orderBy(desc(schema.notifications.id)).limit(50);

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
    </div>
  );
}
