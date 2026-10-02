import { Linking } from 'react-native';

// Opens the device's maps app. No API key needed (SPEC: no auto/cab modes;
// walking guidance is handed to the user's own maps app).
export function mapsDirUrl(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  mode: 'walking' | 'transit' = 'walking',
): string {
  return (
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${fromLat},${fromLon}` +
    `&destination=${toLat},${toLon}` +
    `&travelmode=${mode}`
  );
}

export function mapsPlaceUrl(lat: number, lon: number, label: string): string {
  return (
    `https://www.google.com/maps/dir/?api=1` +
    `&destination=${lat},${lon}` +
    `&destination_place_name=${encodeURIComponent(label)}` +
    `&travelmode=walking`
  );
}

export async function openWalkDirections(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): Promise<void> {
  await Linking.openURL(mapsDirUrl(fromLat, fromLon, toLat, toLon, 'walking'));
}

export async function openTripTransit(it: {
  legs: Array<{ from: { lat: number; lon: number }; to: { lat: number; lon: number } }>;
}): Promise<void> {
  const first = it.legs[0];
  const last = it.legs[it.legs.length - 1];
  if (!first || !last) return;
  await Linking.openURL(
    mapsDirUrl(first.from.lat, first.from.lon, last.to.lat, last.to.lon, 'transit'),
  );
}

export async function openStopDirections(
  lat: number,
  lon: number,
  label: string,
): Promise<void> {
  await Linking.openURL(mapsPlaceUrl(lat, lon, label));
}
