import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView as WebViewRaw } from 'react-native-webview';
import { theme } from '../ui/theme';

// react-native-webview ships class-component typings that TS rejects as
// JSX under React 19 types. Cast once here; behaviour is unaffected.
const WebView = WebViewRaw as unknown as React.FC<{
  source: { html: string };
  style?: unknown;
  onLoadEnd?: () => void;
  onMessage?: (e: { nativeEvent: { data: string } }) => void;
}>;

export interface MapPoint {
  latitude: number;
  longitude: number;
}

export interface Checkpoint extends MapPoint {
  name?: string;
}

export interface StopPin extends MapPoint {
  stopId?: string;
  name?: string;
}

type Mode = 'route' | 'pick' | 'browse';

interface Props {
  mode: Mode;
  /** Route line + bounds for 'route'. */
  points?: MapPoint[];
  /** Start/destination pins for 'route'. */
  pins?: { start?: MapPoint; end?: MapPoint };
  /** Intermediate stops drawn as dots for 'route'. */
  checkpoints?: Checkpoint[];
  /** Stop pins for 'browse'. */
  stops?: StopPin[];
  /** User location dot for 'browse'. */
  user?: MapPoint | null;
  onStopPress?: (stopId: string) => void;
  /** Initial center for 'pick'. */
  center?: MapPoint;
  onPick?: (p: MapPoint) => void;
  height?: number;
}

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

function html(
  mode: Mode,
  points: MapPoint[],
  pins: Props['pins'],
  checkpoints: Checkpoint[],
  stops: StopPin[],
  user: MapPoint | null,
  center: MapPoint,
): string {
  const pts = JSON.stringify(points.map((p) => [p.latitude, p.longitude]));
  const pinJson = JSON.stringify({
    start: pins?.start ? [pins.start.latitude, pins.start.longitude] : null,
    end: pins?.end ? [pins.end.latitude, pins.end.longitude] : null,
  });
  const cpJson = JSON.stringify(
    checkpoints.map((c) => [c.latitude, c.longitude, c.name ?? '']),
  );
  const stopJson = JSON.stringify(
    stops.map((s) => [s.latitude, s.longitude, s.name ?? '', s.stopId ?? '']),
  );
  const userJson = user ? JSON.stringify([user.latitude, user.longitude]) : 'null';
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<link rel="stylesheet" href="${LEAFLET_CSS}" />
<style>html,body,#m{height:100%;margin:0;padding:0}.leaflet-container{font:inherit}</style></head>
<body><div id="m"></div>
<script src="${LEAFLET_JS}"></script>
<script>
(function(){
  var map = L.map('m', { zoomControl: false }).setView([${center.latitude}, ${center.longitude}], 14);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
  var pts = ${pts};
  if ('${mode}' === 'route') {
    if (pts.length > 0) {
      L.polyline(pts, { color: '#0B6E4F', weight: 5 }).addTo(map);
      map.fitBounds(L.latLngBounds(pts).pad(0.25));
    }
    var pins = ${pinJson};
    if (pins.start) L.marker(pins.start).addTo(map).bindPopup('Start');
    if (pins.end) L.marker(pins.end).addTo(map).bindPopup('Destination');
    var cps = ${cpJson};
    cps.forEach(function(c) {
      L.circleMarker([c[0], c[1]], { radius: 6, color: '#ffffff', weight: 2, fillColor: '#E63946', fillOpacity: 1 }).addTo(map).bindPopup(c[2] || '');
    });
  } else if ('${mode}' === 'browse') {
    var uu = ${userJson};
    if (uu) {
      L.circleMarker(uu, { radius: 9, color: '#ffffff', weight: 3, fillColor: '#0B6E4F', fillOpacity: 1 }).addTo(map).bindPopup('You');
    }
    var sts = ${stopJson};
    sts.forEach(function(s) {
      var m = L.marker([s[0], s[1]]).addTo(map).bindPopup(s[2] || 'Stop');
      m.on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ stopId: s[3] }));
      });
    });
    if (uu) map.setView(uu, 15);
  } else {
    var marker = null;
    map.on('click', function(e) {
      if (marker) marker.setLatLng(e.latlng);
      else marker = L.marker(e.latlng).addTo(map);
      window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: e.latlng.lat, longitude: e.latlng.lng }));
    });
  }
})();
</script></body></html>`;
}

/**
 * Web-based Leaflet map (OSM tiles). Used instead of a native map view:
 * no API keys, no native map SDK, renders identically on all devices.
 */
export function LeafletMap(props: Props): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const source = useMemo(() => {
    const pts = (props.points ?? []).filter(
      (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude),
    );
    const cps = (props.checkpoints ?? []).filter(
      (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude),
    );
    const sts = (props.stops ?? []).filter(
      (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude),
    );
    const center =
      props.center ??
      props.user ??
      (pts.length > 0
        ? {
            latitude: pts.reduce((a, p) => a + p.latitude, 0) / pts.length,
            longitude: pts.reduce((a, p) => a + p.longitude, 0) / pts.length,
          }
        : { latitude: 17.385, longitude: 78.486 });
    return { html: html(props.mode, pts, props.pins, cps, sts, props.user ?? null, center) };
  }, [
    props.mode,
    props.points,
    props.pins,
    props.checkpoints,
    props.stops,
    props.user,
    props.center,
  ]);

  return (
    <View style={{ ...styles.box, height: props.height ?? styles.box.height }}>
      <WebView
        source={source}
        style={styles.web}
        onLoadEnd={() => setReady(true)}
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data) as {
              latitude?: number;
              longitude?: number;
              stopId?: string;
            };
            if (props.mode === 'pick' && props.onPick) {
              if (Number.isFinite(msg.latitude) && Number.isFinite(msg.longitude)) {
                props.onPick({
                  latitude: msg.latitude as number,
                  longitude: msg.longitude as number,
                });
              }
            } else if (props.mode === 'browse' && props.onStopPress && msg.stopId) {
              props.onStopPress(msg.stopId);
            }
          } catch {
            // ignore malformed bridge messages
          }
        }}
      />
      {ready ? null : (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text>Loading map…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { height: 260, borderRadius: 16, overflow: 'hidden' },
  web: { flex: 1, backgroundColor: '#E9ECEF' },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E9ECEF',
  },
});
