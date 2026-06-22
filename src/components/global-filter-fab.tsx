"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SlidersHorizontal, X, Calendar, ArrowUpDown, MapPin, Languages, ChevronDown, Search, Clock, Star, Tag, Trees } from "lucide-react";
import { ALL_GENRES, getGenreLabel } from "@/lib/genres";
import { TIME_RANGES } from "@/lib/time-ranges";
import { useLang } from "@/lib/lang";

// ---------------------------------------------------------------------------
// Shared constants — imported by other components that react to filter changes
// ---------------------------------------------------------------------------

const STORAGE_KEY = "cinema-filters";
export const FAVOURITES_KEY = "cinema-favourites";
export const OPEN_AIR_KEY = "open-air-cinema";
export const GLOBAL_FILTER_EVENT = "global-filter-changed";
export const OPEN_AIR_EVENT = "open-air-changed";

export function loadStoredOpenAir(): boolean {
  try { return localStorage.getItem(OPEN_AIR_KEY) === "true"; } catch { return false; }
}

export function saveOpenAir(value: boolean) {
  try {
    if (value) localStorage.setItem(OPEN_AIR_KEY, "true");
    else localStorage.removeItem(OPEN_AIR_KEY);
    window.dispatchEvent(new CustomEvent(OPEN_AIR_EVENT));
  } catch {}
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

type StoredFilters = { q?: string; cinemas?: string; dates?: string; times?: string; sort?: string; ov?: string; genres?: string };

function load(): StoredFilters {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredFilters) : {};
  } catch { return {}; }
}

function save(patch: Partial<StoredFilters>) {
  try {
    const existing = load();
    const next = { ...existing, ...patch };
    // Remove empty/undefined keys
    (Object.keys(next) as (keyof StoredFilters)[]).forEach(k => {
      if (!next[k]) delete next[k];
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(GLOBAL_FILTER_EVENT));
  } catch {}
}

export function loadStoredCinemas(): Set<string> {
  const { cinemas } = load();
  return cinemas ? new Set(cinemas.split(",").filter(Boolean)) : new Set();
}

export function loadStoredOV(): boolean {
  return load().ov === "true";
}

export function loadStoredDates(): Set<string> {
  const { dates } = load();
  return dates ? new Set(dates.split(",").filter(Boolean)) : new Set();
}

export function loadStoredTimes(): Set<string> {
  const { times } = load();
  return times ? new Set(times.split(",").filter(Boolean)) : new Set();
}

export function loadStoredGenres(): Set<string> {
  const { genres } = load();
  return genres ? new Set(genres.split(",").filter(Boolean)) : new Set();
}

export function toggleStoredGenre(enKey: string, onUpdated?: (genres: Set<string>) => void) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) as Record<string, string> : {};
    const current = new Set<string>((data.genres ?? "").split(",").filter(Boolean));
    if (current.has(enKey)) current.delete(enKey); else current.add(enKey);
    if (current.size > 0) data.genres = [...current].join(",");
    else delete data.genres;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(GLOBAL_FILTER_EVENT));
    onUpdated?.(current);
  } catch {}
}

