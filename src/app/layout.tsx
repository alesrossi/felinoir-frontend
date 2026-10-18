import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import {
  Playfair_Display,
  DM_Sans,
  Noto_Sans,
  Noto_Sans_Arabic,
  Noto_Sans_Devanagari,
} from "next/font/google";
// CJK fallbacks come from npm, not next/font: Google splits each into ~100
// unicode-range files per weight, and next/font downloads all of them at build
// time (~1,100 requests for the three) — enough to make Docker builds fail.
// Fontsource ships the same slices, variable-weight, straight from node_modules.
import "@fontsource-variable/noto-sans-sc";
import "@fontsource-variable/noto-sans-jp";
import "@fontsource-variable/noto-sans-kr";
import { ThemeProvider } from "next-themes";
import { LangProvider } from "@/lib/lang";
import { ConditionalFabs } from "@/components/conditional-fabs";
import { getCinemasConfig } from "@/lib/cinemas-config";
import { apiFetch } from "@/lib/api/client";
import type { ApiCinema } from "@/lib/api/types";
import { JsonLd, buildOrganization, buildWebSite, graph } from "@/lib/structured-data";
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

// Fallbacks for scripts DM Sans can't draw (Russian titles, K-pop cast lists,
// anime, Bollywood…). Google serves these as unicode-range slices, so a browser
// only downloads the slices for characters actually on the page — nothing for
// Latin-only pages. (next/font needs literal options, hence no shared object.)
// Stack order lives in tailwind.config.ts; the CJK variables are set in globals.css.
const notoSans = Noto_Sans({ variable: "--font-noto", weight: ["400", "500", "600"], preload: false });  // Cyrillic, Greek
const notoSansArabic = Noto_Sans_Arabic({ variable: "--font-noto-arabic", weight: ["400", "500", "600"], preload: false });
const notoSansDevanagari = Noto_Sans_Devanagari({ variable: "--font-noto-devanagari", weight: ["400", "500", "600"], preload: false });

const fallbackFontVariables = [
  notoSans, notoSansArabic, notoSansDevanagari,
].map((f) => f.variable).join(" ");

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
  // No `alternates.canonical` here on purpose: root metadata is inherited, so a
  // canonical pointing at the homepage would be repeated on every film and
  // cinema page and canonicalise them away. Each route declares its own.
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
      className={`${dmSans.variable} ${GeistMono.variable} ${playfair.variable} ${fallbackFontVariables} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Hide the page until client preferences are loaded, preventing flash of default content */}
        <style dangerouslySetInnerHTML={{ __html: `html:not([data-ready]){visibility:hidden}` }} />
        <script dangerouslySetInnerHTML={{ __html: `setTimeout(function(){document.documentElement.setAttribute('data-ready','')},2000);` }} />
        <script defer src="https://umami.felinoir.it/script.js" data-website-id="71103aa6-da52-4da8-83d4-62a1508ea87c"></script>
        {/* Site-wide entities, emitted once. Page-specific nodes reference them by @id. */}
        <JsonLd data={graph(buildWebSite(), buildOrganization())} />
      </head>
      <body suppressHydrationWarning>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:border-border focus:rounded">
          Vai al contenuto principale
        </a>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <LangProvider>
            {children}
            {/* Pages can move the buttons to the right on mobile by setting
                data-fabs="right" on <html> (the film page does in list view). */}
            <div className="fixed bottom-10 left-10 z-40 flex flex-col items-center gap-4 max-sm:[html[data-fabs=right]_&]:left-auto max-sm:[html[data-fabs=right]_&]:right-10">
              <ConditionalFabs cinemas={cinemaList} />
            </div>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
