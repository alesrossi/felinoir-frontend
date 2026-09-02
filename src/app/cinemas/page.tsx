import type { Metadata } from "next";
import { CinemaMap } from "@/components/map/cinema-map-dynamic";
import { CinemasBackLink } from "./cinemas-back-link";
import { getCinemasConfig } from "@/lib/cinemas-config";
import type { GeocodedCinema } from "@/lib/osm/types";
import { JsonLd, buildBreadcrumbList, buildItemList, graph } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Cinema di Roma",
  alternates: { canonical: "/cinemas" },
};

export default function CinemasPage() {
  const cinemas: GeocodedCinema[] = getCinemasConfig().map((c) => ({
    id: c.id,
    name: c.name,
    address: c.address,
    website: c.website,
    openAir: c.openAir,
    coordinates: c.coordinates,
  }));

  const structuredData = graph(
    buildItemList({
      id: "https://felinoir.it/cinemas#cinemas",
      name: "Cinema di Roma",
      entries: cinemas.map((c) => ({ name: c.name, url: `/cinemas/${c.id}` })),
      maxItems: cinemas.length,
    }),
    buildBreadcrumbList([{ name: "Felinoir", url: "/" }, { name: "Cinema" }]),
  );

  return (
    <main id="main-content" className="h-dvh flex flex-col bg-background text-foreground">
      <JsonLd data={structuredData} />
      {/* Thin top bar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border shrink-0">
        <CinemasBackLink />
        <h1 className="text-lg font-semibold">Cinemas</h1>
      </div>

      {/* Map fills the rest of the viewport */}
      <div className="flex-1 min-h-0">
        <CinemaMap cinemas={cinemas} />
      </div>
    </main>
  );
}
