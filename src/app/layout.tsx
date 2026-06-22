import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { Playfair_Display, DM_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { LangProvider } from "@/lib/lang";
import { ConditionalFabs } from "@/components/conditional-fabs";
import { getCinemasConfig } from "@/lib/cinemas-config";
import { apiFetch } from "@/lib/api/client";
import type { ApiCinema } from "@/lib/api/types";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const dynamic = "force-dynamic";

const BASE_URL = "https://felinoir.it";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Felinoir",
    template: "%s | Felinoir",
  },
  description: "Scopri i cinema di Roma",
  authors: [{ name: "Alessandro Rossi", url: BASE_URL }],
  creator: "Alessandro Rossi",
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: "website",
    locale: "it_IT",
    url: BASE_URL,
    siteName: "Felinoir",
    title: "Felinoir",
    description: "Scopri i cinema di Roma",
  },
  twitter: {
    card: "summary_large_image",
    title: "Felinoir",
    description: "Scopri i cinema di Roma",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-visual",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cinemas = await apiFetch<ApiCinema[]>("/cinemas");
  const cinemaConfigs = getCinemasConfig();
  const cinemaConfigMap = new Map(cinemaConfigs.map(c => [c.id, c]));
  const dbIds = new Set(cinemas.map(c => c.id));
  // Open-air cinemas from config always appear even if not yet scraped
  const openAirOnly = cinemaConfigs.filter(c => c.openAir && !dbIds.has(c.id));
  const cinemaList = [
    ...cinemas.map(c => ({ id: c.id, name: c.name, openAir: cinemaConfigMap.get(c.id)?.openAir ?? false })),
    ...openAirOnly.map(c => ({ id: c.id, name: c.name, openAir: true })),
  ].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <html
      lang="it"
      className={`${dmSans.variable} ${GeistMono.variable} ${playfair.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Hide the page until client preferences are loaded, preventing flash of default content */}
        <style dangerouslySetInnerHTML={{ __html: `html:not([data-ready]){visibility:hidden}` }} />
        <script dangerouslySetInnerHTML={{ __html: `setTimeout(function(){document.documentElement.setAttribute('data-ready','')},2000);` }} />
        <script defer src="https://umami.felinoir.it/script.js" data-website-id="71103aa6-da52-4da8-83d4-62a1508ea87c"></script>
      </head>
      <body suppressHydrationWarning>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:border-border focus:rounded">
          Vai al contenuto principale
        </a>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <LangProvider>
            {children}
            <div className="fixed bottom-10 left-10 z-40 flex flex-col items-center gap-4">
              <ConditionalFabs cinemas={cinemaList} />
            </div>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
