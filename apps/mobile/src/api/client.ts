// Thin API client. Never calls OTP/Gamyam/Nominatim directly (SPEC §2.1).
const BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return (await res.json()) as T;
}
