import { movieNodeId, movieUrl } from "./constants.ts";
import { isoDuration } from "./rome-time.ts";
import { compact } from "./serialize.ts";
import { clean, splitList, uniqueStrings } from "./text.ts";
import type { Movie } from "./schema-types.ts";
import type { ApiMovie } from "@/lib/api/types";
import type { Locale } from "@/lib/translations";

const MAX_ACTORS = 15;
const FULL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const YEAR = /^(\d{4})/;

/**
 * The title rendered on the page for a locale. Mirrors the resolution order in
 * `movie-info-panel.tsx` so `name` always matches the visible <h1>.
 */
export function localizedTitle(movie: ApiMovie, locale: Locale): string {
  return locale === "en"
    ? clean(movie.tmdbTitleEn) ?? clean(movie.tmdbTitle) ?? movie.title
    : clean(movie.tmdbTitle) ?? movie.title;
}

function localizedPlot(movie: ApiMovie, locale: Locale): string | undefined {
  return locale === "en"
    ? clean(movie.tmdbPlotEn) ?? clean(movie.tmdbPlot) ?? clean(movie.synopsis)
    : clean(movie.tmdbPlot) ?? clean(movie.synopsis) ?? clean(movie.tmdbPlotEn);
}

function localizedGenres(movie: ApiMovie, locale: Locale): string[] {
  const source = locale === "en"
    ? movie.tmdbGenreEn ?? movie.tmdbGenre
    : movie.tmdbGenre ?? movie.tmdbGenreEn;
  const fromTmdb = splitList(source);
  if (fromTmdb.length > 0) return fromTmdb;
  return uniqueStrings(movie.genres ?? []);
}

/**
 * `sameAs` is the highest-value field on this page: it is what ties the URL to
 * an entity Google and the LLM crawlers already know, which matters most when
 * the Italian release title differs from the original one.
 */
function knowledgeGraphLinks(movie: ApiMovie): string[] {
  const links: string[] = [];
  if (movie.tmdbId != null) links.push(`https://www.themoviedb.org/movie/${movie.tmdbId}`);
  const imdbId = clean(movie.imdbId);
  if (imdbId && /^tt\d+$/.test(imdbId)) links.push(`https://www.imdb.com/title/${imdbId}/`);
  return links;
}

export function buildMovie(movie: ApiMovie, locale: Locale): Movie {
  const name = localizedTitle(movie, locale);
  const otherLocaleTitle = localizedTitle(movie, locale === "en" ? "it" : "en");
  const originalTitle = clean(movie.tmdbOriginalTitle) ?? clean(movie.originalTitle);

  const released = clean(movie.released);
  const releaseDate = released && FULL_DATE.test(released) ? released : undefined;
  const releaseYear = released ? YEAR.exec(released)?.[1] : undefined;

  return compact<Movie>({
    "@type": "Movie",
    "@id": movieNodeId(movie),
    url: movieUrl(movie),
    name,
    alternateName: uniqueStrings([originalTitle, otherLocaleTitle]).filter(
      (t) => t.toLowerCase() !== name.toLowerCase(),
    ),
    image: clean(movie.tmdbPosterUrl) ?? clean(movie.posterUrl),
    description: localizedPlot(movie, locale),
    // The backend exposes a single release date. It is the Italian theatrical
    // date where the scrape provided one and the TMDB release date otherwise.
    datePublished: releaseDate,
    // Kept only when no full date is known — a bare year is a weak Date value.
    dateCreated: releaseDate ? undefined : releaseYear,
    duration: isoDuration(movie.durationMinutes),
    // The film's spoken language, not the page's UI locale.
    inLanguage: clean(movie.tmdbLanguage),
    genre: localizedGenres(movie, locale),
    director: splitList(movie.director).map((n) => ({ "@type": "Person" as const, name: n })),
    actor: splitList(movie.actors)
      .slice(0, MAX_ACTORS)
      .map((n) => ({ "@type": "Person" as const, name: n })),
    countryOfOrigin: splitList(movie.tmdbCountry).map((n) => ({
      "@type": "Country" as const,
      name: n,
    })),
    sameAs: knowledgeGraphLinks(movie),
  });
}
