import Link from "next/link";
import type { Salon } from "@/db/schema";
import type { Dict } from "@/lib/i18n/dict";
import { displayPhone } from "@/lib/phone";
import { setSalonStatus, toggleFeatured } from "@/lib/actions/admin";
import { SubmitButton } from "@/components/client";
import { typeLabel } from "@/components/ui";

export function SalonRow({ salon, ownerPhone, t }: { salon: Salon; ownerPhone: string | null; t: Dict }) {
  const statusTone =
    salon.status === "approved" ? "text-emerald-700" : salon.status === "pending" ? "text-amber-700" : "text-red-700";
  return (
    <li className={`card p-3 ${salon.status === "pending" ? "border-amber-300 bg-amber-50/50" : ""}`}>
      <div className="min-w-0">
        <Link href={`/s/${salon.slug}`} className="font-semibold hover:text-brand-700">
          {salon.name}
        </Link>
        <p className="text-xs text-slate-500">
          {typeLabel(salon.type, t)} · {salon.area}, {salon.city}
          {ownerPhone && <span className="num"> · {displayPhone(ownerPhone)}</span>}
          {" · "}
          <span className={`font-semibold ${statusTone}`}>{salon.status}</span>
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {salon.status !== "approved" && (
          <form action={setSalonStatus}>
            <input type="hidden" name="salonId" value={salon.id} />
            <input type="hidden" name="status" value="approved" />
            <SubmitButton className="btn-primary btn-sm min-h-9">✓ {t.approve}</SubmitButton>
          </form>
        )}
        {salon.status !== "rejected" && (
          <form action={setSalonStatus}>
            <input type="hidden" name="salonId" value={salon.id} />
            <input type="hidden" name="status" value="rejected" />
            <SubmitButton className="btn-danger btn-sm min-h-9" confirm={`${t.reject} ${salon.name}?`}>
              {t.reject}
            </SubmitButton>
          </form>
        )}
        <form action={toggleFeatured}>
          <input type="hidden" name="salonId" value={salon.id} />
          <SubmitButton className={`${salon.featured ? "btn-primary" : "btn-secondary"} btn-sm min-h-9`}>★ {t.featured}</SubmitButton>
        </form>
        <Link href={`/partner/${salon.id}`} className="btn-secondary btn-sm min-h-9">
          {t.navDashboard} →
        </Link>
      </div>
    </li>
  );
}
