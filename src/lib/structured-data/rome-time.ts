// Europe/Rome time handling for `startDate` / `endDate`.
//
// The UTC offset is derived per-instant from the ICU timezone database via
// `Intl.DateTimeFormat` — never hardcoded — so a screening in July gets +02:00
// (CEST) and the same screening in December gets +01:00 (CET). A wrong offset
// is worse than emitting no markup at all.

export const ROME_TIME_ZONE = "Europe/Rome";

const ROME_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: ROME_TIME_ZONE,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export interface WallClock {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** The Rome wall-clock reading of a given instant. */
export function romeWallClock(instant: Date): WallClock {
  const parts: Record<string, string> = {};
  for (const part of ROME_PARTS.formatToParts(instant)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // Some ICU versions render midnight as hour "24" under hour12: false.
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Rome's UTC offset, in minutes, at the given instant. */
export function romeOffsetMinutes(instant: Date): number {
  const w = romeWallClock(instant);
  const wallAsUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return Math.round((wallAsUtc - instant.getTime()) / 60_000);
}

/**
 * Resolves a Rome wall-clock reading to a real instant.
 *
 * The offset depends on the instant we are trying to find, so we guess with the
 * offset at the naive timestamp and re-check once — enough to settle both DST
 * transitions. Times inside the spring-forward gap resolve to the instant the
 * clock jumps to.
 */
export function romeWallClockToInstant(w: WallClock): Date {
  const naive = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  const firstGuess = naive - romeOffsetMinutes(new Date(naive)) * 60_000;
  const corrected = naive - romeOffsetMinutes(new Date(firstGuess)) * 60_000;
  return new Date(corrected);
}

const WALL_CLOCK_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/;

/**
 * Parses a screening `datetime` from the backend.
 *
 * The rest of the app renders showtimes by slicing characters 11-16 out of this
 * string (see `formatTime` in the film and cinema pages), so those digits *are*
 * the Rome wall-clock time the user sees on the page. Any trailing `Z` or
 * offset is deliberately ignored: the markup must describe the same showtime
 * the page displays.
 */
export function parseRomeWallClock(datetime: string): Date | null {
  const m = WALL_CLOCK_PATTERN.exec(datetime);
  if (!m) return null;
  return romeWallClockToInstant({
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: Number(m[4]),
    minute: Number(m[5]),
    second: Number(m[6] ?? 0),
  });
}

/** `+02:00` during CEST, `+01:00` during CET. */
export function formatRomeOffset(instant: Date): string {
  const offset = romeOffsetMinutes(instant);
  const sign = offset < 0 ? "-" : "+";
  const abs = Math.abs(offset);
  return `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

/** ISO 8601 date-time carrying Rome's offset for that instant. */
export function formatRomeDateTime(instant: Date): string {
  const w = romeWallClock(instant);
  return (
    `${w.year}-${pad2(w.month)}-${pad2(w.day)}` +
    `T${pad2(w.hour)}:${pad2(w.minute)}:${pad2(w.second)}` +
    formatRomeOffset(instant)
  );
}

/** `YYYY-MM-DD` for the Rome calendar day containing this instant. */
export function romeDateString(instant: Date): string {
  const w = romeWallClock(instant);
  return `${w.year}-${pad2(w.month)}-${pad2(w.day)}`;
}

/** Midnight in Rome on the calendar day containing `instant`, offset by `days`. */
export function startOfRomeDay(instant: Date, days = 0): Date {
  const w = romeWallClock(instant);
  // Date.UTC normalises day overflow (e.g. day 35 of a 31-day month).
  const shifted = new Date(Date.UTC(w.year, w.month - 1, w.day + days));
  return romeWallClockToInstant({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: 0,
    minute: 0,
    second: 0,
  });
}

export function addMinutes(instant: Date, minutes: number): Date {
  return new Date(instant.getTime() + minutes * 60_000);
}

/** ISO 8601 duration (`PT98M`); `undefined` when the runtime is unknown. */
export function isoDuration(minutes: number | undefined | null): string | undefined {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return undefined;
  return `PT${Math.round(minutes)}M`;
}
