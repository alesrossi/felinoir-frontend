// Per-film share card: poster, title, and the next day's showtimes at the three
// cinemas that start earliest. This is what WhatsApp renders when someone pastes
// a film link into a group chat.
//
// A Route Handler rather than the `opengraph-image.tsx` file convention, for two
// reasons:
//
//  1. The convention produces a URL fixed at build time. Showtimes go stale and
//     scrapers cache by URL, so `generateMetadata` stamps today's Rome date into
//     the query string: each day gets its own URL, and a re-shared link is
//     re-scraped instead of served from last week's cache.
//  2. `ImageResponse` only emits PNG, and a 1200×630 PNG containing a
//     photographic poster lands around 500 KB. Meta documents a 600 KB ceiling
//     for og:image, but WhatsApp drops images well below that — silently, with
//     no error and no debugger — so the PNG is re-encoded as JPEG here. The
//     convention gives no place to do that.

import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getMovieByParam } from "@/lib/api/movies";
import { getScreenings } from "@/lib/api/screenings";
import { getCinemasConfig } from "@/lib/cinemas-config";
import { pickOgShowtimes } from "@/lib/og/showtimes";
import { OG_IMAGE_SIZE } from "@/lib/og/constants";
import type { OgShowtimes } from "@/lib/og/showtimes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Dark palette, matching globals.css. Flat fills only: the PNG has to stay small
// enough for WhatsApp to fetch and render it.
const BG = "#0D0D0D";
const SURFACE = "#171717";
const INK = "#F5F2EC";
const MUTED = "#95908A";
const ROMAN = "#980328";
const ROMAN_MUTED = "#D9738C";
const BORDER = "#282828";

/**
 * WhatsApp's real-world cutoff sits far under Meta's documented 600 KB, with
 * reports of silent drops from ~300 KB up. Aim well below that, and step the
 * quality down rather than shipping something a chat app will refuse.
 */
const TARGET_BYTES = 250_000;
const JPEG_QUALITIES = [82, 72, 62];

async function toJpeg(png: ArrayBuffer): Promise<Buffer> {
  let encoded: Buffer | null = null;
  for (const quality of JPEG_QUALITIES) {
    encoded = await sharp(Buffer.from(png))
      // JPEG has no alpha; compose onto the card background rather than letting
      // the encoder guess (which turns transparent pixels black).
      .flatten({ background: BG })
      // Baseline, not progressive: some scrapers read only the first scan.
      // `mozjpeg: true` would silently force progressive on, so it is not used —
      // `optimiseCoding` gets most of the same saving on flat artwork.
      .jpeg({ quality, progressive: false, optimiseCoding: true, chromaSubsampling: "4:2:0" })
      .toBuffer();
    if (encoded.byteLength <= TARGET_BYTES) break;
  }
  return encoded!;
}

const dateLabel = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** "Giovedì 4 settembre" for the header, from a `YYYY-MM-DD` Rome date. */
function formatRomeDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  // Noon UTC: safely inside the Rome day whatever the offset.
  const label = dateLabel.format(new Date(Date.UTC(y, m - 1, d, 12)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function Showtimes({ showtimes, nameOf }: { showtimes: OgShowtimes; nameOf: (id: string) => string }) {
  if (!showtimes.date) {
    return (
      <div style={{ display: "flex", fontSize: 28, color: MUTED }}>
        Nessuna proiezione in programma
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: 2,
            color: INK,
            background: ROMAN,
            padding: "5px 14px",
            borderRadius: 4,
          }}
        >
          {showtimes.isToday ? "OGGI" : formatRomeDate(showtimes.date).toUpperCase()}
        </div>
        {showtimes.anyOV && (
          <div style={{ display: "flex", fontSize: 22, color: ROMAN_MUTED, letterSpacing: 2 }}>
            VERSIONE ORIGINALE
          </div>
        )}
      </div>

      {showtimes.cinemas.map((cinema) => (
        <div key={cinema.cinemaId} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", fontSize: 24, color: MUTED }}>{nameOf(cinema.cinemaId)}</div>
          <div style={{ display: "flex", gap: 8 }}>
            {cinema.times.map((time) => (
              <div
                key={time}
                style={{
                  display: "flex",
                  fontSize: 28,
                  color: INK,
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 4,
                  padding: "3px 12px",
                }}
              >
                {time}
              </div>
            ))}
            {cinema.extraTimes > 0 && (
              <div style={{ display: "flex", fontSize: 28, color: MUTED, padding: "3px 4px" }}>
                +{cinema.extraTimes}
              </div>
            )}
          </div>
        </div>
      ))}

      {showtimes.extraCinemas > 0 && (
        <div style={{ display: "flex", fontSize: 22, color: MUTED }}>
          e altri {showtimes.extraCinemas} cinema
        </div>
      )}
    </div>
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movie = await getMovieByParam(id);
  if (!movie) return new Response("Not found", { status: 404 });

  // Server renders are Italian (see LangProvider), and so is the card.
  const title = movie.tmdbTitle ?? movie.title;
  const poster = movie.tmdbPosterUrl ?? movie.posterUrl;

  // A share card must never fail to render: a backend hiccup costs the showtimes,
  // not the image.
  const screenings = await getScreenings({
    movieId: movie.id,
    from: new Date().toISOString(),
    limit: 500,
  }).catch(() => []);

  const showtimes = pickOgShowtimes(screenings, new Date());

  const cinemaNames = new Map(getCinemasConfig().map((c) => [c.id, c.name]));
  const nameOf = (cinemaId: string) => cinemaNames.get(cinemaId) ?? cinemaId;

  const year = (movie.released ?? movie.tmdbEnrichedAt ?? "").slice(0, 4);
  const runtime = movie.durationMinutes ? `${movie.durationMinutes} min` : "";
  const meta = [year, runtime, movie.director].filter(Boolean).join("  ·  ");

  const png = await new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: BG,
          color: INK,
          borderTop: `10px solid ${ROMAN}`,
        }}
      >
        {poster && (
          <img
            src={poster}
            width={350}
            height={525}
            style={{ objectFit: "cover", margin: 40, borderRadius: 6 }}
            alt=""
          />
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: poster ? "38px 44px 32px 8px" : "38px 44px 32px 44px",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                display: "flex",
                fontSize: title.length > 40 ? 46 : 58,
                fontWeight: 700,
                lineHeight: 1.1,
                // Satori has no line-clamp; the size step above keeps long
                // titles inside the box.
                maxHeight: 132,
                overflow: "hidden",
              }}
            >
              {title}
            </div>
            {meta && <div style={{ display: "flex", fontSize: 24, color: MUTED }}>{meta}</div>}
          </div>

          <Showtimes showtimes={showtimes} nameOf={nameOf} />

          <div style={{ display: "flex", flexShrink: 0, fontSize: 22, color: MUTED, letterSpacing: 3 }}>
            FELINOIR.IT  ·  CINEMA A ROMA
          </div>
        </div>
      </div>
    ),
    OG_IMAGE_SIZE,
  ).arrayBuffer();

  return new Response(new Uint8Array(await toJpeg(png)), {
    headers: {
      "Content-Type": "image/jpeg",
      // Scrapers refetch per day thanks to the dated URL; this keeps a viral
      // link from hammering the backend in between.
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
