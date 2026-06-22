"use client";

import dynamic from "next/dynamic";
import type { GeocodedCinema } from "@/lib/osm/types";

// MapLibre accesses `window` on import — must be loaded client-side only.
const CinemaMap = dynamic(
  () => import("./cinema-map").then((m) => m.CinemaMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground text-sm">
        Loading map…
      </div>
    ),
  },
);

export { CinemaMap };
export type { GeocodedCinema };
