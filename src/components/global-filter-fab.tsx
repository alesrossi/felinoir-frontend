"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SlidersHorizontal, X, Calendar, ArrowUpDown, MapPin, Languages, ChevronDown, Search, Clock, Star, Tag, Trees, Check, Minus, Sunrise, Sun, Sunset, Moon, MoonStar } from "lucide-react";
import { ALL_GENRES, getGenreLabel } from "@/lib/genres";
import { TIME_RANGES } from "@/lib/time-ranges";
import { useLang } from "@/lib/lang";
import { romeDateString } from "@/lib/structured-data/rome-time";

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
  // "Today" is Rome's today — the listings are Rome wall clocks, and the server
  // (UTC in Docker) and the browser must agree or hydration fails after midnight.
  const [y, m, d0] = romeDateString(new Date()).split("-").map(Number);
  const today = new Date(y, m - 1, d0);
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

  // Per-section resets — same effect as before, now proper buttons rather than
  // clickable spans nested inside the section toggles.
  function clearCinemas() { setSelectedCinemas(new Set()); save({ cinemas: undefined }); applyToUrl(new Set(), selectedDates, selectedTimes, sort, ov); }
  function clearDates()   { setSelectedDates(new Set());   save({ dates: undefined });   applyToUrl(selectedCinemas, new Set(), selectedTimes, sort, ov); }
  function clearTimes()   { setSelectedTimes(new Set());   save({ times: undefined });   applyToUrl(selectedCinemas, selectedDates, new Set(), sort, ov); }
  function clearGenres()  { setSelectedGenres(new Set());  save({ genres: undefined });  applyToUrl(selectedCinemas, selectedDates, selectedTimes, sort, ov, new Set()); }

  const sortOptions = [
    { value: "listings",       label: t.filters.mostScreenings },
    { value: "alpha",          label: t.filters.alphabetical },
    { value: "popularityDesc", label: t.filters.popularityDesc },
    { value: "popularityAsc",  label: t.filters.popularityAsc },
  ];

  const visibleOtherCinemas = otherCinemas.filter(c => c.name.toLowerCase().includes(cinemaSearch.toLowerCase()));

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

      {/* ── Scrim ── */}
      <div
        aria-hidden="true"
        className={[
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={() => setOpen(false)}
      />

      {/* ── Sheet — floats in from the left, where its button lives ── */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={t.filters.title}
        aria-hidden={!open}
        inert={!open}
        className={[
          "fixed inset-y-2 left-2 sm:inset-y-3 sm:left-3 z-50 flex flex-col",
          "w-[calc(100%-1rem)] max-w-[23rem] overflow-hidden rounded-2xl",
          // Mostly opaque so text stays legible even where blur isn't rendered;
          // fully solid when the user asks the OS for reduced transparency.
          "bg-popover/95 backdrop-blur-2xl backdrop-saturate-150 [@media(prefers-reduced-transparency:reduce)]:bg-popover",
          "ring-1 ring-foreground/10 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.45)]",
          "transition-[transform,opacity] duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
          "motion-reduce:transition-opacity motion-reduce:duration-200",
          open
            ? "translate-x-0 opacity-100"
            : "-translate-x-[calc(100%+1rem)] opacity-0 motion-reduce:translate-x-0 pointer-events-none",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-14 shrink-0">
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-foreground">
            {t.filters.title}
            {mounted && activeCount > 0 && (
              <span className="ml-2 text-sm font-medium tabular-nums text-foreground/45">{activeCount}</span>
            )}
          </h2>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className={`btn-roman ${DARK_NEUTRAL} grid size-8 place-items-center rounded-full active:scale-[0.92]`}
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 space-y-7 [scrollbar-width:thin] [scrollbar-color:hsl(var(--foreground)/0.15)_transparent]">

          {/* When — days as chips */}
          <FilterSection
            icon={<Calendar className="size-3.5" />}
            title={t.filters.when}
            count={selectedDates.size}
            open={datesOpen}
            onToggle={() => setDatesOpen(o => !o)}
            onClear={clearDates}
            clearLabel={t.filters.clear}
          >
            <fieldset className="grid grid-cols-4 gap-1.5 border-0 p-0 m-0 min-w-0">
              <legend className="sr-only">{t.filters.date}</legend>
              {days.map(d => (
                <Chip key={d.iso} checked={selectedDates.has(d.iso)} onChange={() => toggleDate(d.iso)} className={d.iso === days[0].iso || d.iso === days[1].iso ? "col-span-2" : ""}>
                  <span className="capitalize">{d.label}</span>
                </Chip>
              ))}
            </fieldset>
          </FilterSection>

          {/* Time — named slots with their hours */}
          <FilterSection
            icon={<Clock className="size-3.5" />}
            title={t.filters.timeRange}
            count={selectedTimes.size}
            open={timesOpen}
            onToggle={() => setTimesOpen(o => !o)}
            onClear={clearTimes}
            clearLabel={t.filters.clear}
          >
            <fieldset className="grid grid-cols-2 gap-1.5 border-0 p-0 m-0 min-w-0">
              <legend className="sr-only">{t.filters.timeRange}</legend>
              {TIME_RANGES.map((r, i) => {
                const Icon = TIME_ICONS[r.id] ?? Clock;
                return (
                  <Chip
                    key={r.id}
                    checked={selectedTimes.has(r.id)}
                    onChange={() => toggleTime(r.id)}
                    className={`!justify-start text-left px-3 py-2 ${i === TIME_RANGES.length - 1 && TIME_RANGES.length % 2 === 1 ? "col-span-2" : ""}`}
                  >
                    <Icon className="size-4 shrink-0 opacity-70" />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium leading-tight">{t.filters.timeNames[r.id] ?? r.label}</span>
                      <span className="block text-[11px] tabular-nums opacity-60 leading-tight">{r.label}</span>
                    </span>
                  </Chip>
                );
              })}
            </fieldset>
          </FilterSection>

          {/* Where — favourites, open air, then everything else */}
          <FilterSection
            icon={<MapPin className="size-3.5" />}
            title={t.filters.cinema}
            count={selectedCinemas.size}
            open={cinemasOpen}
            onToggle={() => setCinemasOpen(o => !o)}
            onClear={clearCinemas}
            clearLabel={t.filters.clear}
          >
            <fieldset className="border-0 p-0 m-0 min-w-0 space-y-3">
              <legend className="sr-only">{t.filters.cinema}</legend>

              {favouriteCinemas.length > 0 && (
                <div className="overflow-hidden rounded-xl bg-foreground/[0.04]">
                  <CheckRow
                    inputRef={groupCheckRef}
                    checked={allFavsSelected}
                    mixed={someFavsSelected && !allFavsSelected}
                    onChange={toggleAllFavourites}
                    strong
                  >
                    <Star className="size-3.5 fill-amber-400 text-amber-400 shrink-0" />
                    {t.filters.favourites}
                  </CheckRow>
                  {favouriteCinemas.map(c => (
                    <CheckRow key={c.id} checked={selectedCinemas.has(c.id)} onChange={() => toggleCinema(c.id)} inset>
                      {c.name}
                    </CheckRow>
                  ))}
                </div>
              )}

              {openAirCinemas.length > 0 && (
                <div className="overflow-hidden rounded-xl bg-foreground/[0.04]">
                  <CheckRow
                    inputRef={openAirGroupRef}
                    checked={allOpenAirSelected}
                    mixed={someOpenAirSelected && !allOpenAirSelected}
                    onChange={toggleAllOpenAir}
                    tone="green"
                    strong
                  >
                    <Trees className="size-3.5 text-green-600 shrink-0" />
                    {t.filters.openAir}
                  </CheckRow>
                  {openAirCinemas.map(c => (
                    <CheckRow key={c.id} checked={selectedCinemas.has(c.id)} onChange={() => toggleCinema(c.id)} tone="green" inset>
                      {c.name}
                    </CheckRow>
                  ))}
                </div>
              )}

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-foreground/45" />
                <input
                  type="text"
                  value={cinemaSearch}
                  onChange={e => setCinemaSearch(e.target.value)}
                  placeholder={t.filters.searchCinema}
                  aria-label={t.filters.searchCinema}
                  className="h-9 w-full rounded-full bg-foreground/[0.06] pl-8 pr-8 text-sm text-foreground placeholder:text-foreground/45 focus:outline-none focus:bg-background focus:ring-2 focus:ring-roman/40 transition"
                />
                {cinemaSearch && (
                  <button
                    onClick={() => setCinemaSearch("")}
                    aria-label={t.filters.clear}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 grid size-6 place-items-center rounded-full text-roman-muted hover:bg-roman/10 active:bg-roman active:text-white dark:text-foreground/50 dark:hover:bg-foreground/[0.08] dark:hover:text-foreground dark:active:bg-foreground/[0.12] dark:active:text-foreground transition"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {visibleOtherCinemas.length > 0 && (
                <div className="overflow-hidden rounded-xl bg-foreground/[0.04]">
                  {visibleOtherCinemas.map(c => (
                    <CheckRow key={c.id} checked={selectedCinemas.has(c.id)} onChange={() => toggleCinema(c.id)}>
                      {c.name}
                    </CheckRow>
                  ))}
                </div>
              )}
            </fieldset>
          </FilterSection>

          {/* Genre */}
          <FilterSection
            icon={<Tag className="size-3.5" />}
            title={t.filters.genre}
            count={selectedGenres.size}
            onClear={clearGenres}
            clearLabel={t.filters.clear}
          >
            <div className="flex flex-wrap gap-1.5">
              {ALL_GENRES.map(g => (
                <Chip key={g} checked={selectedGenres.has(g)} onChange={() => toggleGenre(g)} className="!rounded-full px-3 py-1.5">
                  {getGenreLabel(g, locale)}
                </Chip>
              ))}
            </div>
          </FilterSection>

          {/* Original version — a real switch */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-foreground/[0.04] px-3.5 py-3 hover:bg-foreground/[0.06] transition-colors">
            <Languages className="size-4 shrink-0 text-foreground/60" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">{t.filters.originalVersionOnly}</span>
              <span className="block text-xs text-foreground/50">{t.filters.ovHint}</span>
            </span>
            <input type="checkbox" role="switch" checked={ov} onChange={toggleOV} className="peer sr-only" />
            <span
              aria-hidden
              className="relative h-[26px] w-[44px] shrink-0 rounded-full bg-foreground/15 transition-colors duration-200 peer-checked:bg-roman peer-focus-visible:ring-2 peer-focus-visible:ring-roman/50 after:absolute after:left-[3px] after:top-[3px] after:size-5 after:rounded-full after:bg-white after:shadow-[0_2px_4px_rgba(0,0,0,0.25)] after:transition-transform after:duration-200 after:ease-[cubic-bezier(0.32,0.72,0,1)] peer-checked:after:translate-x-[18px]"
            />
          </label>

          {/* Order by — checkmark list */}
          <FilterSection icon={<ArrowUpDown className="size-3.5" />} title={t.filters.orderBy}>
            <fieldset className="overflow-hidden rounded-xl bg-foreground/[0.04] border-0 p-0 m-0 min-w-0">
              <legend className="sr-only">{t.filters.orderBy}</legend>
              {sortOptions.map(({ value, label }) => (
                <label key={value} className="flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 text-sm hover:bg-foreground/[0.04] transition-colors [&+&]:shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06)]">
                  <input type="radio" name="global-sort" value={value} checked={sort === value} onChange={() => changeSort(value)} className="peer sr-only" />
                  <span className={sort === value ? "font-medium text-foreground" : "text-foreground/70"}>{label}</span>
                  <Check className={`size-4 text-roman transition-opacity ${sort === value ? "opacity-100" : "opacity-0"}`} />
                </label>
              ))}
            </fieldset>
          </FilterSection>
        </div>

        {/* Footer — filters apply live, so "Done" just closes */}
        <div className="flex items-center gap-2 px-5 py-3 shrink-0 shadow-[0_-1px_0_hsl(var(--foreground)/0.06)]">
          <button
            onClick={clearAll}
            disabled={!mounted || activeCount === 0}
            className="h-10 rounded-full px-4 text-sm font-medium text-roman-muted hover:bg-roman/10 active:bg-roman active:text-white dark:text-foreground/70 dark:hover:bg-foreground/[0.06] dark:hover:text-foreground dark:active:bg-foreground/[0.1] dark:active:text-foreground active:scale-[0.97] disabled:opacity-30 disabled:pointer-events-none transition"
          >
            {t.filters.clearAll}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="btn-roman dark:border-roman dark:bg-roman dark:text-white dark:hover:bg-roman/85 ml-auto h-10 rounded-full px-6 text-sm font-semibold active:scale-[0.97]"
          >
            {t.filters.done}
          </button>
        </div>
      </aside>
    </>
  );
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

// Dark mode keeps the drawer's quieter neutral controls (light mode uses the red
// outline). Selected chips and the primary button are roman red in both.
const DARK_NEUTRAL =
  "dark:border-transparent dark:bg-foreground/[0.06] dark:text-foreground/75 dark:hover:border-transparent dark:hover:bg-foreground/[0.1] dark:hover:text-foreground";

const TIME_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  morning: Sunrise,
  afternoon: Sun,
  late_afternoon: Sunset,
  evening: Moon,
  late_night: MoonStar,
};

/** Section with a sentence-case title, selected count, optional clear + collapse. */
function FilterSection({
  icon, title, count = 0, open = true, onToggle, onClear, clearLabel, children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  open?: boolean;
  onToggle?: () => void;
  onClear?: () => void;
  clearLabel?: string;
  children: React.ReactNode;
}) {
  const heading = (
    <>
      <span className="text-foreground/50">{icon}</span>
      <span>{title}</span>
      {count > 0 && (
        <span className="grid min-w-5 h-5 place-items-center rounded-full bg-roman/15 px-1.5 text-[11px] font-semibold tabular-nums text-roman-muted">
          {count}
        </span>
      )}
    </>
  );
  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2">
        {onToggle ? (
          <button onClick={onToggle} aria-expanded={open} className="group flex flex-1 items-center gap-2 text-sm font-semibold text-foreground">
            {heading}
            <ChevronDown className={`ml-auto size-4 text-foreground/40 group-hover:text-foreground/70 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </button>
        ) : (
          <h3 className="flex flex-1 items-center gap-2 text-sm font-semibold text-foreground">{heading}</h3>
        )}
        {onClear && count > 0 && (
          <button onClick={onClear} className="text-xs font-medium text-roman-muted hover:text-roman transition-colors">
            {clearLabel}
          </button>
        )}
      </div>
      {open && children}
    </section>
  );
}

/** Toggle chip backed by a real (visually hidden) checkbox. */
function Chip({ checked, onChange, className = "", children }: {
  checked: boolean;
  onChange: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      className={[
        "flex cursor-pointer select-none items-center justify-center gap-2 rounded-lg px-2 py-2 text-[13px] font-medium transition active:scale-[0.96]",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-roman/50",
        checked ? "btn-roman-on" : `btn-roman ${DARK_NEUTRAL}`,
        className,
      ].join(" ")}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}

/** List row with a round checkmark, backed by a real (visually hidden) checkbox. */
function CheckRow({ checked, mixed = false, onChange, inputRef, tone = "roman", strong = false, inset = false, children }: {
  checked: boolean;
  mixed?: boolean;
  onChange: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
  tone?: "roman" | "green";
  strong?: boolean;
  inset?: boolean;
  children: React.ReactNode;
}) {
  const on = checked || mixed;
  const fill = tone === "green" ? "bg-green-600 ring-green-600" : "bg-roman ring-roman";
  return (
    <label
      className={[
        "flex cursor-pointer items-center gap-3 py-2.5 pr-3.5 text-sm transition-colors hover:bg-foreground/[0.04]",
        "[&+&]:shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06)] has-[:focus-visible]:bg-foreground/[0.06]",
        inset ? "pl-9" : "pl-3.5",
      ].join(" ")}
    >
      <input ref={inputRef} type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span
        aria-hidden
        className={`grid size-[18px] shrink-0 place-items-center rounded-full ring-[1.5px] ring-inset transition-colors ${
          on ? `${fill} text-white` : "ring-foreground/25"
        }`}
      >
        {mixed ? <Minus className="size-3" strokeWidth={3} /> : checked ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      <span className={`flex min-w-0 items-center gap-2 ${strong ? "font-semibold" : ""} ${on ? "text-foreground" : "text-foreground/75"}`}>
        {children}
      </span>
    </label>
  );
}
