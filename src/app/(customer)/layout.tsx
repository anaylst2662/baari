import { CustomerShell } from "@/experiences/customer/shell";
import { loadShellViewer } from "@/experiences/shared/server";

/** Customer app: /, /search, /s/…, /book/…, /bookings, /profile. Open to guests. */
export default async function CustomerLayout({ children }: LayoutProps<"/">) {
  return <CustomerShell viewer={await loadShellViewer()}>{children}</CustomerShell>;
}
