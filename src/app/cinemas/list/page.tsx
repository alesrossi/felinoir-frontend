import { getCinemasConfig } from "@/lib/cinemas-config";
import { CinemasListHeader } from "./cinemas-list-header";
import { CinemasListContent } from "./cinemas-list-content";

export default function CinemasListPage() {
  const cinemas = getCinemasConfig()
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-12">

        <CinemasListHeader />

        <CinemasListContent cinemas={cinemas} />

      </div>
    </div>
  );
}
