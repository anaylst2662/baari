import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ownedSalons } from "@/lib/roles";

/** Salon owners land on their (first) salon; anyone else is offered salon registration. */
export default async function PartnerIndex() {
  const user = await requireUser("/partner");
  const [first] = await ownedSalons(user.id);
  redirect(first ? `/partner/${first.id}` : "/partner/new");
}
