import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/experiences/admin/shell";
import { loadShellViewer } from "@/experiences/shared/server";

/**
 * Admin — only phone numbers in ADMIN_PHONES. Everyone else gets "page not found".
 * Every admin page and admin action also checks this on its own.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return <AdminShell viewer={await loadShellViewer()}>{children}</AdminShell>;
}
