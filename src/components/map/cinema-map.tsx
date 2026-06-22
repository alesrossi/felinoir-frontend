"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, SlidersHorizontal } from "lucide-react";
import { Map, MapMarker, MarkerContent, MarkerPopup, MapControls } from "@/components/ui/map";
import type { GeocodedCinema } from "@/lib/osm/types";
import { useLang } from "@/lib/lang";
import { mapsUrl } from "@/lib/utils";
import { FAVOURITES_KEY, GLOBAL_FILTER_EVENT } from "@/components/global-filter-fab";

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const FILTERS_KEY = "cinema-filters";

function readFavourites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVOURITES_KEY);
    return raw ? new Set(raw.split(",").filter(Boolean)) : new Set();
  } catch {
    return new Set();
  }
}

function writeFavourites(ids: Set<string>) {
  try {
    if (ids.size > 0) localStorage.setItem(FAVOURITES_KEY, [...ids].join(","));
    else              localStorage.removeItem(FAVOURITES_KEY);
  } catch {}
}

function readActiveFilter(): Set<string> {
  try {
    const raw  = localStorage.getItem(FILTERS_KEY);
    const data = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return new Set((data.cinemas ?? "").split(",").filter(Boolean));
  } catch {
    return new Set();
  }
}

function writeActiveFilter(ids: Set<string>) {
  try {
    const raw  = localStorage.getItem(FILTERS_KEY);
    const data = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    if (ids.size > 0) data.cinemas = [...ids].join(",");
    else              delete data.cinemas;
    localStorage.setItem(FILTERS_KEY, JSON.stringify(data));
  } catch {}
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useStarredCinemas() {
  const [starred, setStarred] = useState<Set<string>>(new Set());

  useEffect(() => {
    setStarred(readFavourites());
  }, []);

  function toggle(id: string) {
    setStarred((prev) => {
      const next   = new Set(prev);
      const adding = !next.has(id);
      if (adding) next.add(id); else next.delete(id);
      writeFavourites(next);
      // Also sync active filter
      const filter = readActiveFilter();
      if (adding) filter.add(id); else filter.delete(id);
      writeActiveFilter(filter);
      setTimeout(() => window.dispatchEvent(new CustomEvent(GLOBAL_FILTER_EVENT)), 0);
      return next;
    });
  }

  return { starred, toggle };
}

function useFilteredCinemas() {
  const [filtered, setFiltered] = useState<Set<string>>(new Set());

  useEffect(() => {
    function sync() { setFiltered(readActiveFilter()); }
    sync();
    window.addEventListener(GLOBAL_FILTER_EVENT, sync);
    return () => window.removeEventListener(GLOBAL_FILTER_EVENT, sync);
  }, []);

  function toggle(id: string) {
    setFiltered((prev) => {
      const next   = new Set(prev);
      const adding = !next.has(id);
      if (adding) next.add(id); else next.delete(id);
      writeActiveFilter(next);
      setTimeout(() => window.dispatchEvent(new CustomEvent(GLOBAL_FILTER_EVENT)), 0);
      return next;
    });
  }

  return { filtered, toggle };
}

// ---------------------------------------------------------------------------
// Map component
// ---------------------------------------------------------------------------

interface CinemaMapProps {
  cinemas: GeocodedCinema[];
}

export function CinemaMap({ cinemas }: CinemaMapProps) {
  const centerLng = 12.4964;
  const centerLat = 41.9028;

  const { starred, toggle: toggleStar }     = useStarredCinemas();
  const { filtered, toggle: toggleFilter }  = useFilteredCinemas();
  const { t } = useLang();

  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 10000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return (
    <Map center={[centerLng, centerLat]} zoom={12}>
      {cinemas.map((cinema) => {
        const isStarred   = starred.has(cinema.id);
        const isFiltered  = filtered.has(cinema.id);
        const isOpenAir   = cinema.openAir === true;
        return (
          <MapMarker
            key={cinema.id}
            longitude={cinema.coordinates.lng}
            latitude={cinema.coordinates.lat}
          >
            <MarkerContent>
              <div
                className={[
                  "w-5 h-5 rounded-full border-2 border-background shadow-lg cursor-pointer hover:scale-110 transition-transform",
                  isStarred ? "bg-amber-400" : isOpenAir ? "bg-green-800" : isFiltered ? "bg-roman" : "bg-cyan",
                ].join(" ")}
              />
            </MarkerContent>
            <MarkerPopup>
              <div className="relative text-sm space-y-1 p-1 pr-14">
                {/* Action buttons */}
                <div className="absolute top-0 right-0 flex items-center gap-0.5">
                  <button
                    onClick={() => toggleFilter(cinema.id)}
                    className="p-1 transition-colors"
                    aria-label={isFiltered ? "Remove from filter" : "Add to filter"}
                  >
                    <SlidersHorizontal
                      className={[
                        "size-4 transition-colors",
                        isFiltered
                          ? "text-roman hover:text-roman-muted"
                          : "text-muted-foreground hover:text-roman",
                      ].join(" ")}
                    />
                  </button>
                  <button
                    onClick={() => toggleStar(cinema.id)}
                    className="p-1 transition-colors"
                    aria-label={isStarred ? "Remove from favourites" : "Add to favourites"}
                  >
                    <Star
                      className={[
                        "size-4 transition-colors",
                        isStarred
                          ? "fill-amber-400 text-amber-400 hover:fill-amber-300 hover:text-amber-300"
                          : "text-muted-foreground hover:text-amber-400",
                      ].join(" ")}
                    />
                  </button>
                </div>

                <p className="font-semibold text-foreground">{cinema.name}</p>
                {cinema.address && (
                  <a
                    href={mapsUrl(cinema.address, cinema.coordinates)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground text-xs hover:text-roman-muted transition-colors block"
                  >
                    {cinema.address}
                  </a>
                )}
                <Link
                  href={`/cinemas/${cinema.id}`}
                  className="text-cyan-500 hover:underline text-xs block"
                >
                  {t.cinema.viewSchedule}
                </Link>
              </div>
            </MarkerPopup>
          </MapMarker>
        );
      })}

      {userPos && (
        <MapMarker longitude={userPos.lng} latitude={userPos.lat}>
          <MarkerContent>
            <div className="relative flex items-center justify-center">
              <div className="absolute w-10 h-10 rounded-full bg-red-500/30 animate-ping" />
              <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-background shadow-lg z-10" />
            </div>
          </MarkerContent>
        </MapMarker>
      )}

      <MapControls />
    </Map>
  );
}
