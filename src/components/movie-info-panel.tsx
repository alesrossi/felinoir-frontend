"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLang } from "@/lib/lang";
import { toEnGenre } from "@/lib/genres";
import { loadStoredGenres, toggleStoredGenre, GLOBAL_FILTER_EVENT } from "@/components/global-filter-fab";
import { PosterImage } from "@/components/ui/poster-image";
import { LangSwitcher } from "@/components/lang-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, X } from "lucide-react";
import { languageToFlag } from "@/lib/utils";

function buildBackHref(base: string): string {
  try {
    const raw = localStorage.getItem("cinema-filters");
    const data: Record<string, string> = raw ? JSON.parse(raw) : {};
    const params = new URLSearchParams();
    for (const key of ["q", "cinemas", "dates", "times", "genres", "sort", "ov"] as const) {
      if (data[key]) params.set(key, data[key]);
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  } catch {
    return base;
  }
}

function formatRuntime(minutes?: number): string | undefined {
  if (!minutes) return undefined;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m} min`;
}

function extractYoutubeId(url: string): string | null {
  const m = url.match(/[?&]v=([^&]+)/);
  return m ? m[1] : null;
}

export interface MovieInfoData {
  title: string;
  originalTitle?: string;
  released?: string;
  director?: string;
  actors?: string;
  durationMinutes?: number;
  scrapedGenres: string[];  // scraped fallback
  tmdbRating?: string;
  imdbRating?: string;
  rtRating?: string;
  metacriticScore?: string;
  tmdbLanguage?: string;
  tmdbCountry?: string;
  // bilingual fields
  tmdbTitle?: string;
  tmdbTitleEn?: string;
  tmdbPlot?: string;
  tmdbPlotEn?: string;
  tmdbGenre?: string;
  tmdbGenreEn?: string;
  synopsis?: string;
  tmdbPosterUrl?: string;
  posterUrl?: string;
  tmdbTrailerUrlIt?: string;
  tmdbTrailerUrlEn?: string;
  backdropUrl?: string;
}

interface MovieInfoPanelProps {
  movie: MovieInfoData;
  markersCount: number;
  backHref: string;
  hasOV?: boolean;
  hasNonOV?: boolean;
  viewToggle?: React.ReactNode;
}

export function MovieInfoPanel({ movie, markersCount, backHref, hasOV, hasNonOV, viewToggle }: MovieInfoPanelProps) {
  const { t, locale } = useLang();
  const router = useRouter();
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [activeGenres, setActiveGenres] = useState<Set<string>>(new Set());
  const [scrolled, setScrolled] = useState(false);
  const [plotOpen, setPlotOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!trailerOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setTrailerOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [trailerOpen]);

  useEffect(() => {
    setActiveGenres(loadStoredGenres());
    function onFilter() { setActiveGenres(loadStoredGenres()); }
    window.addEventListener(GLOBAL_FILTER_EVENT, onFilter);
    return () => window.removeEventListener(GLOBAL_FILTER_EVENT, onFilter);
  }, []);

  const displayTitle =
    locale === "en"
      ? (movie.tmdbTitleEn ?? movie.tmdbTitle ?? movie.title)
      : (movie.tmdbTitle ?? movie.title);

  const plot =
    locale === "en"
      ? (movie.tmdbPlotEn ?? movie.tmdbPlot ?? movie.synopsis)
      : (movie.tmdbPlot ?? movie.synopsis ?? movie.tmdbPlotEn);

  const genreString = locale === "en"
    ? (movie.tmdbGenreEn ?? movie.tmdbGenre)
    : (movie.tmdbGenre ?? movie.tmdbGenreEn);
  const genres = genreString
    ? genreString.split(",").map((g) => g.trim()).filter(Boolean)
    : movie.scrapedGenres;

  const actorList = movie.actors?.split(",").map((a) => a.trim()).filter(Boolean) ?? [];

  const trailerUrl =
    locale === "en"
      ? (movie.tmdbTrailerUrlEn ?? movie.tmdbTrailerUrlIt)
      : (movie.tmdbTrailerUrlIt ?? movie.tmdbTrailerUrlEn);
  const trailerId = trailerUrl ? extractYoutubeId(trailerUrl) : null;

  const isItalian = movie.tmdbLanguage === "it";
  const showIT = hasNonOV || isItalian;
  const showOV = hasOV && !isItalian && !!movie.tmdbLanguage;

  // ~5 lines at this measure; shorter synopses are shown whole.
  const plotLong = (plot?.length ?? 0) > 340;

  const ratings = [
    { label: "IMDb",            title: "Internet Movie Database", value: movie.imdbRating,      suffix: "/10"  },
    { label: "Rotten Tomatoes", title: "Rotten Tomatoes",         value: movie.rtRating,        suffix: undefined },
    { label: "Metacritic",      title: "Metacritic",              value: movie.metacriticScore, suffix: "/100" },
    { label: "TMDb",            title: "The Movie Database",      value: movie.tmdbRating,      suffix: "/10"  },
  ];

  const year = movie.released?.slice(0, 4);
  const meta = [year, formatRuntime(movie.durationMinutes)].filter(Boolean);

  return (
    <>
      {/* Sentinel: once it scrolls away, the top bar turns into a material */}
      <div ref={sentinelRef} aria-hidden className="h-0" />

      {/* Top bar — floats over the hero, gains a translucent material on scroll */}
      <div
        className={[
          "sticky top-0 z-20 flex h-14 items-center justify-between px-6 lg:px-8 shrink-0 transition-[background-color,box-shadow] duration-200",
          scrolled
            ? "bg-background/75 backdrop-blur-xl backdrop-saturate-150 shadow-[0_1px_0_hsl(var(--foreground)/0.06)]"
            : "bg-transparent",
        ].join(" ")}
      >
        <button
          onClick={() => router.push(buildBackHref(backHref))}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-roman-muted active:scale-[0.97] transition"
        >
          <ArrowLeft className="size-4" />
          {t.movie.back}
        </button>
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <LangSwitcher />
        </div>
      </div>

      <div className="relative isolate -mt-14">
        {/* Ambient backdrop — a still from the film, dissolving into the page */}
        {movie.backdropUrl && (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[340px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={movie.backdropUrl}
              alt=""
              className="size-full object-cover opacity-60 dark:opacity-45 [mask-image:linear-gradient(to_bottom,black_20%,transparent_100%)]"
              decoding="async"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background" />
          </div>
        )}

        <div className="px-6 pt-24 pb-28 lg:px-8 space-y-8">
          {/* Hero: poster + identity */}
          <div className="flex items-end gap-6">
            <PosterImage
              primary={movie.tmdbPosterUrl}
              fallback={movie.posterUrl}
              alt={`${displayTitle} poster`}
              className="w-32 xl:w-36 shrink-0 aspect-[2/3] rounded-lg object-cover ring-1 ring-black/10 dark:ring-white/10 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.55)]"
              placeholderClassName="w-32 xl:w-36 shrink-0 aspect-[2/3] rounded-lg ring-1 ring-foreground/10 bg-muted"
              priority
            />

            <div className="min-w-0 pb-1">
              <h1 className="font-serif text-[1.75rem] xl:text-[2rem] font-medium leading-[1.08] tracking-[-0.015em] text-foreground text-balance">
                {displayTitle}
              </h1>
              {movie.originalTitle && movie.originalTitle !== displayTitle && (
                <p className="mt-1.5 font-serif italic text-[15px] text-foreground/60">{movie.originalTitle}</p>
              )}
              {meta.length > 0 && (
                <p className="mt-3 text-sm font-medium tabular-nums text-foreground/70">
                  {meta.join("  ·  ")}
                </p>
              )}
              {genres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {genres.map((g) => {
                    const isActive = activeGenres.size > 0 && activeGenres.has(toEnGenre(g) ?? "");
                    return (
                      <button
                        key={g}
                        onClick={() => { toggleStoredGenre(toEnGenre(g) ?? ""); router.push(buildBackHref("/")); }}
                        className={[
                          "rounded-full px-2.5 py-0.5 text-xs transition active:scale-[0.97]",
                          isActive ? "btn-roman-on" : "btn-roman",
                        ].join(" ")}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Actions: trailer + audio languages */}
          {(trailerId || showIT || showOV) && (
            <div className="flex items-center gap-3">
              {trailerId && (
                <button
                  onClick={() => setTrailerOpen(true)}
                  // Light: red outline. Dark: the original solid light button.
                  className="btn-roman dark:border-transparent dark:bg-foreground dark:text-background dark:hover:bg-foreground/85 inline-flex h-9 items-center gap-2 rounded-full pl-3.5 pr-4 text-sm font-medium active:scale-[0.97]"
                >
                  <Play className="size-3.5 fill-current" />
                  {t.movie.watchTrailer}
                </button>
              )}
              <div className="ml-auto flex items-center gap-1.5">
                {showIT && (
                  <span title="Italiano" className="inline-flex h-7 items-center gap-1.5 rounded-full bg-foreground/[0.06] px-2.5 text-xs font-medium text-foreground/75">
                    <span className="text-sm leading-none">🇮🇹</span>ITA
                  </span>
                )}
                {showOV && (
                  <span title={movie.tmdbLanguage!.toUpperCase()} className="inline-flex h-7 items-center gap-1.5 rounded-full bg-foreground/[0.06] px-2.5 text-xs font-medium text-foreground/75">
                    <span className="text-sm leading-none">{languageToFlag(movie.tmdbLanguage!)}</span>OV
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Ratings — always all four, so a missing score reads as "not rated", not "forgot" */}
          <dl className="flex divide-x divide-foreground/[0.08] rounded-xl bg-foreground/[0.035] ring-1 ring-inset ring-foreground/[0.06]">
            {ratings.map(({ label, title, value, suffix }) => (
              <div key={label} className="flex-auto px-4 py-3">
                <dd className="text-xl font-semibold leading-none tabular-nums tracking-tight text-foreground">
                  {value ? (
                    <>
                      {value}
                      {suffix && <span className="ml-0.5 text-xs font-normal text-foreground/45">{suffix}</span>}
                    </>
                  ) : (
                    <span className="text-base font-medium text-foreground/35">N/A</span>
                  )}
                </dd>
                <dt title={title} className="mt-1.5 whitespace-nowrap text-[11px] text-foreground/55 cursor-help">{label}</dt>
              </div>
            ))}
          </dl>

          {/* Plot */}
          {plot && (
            <div>
              <p className={`text-[15px] leading-[1.65] text-foreground/80 max-w-prose ${plotLong && !plotOpen ? "line-clamp-5" : ""}`}>
                {plot}
              </p>
              {plotLong && (
                <button
                  onClick={() => setPlotOpen((o) => !o)}
                  className="mt-1.5 text-sm font-medium text-roman-muted hover:text-roman transition-colors"
                >
                  {plotOpen ? t.movie.less : t.movie.more}
                </button>
              )}
            </div>
          )}

          {/* Credits */}
          {(movie.director || actorList.length > 0) && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
              {movie.director && (
                <>
                  <dt className="text-foreground/50">{t.movie.directedBy}</dt>
                  <dd className="text-foreground/85">{movie.director}</dd>
                </>
              )}
              {actorList.length > 0 && (
                <>
                  <dt className="text-foreground/50">{t.movie.cast}</dt>
                  <dd className="text-foreground/85 leading-relaxed">{actorList.slice(0, 6).join(", ")}</dd>
                </>
              )}
            </dl>
          )}

          {/* Where to watch — on desktop this lives in the schedule header */}
          <div className="flex items-center justify-between lg:hidden">
            <h2 className="text-sm font-medium text-foreground/70">{t.movie.whereToWatch}</h2>
            <div className="flex items-center gap-2">
              {markersCount > 0 && (
                <p className="text-xs text-foreground/50 tabular-nums">{t.movie.cinemas(markersCount)}</p>
              )}
              {viewToggle}
            </div>
          </div>
        </div>
      </div>

      {/* Trailer modal */}
      {trailerOpen && trailerId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setTrailerOpen(false)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-200" />
          <div
            className="relative z-10 w-full max-w-4xl aspect-video rounded-xl overflow-hidden ring-1 ring-white/10 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setTrailerOpen(false)}
              className="absolute top-3 right-3 z-20 p-1.5 rounded-sm bg-black/60 text-white hover:bg-black/80 transition-colors"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${trailerId}?autoplay=1`}
              title="Trailer"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );
}
