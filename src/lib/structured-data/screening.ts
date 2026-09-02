import { cinemaNodeId, movieNodeId, movieUrl } from "./constants.ts";
import { addMinutes, formatRomeDateTime, parseRomeWallClock, startOfRomeDay } from "./rome-time.ts";
import { compact, serializeJsonLd } from "./serialize.ts";
import { clean } from "./text.ts";
import type { ScreeningEvent, VideoFormat } from "./schema-types.ts";
import type { ApiMovie, ApiScreening } from "@/lib/api/types";

/** Today plus the next 7 days. */
export const DEFAULT_WINDOW_DAYS = 7;
/** Hard cap so the payload never dwarfs the page content. */
export const DEFAULT_MAX_EVENTS = 100;
/**
 * Second, tighter cap. A film at 30 cinemas with long booking URLs can push
 * 100 events past 60KB, so the events are also trimmed to a byte budget that
 * leaves the whole page graph comfortably under ~50KB.
 */
export const DEFAULT_MAX_EVENT_BYTES = 40_000;

export interface BuildScreeningEventsOptions {
  movie: ApiMovie;
  /** The film title as rendered for the current locale. */
  movieName: string;
  screenings: ApiScreening[];
  /** cinemaId -> display name, used for the event name. */
  cinemaNames: Map<string, string>;
  /** Injectable for tests; defaults to the real current time. */
  now?: Date;
  windowDays?: number;
  maxEvents?: number;
  maxBytes?: number;
}

function videoFormat(screening: ApiScreening): VideoFormat {
  const hall = clean(screening.hall) ?? "";
  if (/4\s*dx/i.test(hall)) return "4DX";
  if (/imax/i.test(hall)) return "IMAX";
  if (screening.is3D) return "3D";
  return "2D";
}

/**
 * Audio and subtitle languages, derived from the original-version flag. This is
 * one of the few things in the markup a crawler cannot recover from the HTML.
 * A non-OV screening in Rome is the Italian dub.
 */
function languages(
  screening: ApiScreening,
  movie: ApiMovie,
): { inLanguage?: string; subtitleLanguage?: string } {
  if (!screening.isOV) return { inLanguage: "it" };
  return {
    inLanguage: clean(movie.tmdbLanguage),
    subtitleLanguage: clean(screening.subtitleLanguage) ?? "it",
  };
}

/**
 * One `ScreeningEvent` per upcoming showtime, referencing the `Movie` and
 * `MovieTheater` nodes by `@id` rather than inlining them.
 *
 * Screenings already started are dropped, and the output is limited to the
 * window and the event cap.
 */
export function buildScreeningEvents({
  movie,
  movieName,
  screenings,
  cinemaNames,
  now = new Date(),
  windowDays = DEFAULT_WINDOW_DAYS,
  maxEvents = DEFAULT_MAX_EVENTS,
  maxBytes = DEFAULT_MAX_EVENT_BYTES,
}: BuildScreeningEventsOptions): ScreeningEvent[] {
  // End of the last day in the window: midnight at the start of day N+1.
  const windowEnd = startOfRomeDay(now, windowDays + 1);
  const filmId = movieNodeId(movie);
  const pageUrl = movieUrl(movie);

  const upcoming: { screening: ApiScreening; start: Date }[] = [];
  for (const screening of screenings) {
    if (screening.movieId !== movie.id) continue;
    const start = parseRomeWallClock(screening.datetime);
    if (!start) continue;
    if (start.getTime() <= now.getTime()) continue;
    if (start.getTime() >= windowEnd.getTime()) continue;
    upcoming.push({ screening, start });
  }

  upcoming.sort((a, b) => a.start.getTime() - b.start.getTime());

  const events = upcoming.slice(0, maxEvents).map(({ screening, start }) => {
    const startDate = formatRomeDateTime(start);
    const cinemaName = cinemaNames.get(screening.cinemaId);
    const runtime = movie.durationMinutes;
    const { inLanguage, subtitleLanguage } = languages(screening, movie);

    return compact<ScreeningEvent>({
      "@type": "ScreeningEvent",
      "@id": `${pageUrl}#screening-${screening.cinemaId}-${startDate}`,
      name: cinemaName ? `${movieName} — ${cinemaName}` : movieName,
      startDate,
      endDate:
        runtime && runtime > 0 ? formatRomeDateTime(addMinutes(start, runtime)) : undefined,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      workPresented: { "@id": filmId },
      location: { "@id": cinemaNodeId(screening.cinemaId) },
      videoFormat: videoFormat(screening),
      inLanguage,
      subtitleLanguage,
      url: clean(screening.bookingUrl),
    });
  });

  // Keep the earliest showtimes and drop the tail once the budget is spent.
  let used = 0;
  for (let i = 0; i < events.length; i++) {
    used += serializeJsonLd(events[i]).length + 1;
    if (used > maxBytes) return events.slice(0, i);
  }
  return events;
}
