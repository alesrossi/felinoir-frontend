"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Film, Star } from "lucide-react";
import { MovieMap } from "@/components/map/movie-map-dynamic";
import { BookingModal } from "@/components/map/movie-map";
import type { MovieCinemaMarker, ModalState } from "@/components/map/movie-map";
import { loadStoredCinemas, loadStoredOV, loadStoredTimes, loadStoredDates, loadStoredFavourites, FAVOURITES_KEY, GLOBAL_FILTER_EVENT } from "@/components/global-filter-fab";
import { TIME_RANGES, inTimeRange, minutesFromDatetime } from "@/lib/time-ranges";
import { useLang } from "@/lib/lang";

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function parseDateStr(s: string): Date {
  const [y, mo, d] = s.split("-").map(Number);
  return new Date(y, mo - 1, d);
}

// ---------------------------------------------------------------------------
// List view — one row per cinema, showings as time chips
// ---------------------------------------------------------------------------

function CinemaRow({
  marker,
  isFavourite,
  onOpenModal,
}: {
  marker: MovieCinemaMarker;
  isFavourite: boolean;
  onOpenModal: () => void;
}) {
  const chipClass = "inline-flex flex-col items-center rounded-sm px-2.5 py-1.5 transition-colors text-xs tabular-nums font-bold leading-none";
  return (
    <li className="px-5 py-4 flex flex-col gap-2">
      <a
        href={marker.cinemaWebsite}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-roman-muted transition-colors leading-tight"
      >
        {isFavourite && <Star className="size-3 shrink-0 fill-amber-400 text-amber-400" />}
        {marker.cinemaName}
      </a>
      <div className="flex flex-wrap gap-1.5">
        {marker.showings.map((s) => {
          const badges = (s.is3D || s.isOV) && (
            <span className="flex gap-0.5 mt-1">
              {s.is3D && <span className="text-[9px] font-bold px-1 py-px rounded border border-border text-muted-foreground">3D</span>}
              {s.isOV && <span className="text-[9px] font-bold px-1 py-px rounded border border-roman/40 text-roman-muted">OV</span>}
            </span>
          );
          return (
            <button
              key={s.id}
              onClick={onOpenModal}
              className={`${chipClass} bg-roman/10 text-roman-muted border border-roman/30 hover:bg-roman/20`}
            >
              {s.time}{badges}
            </button>
          );
        })}
      </div>
    </li>
  );
}

