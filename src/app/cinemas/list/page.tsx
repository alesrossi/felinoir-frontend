import type { Metadata } from "next";
import { getCinemasConfig } from "@/lib/cinemas-config";
import { CinemasListHeader } from "./cinemas-list-header";
import { CinemasListContent } from "./cinemas-list-content";
import { JsonLd, buildBreadcrumbList, buildItemList, graph } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Cinema di Roma",
  alternates: { canonical: "/cinemas/list" },
};

export default function CinemasListPage() {
  const cinemas = getCinemasConfig()
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  // Entries carry name + url only; each cinema is fully described on its page.
  const structuredData = graph(
    buildItemList({
      id: "https://felinoir.it/cinemas/list#cinemas",
      name: "Cinema di Roma",
      entries: cinemas.map((c) => ({ name: c.name, url: `/cinemas/${c.id}` })),
      maxItems: cinemas.length,
    }),
    buildBreadcrumbList([{ name: "Felinoir", url: "/" }, { name: "Cinema" }]),
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <JsonLd data={structuredData} />
      <div className="mx-auto max-w-2xl px-4 py-12">

        <CinemasListHeader />

        <CinemasListContent cinemas={cinemas} />

      </div>
    </div>
  );
}
