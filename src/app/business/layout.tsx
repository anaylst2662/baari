import { requireUser } from "@/lib/auth";
import { BusinessHeader } from "@/experiences/business/shell";
import { loadShellViewer } from "@/experiences/shared/server";

/**
 * Baari Business. Every page here needs a login; each salon's pages additionally
 * check ownership in business/[id]/layout.tsx and in every action.
 */
export default async function BusinessLayout({ children }: LayoutProps<"/business">) {
  await requireUser("/business");
  return (
    <div data-experience="business" className="min-h-dvh bg-zinc-100">
      <BusinessHeader viewer={await loadShellViewer()} />
      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4">{children}</main>
    </div>
  );
}
