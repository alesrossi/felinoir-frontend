/**
 * Pick a wide still from TMDb's backdrop list (the raw JSON string stored on
 * the movie): textless backdrops first, so no baked-in logo fights our own
 * title, then the most-voted one.
 */
export function pickBackdropUrl(raw: string | undefined, size: "w780" | "w1280" = "w1280"): string | undefined {
  if (!raw) return undefined;
  try {
    const list: { file_path?: string; iso_639_1?: string | null; vote_count?: number }[] = JSON.parse(raw);
    const best = list
      .filter(b => b.file_path)
      .sort((a, b) =>
        Number(a.iso_639_1 != null) - Number(b.iso_639_1 != null) ||
        (b.vote_count ?? 0) - (a.vote_count ?? 0))[0];
    return best ? `https://image.tmdb.org/t/p/${size}${best.file_path}` : undefined;
  } catch {
    return undefined;
  }
}
