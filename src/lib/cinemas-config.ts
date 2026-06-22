import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import type { Coordinates } from "@/lib/osm/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CinemaConfig {
  id: string;
  name: string;
  address: string;
  website: string;
  openAir: boolean;
  coordinates: Coordinates;
}

interface YamlCinema {
  id: string;
  name: string;
  address: string;
  website: string;
  "open-air"?: boolean;
  coordinates: Coordinates;
}

interface YamlShape {
  cinemas: YamlCinema[];
}

// ---------------------------------------------------------------------------
// Loader — parsed once and cached in module scope
// ---------------------------------------------------------------------------

let _cache: CinemaConfig[] | null = null;

export function getCinemasConfig(): CinemaConfig[] {
  if (_cache) return _cache;

  const filePath = path.join(process.cwd(), "cinemas.yml");
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = yaml.load(raw) as YamlShape;

  _cache = parsed.cinemas.map(c => ({
    id: c.id,
    name: c.name,
    address: c.address,
    website: c.website,
    openAir: c["open-air"] === true,
    coordinates: c.coordinates,
  }));
  return _cache;
}

export function getCinemaConfig(id: string): CinemaConfig | undefined {
  return getCinemasConfig().find((c) => c.id === id);
}
