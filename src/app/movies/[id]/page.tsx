import { notFound } from "next/navigation";
import { getMovie, getMovieBySlug } from "@/lib/api/movies";
import { getScreenings } from "@/lib/api/screenings";
import { getCinemasConfig } from "@/lib/cinemas-config";
import { MovieDetailLayout } from "./movie-detail-layout";
import type { MovieCinemaMarker, MovieShowing } from "@/components/map/movie-map";

export const dynamic = "force-dynamic";

function formatTime(isoDatetime: string): string {
  return isoDatetime.slice(11, 16);
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MoviePage({ params }: PageProps) {
  const { id: param } = await params;
  const now = new Date().toISOString();

  const isNumeric = /^\d+$/.test(param);
  const movie = isNumeric
    ? await getMovie(Number(param))
    : await getMovieBySlug(param);

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

  return (
    <div className="flex flex-col bg-background text-foreground lg:h-dvh">
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
