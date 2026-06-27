import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

export interface ActiveFilters {
  cinemas?: string[];
  dates?: string[];
  times?: string[];
  genres?: string[];
  ov?: boolean;
  q?: string;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/felix/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[felix] proxy error:", err);
    return NextResponse.json(
      { error: "Qualcosa è andato storto. Riprova tra qualche secondo." },
      { status: 500 }
    );
  }
}
