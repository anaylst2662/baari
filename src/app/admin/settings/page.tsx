import { requireAdmin } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { adminPhones } from "@/lib/roles";
import { appUrl, demoMode, messagingConfigured } from "@/lib/notify";
import { displayPhone } from "@/lib/phone";

/**
 * Admin → Settings: a read-only health check of how Baari is configured.
 * Values are changed in Vercel → Settings → Environment Variables. Secrets are never shown.
 */
export default async function AdminSettings() {
  await requireAdmin();
  const { t } = await getDict();
  const ok = (v: boolean) => (v ? <span className="font-bold text-emerald-700">✓ {t.on}</span> : <span className="font-bold text-amber-700">✗ {t.off}</span>);
  const rows: [string, React.ReactNode, string][] = [
    [t.cfgAdmins, <span key="a" className="num" dir="ltr">{adminPhones().map(displayPhone).join(", ") || "—"}</span>, "ADMIN_PHONES"],
    [t.cfgWhatsApp, ok(messagingConfigured()), "WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID"],
    [t.cfgDemo, demoMode() ? <span className="font-bold text-red-700">⚠ {t.on}</span> : ok(false), "DEMO_MODE"],
    [t.cfgDatabase, ok(Boolean(process.env.DATABASE_URL)), "DATABASE_URL"],
    [t.cfgReminders, ok(Boolean(process.env.CRON_SECRET)), "CRON_SECRET"],
    [t.cfgSiteAddress, <span key="u" dir="ltr">{appUrl()}</span>, "APP_URL"],
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{t.settings}</h1>
      <p className="text-slate-600">{t.settingsHelp}</p>
      <dl className="card divide-y divide-slate-100">
        {rows.map(([label, value, env]) => (
          <div key={env} className="flex min-h-14 flex-wrap items-center justify-between gap-2 px-4 py-2">
            <dt>
              <span className="block font-semibold">{label}</span>
              <code className="text-xs text-slate-400">{env}</code>
            </dt>
            <dd className="text-sm">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
