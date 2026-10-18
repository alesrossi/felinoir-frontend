import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMovieByParam } from "@/lib/api/movies";
import { getScreenings } from "@/lib/api/screenings";
import { getCinemasConfig } from "@/lib/cinemas-config";
import { romeWallClockKey } from "@/lib/og/showtimes";
import { OG_IMAGE_SIZE } from "@/lib/og/constants";
import { MovieDetailLayout } from "./movie-detail-layout";
import { parseCompanyNames, parseCountryCodes, parseCredits, pickBackdropUrl } from "@/lib/tmdb-images";
import type { MovieCinemaMarker, MovieShowing } from "@/components/map/movie-map";
import {
  JsonLd,
  buildBreadcrumbList,
  buildMovie,
  buildScreeningEvents,
  graph,
  localizedTitle,
  moviePath,
  movieUrl,
} from "@/lib/structured-data";

export const dynamic = "force-dynamic";

// Server renders are always Italian (see LangProvider), so the markup describes
// the Italian variant of the page — `name` matches the rendered <h1>.
const SERVER_LOCALE = "it" as const;

function formatTime(isoDatetime: string): string {
  return isoDatetime.slice(11, 16);
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: param } = await params;
  const movie = await getMovieByParam(param);
  if (!movie) return {};

  const title = localizedTitle(movie, SERVER_LOCALE);
  const description = shareDescription(movie);

  // The share card carries today's showtimes, so its URL carries today's Rome
  // date: scrapers key their cache on the URL, and a new URL each day is what
  // makes a re-shared link show current times instead of last week's.
  const image = {
    url: `${moviePath(movie)}/og?d=${romeWallClockKey(new Date()).slice(0, 10)}`,
    width: OG_IMAGE_SIZE.width,
    height: OG_IMAGE_SIZE.height,
    alt: `${title} — orari e cinema a Roma`,
    type: "image/jpeg",
  };

  return {
    title,
    description,
    alternates: { canonical: moviePath(movie) },
    openGraph: {
      type: "video.movie",
      title,
      description,
      url: movieUrl(movie),
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

/** One line for the preview text under the title in a chat app. */
function shareDescription(movie: { tmdbTagline?: string; tmdbPlot?: string; synopsis?: string }): string {
  const source = movie.tmdbTagline || movie.tmdbPlot || movie.synopsis;
  if (!source) return "Orari e cinema a Roma.";
  const trimmed = source.trim();
  if (trimmed.length <= 160) return trimmed;
  // Cut on a word boundary — chat apps truncate mid-word otherwise.
  return `${trimmed.slice(0, 157).replace(/\s+\S*$/, "")}…`;
}

export default async function MoviePage({ params }: PageProps) {
  const { id: param } = await params;
  // The backend compares `from` digit-for-digit against the stored Rome wall
  // clocks, ignoring any timezone suffix — so send Rome's clock, not UTC (which
  // would keep already-started screenings listed for 1–2 hours).
  const romeNow = romeWallClockKey(new Date());

  const movie = await getMovieByParam(param);

  if (!movie) notFound();

  const screenings = await getScreenings({
    movieId: movie.id,
    withRelations: true,
    from: romeNow,
    limit: 2000,
  });

  const hasOV    = screenings.some(s => s.isOV);
  const hasNonOV = screenings.some(s => !s.isOV);

  const cinemaConfigs = getCinemasConfig();
  const configById = new Map(cinemaConfigs.map(c => [c.id, c]));

  const byCinema = new Map<string, MovieShowing[]>();
  for (const s of screenings) {
    if (!byCinema.has(s.cinemaId)) byCinema.set(s.cinemaId, []);
    byCinema.get(s.cinemaId)!.push({
      id: s.id,
      datetime: s.datetime,
      time: formatTime(s.datetime),
      is3D: s.is3D ?? false,
      isOV: s.isOV ?? false,
      bookingUrl: s.bookingUrl,
    });
  }

  const markers: MovieCinemaMarker[] = [];
  for (const [cinemaId, showings] of byCinema) {
    const config = configById.get(cinemaId);
    if (!config?.coordinates) continue;
    showings.sort((a, b) => a.datetime.localeCompare(b.datetime));
    markers.push({
      cinemaId,
      cinemaName: config.name,
      cinemaWebsite: config.website,
      lat: config.coordinates.lat,
      lng: config.coordinates.lng,
      openAir: config.openAir,
      showings,
    });
  }

  const scrapedGenres: string[] = Array.isArray(movie.genres) && movie.genres.length > 0
    ? movie.genres
    : [];

  const movieData = {
    title: movie.title,
    originalTitle: movie.originalTitle,
    released: movie.released,
    director: movie.director,
    actors: movie.actors,
    durationMinutes: movie.durationMinutes,
    scrapedGenres,
    tmdbRating: movie.tmdbRating,
    imdbRating: movie.imdbRating,
    rtRating: movie.rtRating,
    metacriticScore: movie.metacriticScore,
    tmdbLanguage: movie.tmdbLanguage,
    tmdbCountry: movie.tmdbCountry,
    tmdbTitle: movie.tmdbTitle,
    tmdbTitleEn: movie.tmdbTitleEn,
    tmdbPlot: movie.tmdbPlot,
    tmdbPlotEn: movie.tmdbPlotEn,
    tmdbGenre: movie.tmdbGenre,
    tmdbGenreEn: movie.tmdbGenreEn,
    synopsis: movie.synopsis,
    tmdbPosterUrl: movie.tmdbPosterUrl,
    posterUrl: movie.posterUrl,
    tmdbTrailerUrlIt: movie.tmdbTrailerUrlIt,
    tmdbTrailerUrlEn: movie.tmdbTrailerUrlEn,
    backdropUrl: pickBackdropUrl(movie.tmdbBackdrops),
    writer: movie.writer,
    credits: parseCredits(movie.tmdbCredits),
    contentRating: movie.contentRating,
    countryCodes: parseCountryCodes(movie.tmdbProductionCountries),
    budget: movie.tmdbBudget,
    revenue: movie.tmdbRevenue,
    awards: movie.awards,
    companies: parseCompanyNames(movie.tmdbProductionCompanies),
    tagline: movie.tmdbTagline,
  };

  const displayTitle = localizedTitle(movie, SERVER_LOCALE);
  const structuredData = graph(
    buildMovie(movie, SERVER_LOCALE),
    ...buildScreeningEvents({
      movie,
      movieName: displayTitle,
      screenings,
      cinemaNames: new Map(cinemaConfigs.map(c => [c.id, c.name])),
    }),
    buildBreadcrumbList([
      { name: "Felinoir", url: "/" },
      { name: displayTitle },
    ], `${movieUrl(movie)}#breadcrumb`),
  );

  return (
    <div className="flex flex-col bg-background text-foreground lg:h-dvh">
      <JsonLd data={structuredData} />
      <MovieDetailLayout
        movie={movieData}
        markers={markers}
        movieTitle={movie.title}
        movieLanguage={movie.tmdbLanguage}
        markersCount={markers.length}
        backHref="/"
        hasOV={hasOV}
        hasNonOV={hasNonOV}
      />
    </div>
  );
}