export function loadStoredFavourites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVOURITES_KEY);
    return raw ? new Set(raw.split(",").filter(Boolean)) : new Set();
  } catch { return new Set(); }
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function getNext7Days(todayLabel: string, tomorrowLabel: string, locale: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const iso = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
    const label =
      i === 0 ? todayLabel :
      i === 1 ? tomorrowLabel :
      d.toLocaleDateString(locale === "en" ? "en-GB" : "it-IT", { weekday: "short", day: "numeric" });
    return { iso, label };
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Cinema { id: string; name: string; openAir?: boolean }

export function GlobalFilterFab({
  cinemas,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  cinemas: Cinema[];
  /** Controlled open state. When provided, the built-in FAB no longer owns it. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hide the built-in floating button (e.g. when an external toggle drives it). */
  hideTrigger?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale } = useLang();

  const drawerRef = useRef<HTMLElement>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      onOpenChange?.(next);
      if (controlledOpen === undefined) setInternalOpen(next);
    },
    [controlledOpen, onOpenChange],
  );
  const [mounted, setMounted] = useState(false);
  const [cinemasOpen, setCinemasOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(true);
  const [timesOpen, setTimesOpen] = useState(true);
  const [cinemaSearch, setCinemaSearch] = useState("");
  const [selectedCinemas, setSelectedCinemas] = useState<Set<string>>(new Set());
  const [selectedDates, setSelectedDates]     = useState<Set<string>>(new Set());
  const [selectedTimes, setSelectedTimes]     = useState<Set<string>>(new Set());
  const [sort, setSort]                       = useState("listings");
  const [ov, setOv]                           = useState(false);
  const [selectedGenres, setSelectedGenres]   = useState<Set<string>>(new Set());
  const [favouriteIds, setFavouriteIds]       = useState<Set<string>>(new Set());
  const groupCheckRef                         = useRef<HTMLInputElement>(null);
  const openAirGroupRef                       = useRef<HTMLInputElement>(null);

  const days = useMemo(
    () => getNext7Days(t.filters.today, t.filters.tomorrow, locale),
    [t, locale]
  );

  // Load from localStorage on mount; on homepage sync URL → state
  useEffect(() => {
    const stored = load();
    setSelectedCinemas(stored.cinemas ? new Set(stored.cinemas.split(",").filter(Boolean)) : new Set());
    setSelectedDates(stored.dates ? new Set(stored.dates.split(",").filter(Boolean)) : new Set());
    setSelectedTimes(stored.times ? new Set(stored.times.split(",").filter(Boolean)) : new Set());
    setSelectedGenres(stored.genres ? new Set(stored.genres.split(",").filter(Boolean)) : new Set());
    setSort(stored.sort ?? "listings");
    setOv(stored.ov === "true");
    setFavouriteIds(loadStoredFavourites());
    setMounted(true);

    // On homepage: if URL has no filter params, push stored values into URL.
    // Deferred one tick so it never races with ongoing SSR hydration.
    if (pathname === "/") {
      setTimeout(() => {
        const url = new URL(window.location.href);
        const hasUrlFilters = url.searchParams.has("cinemas") || url.searchParams.has("dates") || url.searchParams.has("sort") || url.searchParams.has("times") || url.searchParams.has("genres");
        if (!hasUrlFilters && (stored.cinemas || stored.dates || stored.times || stored.sort || stored.ov || stored.genres)) {
          applyToUrl(
            stored.cinemas ? new Set(stored.cinemas.split(",").filter(Boolean)) : new Set(),
            stored.dates   ? new Set(stored.dates.split(",").filter(Boolean))   : new Set(),
            stored.times   ? new Set(stored.times.split(",").filter(Boolean))   : new Set(),
            stored.sort ?? "listings",
            stored.ov === "true",
            stored.genres  ? new Set(stored.genres.split(",").filter(Boolean))  : new Set(),
          );
        }
      }, 0);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for external filter changes (e.g. FiltersBar "clear all", OpenAirSwitcher)
  useEffect(() => {
    function onExternalChange() {
      const stored = load();
      const cin    = stored.cinemas ? new Set(stored.cinemas.split(",").filter(Boolean)) : new Set<string>();
      const dates  = stored.dates   ? new Set(stored.dates.split(",").filter(Boolean))   : new Set<string>();
      const times  = stored.times   ? new Set(stored.times.split(",").filter(Boolean))   : new Set<string>();
      const genres = stored.genres  ? new Set(stored.genres.split(",").filter(Boolean))  : new Set<string>();
      const s      = stored.sort ?? "listings";
      const ov     = stored.ov === "true";

      setSelectedCinemas(cin);
      setSelectedDates(dates);
      setSelectedTimes(times);
      setSelectedGenres(genres);
      setSort(s);
      setOv(ov);
      setFavouriteIds(loadStoredFavourites());

      // Sync URL when on the homepage — use window.location so the closure stays fresh
      if (window.location.pathname === "/") {
        const url = new URL(window.location.href);
        if (cin.size > 0)    url.searchParams.set("cinemas", [...cin].join(","));
        else                 url.searchParams.delete("cinemas");
        if (dates.size > 0)  url.searchParams.set("dates",   [...dates].join(","));
        else                 url.searchParams.delete("dates");
        if (times.size > 0)  url.searchParams.set("times",   [...times].join(","));
        else                 url.searchParams.delete("times");
        if (s !== "listings") url.searchParams.set("sort",   s);
        else                  url.searchParams.delete("sort");
        if (ov)              url.searchParams.set("ov",      "true");
        else                 url.searchParams.delete("ov");
        if (genres.size > 0) url.searchParams.set("genres",  [...genres].join(","));
        else                 url.searchParams.delete("genres");
        router.replace(url.pathname + (url.search || ""));
      }
    }
    window.addEventListener(GLOBAL_FILTER_EVENT, onExternalChange);
    return () => window.removeEventListener(GLOBAL_FILTER_EVENT, onExternalChange);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape + focus trap
  useEffect(() => {
    if (!open) return;
    const drawer = drawerRef.current;

    // Move focus into drawer on open
    const firstFocusable = drawer?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key !== "Tab" || !drawer) return;

      const focusable = Array.from(drawer.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
      ));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Push all filter values to URL (homepage only)
  function applyToUrl(cin: Set<string>, dates: Set<string>, times: Set<string>, s: string, ovOnly: boolean, genres: Set<string> = selectedGenres) {
    if (pathname !== "/") return;
    const url = new URL(window.location.href);
    if (cin.size > 0)      url.searchParams.set("cinemas", [...cin].join(","));
    else                   url.searchParams.delete("cinemas");
    if (dates.size > 0)    url.searchParams.set("dates", [...dates].join(","));
    else                   url.searchParams.delete("dates");
    if (times.size > 0)    url.searchParams.set("times", [...times].join(","));
    else                   url.searchParams.delete("times");
    if (s !== "listings")  url.searchParams.set("sort", s);
    else                   url.searchParams.delete("sort");
    if (ovOnly)            url.searchParams.set("ov", "true");
    else                   url.searchParams.delete("ov");
    if (genres.size > 0)   url.searchParams.set("genres", [...genres].join(","));
    else                   url.searchParams.delete("genres");
    router.replace(url.pathname + (url.search || ""));
  }

  function toggleCinema(id: string) {
    const next = new Set(selectedCinemas);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedCinemas(next);
    save({ cinemas: next.size > 0 ? [...next].join(",") : undefined });
    applyToUrl(next, selectedDates, selectedTimes, sort, ov);
  }

  function toggleDate(iso: string) {
    const next = new Set(selectedDates);
    if (next.has(iso)) next.delete(iso); else next.add(iso);
    setSelectedDates(next);
    save({ dates: next.size > 0 ? [...next].join(",") : undefined });
    applyToUrl(selectedCinemas, next, selectedTimes, sort, ov);
  }

  function toggleTime(id: string) {
    const next = new Set(selectedTimes);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedTimes(next);
    save({ times: next.size > 0 ? [...next].join(",") : undefined });
    applyToUrl(selectedCinemas, selectedDates, next, sort, ov);
  }

  function changeSort(value: string) {
    setSort(value);
    save({ sort: value !== "listings" ? value : undefined });
    applyToUrl(selectedCinemas, selectedDates, selectedTimes, value, ov);
  }

  function toggleGenre(id: string) {
    const next = new Set(selectedGenres);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedGenres(next);
    save({ genres: next.size > 0 ? [...next].join(",") : undefined });
    applyToUrl(selectedCinemas, selectedDates, selectedTimes, sort, ov, next);
  }

  function toggleOV() {
    const next = !ov;
    setOv(next);
    save({ ov: next ? "true" : undefined });
    applyToUrl(selectedCinemas, selectedDates, selectedTimes, sort, next);
  }

  const favouriteCinemas = cinemas.filter(c => favouriteIds.has(c.id));
  const otherCinemas     = cinemas.filter(c => !favouriteIds.has(c.id) && !c.openAir);
  const allFavsSelected  = favouriteCinemas.length > 0 && favouriteCinemas.every(c => selectedCinemas.has(c.id));
  const someFavsSelected = favouriteCinemas.some(c => selectedCinemas.has(c.id));

  useEffect(() => {
    if (groupCheckRef.current) {
      groupCheckRef.current.indeterminate = someFavsSelected && !allFavsSelected;
    }
  }, [someFavsSelected, allFavsSelected]);

  const openAirCinemas   = cinemas.filter(c => c.openAir);
  const allOpenAirSelected  = openAirCinemas.length > 0 && openAirCinemas.every(c => selectedCinemas.has(c.id));
  const someOpenAirSelected = openAirCinemas.some(c => selectedCinemas.has(c.id));

  useEffect(() => {
    if (openAirGroupRef.current) {
      openAirGroupRef.current.indeterminate = someOpenAirSelected && !allOpenAirSelected;
    }
  }, [someOpenAirSelected, allOpenAirSelected]);

  function toggleAllOpenAir() {
    const next = new Set(selectedCinemas);
    if (allOpenAirSelected) openAirCinemas.forEach(c => next.delete(c.id));
    else                    openAirCinemas.forEach(c => next.add(c.id));
    setSelectedCinemas(next);
    save({ cinemas: next.size > 0 ? [...next].join(",") : undefined });
    applyToUrl(next, selectedDates, selectedTimes, sort, ov);
  }

  function toggleAllFavourites() {
    const next = new Set(selectedCinemas);
    if (allFavsSelected) favouriteCinemas.forEach(c => next.delete(c.id));
    else                 favouriteCinemas.forEach(c => next.add(c.id));
    setSelectedCinemas(next);
    save({ cinemas: next.size > 0 ? [...next].join(",") : undefined });
    applyToUrl(next, selectedDates, selectedTimes, sort, ov);
  }

  function clearAll() {
    setSelectedCinemas(new Set());
    setSelectedDates(new Set());
    setSelectedTimes(new Set());
    setSelectedGenres(new Set());
    setSort("listings");
    setOv(false);
    save({ cinemas: undefined, dates: undefined, times: undefined, genres: undefined, sort: undefined, ov: undefined });
    applyToUrl(new Set(), new Set(), new Set(), "listings", false, new Set());
  }

  const activeCount = selectedCinemas.size + selectedDates.size + selectedTimes.size + selectedGenres.size + (sort !== "listings" ? 1 : 0) + (ov ? 1 : 0);

  return (
    <>
      {/* ── FAB ── */}
      {!hideTrigger && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Filters"
          className={[
            "relative flex items-center justify-center",
            "size-12 sm:size-16 rounded-full",
            "bg-card border shadow-lg transition-colors duration-200",
            activeCount > 0
              ? "border-roman/60 text-roman hover:text-roman-muted hover:border-roman-muted"
              : "border-roman/40 text-roman hover:text-roman-muted hover:border-roman-muted",
          ].join(" ")}
        >
          <SlidersHorizontal className="size-5 sm:size-6" />
          {mounted && activeCount > 0 && (
            <span aria-live="polite" className="absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-roman text-white text-[10px] font-bold size-5">
              {activeCount}
            </span>
          )}
        </button>
      )}

      {/* ── Backdrop ── */}
      <div
        aria-hidden="true"
        className={[
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={() => setOpen(false)}
      />

      {/* ── Drawer (slides from left) ── */}
      <aside
        ref={drawerRef}
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col",
          "w-4/5 sm:w-72",
          "bg-popover border-r border-border shadow-2xl",
          "transform transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono tracking-[0.2em] uppercase text-muted-foreground">{t.filters.title}</span>
            {activeCount > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-roman-muted/70 hover:text-roman-muted transition-colors flex items-center gap-1"
              >
                <X className="size-3" /> {t.filters.clearAll}
              </button>
            )}
          </div>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">

          {/* Cinemas */}
          <section>
            <button
              onClick={() => setCinemasOpen(o => !o)}
              aria-expanded={cinemasOpen}
              className="flex items-center gap-2 w-full text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 hover:text-foreground transition-colors"
            >
              <MapPin className="size-3.5" /> {t.filters.cinema}
              {selectedCinemas.size > 0 && (
                <span
                  onClick={(e) => { e.stopPropagation(); setSelectedCinemas(new Set()); save({ cinemas: undefined }); applyToUrl(new Set(), selectedDates, selectedTimes, sort, ov); }}
                  className="ml-auto text-[10px] normal-case tracking-normal text-roman-muted/70 hover:text-roman-muted transition-colors cursor-pointer"
                >
                  {t.filters.clear}
                </span>
              )}
              <ChevronDown className={`size-3.5 transition-transform duration-200 ${selectedCinemas.size > 0 ? "" : "ml-auto"} ${cinemasOpen ? "rotate-180" : ""}`} />
            </button>
            {cinemasOpen && (
              <fieldset className="border-0 p-0 m-0 min-w-0">
                <legend className="sr-only">{t.filters.cinema}</legend>

                {/* Favourites block */}
                {favouriteCinemas.length > 0 && (
                  <div className="mb-3 rounded-md border border-border overflow-hidden">
                    <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-foreground/5 transition-colors bg-foreground/5">
                      <input
                        ref={groupCheckRef}
                        type="checkbox"
                        checked={allFavsSelected}
                        onChange={toggleAllFavourites}
                        className="size-4 rounded border-border accent-[#980328]"
                      />
                      <Star className="size-3.5 fill-roman text-roman shrink-0" />
                      <span className={`text-xs font-semibold uppercase tracking-widest ${allFavsSelected || someFavsSelected ? "text-foreground" : "text-muted-foreground"}`}>
                        {t.filters.favourites}
                      </span>
                    </label>
                    <div className="border-t border-border">
                      {favouriteCinemas.map(c => (
                        <label key={c.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-foreground/5 transition-colors text-sm border-b border-border last:border-0">
                          <input type="checkbox" checked={selectedCinemas.has(c.id)} onChange={() => toggleCinema(c.id)} className="size-4 rounded border-border accent-[#980328]" />
                          <span className={selectedCinemas.has(c.id) ? "text-foreground" : "text-muted-foreground"}>{c.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Open-air block */}
                {openAirCinemas.length > 0 && (
                  <div className="mb-3 rounded-md border border-green-700/30 overflow-hidden">
                    <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-foreground/5 transition-colors bg-foreground/5">
                      <input
                        ref={openAirGroupRef}
                        type="checkbox"
                        checked={allOpenAirSelected}
                        onChange={toggleAllOpenAir}
                        className="size-4 rounded border-border accent-[#15803d]"
                      />
                      <Trees className="size-3.5 text-green-700 shrink-0" />
                      <span className={`text-xs font-semibold uppercase tracking-widest ${allOpenAirSelected || someOpenAirSelected ? "text-foreground" : "text-muted-foreground"}`}>
                        {t.filters.openAir}
                      </span>
                    </label>
                    <div className="border-t border-green-700/20">
                      {openAirCinemas.map(c => (
                        <label key={c.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-foreground/5 transition-colors text-sm border-b border-border last:border-0">
                          <input type="checkbox" checked={selectedCinemas.has(c.id)} onChange={() => toggleCinema(c.id)} className="size-4 rounded border-border accent-[#15803d]" />
                          <span className={selectedCinemas.has(c.id) ? "text-foreground" : "text-muted-foreground"}>{c.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search + remaining cinemas */}
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={cinemaSearch}
                    onChange={e => setCinemaSearch(e.target.value)}
                    placeholder={t.filters.searchCinema}
                    aria-label={t.filters.searchCinema}
                    className="w-full rounded-sm border border-border bg-background/50 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-roman/60 transition-colors"
                  />
                  {cinemaSearch && (
                    <button
                      onClick={() => setCinemaSearch("")}
                      aria-label={t.filters.clear}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
                <div className="space-y-0.5">
                  {otherCinemas
                    .filter(c => c.name.toLowerCase().includes(cinemaSearch.toLowerCase()))
                    .map(c => (
                      <label key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer hover:bg-foreground/5 transition-colors text-sm">
                        <input type="checkbox" checked={selectedCinemas.has(c.id)} onChange={() => toggleCinema(c.id)} className="size-4 rounded border-border accent-[#980328]" />
                        <span className={selectedCinemas.has(c.id) ? "text-foreground" : "text-muted-foreground"}>{c.name}</span>
                      </label>
                    ))
                  }
                </div>
              </fieldset>
            )}
          </section>

          {/* Dates */}
          <section>
            <button
              onClick={() => setDatesOpen(o => !o)}
              aria-expanded={datesOpen}
              className="flex items-center gap-2 w-full text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 hover:text-foreground transition-colors"
            >
              <Calendar className="size-3.5" /> {t.filters.date}
              {selectedDates.size > 0 && (
                <span
                  onClick={(e) => { e.stopPropagation(); setSelectedDates(new Set()); save({ dates: undefined }); applyToUrl(selectedCinemas, new Set(), selectedTimes, sort, ov); }}
                  className="ml-auto text-[10px] normal-case tracking-normal text-roman-muted/70 hover:text-roman-muted transition-colors cursor-pointer"
                >
                  {t.filters.clear}
                </span>
              )}
              <ChevronDown className={`size-3.5 transition-transform duration-200 ${selectedDates.size > 0 ? "" : "ml-auto"} ${datesOpen ? "rotate-180" : ""}`} />
            </button>
            {datesOpen && (
              <fieldset className="border-0 p-0 m-0 min-w-0">
                <legend className="sr-only">{t.filters.date}</legend>
                <div className="space-y-0.5">
                  {days.map(d => (
                    <label key={d.iso} className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer hover:bg-foreground/5 transition-colors text-sm">
                      <input type="checkbox" checked={selectedDates.has(d.iso)} onChange={() => toggleDate(d.iso)} className="size-4 rounded border-border accent-[#980328]" />
                      <span className={selectedDates.has(d.iso) ? "text-foreground" : "text-muted-foreground"}>{d.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </section>

          {/* Time ranges */}
          <section>
            <button
              onClick={() => setTimesOpen(o => !o)}
              aria-expanded={timesOpen}
              className="flex items-center gap-2 w-full text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 hover:text-foreground transition-colors"
            >
              <Clock className="size-3.5" /> {t.filters.timeRange}
              {selectedTimes.size > 0 && (
                <span
                  onClick={(e) => { e.stopPropagation(); setSelectedTimes(new Set()); save({ times: undefined }); applyToUrl(selectedCinemas, selectedDates, new Set(), sort, ov); }}
                  className="ml-auto text-[10px] normal-case tracking-normal text-roman-muted/70 hover:text-roman-muted transition-colors cursor-pointer"
                >
                  {t.filters.clear}
                </span>
              )}
              <ChevronDown className={`size-3.5 transition-transform duration-200 ${selectedTimes.size > 0 ? "" : "ml-auto"} ${timesOpen ? "rotate-180" : ""}`} />
            </button>
            {timesOpen && (
              <fieldset className="border-0 p-0 m-0 min-w-0">
                <legend className="sr-only">{t.filters.timeRange}</legend>
                <div className="space-y-0.5">
                  {TIME_RANGES.map(r => (
                    <label key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer hover:bg-foreground/5 transition-colors text-sm">
                      <input type="checkbox" checked={selectedTimes.has(r.id)} onChange={() => toggleTime(r.id)} className="size-4 rounded border-border accent-[#980328]" />
                      <span className={selectedTimes.has(r.id) ? "text-foreground" : "text-muted-foreground"}>{r.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </section>

          {/* Genre */}
          <section>
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              <Tag className="size-3.5" /> {t.filters.genre}
              {selectedGenres.size > 0 && (
                <span
                  onClick={() => { setSelectedGenres(new Set()); save({ genres: undefined }); applyToUrl(selectedCinemas, selectedDates, selectedTimes, sort, ov, new Set()); }}
                  className="ml-auto text-[10px] normal-case tracking-normal text-roman-muted/70 hover:text-roman-muted transition-colors cursor-pointer"
                >
                  {t.filters.clear}
                </span>
              )}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {ALL_GENRES.map(g => {
                const active = selectedGenres.has(g);
                return (
                  <button
                    key={g}
                    onClick={() => toggleGenre(g)}
                    className={[
                      "text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border transition-colors",
                      active
                        ? "border-roman text-roman bg-roman/10"
                        : "border-border text-muted-foreground hover:border-roman/50 hover:text-foreground",
                    ].join(" ")}
                  >
                    {getGenreLabel(g, locale)}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Original version */}
          <section>
            <label className="flex items-center justify-between px-3 py-2.5 rounded-md cursor-pointer hover:bg-foreground/5 transition-colors">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Languages className="size-3.5" /> {t.filters.originalVersionOnly}
              </span>
              <input
                type="checkbox"
                checked={ov}
                onChange={toggleOV}
                className="size-4 rounded border-border accent-[#980328]"
              />
            </label>
          </section>

          {/* Sort */}
          <section>
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              <ArrowUpDown className="size-3.5" /> {t.filters.orderBy}
            </h3>
            <fieldset className="border-0 p-0 m-0 min-w-0">
              <legend className="sr-only">{t.filters.orderBy}</legend>
              <div className="space-y-0.5">
                {[
                { value: "listings", label: t.filters.mostScreenings },
                { value: "alpha", label: t.filters.alphabetical },
                { value: "popularityDesc", label: t.filters.popularityDesc },
                { value: "popularityAsc", label: t.filters.popularityAsc },
              ].map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer hover:bg-foreground/5 transition-colors text-sm">
                    <input type="radio" name="global-sort" value={value} checked={sort === value} onChange={() => changeSort(value)} className="accent-[#980328]" />
                    <span className={sort === value ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

        </div>
      </aside>
    </>
  );
}
