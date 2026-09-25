import { desc, ilike, isNotNull, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { isAdmin } from "@/lib/roles";
import { formatDate } from "@/lib/time";
import { displayPhone, normalizePkPhone } from "@/lib/phone";
import { Empty } from "@/components/ui";

/** Admin → Users: search by name or phone; shows each person's role. */
export default async function AdminUsers({ searchParams }: PageProps<"/admin/users">) {
  await requireAdmin();
  const { t, lang } = await getDict();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const phone = q ? normalizePkPhone(q) : null;
  const where = q ? or(ilike(schema.users.name, `%${q}%`), ilike(schema.users.phone, `%${phone ?? q.replace(/^0/, "")}%`)) : undefined;

  const [users, owners, [{ total }]] = await Promise.all([
    db
      .select({
        user: schema.users,
        bookings: sql<number>`(select count(*)::int from bookings b where b.user_id = "users"."id")`,
      })
      .from(schema.users)
      .where(where)
      .orderBy(desc(schema.users.createdAt))
      .limit(100),
    db.selectDistinct({ id: schema.salons.ownerId }).from(schema.salons).where(isNotNull(schema.salons.ownerId)),
    db.select({ total: sql<number>`count(*)::int` }).from(schema.users),
  ]);
  const ownerIds = new Set(owners.map((o) => o.id));
  const badge = (u: (typeof users)[number]["user"]) =>
    isAdmin(u)
      ? ["bg-blue-950 text-white", t.roleAdmin]
      : ownerIds.has(u.id)
        ? ["bg-zinc-900 text-amber-300", t.roleOwner]
        : ["bg-slate-100 text-slate-700", t.roleCustomer];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">
        {t.users} <span className="num text-slate-400">({total})</span>
      </h1>
      <form className="flex gap-2">
        <input name="q" type="search" defaultValue={q} placeholder={t.searchUsers} className="input flex-1" />
        <button className="btn-primary">{t.search}</button>
      </form>
      {users.length === 0 ? (
        <Empty>{t.noResults}</Empty>
      ) : (
        <ul className="card divide-y divide-slate-100">
          {users.map(({ user: u, bookings }) => {
            const [cls, label] = badge(u);
            return (
              <li key={u.id} className="flex min-h-14 flex-wrap items-center gap-2 px-4 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{u.name ?? "—"}</span>
                  <span className="num block text-sm text-slate-500" dir="ltr">
                    {displayPhone(u.phone)}
                  </span>
                </span>
                <span className="num text-xs text-slate-500">
                  {bookings} {t.bookings} · {formatDate(u.createdAt, lang)}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
