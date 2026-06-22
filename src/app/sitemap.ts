import type { MetadataRoute } from "next";
import { apiFetch } from "@/lib/api/client";
import type { ApiCinema, ApiMovie } from "@/lib/api/types";

export const dynamic = "force-dynamic";

const BASE_URL = "https://felinoir.it";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cinemas, movies] = await Promise.all([
    apiFetch<ApiCinema[]>("/cinemas"),
    apiFetch<ApiMovie[]>("/movies?limit=2000"),
  ]);

  const cinemaUrls = cinemas.map((c) => ({
    url: `${BASE_URL}/cinemas/${c.id}`,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  const movieUrls = movies.map((m) => ({
    url: `${BASE_URL}/movies/${m.slug ?? m.id}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [
    { url: BASE_URL, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/cinemas`, changeFrequency: "weekly", priority: 0.8 },
    ...cinemaUrls,
    ...movieUrls,
  ];
}
