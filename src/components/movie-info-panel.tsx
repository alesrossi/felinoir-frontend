"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLang } from "@/lib/lang";
import { toEnGenre } from "@/lib/genres";
import { loadStoredGenres, toggleStoredGenre, GLOBAL_FILTER_EVENT } from "@/components/global-filter-fab";
import { PosterImage } from "@/components/ui/poster-image";
import { LangSwitcher } from "@/components/lang-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { languageToFlag } from "@/lib/utils";
import { homeHrefWithFilters } from "@/lib/home-href";
import type { CreditPerson, MovieCredits } from "@/lib/tmdb-images";

function formatRuntime(minutes?: number): string | undefined {
  if (!minutes) return undefined;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m} min`;
}

/** "$200M" / "200 Mln USD". TMDb budgets and revenues are in US dollars; 0 means unknown. */
function formatMoney(amount: number | undefined, locale: string): string | undefined {
  if (!amount) return undefined;
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "it-IT", {
    style: "currency", currency: "USD", notation: "compact", minimumFractionDigits: 0, maximumFractionDigits: 1,
  }).format(amount);
}

function formatReleaseDate(released: string | undefined, locale: string): string | undefined {
  if (!released || !/^\d{4}-\d{2}-\d{2}/.test(released)) return undefined;
  const [y, m, d] = released.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale === "en" ? "en-GB" : "it-IT", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}

function displayName(code: string, type: "region" | "language", locale: string): string {
  try {
    const name = new Intl.DisplayNames([locale === "en" ? "en" : "it"], { type }).of(code) ?? code;
    return name.charAt(0).toUpperCase() + name.slice(1); // Italian language names are lowercase
  } catch {
    return code;
  }
}

/** OMDb's awards line is English; translate its few fixed phrases for Italian. */
function localizeAwards(awards: string | undefined, locale: string): string | undefined {
  if (!awards || awards === "N/A") return undefined;
  if (locale === "en") return awards;
  return awards
    .replace(/Won (\d+) Oscars?/i, (_, n) => `${n} Oscar vint${n === "1" ? "o" : "i"}`)
    .replace(/Nominated for (\d+) Oscars?/i, (_, n) => `${n} candidatur${n === "1" ? "a" : "e"} all'Oscar`)
    .replace(/(\d+) wins?/i, (_, n) => `${n} premi${n === "1" ? "o" : ""}`)
    .replace(/(\d+) nominations?/i, (_, n) => `${n} candidatur${n === "1" ? "a" : "e"}`)
    .replace(/ & /g, " e ")
    .replace(/ total\.?$/i, " in totale");
}

