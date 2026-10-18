/**
 * A link back to `base` carrying the filters saved in localStorage, so going
 * home lands on the same filtered listing (and agrees with the filter button,
 * which reads the same storage). Client-only; falls back to `base`.
 */
export function homeHrefWithFilters(base = "/"): string {
  try {
    const raw = localStorage.getItem("cinema-filters");
    const data: Record<string, string> = raw ? JSON.parse(raw) : {};
    const params = new URLSearchParams();
    for (const key of ["q", "cinemas", "dates", "times", "genres", "sort", "ov"] as const) {
      if (data[key]) params.set(key, data[key]);
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  } catch {
    return base;
  }
}
