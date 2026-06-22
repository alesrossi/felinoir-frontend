const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`Backend ${path} returned ${res.status}`);
  }
  return res.json() as Promise<T>;
}