/** Round photo with initials behind it, so a missing or broken photo still fills the circle. */
function PersonPhoto({ person, className }: { person: Pick<CreditPerson, "name" | "photoUrl">; className: string }) {
  const [failed, setFailed] = useState(false);
  const initials = person.name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-foreground/[0.07] font-semibold text-foreground/45 ring-1 ring-inset ring-foreground/[0.06] ${className}`}>
      {initials}
      {person.photoUrl && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={person.photoUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </span>
  );
}

/**
 * Cast photos in a sideways-scrolling row. On desktop, where a mouse can't
 * swipe and overlay scrollbars stay hidden until used, ‹ › buttons beside the
 * title page through it. Edges fade only where more people are hidden.
 */
function CastRow({ title, cast }: { title: string; cast: CreditPerson[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setCanLeft(el.scrollLeft > 4);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, [cast.length]);

  function page(dir: -1 | 1) {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  }

  const arrow = "btn-roman grid size-7 place-items-center rounded-full active:scale-[0.92] disabled:pointer-events-none disabled:opacity-30";

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-[-0.005em] text-foreground">{title}</h2>
        {(canLeft || canRight) && (
          <div className="hidden lg:flex items-center gap-1.5">
            <button onClick={() => page(-1)} disabled={!canLeft} aria-label="Scroll left" className={arrow}>
              <ChevronLeft className="size-4" />
            </button>
            <button onClick={() => page(1)} disabled={!canRight} aria-label="Scroll right" className={arrow}>
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>
      <ul
        ref={ref}
        style={{
          maskImage: `linear-gradient(to right, ${canLeft ? "transparent, black 24px" : "black"}, ${canRight ? "black calc(100% - 24px), transparent" : "black"})`,
        }}
        className="-mx-6 flex snap-x gap-3 overflow-x-auto scroll-px-6 px-6 [scrollbar-width:none] lg:-mx-8 lg:scroll-px-8 lg:px-8 lg:pb-3 lg:[scrollbar-width:thin] lg:[scrollbar-color:hsl(var(--foreground)/0.2)_transparent]"
      >
        {cast.map((p) => (
          <li key={`${p.id}-${p.name}`} className="w-[76px] shrink-0 snap-start text-center">
            <PersonPhoto person={p} className="mx-auto size-16 text-base" />
            <p className="mt-2 text-xs font-medium leading-tight text-foreground/90 line-clamp-2">{p.name}</p>
            {p.role && <p className="mt-0.5 text-[11px] leading-tight text-foreground/50 line-clamp-2">{p.role}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-sm font-semibold tracking-[-0.005em] text-foreground">{children}</h2>;
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
  writer?: string;
  credits?: MovieCredits;
  contentRating?: string;
  countryCodes?: string[];
  budget?: number;
  revenue?: number;
  awards?: string;
  companies?: string[];
  /** TMDb's tagline — stored in Italian only. */
  tagline?: string;
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

  const splitNames = (names?: string): CreditPerson[] =>
    (names?.split(",").map((n) => n.trim()).filter(Boolean) ?? []).map((name, i) => ({ id: -i - 1, name }));

  // Cast with photos from TMDb; the plain OMDb names when there are no credits.
  const cast: CreditPerson[] = movie.credits?.cast.length ? movie.credits.cast : splitNames(movie.actors);

  const writers = movie.credits?.writers.length
    ? movie.credits.writers.map((w) => ({
        ...w,
        role: w.jobs?.map((j) => t.movie.jobs[j] ?? j.toLowerCase()).join(", "),
      }))
    : splitNames(movie.writer);

  // Always all four rows — a missing one reads "N/A" instead of disappearing.
  const crew: { label: string; people: CreditPerson[] }[] = [
    { label: t.movie.directedBy,     people: movie.credits?.directors.length ? movie.credits.directors : splitNames(movie.director) },
    { label: t.movie.writing,        people: writers },
    { label: t.movie.music,          people: movie.credits?.composers ?? [] },
    { label: t.movie.cinematography, people: movie.credits?.cinematographers ?? [] },
  ];

  const countries = movie.countryCodes?.length
    ? movie.countryCodes.map((c) => displayName(c, "region", locale)).join(", ")
    : movie.tmdbCountry;

  const details: { label: string; value?: string; wide?: boolean }[] = [
    { label: t.movie.releaseDate,   value: formatReleaseDate(movie.released, locale) },
    { label: t.movie.country,       value: countries },
    { label: t.movie.language,      value: movie.tmdbLanguage ? displayName(movie.tmdbLanguage, "language", locale) : undefined },
    {
      label: t.movie.certification,
      value: movie.contentRating
        ? [movie.contentRating, t.movie.certifications[movie.contentRating]].filter(Boolean).join(" · ")
        : undefined,
    },
    { label: t.movie.budget,        value: formatMoney(movie.budget, locale) },
    { label: t.movie.boxOffice,     value: formatMoney(movie.revenue, locale) },
    { label: t.movie.production,    value: movie.companies?.length ? movie.companies.slice(0, 3).join(", ") : undefined, wide: true },
    { label: t.movie.awards,        value: localizeAwards(movie.awards, locale), wide: true },
  ];

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
          onClick={() => router.push(homeHrefWithFilters(backHref))}
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

      {/* On mobile the layout lays these blocks out around the schedule:
          hero, scores and plot (order-1) → map/list (order-2) → cast,
          crew and details (order-3). */}
      <div className="relative isolate -mt-14 max-lg:order-1">
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

        <div className="px-6 pt-20 pb-4 lg:px-8 lg:pt-24 lg:pb-0 space-y-6 lg:space-y-8">
          {/* Hero: poster + identity */}
          <div className="flex items-end gap-6">
            <PosterImage
              primary={movie.tmdbPosterUrl}
              fallback={movie.posterUrl}
              alt={`${displayTitle} poster`}
              className="w-24 sm:w-32 xl:w-36 shrink-0 aspect-[2/3] rounded-lg object-cover ring-1 ring-black/10 dark:ring-white/10 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.55)]"
              placeholderClassName="w-24 sm:w-32 xl:w-36 shrink-0 aspect-[2/3] rounded-lg ring-1 ring-foreground/10 bg-muted"
              priority
            />

            <div className="min-w-0 pb-1">
              <h1 className="font-serif text-2xl sm:text-[1.75rem] xl:text-[2rem] font-medium leading-[1.08] tracking-[-0.015em] text-foreground text-balance">
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
                        onClick={() => { toggleStoredGenre(toEnGenre(g) ?? ""); router.push(homeHrefWithFilters("/")); }}
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

          {/* Plot, led by the tagline when there is one */}
          {plot && (
            <div>
              {locale === "it" && movie.tagline && (
                <p className="mb-3 font-serif text-lg italic leading-snug text-foreground/85">{movie.tagline}</p>
              )}
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

          {/* Where to watch — on desktop this lives in the schedule header. On
              mobile it heads the map, which follows straight after. */}
          <div className="flex items-center justify-between lg:hidden">
            <h2 className="text-base font-semibold tracking-[-0.01em] text-foreground">{t.movie.whereToWatch}</h2>
            <div className="flex items-center gap-2">
              {markersCount > 0 && (
                <p className="text-xs text-foreground/50 tabular-nums">{t.movie.cinemas(markersCount)}</p>
              )}
              {viewToggle}
            </div>
          </div>
        </div>
      </div>

      {/* Cast, crew and details. Below the schedule on mobile. */}
      {/* Bottom padding clears the two floating buttons (filters + map) in
          the bottom-left corner: 2 × 48px + gap + 40px offset, 64px each from sm. */}
      <div className="px-6 pt-8 pb-44 sm:pb-52 lg:px-8 space-y-8 max-lg:order-3 max-lg:border-t max-lg:border-border">
        {/* Cast — photos in a row that scrolls sideways */}
        {cast.length > 0 ? (
          <CastRow title={t.movie.cast} cast={cast} />
        ) : (
          <section>
            <SectionTitle>{t.movie.cast}</SectionTitle>
            <p className="text-sm text-foreground/35">{t.movie.na}</p>
          </section>
        )}

        {/* Crew — one row per role; a fixed photo slot keeps every name on the same line */}
        <section>
          <SectionTitle>{t.movie.crew}</SectionTitle>
          <ul className="space-y-3.5">
            {crew.map(({ label, people }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="flex w-[58px] shrink-0">
                  {people.length > 0 ? (
                    people.slice(0, 2).map((p, i) => (
                      <PersonPhoto
                        key={`${p.id}-${p.name}`}
                        person={p}
                        className={`size-10 text-xs ring-2 ring-background ${i > 0 ? "-ml-[22px]" : ""}`}
                      />
                    ))
                  ) : (
                    <span aria-hidden className="size-10 rounded-full bg-foreground/[0.05]" />
                  )}
                </span>
                <div className="min-w-0 text-sm">
                  <p className="text-[11px] text-foreground/50">{label}</p>
                  {people.length > 0 ? (
                    <p className="mt-0.5 leading-snug text-foreground/85">
                      {people.map((p, i) => (
                        <React.Fragment key={`${p.id}-${p.name}`}>
                          {i > 0 && ", "}
                          {p.name}
                          {p.role && <span className="text-foreground/45"> ({p.role})</span>}
                        </React.Fragment>
                      ))}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-foreground/35">{t.movie.na}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Details — fixed set of facts, "N/A" when unknown. Open list with
            hairlines rather than another box, so it reads as reference info. */}
        <section>
          <SectionTitle>{t.movie.details}</SectionTitle>
          <dl className="grid grid-cols-2 gap-x-6 border-b border-foreground/[0.08]">
            {details.map(({ label, value, wide }) => (
              <div key={label} className={`border-t border-foreground/[0.08] py-2.5 ${wide ? "col-span-2" : ""}`}>
                <dt className="text-[11px] text-foreground/50">{label}</dt>
                <dd className={`mt-0.5 text-sm ${value ? "text-foreground/85" : "text-foreground/35"}`}>{value ?? t.movie.na}</dd>
              </div>
            ))}
          </dl>
        </section>
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
