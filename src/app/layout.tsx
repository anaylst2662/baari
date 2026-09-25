import type { Metadata, Viewport } from "next";
import { Geist, Noto_Nastaliq_Urdu } from "next/font/google";
import { getDict } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import { getUser } from "@/lib/auth";
import { Header, BottomNav, type NavViewer } from "@/components/nav";
import { viewerFor } from "@/lib/roles";
import { RegisterSWInner as RegisterSW } from "@/components/client";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const nastaliq = Noto_Nastaliq_Urdu({ variable: "--font-nastaliq", subsets: ["arabic"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: { default: "Baari — book salons & barbers without the wait", template: "%s · Baari" },
  description:
    "Find nearby salons and barbershops in Islamabad and Rawalpindi, see live wait times and prices, join the queue or book from home.",
  applicationName: "Baari",
  appleWebApp: { capable: true, title: "Baari", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [{ lang }, user] = await Promise.all([getDict(), getUser()]);
  const viewer = await viewerFor(user);
  // Only what the menus need is sent to the browser.
  const nav: NavViewer = viewer && {
    name: viewer.user.name,
    phone: viewer.user.phone,
    admin: viewer.admin,
    salons: viewer.salons.map((s) => ({ id: s.id, name: s.name, mode: s.mode })),
  };
  return (
    <html lang={lang} dir={lang === "ur" ? "rtl" : "ltr"} className={`${geistSans.variable} ${nastaliq.variable} antialiased`}>
      <body className="min-h-dvh">
        <I18nProvider lang={lang}>
          <Header viewer={nav} />
          <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4">{children}</main>
          <BottomNav viewer={nav} />
        </I18nProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
