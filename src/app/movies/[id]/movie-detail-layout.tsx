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

  // In list view the floating buttons move to the bottom right on mobile
  // (see the FAB container in the root layout).
  useEffect(() => {
    const root = document.documentElement;
    if (view === "list") root.dataset.fabs = "right";
    else delete root.dataset.fabs;
    return () => { delete root.dataset.fabs; };
  }, [view]);

  function selectView(v: "map" | "list") {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch {}
  }

  const viewOptions = [
    { id: "map" as const,  label: "Map view",  Icon: Map  },
    { id: "list" as const, label: "List view", Icon: List },
  ];

  // Map / list toggle: selected option solid red, the other outlined.
  const viewToggle = markersCount > 0 ? (
    <div className="flex items-center gap-1">
      {viewOptions.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => selectView(id)}
          aria-label={label}
          aria-pressed={view === id}
          className={`rounded-md p-1.5 active:scale-[0.94] ${view === id ? "btn-roman-on" : "btn-roman"}`}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className="flex flex-col lg:flex-row lg:flex-1 lg:min-h-0">
      <div className="border-b lg:border-b-0 lg:border-r border-border lg:w-[clamp(420px,34vw,540px)] lg:shrink-0 lg:overflow-y-auto [scrollbar-width:thin] [scrollbar-color:hsl(var(--foreground)/0.15)_transparent]">
        <MovieInfoPanel
          movie={movie}
          markersCount={filteredCinemaCount}
          backHref={backHref}
          hasOV={hasOV}
          hasNonOV={hasNonOV}
          viewToggle={viewToggle}
        />
      </div>
      <div className="h-[70dvh] lg:h-auto lg:flex-1 lg:min-w-0">
        <MovieSchedulePanel
          markers={markers}
          movieTitle={movieTitle}
          posterUrl={movie.tmdbPosterUrl}
          posterFallbackUrl={movie.posterUrl}
          movieLanguage={movieLanguage}
          view={view}
          onFilteredCountChange={setFilteredCinemaCount}
          toolbar={viewToggle}
        />
      </div>
    </div>
  );
}
