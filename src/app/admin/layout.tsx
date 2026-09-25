import { requireAdmin } from "@/lib/auth";

/**
 * Every admin page is also checked on its own, but this makes sure any new page
 * added under /admin is protected too. Non-admins get "page not found".
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return children;
}
