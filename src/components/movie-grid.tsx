"use client";

import { useState, useEffect } from "react";
import { LayoutGrid, LayoutList, Film, ChevronDown } from "lucide-react";
import { MovieCard } from "@/components/movie-card";
import { useLang } from "@/lib/lang";
import type { ApiMovie as MovieRecord } from "@/lib/api/types";

interface MovieGridProps {
  movies: MovieRecord[];
  screeningCounts: Record<number, number>;
  filterParams?: string;
  totalMovies: number;
  sort?: string;
  ovMovieIds?: number[];
  nonOVMovieIds?: number[];
}

function getDisplayTitle(movie: MovieRecord, locale: string): string {
  return (locale === "en" ? (movie.tmdbTitleEn ?? movie.title) : movie.title);
}

function getGroupLetter(title: string): string {
  const first = title.trim()[0]?.toUpperCase() ?? "#";
  return /[A-Z]/.test(first) ? first : "#";
}

interface LetterGroupProps {
  letter: string;
  movies: MovieRecord[];
  screeningCounts: Record<number, number>;
  filterParams?: string;
  view: "grid" | "list";
  ovSet: Set<number>;
  nonOVSet: Set<number>;
}

function LetterGroup({ letter, movies, screeningCounts, filterParams, view, ovSet, nonOVSet }: LetterGroupProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex items-center gap-3 w-full mb-3 group"
      >
        <span className="font-serif italic text-3xl font-light text-foreground/70 group-hover:text-foreground transition-colors leading-none w-6">
          {letter}
        </span>
        <div className="flex-1 h-px bg-border" />
        <ChevronDown className={`size-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className={
          view === "grid"
            ? "grid grid-cols-3 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
            : "grid grid-cols-1 gap-2 sm:grid-cols-2"
        }>
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              screeningCount={screeningCounts[movie.id]}
              filterParams={filterParams}
              view={view}
              hasOV={ovSet.has(movie.id)}
              hasNonOV={nonOVSet.has(movie.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MovieGrid({ movies, screeningCounts, filterParams, totalMovies, sort, ovMovieIds = [], nonOVMovieIds = [] }: MovieGridProps) {
  const ovSet    = new Set(ovMovieIds);
  const nonOVSet = new Set(nonOVMovieIds);
  const [view, setView] = useState<"list" | "grid">("grid");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("movie-view");
    if (stored === "list" || stored === "grid") setView(stored);
    setMounted(true);
  }, []);

  function changeView(v: "list" | "grid") {
    setView(v);
    localStorage.setItem("movie-view", v);
  }
  const { t, locale } = useLang();

  if (totalMovies === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center text-muted-foreground">
        <Film className="size-10 mb-4 opacity-20" />
        <p className="font-serif italic text-xl font-light">{t.home.noFilms}</p>
        <p className="text-xs mt-2 tracking-wider uppercase opacity-60">{t.home.noFilmsHint}</p>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
        <p className="font-serif italic text-xl font-light">{t.home.noMatch}</p>
        <p className="text-xs mt-2 tracking-wider uppercase opacity-60">{t.home.noMatchHint}</p>
      </div>
    );
  }

  const viewToggle = (
    <div className="flex justify-end mb-3">
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => changeView("list")}
          aria-label="List view"
          className={`p-1.5 rounded transition-colors ${
            view === "list" ? "text-foreground" : "text-foreground/30 hover:text-foreground/60"
          }`}
        >
          <LayoutList className="size-4" />
        </button>
        <button
          onClick={() => changeView("grid")}
          aria-label="Grid view"
          className={`p-1.5 rounded transition-colors ${
            view === "grid" ? "text-foreground" : "text-foreground/30 hover:text-foreground/60"
          }`}
        >
          <LayoutGrid className="size-4" />
        </button>
      </div>
    </div>
  );

  if (sort === "alpha") {
    const groups = movies.reduce<Record<string, MovieRecord[]>>((acc, movie) => {
      const letter = getGroupLetter(getDisplayTitle(movie, locale));
      (acc[letter] ??= []).push(movie);
      return acc;
    }, {});

    const letters = Object.keys(groups).sort((a, b) =>
      a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)
    );

    return (
      <div className={mounted ? undefined : "invisible"}>
        {viewToggle}
        {letters.map(letter => (
          <LetterGroup
            key={letter}
            letter={letter}
            movies={groups[letter]}
            screeningCounts={screeningCounts}
            filterParams={filterParams}
            view={view}
            ovSet={ovSet}
            nonOVSet={nonOVSet}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={mounted ? undefined : "invisible"}>
      {viewToggle}
      <div className={
        view === "grid"
          ? "grid grid-cols-3 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
          : "grid grid-cols-1 gap-2 sm:grid-cols-2"
      }>
        {movies.map((movie) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            screeningCount={screeningCounts[movie.id]}
            filterParams={filterParams}
            view={view}
            hasOV={ovSet.has(movie.id)}
            hasNonOV={nonOVSet.has(movie.id)}
          />
        ))}
      </div>
    </div>
  );
}
