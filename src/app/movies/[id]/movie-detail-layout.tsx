"use client";

import { useState, useEffect } from "react";
import { Map, List } from "lucide-react";
import { MovieInfoPanel } from "@/components/movie-info-panel";
import { MovieSchedulePanel } from "@/components/movie-schedule-panel";
import type { MovieInfoData } from "@/components/movie-info-panel";
import type { MovieCinemaMarker } from "@/components/map/movie-map";

const VIEW_KEY = "cinema-movie-view";

interface Props {
  movie: MovieInfoData;
  markers: MovieCinemaMarker[];
  movieTitle: string;
  movieLanguage?: string;
  markersCount: number;
  backHref: string;
  hasOV: boolean;
  hasNonOV: boolean;
}

export function MovieDetailLayout({
  movie,
  markers,
  movieTitle,
  movieLanguage,
  markersCount,
  backHref,
  hasOV,
  hasNonOV,
}: Props) {
  const [view, setView] = useState<"map" | "list">("map");
  const [filteredCinemaCount, setFilteredCinemaCount] = useState(markersCount);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(VIEW_KEY);
      if (stored === "map" || stored === "list") setView(stored);
    } catch {}
  }, []);

  function selectView(v: "map" | "list") {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch {}
  }

  const viewToggle = markersCount > 0 ? (
    <div className="flex items-center rounded-md border border-border overflow-hidden">
      <button
        onClick={() => selectView("map")}
        aria-label="Map view"
        className={`p-1.5 transition-colors ${
          view === "map"
            ? "bg-foreground/10 text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
        }`}
      >
        <Map className="size-3.5" />
      </button>
      <button
        onClick={() => selectView("list")}
        aria-label="List view"
        className={`p-1.5 transition-colors ${
          view === "list"
            ? "bg-foreground/10 text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
        }`}
      >
        <List className="size-3.5" />
      </button>
    </div>
  ) : null;

  return (
    <div className="flex flex-col lg:flex-row lg:flex-1 lg:min-h-0">
      <div className="border-b lg:border-b-0 lg:border-r border-border lg:w-2/5 lg:overflow-y-auto">
        <MovieInfoPanel
          movie={movie}
          markersCount={filteredCinemaCount}
          backHref={backHref}
          hasOV={hasOV}
          hasNonOV={hasNonOV}
          viewToggle={viewToggle}
        />
      </div>
      <div className="h-[70dvh] lg:h-auto lg:w-3/5">
        <MovieSchedulePanel
          markers={markers}
          movieTitle={movieTitle}
          movieLanguage={movieLanguage}
          view={view}
          onFilteredCountChange={setFilteredCinemaCount}
        />
      </div>
    </div>
  );
}
