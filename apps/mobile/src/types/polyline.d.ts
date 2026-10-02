declare module '@mapbox/polyline' {
  export function decode(encoded: string, precision?: number): Array<[number, number]>;
  export function encode(coords: Array<[number, number]>, precision?: number): string;
}
