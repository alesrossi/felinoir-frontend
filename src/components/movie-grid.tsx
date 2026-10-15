"use client";

import { useState, useEffect, useRef } from "react";
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
  /** Search + count, rendered in the sticky toolbar beside the view toggle. */
  toolbar?: React.ReactNode;
}

function getDisplayTitle(movie: MovieRecord, locale: string): string {
  return (locale === "en" ? (movie.tmdbTitleEn ?? movie.title) : movie.title);
}

function getGroupLetter(title: string): string {
  const first = title.trim()[0]?.toUpperCase() ?? "#";
  return /[A-Z]/.test(first) ? first : "#";
}

function gridClass(view: "grid" | "list"): string {
  return view === "grid"
    ? "grid grid-cols-3 gap-x-3 gap-y-6 sm:gap-x-5 sm:gap-y-8 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
    : "grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-3";
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
    <div className="mb-10">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex items-center gap-3 w-full mb-4 group"
      >
        <span className="font-serif text-3xl font-medium text-foreground/80 group-hover:text-foreground transition-colors leading-none min-w-6 text-left">
          {letter}
        </span>
        <div className="flex-1 h-px bg-foreground/[0.08]" />
        <ChevronDown className={`size-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className={
          gridClass(view)
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

export function MovieGrid({ movies, screeningCounts, filterParams, totalMovies, sort, ovMovieIds = [], nonOVMovieIds = [], toolbar }: MovieGridProps) {
  const ovSet    = new Set(ovMovieIds);
  const nonOVSet = new Set(nonOVMovieIds);
  const [view, setView] = useState<"list" | "grid">("grid");
  const [mounted, setMounted] = useState(false);
  const [stuck, setStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // The toolbar turns into a material only once it's actually floating over films.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [totalMovies]);

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

  const viewOptions = [
    { id: "grid" as const, label: "Grid view", Icon: LayoutGrid },
    { id: "list" as const, label: "List view", Icon: LayoutList },
  ];

  const toolbarRow = (
    <>
      <div ref={sentinelRef} aria-hidden className="h-0" />
      <div
        className={[
          "sticky top-0 z-20 -mx-4 mb-6 flex flex-wrap items-center gap-4 max-sm:gap-y-3 px-4 py-3 lg:-mx-8 lg:px-8 transition-[background-color,box-shadow] duration-200",
          stuck
            ? "bg-background/80 backdrop-blur-xl backdrop-saturate-150 shadow-[0_1px_0_hsl(var(--foreground)/0.08)]"
            : "",
        ].join(" ")}
      >
        {toolbar}
        {movies.length > 0 && (
          <div className="flex shrink-0 items-center rounded-lg bg-foreground/[0.06] p-0.5 max-sm:order-2">
            {viewOptions.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => changeView(id)}
                aria-label={label}
                aria-pressed={view === id}
                className={`rounded-md p-1.5 transition active:scale-[0.94] ${
                  view === id
                    ? "bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
                    : "text-foreground/50 hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );

  if (movies.length === 0) {
    return (
      <>
        {toolbarRow}
        <div className="flex flex-col items-center justify-center py-24 text-center text-foreground/50">
          <p className="font-serif italic text-xl">{t.home.noMatch}</p>
          <p className="text-sm mt-2">{t.home.noMatchHint}</p>
        </div>
      </>
    );
  }

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
      <>
        {toolbarRow}
        <div className={mounted ? undefined : "invisible"}>
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
      </>
    );
  }

  return (
    <>
    {toolbarRow}
    <div className={mounted ? undefined : "invisible"}>
      <div className={
        gridClass(view)
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
    </>
  );
}
