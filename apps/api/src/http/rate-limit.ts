// Anonymous per-device rate limiter for POST /v1/reports (SPEC §2.7).
// In-memory sliding window: 5 submits per device per hour. Good enough
// for v1 (single instance); Redis later.

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;

const hits = new Map<string, number[]>();

export function reportRateLimit(deviceId: string, now = Date.now()): boolean {
  const list = (hits.get(deviceId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_PER_WINDOW) {
    hits.set(deviceId, list);
    return false;
  }
  list.push(now);
  hits.set(deviceId, list);
  return true;
}

/** Test-only reset. */
export function resetReportRateLimit(): void {
  hits.clear();
}
