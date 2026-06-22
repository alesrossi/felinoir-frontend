// TMDB canonical genres — English key → Italian display name
export const GENRE_MAP: Record<string, string> = {
  "Action":           "Azione",
  "Adventure":        "Avventura",
  "Animation":        "Animazione",
  "Comedy":           "Commedia",
  "Crime":            "Crimine",
  "Documentary":      "Documentario",
  "Drama":            "Dramma",
  "Family":           "Famiglia",
  "Fantasy":          "Fantasy",
  "History":          "Storia",
  "Horror":           "Horror",
  "Music":            "Musica",
  "Mystery":          "Mistero",
  "Romance":          "Romance",
  "Science Fiction":  "Fantascienza",
  "TV Movie":         "Film TV",
  "Thriller":         "Thriller",
  "War":              "Guerra",
  "Western":          "Western",
};

const IT_TO_EN: Record<string, string> = Object.fromEntries(
  Object.entries(GENRE_MAP).map(([en, it]) => [it, en])
);

// Any locale genre string → English canonical key (undefined if unknown)
export function toEnGenre(genre: string): string | undefined {
  const t = genre.trim();
  if (GENRE_MAP[t]) return t;
  return IT_TO_EN[t];
}

export function getGenreLabel(enKey: string, locale: "en" | "it"): string {
  return locale === "en" ? enKey : (GENRE_MAP[enKey] ?? enKey);
}

export const ALL_GENRES = Object.keys(GENRE_MAP).sort();
