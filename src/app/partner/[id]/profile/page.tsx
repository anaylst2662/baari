import { redirect } from "next/navigation";

/** Old address — this page now lives under Salon settings. */
export default async function Moved({ params }: PageProps<"/partner/[id]/profile">) {
  const { id } = await params;
  redirect(`/partner/${id}/settings`);
}