function ShowingsList({
  markers,
  movieTitle,
  dateStr,
}: {
  markers: MovieCinemaMarker[];
  movieTitle?: string;
  dateStr: string;
}) {
  const { locale } = useLang();
  const [moreOpen, setMoreOpen] = useState(false);
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalState | null>(null);

  useEffect(() => {
    setFavourites(loadStoredFavourites());
    function sync() { setFavourites(loadStoredFavourites()); }
    window.addEventListener(FAVOURITES_KEY, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(FAVOURITES_KEY, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function openModal(m: MovieCinemaMarker) {
    setModal({
      movieTitle,
      cinemaName: m.cinemaName,
      cinemaWebsite: m.cinemaWebsite,
      date: dateStr,
      showings: m.showings,
    });
  }

  const active   = [...markers].filter(m => m.active !== false).sort((a, b) => a.cinemaName.localeCompare(b.cinemaName));
  const inactive = [...markers].filter(m => m.active === false).sort((a, b) => a.cinemaName.localeCompare(b.cinemaName));

  return (
    <div className="h-full overflow-y-auto">
      <ul className="divide-y divide-border">
        {active.map(m => (
          <CinemaRow
            key={m.cinemaId}
            marker={m}
            isFavourite={favourites.has(m.cinemaId)}
            onOpenModal={() => openModal(m)}
          />
        ))}
      </ul>

      {inactive.length > 0 && (
        <div className="border-t border-border">
          <button
            onClick={() => setMoreOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="font-mono tracking-wider uppercase">
              {locale === "en" ? "More" : "Altri"} ({inactive.length})
            </span>
            <ChevronLeft className={`size-3.5 transition-transform ${moreOpen ? "-rotate-90" : "rotate-180"}`} />
          </button>
          {moreOpen && (
            <ul className="divide-y divide-border border-t border-border">
              {inactive.map(m => (
                <CinemaRow
                  key={m.cinemaId}
                  marker={m}
                  isFavourite={favourites.has(m.cinemaId)}
                  onOpenModal={() => openModal(m)}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {modal && <BookingModal state={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date navigator
// ---------------------------------------------------------------------------

function DateNavigator({
  date,
  isToday,
  onPrev,
  onNext,
  onSelectDate,
  prevDisabled,
  nextDisabled,
}: {
  date: Date;
  isToday: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSelectDate: (d: Date) => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
}) {
  const { t, locale } = useLang();
  const localeStr = locale === "en" ? "en-GB" : "it-IT";
  const weekday = date.toLocaleDateString(localeStr, { weekday: "short" }).toUpperCase();
  const month   = date.toLocaleDateString(localeStr, { month: "short" }).toUpperCase();
  const day     = date.getDate();
  const year    = date.getFullYear();
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    try {
      inputRef.current?.showPicker?.();
    } catch {
      inputRef.current?.click();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (!val) return;
    const [y, mo, d] = val.split("-").map(Number);
    onSelectDate(new Date(y, mo - 1, d));
  }

  return (
    <div className="flex items-center justify-center gap-3 px-5 py-3 border-b border-border shrink-0 select-none">
      <button
        onClick={onPrev}
        disabled={prevDisabled}
        className="p-1.5 rounded-sm text-foreground hover:bg-foreground/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous day"
      >
        <ChevronLeft className="size-4" />
      </button>

      {/* Date display — clickable to open native date picker */}
      <button
        onClick={openPicker}
        className="flex items-baseline justify-center gap-2 min-w-[140px] cursor-pointer group"
        aria-label="Select date"
      >
        <span className="text-[10px] font-mono tracking-[0.15em] text-muted-foreground">
          {weekday}
        </span>
        <span className="font-mono leading-none text-5xl text-foreground group-hover:text-roman-muted transition-colors">
          {day}
        </span>
        <span className="text-[10px] font-mono tracking-[0.15em] text-muted-foreground">
          {month} {!isToday && year}
          {isToday && <span className="ml-1.5 text-roman-muted">{t.schedule.today}</span>}
        </span>
        <input
          ref={inputRef}
          type="date"
          value={toDateStr(date)}
          onChange={handleInputChange}
          className="sr-only"
          aria-hidden="true"
        />
      </button>

      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="p-1.5 rounded-sm text-foreground hover:bg-foreground/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        aria-label="Next day"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel — date state + cinema filter from localStorage + filtered map
// ---------------------------------------------------------------------------

interface MovieSchedulePanelProps {
  markers: MovieCinemaMarker[]; // all cinemas for this movie, active flag ignored (computed here)
  movieTitle?: string;
  movieLanguage?: string; // tmdbLanguage, e.g. "it", "en", "fr"
  view?: "map" | "list";
  onFilteredCountChange?: (count: number) => void;
}

/**
 * Sorted list of dates (today onward) that have at least one showing under the
 * active filters. Landing and prev/next navigation both walk this list, so the
 * user never lands on — or steps through — a date with nothing to show.
 */
function availableDatesFor(
  markers: MovieCinemaMarker[],
  cinemas: Set<string>,
  ov: boolean,
  times: Set<string>,
  dateFilter: Set<string>,
  movieLanguage?: string,
): string[] {
  const todayStr = toDateStr(startOfDay(new Date()));
  const activeTimeRanges = TIME_RANGES.filter(r => times.has(r.id));
  const dates = new Set<string>();
  for (const m of markers) {
    if (cinemas.size > 0 && !cinemas.has(m.cinemaId)) continue;
    if (m.openAir && !cinemas.has(m.cinemaId)) continue;
    for (const s of m.showings) {
      const d = s.datetime.slice(0, 10);
      if (d < todayStr) continue;
      if (dateFilter.size > 0 && !dateFilter.has(d)) continue;
      if (ov && !s.isOV && movieLanguage && movieLanguage !== "it") continue;
      if (activeTimeRanges.length > 0) {
        const mins = minutesFromDatetime(s.datetime);
        if (!activeTimeRanges.some(r => inTimeRange(r, mins))) continue;
      }
      dates.add(d);
    }
  }
  return [...dates].sort();
}

export function MovieSchedulePanel({ markers, movieTitle, movieLanguage, view = "map", onFilteredCountChange }: MovieSchedulePanelProps) {
  const { t } = useLang();
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));
  const [selectedCinemas, setSelectedCinemas] = useState<Set<string>>(new Set());
  const [filterOV, setFilterOV] = useState(false);
  const [selectedTimes, setSelectedTimes] = useState<Set<string>>(new Set());
  const [filterDates, setFilterDates] = useState<Set<string>>(new Set());

  // On mount: load all filters and jump to the first relevant date
  useEffect(() => {
    const cinemas = loadStoredCinemas();
    const ov      = loadStoredOV();
    const times   = loadStoredTimes();
    const dates   = loadStoredDates();
    setSelectedCinemas(cinemas);
    setFilterOV(ov);
    setSelectedTimes(times);
    setFilterDates(dates);

    // Land on the first date that actually has showings under the loaded
    // filters — never on an empty date.
    const first = availableDatesFor(markers, cinemas, ov, times, dates, movieLanguage)[0];
    if (first && first !== toDateStr(startOfDay(new Date()))) {
      setSelectedDate(parseDateStr(first));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ongoing filter sync — does not reset the date the user is viewing
  useEffect(() => {
    function sync() {
      setSelectedCinemas(loadStoredCinemas());
      setFilterOV(loadStoredOV());
      setSelectedTimes(loadStoredTimes());
      setFilterDates(loadStoredDates());
    }
    window.addEventListener(GLOBAL_FILTER_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(GLOBAL_FILTER_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const today = startOfDay(new Date());
  const isToday = selectedDate.getTime() === today.getTime();
  const dateStr = toDateStr(selectedDate);

  // Navigation walks only dates that have showings under the active filters,
  // skipping empty days (e.g. from the 3rd straight to the 9th).
  const availableDates = useMemo<string[]>(
    () => availableDatesFor(markers, selectedCinemas, filterOV, selectedTimes, filterDates, movieLanguage),
    [markers, selectedCinemas, filterOV, selectedTimes, filterDates, movieLanguage],
  );

  // Nearest available date on either side of the current one. Works even when
  // the current date is off-list (picked via the native date picker).
  const prevAvailable = [...availableDates].reverse().find(d => d < dateStr);
  const nextAvailable = availableDates.find(d => d > dateStr);

  function prevDay() {
    if (prevAvailable) setSelectedDate(parseDateStr(prevAvailable));
  }

  function nextDay() {
    if (nextAvailable) setSelectedDate(parseDateStr(nextAvailable));
  }

  const prevDisabled = !prevAvailable;
  const nextDisabled = !nextAvailable;

  const hasCinemaFilter = selectedCinemas.size > 0;

  // Apply cinema filter (active flag) + date filter + OV filter + time filter
  const filteredMarkers = useMemo<MovieCinemaMarker[]>(() => {
    const activeTimeRanges = TIME_RANGES.filter(r => selectedTimes.has(r.id));
    return markers
      .filter(m => !m.openAir || selectedCinemas.has(m.cinemaId))
      .map(m => ({
        ...m,
        active: !hasCinemaFilter || selectedCinemas.has(m.cinemaId),
        showings: m.showings.filter(s => {
          if (!s.datetime.startsWith(dateStr)) return false;
          if (filterOV && !s.isOV && movieLanguage && movieLanguage !== "it") return false;
          if (activeTimeRanges.length > 0) {
            const mins = minutesFromDatetime(s.datetime);
            if (!activeTimeRanges.some(r => inTimeRange(r, mins))) return false;
          }
          return true;
        }),
      }))
      .filter(m => m.showings.length > 0);
  }, [markers, selectedCinemas, hasCinemaFilter, dateStr, filterOV, selectedTimes, movieLanguage]);

  const hasAnyShowings = filteredMarkers.length > 0;

  useEffect(() => {
    onFilteredCountChange?.(filteredMarkers.length);
  }, [filteredMarkers.length, onFilteredCountChange]);

  return (
    <div className="h-full flex flex-col">
      <DateNavigator
        date={selectedDate}
        isToday={isToday}
        onPrev={prevDay}
        onNext={nextDay}
        onSelectDate={setSelectedDate}
        prevDisabled={prevDisabled}
        nextDisabled={nextDisabled}
      />

      {/* Map or list */}
      <div className="flex-1 min-h-0">
        {!hasAnyShowings ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground p-8">
            <Film className="size-8 opacity-20" />
            <p className="font-serif italic text-lg font-light text-center">
              {t.schedule.noShowings}
            </p>
            {hasCinemaFilter && (
              <button
                onClick={() => {
                  try {
                    const raw = localStorage.getItem("cinema-filters");
                    const data = raw ? JSON.parse(raw) : {};
                    delete data.cinemas;
                    localStorage.setItem("cinema-filters", JSON.stringify(data));
                    window.dispatchEvent(new CustomEvent(GLOBAL_FILTER_EVENT));
                  } catch {}
                }}
                className="text-xs hover:text-roman-muted transition-colors"
              >
                {t.schedule.clearCinemaFilter}
              </button>
            )}
          </div>
        ) : view === "list" ? (
          <ShowingsList markers={filteredMarkers} movieTitle={movieTitle} dateStr={dateStr} />
        ) : (
          <MovieMap markers={filteredMarkers} movieTitle={movieTitle} />
        )}
      </div>
    </div>
  );
}
