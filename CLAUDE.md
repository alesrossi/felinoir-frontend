# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server (Next.js, port 3000)
npm run build     # production build (output: standalone)
npm run start     # run production build locally
npm run lint      # ESLint
```

There are no automated tests. The app requires a running backend; set `BACKEND_URL` in `.env` (defaults to `http://localhost:3001`).

## Architecture

**Felinoir** is a Next.js 15 (App Router) frontend for a Rome cinema listings aggregator. All pages are `force-dynamic` server components that fetch from a separate backend REST API.

### Data flow

- `src/lib/api/client.ts` — `apiFetch<T>()` wraps all backend calls, reading `BACKEND_URL` from env. All calls set `revalidate: 0` (no caching).
- `src/lib/api/movies.ts` / `screenings.ts` — typed wrappers around `apiFetch`.
- `src/lib/api/types.ts` — canonical `ApiMovie`, `ApiCinema`, `ApiScreening` interfaces that mirror the backend DB schema.
- `cinemas.yml` — static cinema registry (id, name, address, coordinates, `open-air` flag). Parsed once at startup by `src/lib/cinemas-config.ts` and cached in module scope. The YAML is copied into the Docker image at build time.

### Routing

| Route | Purpose |
|---|---|
| `/` (page.tsx) | Main listing: fetches all movies + screenings, applies filters, builds carousels |
| `/movies/[id]` | Movie detail: accepts numeric id **or** slug |
| `/cinemas/[id]` | Cinema schedule grid |
| `/cinemas/list` | Cinema directory with map |
| `/felix` | "Ask Felix" AI chat UI |
| `/api/felix` | Next.js Route Handler — proxies chat to backend `/felix/chat` |

### Filtering model

All filters live in URL search params (`q`, `cinemas`, `dates`, `times`, `genres`, `sort`, `ov`). The homepage server component reads them, applies them in-memory against the full movies+screenings response, and renders. Open-air cinemas are handled separately — they must be explicitly selected and never contribute to the default non-open-air count.

### Internationalisation

`src/lib/lang.tsx` — `LangProvider` (client context) stores the active locale (`en` | `it`) in `localStorage`. Server renders always use `"it"` as the default to avoid hydration mismatches. All UI strings live in `src/lib/translations.ts`; access them via `useLang()` → `t.*`.

### Theme and styling

- Tailwind CSS 3.4 with CSS variables for colours; theme switching via `next-themes`.
- The page is hidden (`visibility:hidden`) until the client has applied locale + theme preferences (`data-ready` attribute on `<html>`), preventing flash of default content. A 2-second safety fallback ensures the page always becomes visible.
- shadcn/ui components live in `src/components/ui/`; icon library is Lucide.
- Custom colour token `roman` / `roman-muted` used for accent/hover states.
- Fonts: Playfair Display (`--font-cormorant`), DM Sans (`--font-dm-sans`), Geist Mono.

### Key utilities

- `src/lib/slug.ts` — slug generation for movie URLs.
- `src/lib/time-ranges.ts` — defines named time windows (morning, afternoon, evening, night) used by the time filter.
- `src/lib/genres.ts` — maps localised genre display names to canonical EN keys.
- `src/lib/osm/` — OpenStreetMap/MapLibre types used by the cinema map component.
- `src/lib/use-keyboard-viewport.ts` — hook that adjusts layout when the mobile virtual keyboard is open.

### Felix (AI assistant)

`src/components/ask-felix.tsx` sends chat messages to `/api/felix`, which proxies to the backend. `src/lib/felix/` contains any client-side Felix utilities.

### Deployment

Docker uses a multi-stage build (`node:22-alpine`). `next.config.ts` sets `output: "standalone"`. The `cinemas.yml` file must be present at the working directory root at runtime — it is explicitly copied in the Dockerfile.
