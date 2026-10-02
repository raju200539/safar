// Thin API client. Never calls OTP/Gamyam/Nominatim directly (SPEC §2.1).
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Arrival, HealthStatus, Itinerary, Place, Report } from '@hyd/shared';

const BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

/** Shown on the home screen so connection problems are diagnosable. */
export function getBaseUrl(): string {
  return BASE;
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  const body = (await res.json().catch(() => null)) as {
    error?: { code?: string; message?: string };
  } | null;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error?.code ?? 'REQUEST_FAILED',
      body?.error?.message ?? `Request failed (${res.status})`,
    );
  }
  return body as T;
}

export interface PlanParams {
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  when?: string;
  arriveBy?: boolean;
}

export const api = {
  health: () => req<HealthStatus>('/health'),
  plan: (p: PlanParams) =>
    req<Itinerary[]>(
      `/v1/plan?fromLat=${p.fromLat}&fromLon=${p.fromLon}&toLat=${p.toLat}&toLon=${p.toLon}` +
        (p.when ? `&when=${encodeURIComponent(p.when)}` : '') +
        (p.arriveBy ? '&arriveBy=true' : ''),
    ),
  searchStops: (q: string) =>
    req<Place[]>(`/v1/stops/search?q=${encodeURIComponent(q)}`),
  nearby: (lat: number, lon: number, radius = 500) =>
    req<Place[]>(`/v1/stops/nearby?lat=${lat}&lon=${lon}&radius=${radius}`),
  arrivals: (id: string) =>
    req<Arrival[]>(`/v1/stops/${encodeURIComponent(id)}/arrivals`),
  alerts: (stopId?: string, routeId?: string) => {
    const qs = new URLSearchParams();
    if (stopId) qs.set('stopId', stopId);
    if (routeId) qs.set('routeId', routeId);
    const s = qs.toString();
    return req<Report[]>(`/v1/alerts${s ? `?${s}` : ''}`);
  },
  report: (
    deviceId: string,
    r: { type: string; routeId?: string; stopId?: string; note?: string },
  ) =>
    req<Report>('/v1/reports', {
      method: 'POST',
      headers: { 'x-device-id': deviceId },
      body: JSON.stringify(r),
    }),
};

const DEVICE_KEY = 'hyd-device-id';

export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const id = `dev-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  await AsyncStorage.setItem(DEVICE_KEY, id);
  return id;
}

export interface RecentSearch {
  fromName: string;
  fromLat: number;
  fromLon: number;
  toName: string;
  toLat: number;
  toLon: number;
  at: number;
}

const RECENT_KEY = 'hyd-recent-searches';

export async function getRecentSearches(): Promise<RecentSearch[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as RecentSearch[]) : [];
  } catch {
    return [];
  }
}

export async function addRecentSearch(s: RecentSearch): Promise<void> {
  const list = await getRecentSearches();
  const next = [s, ...list.filter((r) => r.at !== s.at)].slice(0, 8);
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
}
