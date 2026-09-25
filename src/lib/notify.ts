import "server-only";
import { db, schema } from "@/db";

export function messagingConfigured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** In demo mode OTP codes are shown on screen and messages only go to the outbox. */
export function demoMode() {
  return process.env.DEMO_MODE === "true" || (process.env.NODE_ENV !== "production" && !messagingConfigured());
}

export function appUrl(path = "") {
  return `${process.env.APP_URL ?? "http://localhost:3000"}${path}`;
}

/**
 * Sends a WhatsApp text via the WhatsApp Business Cloud API when configured; always
 * records the message in the outbox so the admin panel shows what was sent.
 * Note: outside the 24h customer-service window Meta requires approved templates —
 * swap `text` for a `template` payload once templates are approved.
 */
export async function sendMessage(phone: string, body: string) {
  let status = "logged";
  let error: string | null = null;

  if (messagingConfigured()) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phone.replace(/^\+/, ""),
            type: "text",
            text: { body },
          }),
        },
      );
      status = res.ok ? "sent" : "failed";
      if (!res.ok) error = (await res.text()).slice(0, 500);
    } catch (e) {
      status = "failed";
      error = String(e).slice(0, 500);
    }
  } else {
    console.log(`[whatsapp:demo] to ${phone}: ${body}`);
  }

  await db.insert(schema.notifications).values({ phone, body, status, error });
}
