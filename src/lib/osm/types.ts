export interface Coordinates {
  lat: number;
  lng: number;
}

export interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  place_id: number;
}

export interface GeocodedCinema {
  id: string;
  name: string;
  address?: string;
  website: string;
  openAir?: boolean;
  coordinates: Coordinates;
}
