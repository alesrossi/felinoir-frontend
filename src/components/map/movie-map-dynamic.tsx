"use client";

import dynamic from "next/dynamic";

export type { MovieCinemaMarker, MovieShowing } from "./movie-map";

const MovieMap = dynamic(
  () => import("./movie-map").then(m => ({ default: m.MovieMap })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
        Loading map…
      </div>
    ),
  },
);

export { MovieMap };
