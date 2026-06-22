import { Suspense } from "react";
import { getMovies } from "@/lib/api/movies";
import { getScreenings } from "@/lib/api/screenings";
import { MovieGrid } from "@/components/movie-grid";
import { FiltersBar } from "@/components/filters-bar";
import { HomeHeader } from "@/components/home-header";
import { HomeCarousels } from "@/components/home-carousels";
import FooterSection from "@/components/ui/footer";
import { TIME_RANGES, inTimeRange, minutesFromDatetime } from "@/lib/time-ranges";
import { getCinemasConfig } from "@/lib/cinemas-config";
import type { CarouselSection } from "@/components/home-carousels";



export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string; cinemas?: string; dates?: string; sort?: string; ov?: string; times?: string; genres?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const { q, cinemas: cinemasParam, dates: datesParam, sort, ov, times: timesParam, genres: genresParam } = await searchParams;

  const selectedCinemaIds = new Set((cinemasParam ?? "").split(",").filter(Boolean));
  const selectedDates     = new Set((datesParam   ?? "").split(",").filter(Boolean));
  const selectedTimes     = new Set((timesParam   ?? "").split(",").filter(Boolean));
  const selectedGenres    = new Set((genresParam  ?? "").split(",").filter(Boolean));
  const filterOV          = ov === "true";
  const activeTimeRanges  = TIME_RANGES.filter(r => selectedTimes.has(r.id));

  const openAirCinemaIds    = new Set(getCinemasConfig().filter(c => c.openAir).map(c => c.id));
  const selectedNonOACinemaIds = new Set([...selectedCinemaIds].filter(id => !openAirCinemaIds.has(id)));

  const [movies, screenings] = await Promise.all([
    getMovies({ limit: 500 }),
    getScreenings({ limit: 50_000 }),
  ]);

  const now = new Date().toISOString();
  const countMap = new Map<number, number>();
  const anyOVMovieIds    = new Set<number>();
  const anyNonOVMovieIds = new Set<number>();
  const movieLanguageMap = new Map<number, string>();

  // Build movie language map
  for (const m of movies) {
    if (m.tmdbLanguage) {
      movieLanguageMap.set(m.id, m.tmdbLanguage);
    }
  }

  // ── Non-open-air screening stats per movie (used by carousels) ───────────
  const todayStr  = now.slice(0, 10);
  const in2Days    = new Date(Date.now() + 2  * 86_400_000).toISOString();
  const in3Days    = new Date(Date.now() + 3  * 86_400_000).toISOString();
  const minus5Days  = new Date(Date.now() - 5  * 86_400_000).toISOString();
  const minus14Days = new Date(Date.now() - 14 * 86_400_000).toISOString();

  interface NoaStats {
    hasPast: boolean;
    earliest: string;
    latest: string;
    count: number;
    hasTonight: boolean;
  }
  const noaMap = new Map<number, NoaStats>();

  for (const s of screenings) {
    if (openAirCinemaIds.has(s.cinemaId)) continue;
    let entry = noaMap.get(s.movieId);
    if (!entry) {
      entry = { hasPast: false, earliest: s.datetime, latest: s.datetime, count: 0, hasTonight: false };
      noaMap.set(s.movieId, entry);
    }
    if (s.datetime < now) { entry.hasPast = true; continue; }
    entry.count++;
    if (s.datetime < entry.earliest) entry.earliest = s.datetime;
    if (s.datetime > entry.latest)   entry.latest   = s.datetime;
    if (s.datetime.slice(0, 10) === todayStr) entry.hasTonight = true;
  }
  // ─────────────────────────────────────────────────────────────────────────

  for (const s of screenings) {
    if (s.datetime < now) continue;
    if (s.isOV) anyOVMovieIds.add(s.movieId);
    else anyNonOVMovieIds.add(s.movieId);

    const passedCinema = openAirCinemaIds.has(s.cinemaId)
      ? selectedCinemaIds.has(s.cinemaId)
      : selectedNonOACinemaIds.size === 0 || selectedNonOACinemaIds.has(s.cinemaId);
    const passedDate   = selectedDates.size === 0    || selectedDates.has(s.datetime.slice(0, 10));
    const passedOV     = !filterOV || s.isOV === true || movieLanguageMap.get(s.movieId) === "it" || !movieLanguageMap.get(s.movieId);
    const passedTime   = activeTimeRanges.length === 0 ||
      activeTimeRanges.some(r => inTimeRange(r, minutesFromDatetime(s.datetime)));

    if (passedCinema && passedDate && passedOV && passedTime) {
      countMap.set(s.movieId, (countMap.get(s.movieId) ?? 0) + 1);
    }
  }

  let filtered = movies.filter((m) => countMap.has(m.id));

  if (selectedGenres.size > 0) {
    filtered = filtered.filter(m => {
      const movieGenres = (m.tmdbGenreEn ?? "").split(",").map(g => g.trim()).filter(Boolean);
      return movieGenres.some(g => selectedGenres.has(g));
    });
  }

  if (filterOV) {
    filtered = filtered.filter((m) => 
      anyOVMovieIds.has(m.id) || 
      m.tmdbLanguage === "it" ||
      !m.tmdbLanguage // Include if language unknown/empty (might be Italian)
    );
  }

  if (q?.trim()) {
    const needle = q.trim().toLowerCase();
    filtered = filtered.filter((m) =>
      m.title.toLowerCase().includes(needle) ||
      m.originalTitle?.toLowerCase().includes(needle) ||
      m.tmdbTitle?.toLowerCase().includes(needle) ||
      m.tmdbTitleEn?.toLowerCase().includes(needle)
    );
  }

  // ── Carousel sections (pool = filtered movies respecting all active filters) ─
  const carouselPool = filtered.filter(
    (m) => !!m.tmdbEnrichedAt && (noaMap.get(m.id)?.count ?? 0) > 0
  );

  const carouselSections: CarouselSection[] = [
    {
      id: "tonight",
      movies: carouselPool.filter((m) => noaMap.get(m.id)!.hasTonight),
    },
    {
      id: "newArrivals",
      movies: carouselPool.filter((m) => (m.tmdbEnrichedAt ?? m.createdAt) >= minus5Days),
    },
    {
      id: "openingSoon",
      movies: carouselPool.filter((m) => {
        const s = noaMap.get(m.id)!;
        return !s.hasPast && s.earliest <= in3Days && (m.tmdbEnrichedAt ?? m.createdAt) >= minus14Days;
      }),
    },
    {
      id: "lastChance",
      movies: carouselPool.filter((m) => (m.tmdbEnrichedAt ?? m.createdAt) < minus14Days && noaMap.get(m.id)!.latest <= in2Days),
    },
    {
      id: "mostScreened",
      movies: [...carouselPool]
        .sort((a, b) => (noaMap.get(b.id)?.count ?? 0) - (noaMap.get(a.id)?.count ?? 0))
        .slice(0, 15),
    },
    {
      id: "criticallyAcclaimed",
      movies: [...carouselPool]
        .filter((m) => m.imdbRating || m.tmdbRating)
        .sort((a, b) => parseFloat(b.imdbRating ?? b.tmdbRating ?? "0") - parseFloat(a.imdbRating ?? a.tmdbRating ?? "0"))
        .slice(0, 15),
    },
  ];
  // ─────────────────────────────────────────────────────────────────────────

  const homepageTotal = countMap.size;

  const sortKey = sort === "alpha" ? "alpha"
    : sort === "popularityDesc" ? "popularityDesc"
    : sort === "popularityAsc" ? "popularityAsc"
    : "listings";
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "alpha") return a.title.localeCompare(b.title);
    if (sortKey === "popularityDesc" || sortKey === "popularityAsc") {
      const pa = parseFloat(a.tmdbPopularity ?? "0");
      const pb = parseFloat(b.tmdbPopularity ?? "0");
      if (pa !== pb) return sortKey === "popularityDesc" ? pb - pa : pa - pb;
      return a.title.localeCompare(b.title);
    }
    const ca = countMap.get(a.id) ?? 0;
    const cb = countMap.get(b.id) ?? 0;
    if (ca !== cb) return cb - ca;
    return a.title.localeCompare(b.title);
  });

  return (
    <main id="main-content" className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-12">

        <HomeHeader openAirIds={[...openAirCinemaIds]} />

        <HomeCarousels sections={carouselSections} />

        <Suspense>
          <FiltersBar totalShown={sorted.length} totalAll={homepageTotal} />
        </Suspense>

        <MovieGrid
          sort={sortKey}
          movies={sorted}
          totalMovies={homepageTotal}
          screeningCounts={Object.fromEntries(countMap)}
          ovMovieIds={[...anyOVMovieIds]}
          nonOVMovieIds={[...anyNonOVMovieIds]}
          filterParams={
            cinemasParam || datesParam || genresParam
              ? new URLSearchParams({
                  ...(cinemasParam ? { cinemas: cinemasParam } : {}),
                  ...(datesParam   ? { dates:   datesParam   } : {}),
                  ...(genresParam  ? { genres:  genresParam  } : {}),
                }).toString()
              : undefined
          }
        />

        <FooterSection />

      </div>
    </main>
  );
}
