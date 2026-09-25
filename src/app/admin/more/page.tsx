import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getDict } from "@/lib/i18n/server";
import { MessageIcon, SettingsIcon } from "@/components/icons";

/** Admin → More: the less-used admin pages. */
export default async function AdminMore() {
  await requireAdmin();
  const { t } = await getDict();
  const links = [
    { href: "/admin/messages", icon: MessageIcon, title: t.navMessages, sub: t.messagesSub },
    { href: "/admin/settings", icon: SettingsIcon, title: t.settings, sub: t.settingsSub },
  ];
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-extrabold">{t.navMore}</h1>
      {links.map(({ href, icon: Icon, title, sub }) => (
        <Link key={href} href={href} className="card flex min-h-16 items-center gap-3 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-950 text-white">
            <Icon className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block font-bold">{title}</span>
            <span className="block text-sm text-slate-500">{sub}</span>
          </span>
          <span className="text-slate-400 rtl:rotate-180">→</span>
        </Link>
      ))}
    </div>
  );
}
