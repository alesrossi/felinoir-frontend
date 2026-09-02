# Structured data

JSON-LD emitted server-side into the initial HTML of every page type.

## Honest expectations

Read this before investing more time here.

- **Structured data is not a ranking factor.** None of this moves positions directly.
- **Google has no rich result that renders cinema showtimes from this markup.**
  The showtimes panel in Google Search is fed by commercial partner feeds, not by
  `ScreeningEvent`. The `ScreeningEvent` nodes here will not produce one, and no
  amount of tuning will change that.
- What this actually buys:
  1. **Entity disambiguation.** `sameAs` pointing at TMDB and IMDb tells Google that
     `/movies/147` is a known film entity instead of making it infer one from the
     HTML. This is the highest-value part of the whole thing, and it matters most
     when the Italian release title differs from the original ("Strade perdute" vs
     "Lost Highway").
  2. **Clean ingestion by LLM crawlers and answer engines**, which increasingly
     mediate questions like "where can I watch X in Rome tonight". The
     `inLanguage` / `subtitleLanguage` pair on each screening carries the
     original-version flag, which a crawler cannot recover from the rendered page.
  3. **Eligibility** — not a guarantee — for Google's movie carousel on list pages.
     Realistically that fires on editorial queries ("best noir films"), not on
     "cinema Roma stasera". Treat it as a bonus, not a goal.

The realistic ceiling is "machines parse the site correctly". If you are here
hoping to add fields that will produce a visible search feature, the answer is
almost certainly that no such feature exists.

## What each type is for

| Type | Where | Purpose |
|---|---|---|
| `WebSite` | root layout | Site identity + the `?q=` search endpoint, which is real. |
| `Organization` | root layout | Publisher identity, referenced by `WebSite.publisher`. |
| `Movie` | `/movies/{id}` | The film entity. Carries the `sameAs` knowledge-graph links. |
| `ScreeningEvent` | `/movies/{id}` | One per upcoming showtime; references the film and cinema by `@id`. |
| `MovieTheater` | `/cinemas/{id}` | The cinema entity: address, coordinates, official site. |
| `ItemList` | `/`, `/cinemas`, `/cinemas/list` | Page contents as `position` + `name` + `url` only. **One per page** — see below. |
| `BreadcrumbList` | detail pages | Mirrors the visible navigation. |

## One `ItemList` per page

Google's carousel validator accepts a single `ItemList` per page and reports
*"Multiple ListItem defined per page"* when it finds more. The homepage therefore
emits one list mirroring the film grid (`#movies`), not one list per carousel
section — the sections overlap anyway, so the same film would have appeared with
several different `position` values on the same page. If you add a new section to
the homepage, do **not** give it its own `ItemList`.

## `@id` strategy

Every node is keyed by its canonical absolute URL plus a fragment, so a node
referenced from one page resolves to the node fully described on its own page:

- Film — `https://felinoir.it/movies/{slug ?? id}#film`
- Cinema — `https://felinoir.it/cinemas/{id}#theater`
- Site — `https://felinoir.it/#website`
- Organization — `https://felinoir.it/#organization`

The film path uses `slug ?? id` to match how the app links to films and what
`app/sitemap.ts` submits, so the `@id` is always the URL Google actually indexes.

## Things that are deliberately absent

- **`AggregateRating` / `Review`.** The site shows TMDB, IMDb, RT and Metacritic
  scores, none of them first-party. Emitting them as `Movie.aggregateRating` would
  present someone else's ratings as this site's own. TMDB scores stay visible in
  the UI with the attribution the API licence requires (see `components/ui/footer.tsx`).
- **`Offer` / prices.** The site has no ticket prices.
- **`openingHoursSpecification`.** `cinemas.yml` has no opening hours, and invented
  hours are worse than omitted ones.
- **`Organization.logo`.** There is no logo asset yet — only `app/favicon.ico`.
  Add a real image to `public/` and pass it to `buildOrganization(logoUrl)`.
- **The full `Movie` object inside each `ScreeningEvent`**, and inside list items.
  Both reference by `@id` / `url` instead.

## Time handling

`rome-time.ts` derives Europe/Rome's UTC offset per instant from the ICU database
via `Intl.DateTimeFormat`. The offset is never hardcoded: a July screening gets
`+02:00` and a December one `+01:00`, and a film starting at 01:00 on the night
clocks fall back ends at `+01:00` while it started at `+02:00`.

A screening `datetime` from the backend is read as a **Rome wall clock**: the rest
of the app renders showtimes by slicing characters 11–16 out of that string, so
those digits are what the user sees, and any trailing `Z` or offset is ignored so
the markup describes the same showtime as the page. If the backend ever starts
returning true UTC *and* the UI is changed to convert it, `parseRomeWallClock`
must change with it.

## Caps

Screening output is bounded three ways, because a film at 30 cinemas over three
weeks would otherwise outweigh the page content:

- window: the current day plus the next 7 (`DEFAULT_WINDOW_DAYS`);
- count: 100 events (`DEFAULT_MAX_EVENTS`);
- bytes: 40 KB of events (`DEFAULT_MAX_EVENT_BYTES`), which keeps the whole page
  graph under the ~50 KB budget even with long cinema ids and booking URLs. The
  count cap alone is not enough — the worst realistic case measured 66 KB.

List sections cap at `DEFAULT_MAX_LIST_ITEMS` (30) entries.

Past screenings are filtered against the current Rome time on every request. All
pages are `force-dynamic`, so the markup is rebuilt per request and never goes
stale relative to the daily scrape.

## Locale

`LangProvider` stores the locale in `localStorage` and server-renders Italian to
avoid a hydration mismatch — there is no `/en` route. The builders take a `locale`
and produce different `name`, `alternateName`, `description` and `genre`, and the
pages pass `"it"` because that is what the server-rendered HTML contains. Emitting
English markup on an Italian page would break the rule that `name` matches the
visible `<h1>`. **When an `/en` route is added, pass `"en"` there** — everything
below the page layer is already locale-aware and tested for it.

`Movie.inLanguage` is the film's spoken language, not the UI locale, so it
correctly does not vary between the two. The page locale is carried by
`WebSite.inLanguage` and the `<html lang>` attribute.

## Omission rule

`compact()` recursively drops `null`, `undefined`, blank strings, empty arrays and
containers left empty, while keeping `false` and `0`. `text.ts` additionally treats
`"N/A"` and friends from the OMDb/TMDB enrichment as missing. A film with no
director, runtime or IMDb id therefore renders a valid `Movie` with those keys
absent rather than empty.

## Escaping

`serializeJsonLd()` escapes `<` as `\u003c`, so a synopsis containing `</script>`
or `<!--` cannot terminate the script element. U+2028/U+2029 are escaped too.

## Tests

```bash
npm test
```

Runs `node --test --experimental-strip-types` over `src/**/*.test.ts` — no test
framework dependency. This is why the modules inside this directory import each
other with explicit `.ts` specifiers (`allowImportingTsExtensions` in
`tsconfig.json`): the same files then run unmodified under both Next and Node.

Covered: the 2026-10-24 / 2026-10-26 DST boundary, the past-screening filter, the
window and both caps, null omission, and the escaping.

## Validating

Neither validator can be run from CI, so check by hand after changing a builder:

- <https://validator.schema.org> — catches vocabulary errors.
- <https://search.google.com/test/rich-results> — catches Google-specific
  requirements. It will report that `ScreeningEvent` is not eligible for any rich
  result; that is expected and not an error.

Paste the rendered HTML rather than the URL if the site is not yet public.
