import { NextResponse, type NextRequest } from "next/server";
import { ensureDeviceToken } from "@/lib/lobby-device";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

// Proxy for the backend's /lobbies endpoints. It owns the device cookie and
// forwards it as X-Device-Token, so the browser never handles the token.

const ID = /^[A-Za-z0-9-]{1,64}$/;

/** Only the shapes the backend serves; anything else is a 404 here. */
function isAllowedPath(path: string[]): boolean {
  if (!path.every((p) => ID.test(p))) return false;
  switch (path.length) {
    case 0:
    case 1: return true;                                   // /lobbies, /lobbies/:id
    case 2: return path[1] === "participants";             // join
    case 3: return path[1] === "participants";             // rename / remove
    case 4: return path[1] === "participants" && path[3] === "claim";
    default: return false;
  }
}

async function proxy(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  if (!isAllowedPath(path)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const token = await ensureDeviceToken();
  const url = `${BACKEND_URL}/lobbies${path.length ? `/${path.join("/")}` : ""}${req.nextUrl.search}`;
  const body = req.method === "GET" || req.method === "DELETE" ? undefined : await req.text();

  try {
    const res = await fetch(url, {
      method: req.method,
      headers: {
        "X-Device-Token": token,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body || undefined,
      cache: "no-store",
    });
    if (res.status === 304 || res.status === 204) return new NextResponse(null, { status: res.status });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (err) {
    console.error("[lobbies] proxy error:", err);
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
