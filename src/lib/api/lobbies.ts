// Lobbies — shareable group outings to one screening (/e/<id>).
// Unlike the rest of the API, nullable fields are sent as null, never omitted.

export interface ApiLobbyScreening {
  screeningId: number | null; // null once it left the schedule
  available: boolean;
  movieId: number | null;
  movieSlug: string | null;
  movieTitle: string;
  movieTitleEn: string | null;
  posterUrl: string | null;
  cinemaId: string;
  cinemaName: string;
  datetime: string; // Rome wall clock, e.g. "2026-10-17T21:00:00"
  isOV: boolean;
  is3D: boolean;
  bookingUrl: string | null;
}

export interface ApiLobbyParticipant {
  id: string;
  name: string;
  joinedAt: string;
  isMe: boolean;
}

export interface ApiLobby {
  id: string;
  version: number;
  screening: ApiLobbyScreening;
  note: string;
  participants: ApiLobbyParticipant[];
  meId: string | null;
  expiresAt: string;
}

export type LobbyErrorCode =
  | "missing_device"
  | "invalid_name"
  | "invalid_note"
  | "not_found"
  | "name_taken"
  | "already_joined"
  | "screening_not_found"
  | "screening_past";

/** Cookie holding this browser's device token. One per device, not per lobby. */
export const DEVICE_COOKIE = "felinoir_device";
