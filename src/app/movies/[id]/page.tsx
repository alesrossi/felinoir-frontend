import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMovie, getMovieBySlug } from "@/lib/api/movies";
import { getScreenings } from "@/lib/api/screenings";
import { getCinemasConfig } from "@/lib/cinemas-config";
import { MovieDetailLayout } from "./movie-detail-layout";
import type { MovieCinemaMarker, MovieShowing } from "@/components/map/movie-map";
import type { ApiMovie } from "@/lib/api/types";
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

function fetchMovie(param: string): Promise<ApiMovie | null> {
  return /^\d+$/.test(param) ? getMovie(Number(param)) : getMovieBySlug(param);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: param } = await params;
  const movie = await fetchMovie(param);
  if (!movie) return {};

  const title = localizedTitle(movie, SERVER_LOCALE);
  return {
    title,
    alternates: { canonical: moviePath(movie) },
    openGraph: { title, url: movieUrl(movie) },
  };
}

export default async function MoviePage({ params }: PageProps) {
  const { id: param } = await params;
  const now = new Date().toISOString();

  const movie = await fetchMovie(param);

  if (!movie) notFound();

  const screenings = await getScreenings({
    movieId: movie.id,
    withRelations: true,
    from: now,
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
