import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ownedSalons } from "@/lib/roles";

/** /business → the owner's (first) salon. People without a salon are offered signup. */
export default async function BusinessIndex() {
  const user = await requireUser("/business");
  const [first] = await ownedSalons(user.id);
  redirect(first ? `/business/${first.id}` : "/business/join");
}
