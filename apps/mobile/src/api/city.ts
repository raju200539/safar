// Current city. Hyderabad only for v1; others unlock later.
let city = 'Hyderabad';
const listeners = new Set<(c: string) => void>();

export const CITIES = [
  { name: 'Hyderabad', live: true },
  { name: 'Bengaluru', live: false },
  { name: 'Chennai', live: false },
  { name: 'Delhi', live: false },
  { name: 'Mumbai', live: false },
];

export function getCity(): string {
  return city;
}

export function setCity(c: string): void {
  city = c;
  for (const l of listeners) l(c);
}

export function subscribeCity(l: (c: string) => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
