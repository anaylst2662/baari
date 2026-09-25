import type { Metadata, Viewport } from "next";
import { Geist, Noto_Nastaliq_Urdu } from "next/font/google";
import { getDict } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
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

/**
 * The bare frame shared by all three experiences. Each experience adds its own
 * header and bottom menu in its own layout: (customer)/layout.tsx,
 * business/layout.tsx and admin/layout.tsx.
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { lang } = await getDict();
  return (
    <html lang={lang} dir={lang === "ur" ? "rtl" : "ltr"} className={`${geistSans.variable} ${nastaliq.variable} antialiased`}>
      <body className="min-h-dvh">
        <I18nProvider lang={lang}>{children}</I18nProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
