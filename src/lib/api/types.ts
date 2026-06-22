// Local response types for backend API responses.
// These mirror the backend DB types initially; they will diverge once the
// Node backend is replaced with .NET.

export interface ApiMovie {
  id: number;
  slug?: string;
  title: string;
  originalTitle?: string;
  director?: string;
  durationMinutes?: number;
  genres?: string[];
  synopsis?: string;
  posterUrl?: string;
  trailerUrl?: string;
  externalId?: string;
  rating?: string;
  createdAt: string;
  updatedAt: string;
  tmdbId?: number;
  imdbId?: string;
  tmdbRating?: string;
  tmdbVotes?: string;
  contentRating?: string;
  writer?: string;
  actors?: string;
  released?: string;
  tmdbCountry?: string;
  tmdbEnrichedAt?: string;
  tmdbPosterUrl?: string;
  tmdbTitle?: string;
  tmdbPlot?: string;
  tmdbPlotEn?: string;
  tmdbLanguage?: string;
  tmdbGenre?: string;
  tmdbTitleEn?: string;
  tmdbGenreEn?: string;
  tmdbOriginalTitle?: string;
  tmdbPopularity?: string;
  tmdbStatus?: string;
  tmdbTagline?: string;
  tmdbBudget?: number;
  tmdbRevenue?: number;
  tmdbHomepage?: string;
  tmdbTrailerUrlIt?: string;
  tmdbTrailerUrlEn?: string;
  tmdbCollection?: string;
  tmdbProductionCompanies?: string;
  tmdbProductionCountries?: string;
  tmdbSpokenLanguages?: string;
  tmdbBackdrops?: string;
  tmdbVideos?: string;
  tmdbKeywords?: string;
  tmdbRecommendations?: string;
  tmdbWatchProviders?: string;
  imdbRating?: string;
  imdbVotes?: string;
  rtRating?: string;
  metacriticScore?: string;
  omdbEnrichedAt?: string;
}

export interface ApiCinema {
  id: string;
  name: string;
  chain?: string;
  address?: string;
  city: string;
  country: string;
  website: string;
  scheduleUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiScreening {
  id: number;
  movieId: number;
  cinemaId: string;
  datetime: string;
  hall?: string;
  is3D: boolean;
  isOV: boolean;
  subtitleLanguage?: string;
  bookingUrl?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  movie?: ApiMovie;
  cinema?: ApiCinema;
}
