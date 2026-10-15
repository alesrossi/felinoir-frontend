import type { Locale } from "@/lib/translations";

/** The bits of a screening needed to share it or put it in a calendar. */
export interface ShareableShowing {
  id: number;
  datetime: string; // "2025-04-16T20:30:00"
  time: string;     // "20:30"
  isOV: boolean;
  is3D: boolean;
  bookingUrl?: string | null;
}

interface ShowingContext {
  movieTitle?: string;
  cinemaName: string;
}

/** Plain-text summary for the clipboard, ending with a pointer back to the site. */
export function showingShareText(
  s: ShareableShowing,
  { movieTitle, cinemaName, dateLabel, locale }: ShowingContext & { dateLabel: string; locale: Locale },
): string {
  const ovLabel = locale === "en" ? "Original version" : "Versione originale";
  const callToAction = locale === "en" ? "Find more movies on felinoir.it" : "Trova altri film su felinoir.it";
  return [
    movieTitle ?? "",
    cinemaName,
    dateLabel,
    s.time,
    s.isOV ? ovLabel : "",
    s.is3D ? "3D" : "",
    s.bookingUrl ?? "",
    "\n",
    callToAction,
  ].filter(Boolean).join("\n");
}

/** Download a one-event .ics file for the screening. */
export function downloadShowingIcs(s: ShareableShowing, { movieTitle, cinemaName }: ShowingContext): void {
  const start = new Date(s.datetime);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // assume 2h runtime
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const badges = [s.isOV ? "OV" : "", s.is3D ? "3D" : ""].filter(Boolean).join(" ");
  const title = [movieTitle, badges].filter(Boolean).join(" ");
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
    `LOCATION:${cinemaName}`,
    s.bookingUrl ? `URL:${s.bookingUrl}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(movieTitle ?? "screening").replace(/\s+/g, "-").toLowerCase()}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
