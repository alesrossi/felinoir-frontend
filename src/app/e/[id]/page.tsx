import { cache } from "react";
import type { Metadata } from "next";
import type { ApiLobby } from "@/lib/api/lobbies";
import { readDeviceToken } from "@/lib/lobby-device";
import { LobbyView } from "./lobby-view";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** The lobby as this device sees it, or null when it's gone. Deduped per request. */
const getLobby = cache(async (id: string): Promise<ApiLobby | null> => {
  try {
    const res = await fetch(`${BACKEND_URL}/lobbies/${encodeURIComponent(id)}`, {
      headers: { "X-Device-Token": await readDeviceToken() },
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as ApiLobby) : null;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const lobby = await getLobby(id);
  // Private by nature: the link is the access control.
  const robots = { index: false, follow: false };
  if (!lobby) return { title: "Felinoir", robots };

  const { screening: s } = lobby;
  const [y, mo, d] = s.datetime.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d)).toLocaleDateString("it-IT", {
    weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
  });
  const title = `${s.movieTitle} · ${s.cinemaName}`;
  const description = `${date}, ${s.datetime.slice(11, 16)}${s.isOV ? " · VO" : ""} — chi viene?`;
  return {
    title,
    description,
    robots,
    openGraph: { title, description, images: s.posterUrl ? [s.posterUrl] : undefined },
  };
}

export default async function LobbyPage({ params }: PageProps) {
  const { id } = await params;
  const lobby = await getLobby(id);
  return <LobbyView id={id} initial={lobby} />;
}
