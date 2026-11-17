import type { Metadata, Viewport } from "next";
import "@fontsource-variable/unbounded";
import "@fontsource-variable/onest";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { getEnv } from "@/server/env";
import { getSettings } from "@/server/services/settings";

// Toutes les pages lisent la base et reçoivent un nonce CSP par requête : rendu dynamique obligatoire.
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#f4f5f1",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    metadataBase: new URL(getEnv().APP_URL),
    title: { default: settings.defaultSeoTitle, template: `%s · ${settings.siteName}` },
    description: settings.defaultSeoDescription,
    applicationName: settings.siteName,
    icons: settings.faviconUrl ? { icon: settings.faviconUrl } : undefined,
    openGraph: {
      type: "website",
      locale: "fr_TN",
      siteName: settings.siteName,
      title: settings.defaultSeoTitle,
      description: settings.defaultSeoDescription,
      images: settings.ogImageUrl ? [{ url: settings.ogImageUrl }] : undefined,
    },
    twitter: { card: "summary_large_image" },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
