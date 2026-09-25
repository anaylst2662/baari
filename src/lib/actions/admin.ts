"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { recomputeRating } from "@/lib/salons";
import { appUrl, sendMessage } from "@/lib/notify";

export async function setSalonStatus(formData: FormData) {
  await requireAdmin();
  const id = z.coerce.number().int().parse(formData.get("salonId"));
  const status = z.enum(["approved", "rejected", "pending"]).parse(formData.get("status"));
  const [salon] = await db
    .update(schema.salons)
    .set({ status, lastActiveAt: new Date() })
    .where(eq(schema.salons.id, id))
    .returning();
  if (salon?.ownerId && status !== "pending") {
    const [owner] = await db.select().from(schema.users).where(eq(schema.users.id, salon.ownerId));
    if (owner) {
      await sendMessage(
        owner.phone,
        status === "approved"
          ? `Baari: 🎉 ${salon.name} is now live! Share your page: ${appUrl(`/s/${salon.slug}`)}`
          : `Baari: ${salon.name} could not be approved yet. Our team will contact you.`,
      );
    }
  }
  revalidatePath("/admin", "layout");
}

export async function toggleFeatured(formData: FormData) {
  await requireAdmin();
  const id = z.coerce.number().int().parse(formData.get("salonId"));
  const [salon] = await db.select().from(schema.salons).where(eq(schema.salons.id, id));
  if (salon) await db.update(schema.salons).set({ featured: !salon.featured }).where(eq(schema.salons.id, id));
  revalidatePath("/admin", "layout");
}

export async function toggleReviewHidden(formData: FormData) {
  await requireAdmin();
  const id = z.coerce.number().int().parse(formData.get("reviewId"));
  const [review] = await db.select().from(schema.reviews).where(eq(schema.reviews.id, id));
  if (!review) return;
  await db.update(schema.reviews).set({ hidden: !review.hidden }).where(eq(schema.reviews.id, id));
  await recomputeRating(review.salonId);
  revalidatePath("/admin", "layout");
}
