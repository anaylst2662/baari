import Link from "next/link";
import { BackIcon } from "@/components/icons";

/** Title for a My Salon section, with a big "back to My Salon" link. */
export function SectionHeader({ salonId, title, backLabel }: { salonId: number; title: string; backLabel: string }) {
  return (
    <div className="mb-4 space-y-1">
      <Link href={`/business/${salonId}/salon`} className="-ms-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-zinc-600">
        <BackIcon className="h-5 w-5 rtl:rotate-180" /> {backLabel}
      </Link>
      <h2 className="text-2xl font-extrabold">{title}</h2>
    </div>
  );
}
