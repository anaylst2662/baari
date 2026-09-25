import "server-only";
import { getUser } from "@/lib/auth";
import { experiencesFor, viewerFor } from "@/lib/roles";
import type { ShellViewer } from "./types";

/** Loads the logged-in person for a header/menu (null for guests). */
export async function loadShellViewer(): Promise<ShellViewer> {
  const viewer = await viewerFor(await getUser());
  if (!viewer) return null;
  const access = experiencesFor(viewer);
  return { name: viewer.user.name, phone: viewer.user.phone, access: { customer: true, business: access.business, admin: access.admin } };
}
