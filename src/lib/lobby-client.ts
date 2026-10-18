import type { ApiLobby, LobbyErrorCode } from "@/lib/api/lobbies";
import type { T } from "@/lib/translations";

// Browser-side calls to the /api/lobbies proxy.

export type LobbyResult =
  | { ok: true; lobby: ApiLobby }
  | { ok: false; status: number; error: LobbyErrorCode | "generic" };

export async function lobbyRequest(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<LobbyResult> {
  try {
    const res = await fetch(`/api/lobbies${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data) return { ok: true, lobby: data as ApiLobby };
    return { ok: false, status: res.status, error: (data?.error as LobbyErrorCode) ?? "generic" };
  } catch {
    return { ok: false, status: 0, error: "generic" };
  }
}

/** Localised message for an error code, falling back to a generic one. */
export function lobbyErrorText(t: T, code: string): string {
  const errors = t.lobby.errors as Record<string, string>;
  return errors[code] ?? errors.generic;
}

/** The name typed last time, so joining the next lobby is one tap. */
const NAME_KEY = "felinoir-lobby-name";

export function rememberedName(): string {
  try { return localStorage.getItem(NAME_KEY) ?? ""; } catch { return ""; }
}

export function rememberName(name: string): void {
  try { localStorage.setItem(NAME_KEY, name.trim()); } catch {}
}
