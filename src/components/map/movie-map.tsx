"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { X, Share2, Check, CalendarPlus } from "lucide-react";
import { Map, MapMarker, MarkerContent, MapControls, useMap } from "@/components/ui/map";
import { useLang } from "@/lib/lang";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MovieShowing {
  id: number;
  datetime: string; // "2025-04-16T20:30:00"
  time: string;     // "20:30"
  is3D: boolean;
  isOV: boolean;
  bookingUrl?: string | null;
}

export interface MovieCinemaMarker {
  cinemaId: string;
  cinemaName: string;
  cinemaWebsite?: string;
  lat: number;
  lng: number;
  openAir?: boolean;
  showings: MovieShowing[]; // upcoming, sorted ascending by datetime
  active?: boolean;         // false → render as a plain dot with no totem
}

// ---------------------------------------------------------------------------
// Time chip — used inside the booking modal
// ---------------------------------------------------------------------------

function TimeChip({ showing, cinemaWebsite }: { showing: MovieShowing; cinemaWebsite?: string }) {
  const badges = (showing.is3D || showing.isOV) && (
    <span className="flex gap-1 mt-1.5">
      {showing.is3D && (
        <span className="text-[9px] font-bold px-1 py-px rounded border border-border text-muted-foreground">
          3D
        </span>
      )}
      {showing.isOV && (
        <span className="text-[9px] font-bold px-1 py-px rounded border border-roman/40 text-roman-muted">
          OV
        </span>
      )}
    </span>
  );

  const base = "inline-flex flex-col items-center rounded-sm px-3 py-2 transition-colors";

  const href = showing.bookingUrl ?? cinemaWebsite;

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} bg-roman/10 text-roman-muted border border-roman/30 hover:bg-roman/20`}
      >
        <span className="tabular-nums font-bold text-sm leading-none">{showing.time}</span>
        {badges}
      </a>
    );
  }
  return (
    <div className={`${base} bg-card border border-border text-foreground`}>
      <span className="tabular-nums font-bold text-sm leading-none">{showing.time}</span>
      {badges}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Booking modal
// ---------------------------------------------------------------------------

export interface ModalState {
  movieTitle?: string;
  cinemaName: string;
  cinemaWebsite?: string;
  date: string; // "YYYY-MM-DD"
  showings: MovieShowing[];
}

export function BookingModal({ state, onClose }: { state: ModalState; onClose: () => void }) {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const { locale, t } = useLang();
  const formattedDate = new Date(state.date + "T00:00:00").toLocaleDateString(
    locale === "en" ? "en-GB" : "it-IT",
    { weekday: "long", day: "numeric", month: "long" }
  );

  function addToCalendar(s: MovieShowing) {
    const start = new Date(s.datetime);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // assume 2h runtime
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const badges = [s.isOV ? "OV" : "", s.is3D ? "3D" : ""].filter(Boolean).join(" ");
    const title = [state.movieTitle, badges].filter(Boolean).join(" ");
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//felinoir//cinema//EN",
      "BEGIN:VEVENT",
      `UID:${s.id}-${s.datetime}@felinoir.it`,
      `DTSTAMP:${fmt(new Date())}Z`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${title}`,
      `LOCATION:${state.cinemaName}`,
      s.bookingUrl ? `URL:${s.bookingUrl}` : "",
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(state.movieTitle ?? "screening").replace(/\s+/g, "-").toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyShowing(s: MovieShowing) {
    const ovLabel = locale === "en" ? "Original version" : "Versione originale";
    const callToAction = locale === "en" ? "Find more movies on felinoir.it" : "Trova altri film su felinoir.it";
    const lines = [
      state.movieTitle ?? "",
      state.cinemaName,
      formattedDate,
      s.time,
      s.isOV ? ovLabel : "",
      s.is3D ? "3D" : "",
      s.bookingUrl ?? "",
      "\n",
      callToAction
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(lines).catch(() => {});
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative z-10 w-full max-w-sm rounded border border-border bg-card shadow-2xl p-6 flex flex-col max-h-[75vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5 shrink-0">
          <div className="min-w-0">
            <p className="font-semibold text-foreground leading-snug truncate">{state.cinemaName}</p>
            <p className="text-sm text-roman-muted mt-1">{formattedDate}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Showings */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-2 items-center pb-2">
            {state.showings.map(s => (
              <div key={s.id} className="flex items-center gap-2">
                <TimeChip showing={s} cinemaWebsite={state.cinemaWebsite} />
                <button
                  onClick={() => copyShowing(s)}
                  aria-label="Copy to clipboard"
                  className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                >
                  {copiedId === s.id
                    ? <Check className="size-3.5 text-green-500" />
                    : <Share2 className="size-3.5" />}
                </button>
                <button
                  onClick={() => addToCalendar(s)}
                  aria-label={t.schedule.addToCalendar}
                  className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                >
                  <CalendarPlus className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsed totem — small pill shown by default
// ---------------------------------------------------------------------------

function CollapsedTotem({ cinemaName, showingCount }: { cinemaName: string; showingCount: number }) {
  return (
    <div
      className="rounded-sm border border-border shadow-lg backdrop-blur-sm px-2.5 py-1.5 flex items-center gap-2"
      style={{ background: "hsl(var(--popover) / 0.94)" }}
    >
      <span className="text-[9px] font-mono tracking-[0.15em] uppercase text-muted-foreground truncate max-w-[120px]">
        {cinemaName}
      </span>
      <span className="shrink-0 text-[9px] font-mono tabular-nums text-roman-muted bg-roman/10 border border-roman/25 rounded-sm px-1 py-px leading-none">
        {showingCount}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Totem marker — card + connector + dot, anchored at the dot
// ---------------------------------------------------------------------------

function TotemMarker({
  cinemaId,
  cinemaName,
  showings,
  isExpanded,
  openAir,
  onChipClick,
}: {
  cinemaId: string;
  cinemaName: string;
  showings: MovieShowing[];
  isExpanded: boolean;
  openAir?: boolean;
  onChipClick: (date: string) => void;
}) {
  const { t } = useLang();
  const overflow = showings.length > 3 ? showings.length - 2 : 0;
  const visible = showings.slice(0, overflow > 0 ? 2 : 3);

  return (
    // pointer-events: none on the outer shell so map panning works behind the
    // connector and dot; pointer-events: auto is restored on the card only.
    <div className="flex flex-col items-center" style={{ pointerEvents: "none", cursor: "default" }}>
      {/* ── Card (collapsed or expanded) ── */}
      <div
        className="transition-opacity duration-150"
        style={{ pointerEvents: "auto" }}
      >
        {isExpanded ? (
          <div
            className="rounded-sm border border-border px-3 py-2.5 shadow-xl backdrop-blur-sm"
            style={{
              background: "hsl(var(--popover) / 0.96)",
              minWidth: 148,
            }}
          >
            <Link
              href={`/cinemas/${cinemaId}`}
              className="block text-[9px] font-mono tracking-[0.15em] uppercase text-muted-foreground hover:text-roman-muted transition-colors mb-2 truncate max-w-[180px]"
            >
              {cinemaName}
            </Link>
            <div className="flex gap-1.5 flex-wrap">
              {visible.map(s => (
                <button
                  key={s.id}
                  onClick={() => onChipClick(s.datetime.slice(0, 10))}
                  className={[
                    "tabular-nums font-bold text-xs leading-none px-2 py-1.5 rounded-sm border transition-colors cursor-pointer",
                    s.bookingUrl
                      ? "bg-roman/15 text-roman-muted border-roman/35 hover:bg-roman/25"
                      : "bg-muted text-foreground/80 border-border hover:bg-secondary",
                  ].join(" ")}
                >
                  {s.time}
                </button>
              ))}
              {overflow > 0 && (
                <button
                  onClick={() => onChipClick(showings[2].datetime.slice(0, 10))}
                  className="tabular-nums font-bold text-xs leading-none px-2 py-1.5 rounded-sm border border-border text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  +{overflow} {t.schedule.more}
                </button>
              )}
              {visible.length === 0 && (
                <span className="text-[10px] text-muted-foreground">{t.schedule.noShowingsShort}</span>
              )}
            </div>
          </div>
        ) : (
          <CollapsedTotem cinemaName={cinemaName} showingCount={showings.length} />
        )}
      </div>

      {/* ── Connector ── */}
      <div className="w-px h-3.5 bg-border" />

      {/* ── Dot pin ── */}
      <div className={`w-5 h-5 rounded-full border-2 border-background shadow-lg ${openAir ? "bg-green-800" : "bg-roman"}`} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dimmed dot marker — shown for cinemas not matching the active filter
// ---------------------------------------------------------------------------

function DimmedDotMarker({
  cinemaName,
  openAir,
  onDotClick,
}: {
  cinemaName: string;
  openAir?: boolean;
  onDotClick: () => void;
}) {
  return (
    <button
      onClick={onDotClick}
      title={cinemaName}
      aria-label={cinemaName}
      className={`w-5 h-5 rounded-full border-2 border-background shadow-lg cursor-pointer hover:scale-110 transition-transform ${openAir ? "bg-green-800" : "bg-cyan"}`}
      style={{ pointerEvents: "auto" }}
    />
  );
}

// ---------------------------------------------------------------------------
// Interaction tracker — proximity detection via MapLibre events
// Hover (desktop): MapLibre mousemove → expand markers near cursor
// Center (mobile):  MapLibre move    → expand markers near map center
// ---------------------------------------------------------------------------

const TOUCH_THRESHOLD = 65;

function MapInteractionTracker({
  markers,
  onHovered,
  onCentered,
}: {
  markers: MovieCinemaMarker[];
  onHovered: (ids: Set<string>) => void;
  onCentered: (ids: Set<string>) => void;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    function nearPixel(cx: number, cy: number, threshold: number): Set<string> {
      const result = new Set<string>();
      for (const m of markers) {
        const p = map!.project([m.lng, m.lat]);
        if (Math.hypot(p.x - cx, p.y - cy) <= threshold) result.add(m.cinemaId);
      }
      return result;
    }

    // Desktop: cursor proximity (100px radius)
    // Uses MapLibre's canvas event — does not interfere with panning
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function onMouseMove(e: any) {
      onHovered(nearPixel(e.point.x, e.point.y, 100));
    }
    function onMouseLeave() { onHovered(new Set()); }

    const isTouch = window.matchMedia("(pointer: coarse)").matches;

    // Mobile only: map center proximity
    function onMove() {
      const el = map!.getContainer();
      onCentered(nearPixel(el.offsetWidth / 2, el.offsetHeight / 2, TOUCH_THRESHOLD));
    }

    map.on("mousemove", onMouseMove);
    map.getContainer().addEventListener("mouseleave", onMouseLeave);
    if (isTouch) {
      map.on("move", onMove);
      onMove(); // initial pass
    }

    return () => {
      map.off("mousemove", onMouseMove);
      map.getContainer().removeEventListener("mouseleave", onMouseLeave);
      if (isTouch) map.off("move", onMove);
    };
  }, [map, isLoaded, markers, onHovered, onCentered]);

  return null;
}

// ---------------------------------------------------------------------------
// Centering — the city centre is often empty when the only screenings are far
// out, so the map opens on a cinema that actually has a screening: the closest
// one to the user when geolocation is available, otherwise a random one.
// ---------------------------------------------------------------------------

const ROME_CENTER: [number, number] = [12.4964, 41.9028];

type LatLng = { lat: number; lng: number };

/** Squared distance in degree-space, longitude scaled by latitude. Ordering-only. */
function roughDistance(a: LatLng, b: LatLng): number {
  const dLat = a.lat - b.lat;
  const dLng = (a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180);
  return dLat * dLat + dLng * dLng;
}

/** Prefers markers matching the active filter, since those carry the totems. */
function preferActive(markers: MovieCinemaMarker[]): MovieCinemaMarker[] {
  const active = markers.filter(m => m.active !== false);
  return active.length > 0 ? active : markers;
}

function pickRandom(markers: MovieCinemaMarker[]): MovieCinemaMarker | undefined {
  const pool = preferActive(markers);
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickClosest(markers: MovieCinemaMarker[], to: LatLng): MovieCinemaMarker | undefined {
  const pool = preferActive(markers);
  return pool.reduce<MovieCinemaMarker | undefined>(
    (best, m) => (!best || roughDistance(m, to) < roughDistance(best, to) ? m : best),
    undefined
  );
}

function useUserPosition(): LatLng | null {
  const [pos, setPos] = useState<LatLng | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      p => {
        if (!cancelled) setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
    return () => { cancelled = true; };
  }, []);

  return pos;
}

/**
 * Recentres the map only when the current viewport contains no active marker
 * (on load, or after a filter/date change empties the view): to the cinema
 * closest to the user when geolocation is available, otherwise a random one.
 * While an active marker is in view the map is never moved.
 */
function MapAutoCenter({ markers, userPos }: { markers: MovieCinemaMarker[]; userPos: LatLng | null }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || markers.length === 0) return;

    const bounds = map.getBounds();
    if (preferActive(markers).some(m => bounds.contains([m.lng, m.lat]))) return;

    const target = userPos ? pickClosest(markers, userPos) : pickRandom(markers);
    if (target) map.easeTo({ center: [target.lng, target.lat], duration: 600 });
  }, [map, isLoaded, markers, userPos]);

  return null;
}

// ---------------------------------------------------------------------------
// Map component
// ---------------------------------------------------------------------------

interface MovieMapProps {
  markers: MovieCinemaMarker[];
  movieTitle?: string;
}

export function MovieMap({ markers, movieTitle }: MovieMapProps) {
  const [modal, setModal] = useState<ModalState | null>(null);
  const [hoveredCinemas, setHoveredCinemas]   = useState<Set<string>>(new Set());
  const [centeredCinemas, setCenteredCinemas] = useState<Set<string>>(new Set());

  const handleHovered  = useCallback((ids: Set<string>) => setHoveredCinemas(ids), []);
  const handleCentered = useCallback((ids: Set<string>) => setCenteredCinemas(ids), []);

  const userPos = useUserPosition();

  return (
    <>
      <Map center={ROME_CENTER} zoom={12}>
        <MapAutoCenter markers={markers} userPos={userPos} />
        <MapInteractionTracker
          markers={markers}
          onHovered={handleHovered}
          onCentered={handleCentered}
        />
        {markers.map(m => {
          const isActive = m.active !== false;
          const isExpanded = hoveredCinemas.has(m.cinemaId) || centeredCinemas.has(m.cinemaId);
          const date = m.showings[0]?.datetime.slice(0, 10) ?? "";
          return (
            <MapMarker
              key={m.cinemaId}
              longitude={m.lng}
              latitude={m.lat}
              anchor="bottom"
            >
              <MarkerContent className="cursor-default overflow-visible">
                {isActive ? (
                  <TotemMarker
                    cinemaId={m.cinemaId}
                    cinemaName={m.cinemaName}
                    showings={m.showings}
                    isExpanded={isExpanded}
                    openAir={m.openAir}
                    onChipClick={(date) =>
                      setModal({
                        movieTitle,
                        cinemaName: m.cinemaName,
                        cinemaWebsite: m.cinemaWebsite,
                        date,
                        showings: m.showings.filter(s => s.datetime.startsWith(date)),
                      })
                    }
                  />
                ) : (
                  <DimmedDotMarker
                    cinemaName={m.cinemaName}
                    openAir={m.openAir}
                    onDotClick={() =>
                      setModal({
                        movieTitle,
                        cinemaName: m.cinemaName,
                        cinemaWebsite: m.cinemaWebsite,
                        date,
                        showings: m.showings,
                      })
                    }
                  />
                )}
              </MarkerContent>
            </MapMarker>
          );
        })}
        <MapControls />
      </Map>

      {modal && <BookingModal state={modal} onClose={() => setModal(null)} />}
    </>
  );
}
