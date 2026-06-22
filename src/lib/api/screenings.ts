import { apiFetch } from "./client";
import type { ApiScreening } from "./types";

export type { ApiScreening };

export interface ScreeningQuery {
  cinemaId?: string;
  movieId?: number;
  withRelations?: boolean;
  from?: string;
  to?: string;
  limit?: number;
}

export function getScreenings(query?: ScreeningQuery): Promise<ApiScreening[]> {
  const params = new URLSearchParams();
  if (query?.cinemaId) params.set("cinemaId", query.cinemaId);
  if (query?.movieId != null) params.set("movieId", String(query.movieId));
  if (query?.withRelations) params.set("withRelations", "true");
  if (query?.from) params.set("from", query.from);
  if (query?.to) params.set("to", query.to);
  if (query?.limit != null) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiFetch<ApiScreening[]>(`/screenings${qs ? `?${qs}` : ""}`);
}
