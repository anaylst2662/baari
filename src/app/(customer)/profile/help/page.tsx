import Link from "next/link";
import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { BackIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Help" };

/** Customer app → Profile → Help: short answers in simple words. */
export default async function HelpPage() {
  const { t } = await getDict();
  const whatsapp = process.env.SUPPORT_WHATSAPP?.replace(/[^\d]/g, "");
  const faqs = [
    [t.faqBookQ, t.faqBookA],
    [t.faqQueueQ, t.faqQueueA],
    [t.faqCancelQ, t.faqCancelA],
    [t.faqPayQ, t.faqPayA],
    [t.faqSalonQ, t.faqSalonA],
  ];
  return (
    <div className="space-y-4">
      <Link href="/profile" className="-ms-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-brand-700">
        <BackIcon className="h-5 w-5 rtl:rotate-180" /> {t.navProfile}
      </Link>
      <h1 className="text-2xl font-extrabold">{t.help}</h1>
      <div className="space-y-2">
        {faqs.map(([q, a]) => (
          <details key={q} className="card">
            <summary className="flex min-h-14 cursor-pointer items-center px-4 font-semibold">{q}</summary>
            <p className="border-t border-slate-100 px-4 py-3 text-slate-700">{a}</p>
          </details>
        ))}
      </div>
      {whatsapp && (
        <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="btn-primary w-full">
          💬 {t.contactOnWhatsApp}
        </a>
      )}
    </div>
  );
}
