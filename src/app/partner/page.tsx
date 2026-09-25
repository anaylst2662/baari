import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";

export default async function PartnerIndex() {
  const user = await requireUser("/partner");
  const [first] = await db
    .select({ id: schema.salons.id })
    .from(schema.salons)
    .where(eq(schema.salons.ownerId, user.id))
    .orderBy(asc(schema.salons.id))
    .limit(1);
  redirect(first ? `/partner/${first.id}` : "/partner/new");
}
