import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { DEVICE_COOKIE } from "@/lib/api/lobbies";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * This browser's device token, minted on first use. The cookie is set by the
 * server (HttpOnly) so Safari doesn't cap it at 7 days like script-set storage.
 * Only callable where cookies can be written: route handlers, server actions.
 */
export async function ensureDeviceToken(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(DEVICE_COOKIE)?.value;
  if (existing) return existing;

  const token = randomBytes(32).toString("base64url");
  jar.set(DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
  return token;
}

/**
 * Token for a read-only server render. Server components can't set cookies, so
 * a first-time visitor gets a throwaway token: nothing is "theirs" yet anyway,
 * and their first join goes through a route handler that sets the real one.
 */
export async function readDeviceToken(): Promise<string> {
  const jar = await cookies();
  return jar.get(DEVICE_COOKIE)?.value ?? randomBytes(32).toString("base64url");
}
