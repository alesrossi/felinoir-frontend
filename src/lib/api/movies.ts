import { apiFetch } from "./client";
import type { ApiMovie } from "./types";

export type { ApiMovie };

export function getMovies(opts?: { limit?: number; offset?: number }): Promise<ApiMovie[]> {
  const params = new URLSearchParams();
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  if (opts?.offset != null) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return apiFetch<ApiMovie[]>(`/movies${qs ? `?${qs}` : ""}`);
}

export function getMovie(id: number): Promise<ApiMovie | null> {
  return apiFetch<ApiMovie>(`/movies/${id}`).catch(() => null);
}

export function getMovieBySlug(slug: string): Promise<ApiMovie | null> {
  return apiFetch<ApiMovie>(`/movies/slug/${encodeURIComponent(slug)}`).catch(() => null);
}
