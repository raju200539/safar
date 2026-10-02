export interface Endpoint {
  name: string;
  lat: number;
  lon: number;
}

// Shared From/To picked on the plan screen or the pin-drop map.
let from: Endpoint | null = null;
let to: Endpoint | null = null;

export function getEndpoints(): { from: Endpoint | null; to: Endpoint | null } {
  return { from, to };
}

export function setEndpoint(which: 'from' | 'to', ep: Endpoint | null): void {
  if (which === 'from') from = ep;
  else to = ep;
}

export function swapEndpoints(): void {
  const t = from;
  from = to;
  to = t;
}
