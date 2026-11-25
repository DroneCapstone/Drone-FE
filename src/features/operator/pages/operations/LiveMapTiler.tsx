import { formatHubName } from '../../utils/displayEnglish';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
// Vite bundles the MapLibre v6 worker as a self-contained asset.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { Map as MapLibreMap, Marker, Popup } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { LiveTrackingDrone, MissionHubSummary, MissionTelemetryPoint } from '../../api/missionApi';
import type { RouteLegSnapshot } from '../../types/operator';
import './live-maptiler.css';

// Must be set before constructing the first Map (including React Strict Mode remounts).
maplibregl.setWorkerUrl(maplibreWorkerUrl);

/** Basemap choice for Live Tracking. Does not affect GPS or mission data. */
export type LiveMapStyle = 'default' | 'streets' | 'satellite';

export interface LiveMapTilerHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fitAll: () => void;
  togglePitch: () => void;
  focus: (missionId: string) => void;
  showSelectedPath: () => void;
}

type Props = {
  hubs: MissionHubSummary[];
  drones: LiveTrackingDrone[];
  histories: Record<string, MissionTelemetryPoint[]>;
  /** Planned hub-to-hub Mission route, separate from recorded GPS. */
  plannedRoutes: Record<string, RouteLegSnapshot[] | undefined>;
  mapStyle: LiveMapStyle;
  selectedMissionId?: string;
  onSelectMission: (missionId: string) => void;
  /** Stop forward prediction immediately when the Live Tracking request fails. */
  connectionHealthy?: boolean;
};

type FlightPathScope = 'none' | 'selected' | 'all';

/** Limit line geometry, never aircraft markers or telemetry data. */
function scopeFlightPaths<T>(paths: Record<string, T>, scope: FlightPathScope, selectedId: string | undefined, activeIds: ReadonlySet<string>): Record<string, T> {
  if (scope === 'none') return {};
  return Object.fromEntries(Object.entries(paths).filter(([id]) =>
    activeIds.has(id) && (scope === 'all' || id === selectedId),
  ));
}

type Point = [number, number];
type MovingMarker = {
  marker: Marker;
  element: HTMLElement;
  popup: Popup;
  /** Most recent accepted BE GPS fix; not the approximate on-screen position. */
  position: Point;
  lastFixAt?: number;
  /** Monotonic time of the last CHANGED GPS fix received from BE. */
  lastReceivedAt: number;
  /** Smoothly approach a confirmed GPS target; never go past it. */
  segmentFrom: Point;
  segmentTo: Point;
  segmentStartedAt: number;
  segmentDurationMs: number;
  /** Moving estimate of actual GPS update spacing (includes request latency). */
  gpsCadenceMs: number;
};
// The previous predictive animation could travel *ahead* of BE and then use a
// correction vector that dragged the marker backwards whenever GPS caught up.
// Instead interpolate between confirmed positions with a small cadence buffer.
// It may pause if BE sends no new coordinates; that is intentional (no fake GPS).
const DEFAULT_GPS_CADENCE_MS = 2_800;
const MIN_SEGMENT_MS = 700;
const MAX_SEGMENT_MS = 5_500;
const MAX_GPS_JUMP_METERS = 2_000;

/** Linear interpolation cannot overshoot the newest confirmed GPS fix. */
function sampleGpsSegment(from: Point, to: Point, startedAt: number, durationMs: number, now: number): Point {
  const t = Math.max(0, Math.min(1, (now - startedAt) / Math.max(1, durationMs)));
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
}
const INITIAL_CENTER: Point = [106.78, 10.83];
const MAPTILER_KEY = (import.meta.env.VITE_MAPTILER_API_KEY ?? '').trim();
// MapTiler style IDs: grayscale current map, colorful Replay streets,
// and Hybrid (satellite imagery + road/place labels).
const MAP_STYLE = (choice: LiveMapStyle, theme: 'dark' | 'light') => {
  const styleId = choice === 'satellite'
    ? 'hybrid-v4'
    : choice === 'streets'
      ? (theme === 'dark' ? 'streets-v4-dark' : 'streets-v4')
      : (theme === 'dark' ? 'dataviz-v4-dark' : 'dataviz-v4-light');
  return `https://api.maptiler.com/maps/${styleId}/style.json?key=${encodeURIComponent(MAPTILER_KEY)}`;
};
const themeNow = (): 'dark' | 'light' => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
const asPoint = (longitude?: number, latitude?: number): Point | null => {
  if (typeof longitude !== 'number' || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return null;
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || Math.abs(latitude) > 90) return null;
  return [longitude, latitude];
};

const OLD_DRONE_SVG = `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 12h8M10 12v4h4v-4M7 8 4 5M17 8l3-3M7 16l-3 3M17 16l3 3"/><circle cx="6" cy="8" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="6" cy="16" r="2"/><circle cx="18" cy="16" r="2"/></svg>`;

function createPopup(title: string, lines: Array<[string, string]>): HTMLElement {
  const container = document.createElement('div');
  container.className = 'live-geo-popup-content';
  const heading = document.createElement('strong');
  heading.textContent = title;
  container.append(heading);
  for (const [label, value] of lines) {
    const line = document.createElement('div');
    const key = document.createElement('span');
    key.textContent = label;
    const val = document.createElement('b');
    val.textContent = value;
    line.append(key, val);
    container.append(line);
  }
  return container;
}

function getLine(h: MissionTelemetryPoint[]): Point[] {
  return [...h]
    .sort((a, b) => Date.parse(a.recordedAt || '0') - Date.parse(b.recordedAt || '0'))
    .map(p => asPoint(p.longitude, p.latitude))
    .filter((p): p is Point => p !== null);
}

// WGS84 local distance is sufficient for short hub-to-hub visual segments.
// This is strictly for display; it does not alter GPS or mission/leg status.
function distanceInMeters(a: Point, b: Point): number {
  const latitudeRad = (a[1] + b[1]) / 2 * Math.PI / 180;
  return Math.hypot(
    (a[0] - b[0]) * 111_320 * Math.cos(latitudeRad),
    (a[1] - b[1]) * 111_320,
  );
}

type PlannedSegment = { from: Point; to: Point; start: number; length: number };

function projectedProgress(p: Point, seg: PlannedSegment): { progress: number; crossTrack: number } {
  const latRad = (seg.from[1] + seg.to[1]) / 2 * Math.PI / 180;
  const metersPerLng = 111_320 * Math.cos(latRad);
  const dx = (seg.to[0] - seg.from[0]) * metersPerLng;
  const dy = (seg.to[1] - seg.from[1]) * 111_320;
  const x = (p[0] - seg.from[0]) * metersPerLng;
  const y = (p[1] - seg.from[1]) * 111_320;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared > 0 ? Math.min(1, Math.max(0, (x * dx + y * dy) / lengthSquared)) : 0;
  return {
    progress: seg.start + t * seg.length,
    crossTrack: Math.hypot(x - dx * t, y - dy * t),
  };
}

/** Hide only the planned interval covered by the available GPS history.
 * A rolling window may start halfway through the route; preserve the missing
 * prefix as planned (dashed), never invent a recorded line for it.
 */
function recordedRouteCoverage(segments: PlannedSegment[], history: MissionTelemetryPoint[]): [number, number] | null {
  if (history.length < 2 || segments.length === 0) return null;
  let first = Infinity;
  let last = -Infinity;
  for (const gps of getLine(history)) {
    let closest: { progress: number; crossTrack: number } | null = null;
    for (const segment of segments) {
      const projection = projectedProgress(gps, segment);
      if (!closest || projection.crossTrack < closest.crossTrack) closest = projection;
    }
    if (closest && closest.crossTrack <= 200) {
      first = Math.min(first, closest.progress);
      last = Math.max(last, closest.progress);
    }
  }
  if (!Number.isFinite(first) || !Number.isFinite(last) || last - first < 1) return null;
  const total = segments[segments.length - 1].start + segments[segments.length - 1].length;
  return [first <= 25 ? 0 : first, total - last <= 25 ? total : last];
}

/** Split a leg into its portions outside the observed GPS interval. */
function uncoveredLegParts(segment: PlannedSegment, coverage: [number, number] | null): [Point, Point][] {
  const start = segment.start;
  const end = start + segment.length;
  const intervals: [number, number][] = coverage
    ? [[start, Math.min(end, coverage[0])], [Math.max(start, coverage[1]), end]]
    : [[start, end]];
  const at = (distance: number): Point => {
    const t = (distance - start) / segment.length;
    return [segment.from[0] + (segment.to[0] - segment.from[0]) * t,
      segment.from[1] + (segment.to[1] - segment.from[1]) * t];
  };
  return intervals.filter(([a, b]) => b - a >= 1).map(([a, b]) => [at(a), at(b)]);
}

function emptyCollection() {
  return {
    type: 'FeatureCollection' as const, features: [] as Array<{
      type: 'Feature'; properties: Record<string, string>; geometry: { type: 'LineString'; coordinates: Point[] };
    }>
  };
}

function drawPlannedRoutes(
  map: MapLibreMap,
  routes: Props['plannedRoutes'],
  hubs: Props['hubs'],
  histories: Props['histories'],
  selectedMissionId?: string,
) {
  const data = emptyCollection();
  const hubPoint = (id: number | undefined, code: string | undefined, name: string | undefined): Point | null => {
    const found = hubs.find(h =>
      (id !== undefined && h.id === String(id)) ||
      (code && h.code?.toUpperCase() === code.toUpperCase()) ||
      (name && h.name.toLocaleLowerCase() === name.toLocaleLowerCase()),
    );
    return found ? asPoint(found.longitude, found.latitude) : null;
  };
  for (const [missionId, legs] of Object.entries(routes)) {
    if (!legs?.length) continue;
    const segments: PlannedSegment[] = [];
    let routeDistance = 0;
    for (const leg of [...legs].sort((a, b) => (a.sequence_no ?? 0) - (b.sequence_no ?? 0))) {
      const from = asPoint(leg.from_longitude, leg.from_latitude) ??
        hubPoint(leg.from_hub_id, leg.from_hub_code, leg.from_hub_name);
      const to = asPoint(leg.to_longitude, leg.to_latitude) ??
        hubPoint(leg.to_hub_id, leg.to_hub_code, leg.to_hub_name);
      // Never invent missing coordinates or connect nonadjacent legs.
      if (!from || !to || (from[0] === to[0] && from[1] === to[1])) continue;
      if ((from[0] === 0 && from[1] === 0) || (to[0] === 0 && to[1] === 0)) continue;
      const length = distanceInMeters(from, to);
      if (length < 1) continue;
      segments.push({ from, to, start: routeDistance, length });
      routeDistance += length;
    }
    const coverage = recordedRouteCoverage(segments, histories[missionId] ?? []);
    for (const segment of segments) {
      for (const coordinates of uncoveredLegParts(segment, coverage)) {
        data.features.push({
          type: 'Feature',
          properties: { selected: String(missionId === selectedMissionId) },
          geometry: { type: 'LineString', coordinates },
        });
      }
    }
  }
  if (!map.getSource('droneoptai-planned-routes')) {
    map.addSource('droneoptai-planned-routes', { type: 'geojson', data });
  } else {
    (map.getSource('droneoptai-planned-routes') as maplibregl.GeoJSONSource).setData(data);
  }
  if (!map.getLayer('droneoptai-planned-routes')) {
    map.addLayer({
      id: 'droneoptai-planned-routes', type: 'line', source: 'droneoptai-planned-routes',
      filter: ['==', ['get', 'selected'], 'false'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#f97316',
        'line-opacity': 1,
        'line-width': 2,
        'line-dasharray': [3, 2],
      },
    });
  }
  // Keep the followed aircraft's planned route above other flights' paths.
  // The selected path uses the same orange as its recorded GPS trail; line style
  // (dashed versus solid) remains the visual distinction.
  if (!map.getLayer('droneoptai-planned-routes-selected')) {
    map.addLayer({
      id: 'droneoptai-planned-routes-selected', type: 'line', source: 'droneoptai-planned-routes',
      filter: ['==', ['get', 'selected'], 'true'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#f97316',
        'line-opacity': 1,
        'line-width': 3.2,
        'line-dasharray': [3, 2],
      },
    });
  }
}

function drawTrails(map: MapLibreMap, histories: Props['histories'], selectedMissionId?: string) {
  const data = emptyCollection();
  for (const [missionId, history] of Object.entries(histories)) {
    const coordinates = getLine(history);
    if (coordinates.length < 2) continue;
    data.features.push({ type: 'Feature', properties: { selected: String(missionId === selectedMissionId) }, geometry: { type: 'LineString', coordinates } });
  }
  if (!map.getSource('droneoptai-trails')) {
    map.addSource('droneoptai-trails', { type: 'geojson', data });
  } else {
    (map.getSource('droneoptai-trails') as maplibregl.GeoJSONSource).setData(data);
  }
  if (!map.getLayer('droneoptai-trails')) {
    map.addLayer({
      id: 'droneoptai-trails', type: 'line', source: 'droneoptai-trails',
      filter: ['==', ['get', 'selected'], 'false'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#f97316',
        'line-opacity': 1,
        'line-width': 2.5
      }
    });
  }
  if (!map.getLayer('droneoptai-trails-selected')) {
    map.addLayer({
      id: 'droneoptai-trails-selected', type: 'line', source: 'droneoptai-trails',
      filter: ['==', ['get', 'selected'], 'true'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#f97316',
        'line-opacity': 1,
        'line-width': 4.5,
      },
    });
  }
  // Draw the followed Mission above every other aircraft's route/trail:
  // unselected planned -> selected planned initially -> unselected GPS -> selected GPS.
  // Reorder selected planned between the two GPS layers to avoid gray/blue blending.
  if (map.getLayer('droneoptai-planned-routes-selected')) {
    map.moveLayer('droneoptai-planned-routes-selected', 'droneoptai-trails-selected');
  }
}

export const LiveMapTiler = forwardRef<LiveMapTilerHandle, Props>(function LiveMapTiler({ hubs, drones, histories, plannedRoutes, mapStyle, selectedMissionId, onSelectMission, connectionHealthy = true }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const hubsRef = useRef(new Map<string, Marker>());
  const dronesRef = useRef(new Map<string, MovingMarker>());
  const stateRef = useRef({ hubs, drones, histories, plannedRoutes, selectedMissionId, onSelectMission, connectionHealthy });
  stateRef.current = { hubs, drones, histories, plannedRoutes, selectedMissionId, onSelectMission, connectionHealthy };
  // One animation clock for all aircraft; refetches never restart this clock.
  const animationClockRef = useRef<number | null>(null);
  const followRef = useRef<string | null>(null);
  // Changing the basemap must never reconstruct the map or its DOM markers.
  const mapStyleRef = useRef<LiveMapStyle>(mapStyle);
  mapStyleRef.current = mapStyle;
  const appliedStyleUrlRef = useRef(MAP_STYLE(mapStyle, themeNow()));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showHubs, setShowHubs] = useState(true);
  const [pathScope, setPathScope] = useState<FlightPathScope>('none');
  const [showWeather, setShowWeather] = useState(true);
  const [viewLabel, setViewLabel] = useState('Expanded Ho Chi Minh City');

  function stopFollowing() {
    followRef.current = null;
    setIsFollowing(false);
    setViewLabel('Free view');
  }
  function showSelectedPath() {
    stopFollowing();
    setPathScope('selected');
  }
  function changePathScope(next: FlightPathScope) {
    if (next !== 'selected') stopFollowing();
    setPathScope(next);
  }
  function entireCity() {
    stopFollowing();
    setPathScope('none');
    mapRef.current?.fitBounds([[106.05, 8.55], [108.25, 11.55]], { padding: 24, duration: 900 });
    setViewLabel('Expanded Ho Chi Minh City');
  }
  function fitAll() {
    const map = mapRef.current;
    if (!map) return;
    stopFollowing();
    setPathScope('none');
    const bounds = new maplibregl.LngLatBounds();
    let count = 0;
    for (const h of stateRef.current.hubs) { const pt = asPoint(h.longitude, h.latitude); if (pt) { bounds.extend(pt); count++; } }
    for (const d of stateRef.current.drones) { const pt = asPoint(d.longitude, d.latitude); if (pt) { bounds.extend(pt); count++; } }
    if (count > 0) map.fitBounds(bounds, { padding: 75, maxZoom: 13, duration: 900 });
    else map.flyTo({ center: INITIAL_CENTER, zoom: 8, duration: 800 });
    setViewLabel('Hub network');
  }
  function focus(missionId: string) {
    const map = mapRef.current;
    const drone = stateRef.current.drones.find(d => d.missionId === missionId);
    const point = drone && asPoint(drone.longitude, drone.latitude);
    if (!map || !point) return;
    // Follow the displayed marker's current animated location rather than
    // jumping ahead to the latest fix while an animation is in progress.
    const displayed = dronesRef.current.get(missionId)?.marker.getLngLat().toArray() as Point | undefined;
    setPathScope('selected');
    followRef.current = missionId;
    setIsFollowing(true);
    setViewLabel(`Following ${drone.id}`);
    // Follow needs a readable zoom immediately: continuous map.jumpTo() calls
    // from the GPS animation would otherwise cancel an in-progress easeTo zoom.
    // Zoom 16 makes the 15-25 m GPS steps clearly visible (~7-11 px in HCMC).
    map.jumpTo({ center: displayed ?? point, zoom: Math.max(map.getZoom(), 16), pitch: 45 });
  }
  useImperativeHandle(ref, () => ({
    zoomIn: () => mapRef.current?.zoomIn({ duration: 350 }),
    zoomOut: () => mapRef.current?.zoomOut({ duration: 350 }),
    fitAll,
    focus,
    showSelectedPath,
    togglePitch: () => { const m = mapRef.current; if (m) m.easeTo({ pitch: m.getPitch() > 15 ? 0 : 50, bearing: m.getBearing(), duration: 400 }); },
  }));

  useEffect(() => {
    if (!host.current || !MAPTILER_KEY) return;
    let disposed = false;
    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container: host.current,
        style: appliedStyleUrlRef.current,
        center: INITIAL_CENTER,
        zoom: 8,
        minZoom: 5,
        maxZoom: 20,
        pitch: 0,
        maxPitch: 65,
        attributionControl: false,
        cooperativeGestures: false,
        canvasContextAttributes: { antialias: true },
      });
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
      map.dragRotate.enable();
      map.touchZoomRotate.enableRotation();
      map.scrollZoom.enable();
      mapRef.current = map;
      // The expanded city's geographic extent is broad; it is not a new administrative-boundary polygon.
      map.fitBounds([[106.05, 8.55], [108.25, 11.55]], { padding: 24, duration: 0 });
      map.on('load', () => { if (!disposed) { setReady(true); setError(''); } });
      map.on('style.load', () => { if (!disposed) setError(''); });
      map.on('error', (e) => {
        if (!disposed && e.error) {
          const message = String(e.error.message || '');
          if (/401|403|unauthoriz|forbidden|api key|network|fetch|style|tile/i.test(message))
            setError('Unable to load the map. Check the MapTiler API key, Allowed HTTP Origins and your Internet connection.');
        }
      });
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to initialize the map.'); return; }
    const resizeObserver = new ResizeObserver(() => { if (!disposed) map.resize(); });
    resizeObserver.observe(host.current);
    const themeObserver = new MutationObserver(() => {
      const current = mapRef.current;
      if (!current) return;
      const nextStyleUrl = MAP_STYLE(mapStyleRef.current, themeNow());
      if (nextStyleUrl === appliedStyleUrlRef.current) return;
      appliedStyleUrlRef.current = nextStyleUrl;
      // The style.load listener below restores flight trails after switching.
      current.setStyle(nextStyleUrl);
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      disposed = true;
      themeObserver.disconnect();
      resizeObserver.disconnect();
      for (const m of hubsRef.current.values()) m.remove();
      hubsRef.current.clear();
      if (animationClockRef.current !== null) cancelAnimationFrame(animationClockRef.current);
      animationClockRef.current = null;
      for (const m of dronesRef.current.values()) m.marker.remove();
      dronesRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Switch only the basemap; preserve center, zoom, pitch, live markers, and Follow.
  // MapLibre re-emits style.load; the existing trail-sync effect re-adds GeoJSON.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const nextStyleUrl = MAP_STYLE(mapStyle, themeNow());
    if (nextStyleUrl === appliedStyleUrlRef.current) return;
    appliedStyleUrlRef.current = nextStyleUrl;
    try {
      setError('');
      map.setStyle(nextStyleUrl);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to change map style.');
    }
  }, [mapStyle]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    function sync() {
      // style.load fires after the new style can accept custom layers.
      // No isStyleLoaded() gate: that check can still be false while tiles load.
      try {
        const current = stateRef.current;
        const activeIds = new Set(current.drones.map(drone => drone.missionId));
        const routes = scopeFlightPaths(current.plannedRoutes, pathScope, current.selectedMissionId, activeIds);
        const trails = scopeFlightPaths(current.histories, pathScope, current.selectedMissionId, activeIds);
        drawPlannedRoutes(map, routes, current.hubs, trails, current.selectedMissionId);
        drawTrails(map, trails, current.selectedMissionId);
        for (const id of ['droneoptai-planned-routes', 'droneoptai-trails', 'droneoptai-planned-routes-selected', 'droneoptai-trails-selected']) {
          if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', pathScope !== 'none' ? 'visible' : 'none');
        }
      } catch (error) {
        console.warn('Unable to update flight trails:', error);
      }
    }
    // Existing sources may still be processing the previous GPS update.
    // Refresh them even while tiles are loading, including when changing scope.
    if (map.isStyleLoaded() || (map.getSource('droneoptai-planned-routes') && map.getSource('droneoptai-trails'))) sync();
    map.on('style.load', sync);
    return () => {
      map.off('style.load', sync);
    };
  }, [ready, hubs, drones, histories, plannedRoutes, selectedMissionId, pathScope]);
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const current = new Set<string>();
    for (const hub of hubs) {
      const point = asPoint(hub.longitude, hub.latitude);
      if (!point) continue;
      current.add(hub.id);
      let marker = hubsRef.current.get(hub.id);
      if (!marker) {
        const elem = document.createElement('div');
        elem.className = 'live-geo-hub';
        const badge = document.createElement('span');
        badge.className = 'live-geo-hub-badge';
        badge.textContent = 'H';
        const label = document.createElement('span');
        label.className = 'live-geo-hub-label';
        elem.append(badge, label);

        const popup = new maplibregl.Popup({ closeButton: false, offset: 22 });
        marker = new maplibregl.Marker({ element: elem, anchor: 'center' })
          .setLngLat(point).setPopup(popup).addTo(map);
        hubsRef.current.set(hub.id, marker);
        // Listeners are installed once, and always access the current popup.
        const ownMarker = marker;
        elem.addEventListener('mouseenter', () => {
          const p = ownMarker.getPopup();
          if (p) p.setLngLat(ownMarker.getLngLat()).addTo(map);
        });
        elem.addEventListener('mouseleave', () => ownMarker.getPopup()?.remove());
      }
      marker.setLngLat(point);
      const element = marker.getElement();
      element.style.display = showHubs ? '' : 'none';
      const occupied = drones.some(drone => {
        const dronePoint = asPoint(drone.longitude, drone.latitude);
        return dronePoint && typeof drone.speedKmh === 'number' && drone.speedKmh <= 1
          && distanceInMeters(point, dronePoint) <= 85;
      });
      // Lift the Hub name above a parked aircraft; keep the aircraft visible.
      element.classList.toggle('live-geo-hub--occupied', Boolean(occupied));
      element.style.zIndex = occupied ? '12' : '';
      const label = element.querySelector('.live-geo-hub-label');
      if (label) label.textContent = formatHubName(hub.name) || hub.code || `Hub ${hub.id}`;
      marker.getPopup()?.setDOMContent(createPopup(formatHubName(hub.name), [
        ['Hub', hub.code || hub.id],
        ['Position', `${point[1].toFixed(5)}, ${point[0].toFixed(5)}`],
      ]));
    }
    for (const [id, marker] of hubsRef.current) { if (!current.has(id)) { marker.remove(); hubsRef.current.delete(id); } }
  }, [hubs, drones, ready, showHubs]);

  // One animation frame clock, but no forward GPS extrapolation or snap-back.
  // Reconciles toward BE fixes *without overshooting*. A new fix starts from
  // the currently displayed marker so no animation restarts or retrograde jump.
  useEffect(() => {
    if (!ready) return;
    const tick = (now: number) => {
      const map = mapRef.current;
      if (map) {
        const canAnimate = stateRef.current.connectionHealthy && !document.hidden;
        for (const [id, moving] of dronesRef.current) {
          if (!canAnimate) {
            // Freeze immediately when requests fail / tab is hidden. Do not
            // fast-forward an old animation when the tab is shown again.
            const current = moving.marker.getLngLat().toArray() as Point;
            moving.segmentFrom = current;
            moving.segmentTo = current;
            moving.segmentStartedAt = now;
            continue;
          }
          const next = sampleGpsSegment(
            moving.segmentFrom, moving.segmentTo,
            moving.segmentStartedAt, moving.segmentDurationMs, now,
          );
          const current = moving.marker.getLngLat();
          if (Math.abs(current.lng - next[0]) < 1e-10 && Math.abs(current.lat - next[1]) < 1e-10) continue;
          moving.marker.setLngLat(next);
          if (moving.popup.isOpen()) moving.popup.setLngLat(next);
          // MapLibre jumpTo() interrupts zoomIn/zoomOut easing when called on
          // every frame. Let zoom/rotate/pitch animations finish uninterrupted;
          // keep updating the marker's geographic position throughout.
          if (followRef.current === id &&
            !map.isMoving()) {
            map.jumpTo({ center: next });
          }
        }
      }
      animationClockRef.current = requestAnimationFrame(tick);
    };
    animationClockRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationClockRef.current !== null) cancelAnimationFrame(animationClockRef.current);
      animationClockRef.current = null;
    };
  }, [ready]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const active = new Set<string>();
    for (const drone of drones) {
      const pt = asPoint(drone.longitude, drone.latitude);
      if (!pt) continue;
      const id = drone.missionId || drone.id;
      active.add(id);
      let moving = dronesRef.current.get(id);
      if (!moving) {
        const element = document.createElement('button'); element.type = 'button';
        element.className = 'live-geo-drone'; element.title = `View flight path of ${drone.id}`;
        const body = document.createElement('span'); body.className = 'live-geo-drone-symbol'; body.innerHTML = OLD_DRONE_SVG;
        const text = document.createElement('span'); text.className = 'live-geo-drone-label';
        element.append(body, text);
        element.addEventListener('click', (evt) => {
          evt.preventDefault(); evt.stopPropagation();
          stateRef.current.onSelectMission(id);
          showSelectedPath();
        });
        const popup = new maplibregl.Popup({ closeButton: false, offset: 23 });
        const marker = new maplibregl.Marker({ element, anchor: 'center' }).setLngLat(pt).setPopup(popup).addTo(map);
        element.addEventListener('mouseenter', () => popup.setLngLat(marker.getLngLat()).addTo(map));
        element.addEventListener('mouseleave', () => popup.remove());
        const initialFixAt = drone.lastUpdated ? Date.parse(drone.lastUpdated) : NaN;
        const now = performance.now();
        moving = {
          marker, element, popup, position: pt,
          lastFixAt: Number.isFinite(initialFixAt) ? initialFixAt : undefined,
          lastReceivedAt: now,
          segmentFrom: pt, segmentTo: pt, segmentStartedAt: now,
          segmentDurationMs: DEFAULT_GPS_CADENCE_MS,
          gpsCadenceMs: DEFAULT_GPS_CADENCE_MS,
        };
        dronesRef.current.set(id, moving);
      }
      moving.element.className = `live-geo-drone health-${drone.health.toLowerCase()} ${selectedMissionId === id ? 'selected' : ''}`;
      const droneLabel = moving.element.querySelector('.live-geo-drone-label');
      if (droneLabel) droneLabel.textContent = drone.id;
      moving.popup.setDOMContent(createPopup(drone.id, [
        ['Mission', drone.missionId], ['Status', drone.health], ['Altitude', drone.altitudeM != null ? `${drone.altitudeM.toFixed(1)} m` : '—'],
        ['Battery', drone.batteryVoltage != null ? `${drone.batteryVoltage.toFixed(2)} V` : '—'],
        ['Updated', drone.lastUpdated ? new Date(drone.lastUpdated).toLocaleTimeString('en-GB') : '—'],
      ]));
      moving.popup.setLngLat(moving.marker.getLngLat());
      const parsedFixAt = drone.lastUpdated ? Date.parse(drone.lastUpdated) : NaN;
      const fixAt = Number.isFinite(parsedFixAt) ? parsedFixAt : undefined;
      const outOfOrder = fixAt !== undefined && moving.lastFixAt !== undefined && fixAt < moving.lastFixAt;
      // Ignore only strictly older BE timestamps. Two distinct GPS positions
      // may share the same second-resolution timestamp, so do not drop those.
      if (outOfOrder) continue;
      const gpsChanged = moving.position[0] !== pt[0] || moving.position[1] !== pt[1];
      const now = performance.now();
      const groundStop = (drone.speedKmh !== undefined && drone.speedKmh <= 0.5) ||
        ['SCHEDULED', 'COMPLETED', 'FAILED'].includes((drone.missionStatusRaw ?? '').toUpperCase());
      if (gpsChanged) {
        const previous = moving.position;
        const displayed = moving.marker.getLngLat().toArray() as Point;
        const gapMs = Math.max(100, now - moving.lastReceivedAt);
        const gapOnServer = fixAt !== undefined && moving.lastFixAt !== undefined
          ? fixAt - moving.lastFixAt : undefined;
        const latitudeRad = (pt[1] + previous[1]) / 2 * Math.PI / 180;
        const jumpMeters = Math.hypot(
          (pt[0] - previous[0]) * 111_320 * Math.cos(latitudeRad),
          (pt[1] - previous[1]) * 111_320,
        );
        const discontinuity = jumpMeters > MAX_GPS_JUMP_METERS ||
          (gapOnServer !== undefined && gapOnServer > 30_000);
        moving.position = pt;
        moving.lastFixAt = fixAt ?? moving.lastFixAt;
        moving.lastReceivedAt = now;
        moving.gpsCadenceMs = Math.max(MIN_SEGMENT_MS, Math.min(MAX_SEGMENT_MS,
          moving.gpsCadenceMs * 0.5 + gapMs * 0.5,
        ));
        if (discontinuity || groundStop) {
          // Genuine discontinuities or explicit stops use the BE location.
          // They are not predicted; no coasting past a landing or relay hub.
          moving.segmentFrom = pt;
          moving.segmentTo = pt;
          moving.segmentStartedAt = now;
          moving.marker.setLngLat(pt);
          if (moving.popup.isOpen()) moving.popup.setLngLat(pt);
          if (followRef.current === id && !map.isMoving()) {
            map.jumpTo({ center: pt });
          }
        } else {
          moving.segmentFrom = displayed;
          moving.segmentTo = pt;
          moving.segmentStartedAt = now;
          // A slightly buffered duration covers regular 2–4 second snapshots.
          // It follows BE exactly, never predicts a position past this GPS fix.
          moving.segmentDurationMs = Math.max(MIN_SEGMENT_MS, Math.min(MAX_SEGMENT_MS,
            moving.gpsCadenceMs * 1.12,
          ));
        }
      } else if (groundStop) {
        // A genuine stationary fix must not keep an earlier animation moving.
        moving.segmentFrom = pt;
        moving.segmentTo = pt;
        moving.segmentStartedAt = now;
        moving.marker.setLngLat(pt);
      } else if (fixAt !== undefined && (moving.lastFixAt === undefined || fixAt > moving.lastFixAt)) {
        // BE sent fresh telemetry at the same GPS coordinates: do not fabricate
        // extra displacement; allow any in-flight interpolation to finish.
        moving.lastFixAt = fixAt;
      }
    }
    for (const [id, moving] of dronesRef.current) {
      if (!active.has(id)) {
        moving.marker.remove(); dronesRef.current.delete(id);
        if (followRef.current === id) stopFollowing();
      }
    }
  }, [drones, selectedMissionId, ready]);

  // Selection may change automatically when an aircraft leaves the live fleet.
  // Never keep following a different aircraft from the one whose path is shown.
  useEffect(() => {
    if (followRef.current && followRef.current !== selectedMissionId) stopFollowing();
    if (!selectedMissionId && pathScope === 'selected') setPathScope('none');
  }, [selectedMissionId, pathScope]);

  const selected = drones.find(d => d.missionId === selectedMissionId);
  const selectedPathVisible = pathScope === 'selected' && Boolean(selected);
  return <div className="live-geo-shell">
    <div ref={host} className="live-geo-map" role="application" aria-label="Live geographic drone map of Ho Chi Minh City" />
    {!MAPTILER_KEY && <div className="live-geo-error">MapTiler API key is not configured. Add VITE_MAPTILER_API_KEY to .env.local and restart Vite.</div>}
    {error && <div className="live-geo-error" role="alert">{error}</div>}
    <div className="live-geo-badge">{!isFollowing && selectedPathVisible ? `Selected ${selected?.id}` : viewLabel}</div>
    <div className="live-geo-controls">
      <button type="button" onClick={entireCity}>Entire city</button>
      <button type="button" onClick={fitAll}>Hub network</button>
      {isFollowing
        ? <button type="button" onClick={stopFollowing}>Stop following</button>
        : <button type="button" disabled={!selected || !ready || !asPoint(selected.longitude, selected.latitude)} onClick={() => selected && focus(selected.missionId)}>Follow drone</button>}
    </div>
    {showWeather && selected && <div className="live-geo-weather">
      <strong>Observed weather · selected aircraft</strong>
      <span>{selected.id}</span>
      <div><span>Temperature</span><b>{selected.weather?.temperature !== undefined ? `${selected.weather.temperature.toFixed(1)}°C` : '—'}</b></div>
      <div><span>Wind</span><b>{selected.weather?.windSpeed !== undefined ? `${selected.weather.windSpeed.toFixed(1)}` : '—'}</b></div>
      <div><span>Humidity</span><b>{selected.weather?.humidity !== undefined ? `${selected.weather.humidity.toFixed(0)}%` : '—'}</b></div>
      <div><span>Wind direction</span><b>{selected.weather?.windDirection !== undefined ? `${Math.round(selected.weather.windDirection)}°` : '—'}</b></div>
      {/* <small>Weather at aircraft location, not district-wide conditions.</small> */}
    </div>}
    <div className="live-geo-layers" role="group" aria-label="Map layers">
      <button type="button" aria-pressed={showHubs} onClick={() => setShowHubs(v => !v)} className={showHubs ? 'active' : ''}>Hubs</button>
      <select aria-label="Flight paths" title="Choose which flight paths to display" className={`live-geo-path-scope ${pathScope !== 'none' ? 'active' : ''}`} value={pathScope} onChange={event => changePathScope(event.target.value as FlightPathScope)}>
        <option value="none">Flight paths: Off</option>
        <option value="selected" disabled={!selected}>Flight paths: Selected</option>
        <option value="all">All flight paths</option>
      </select>
      <button type="button" aria-pressed={showWeather} onClick={() => setShowWeather(v => !v)} className={showWeather ? 'active' : ''}>Weather</button>
    </div>

    {(pathScope === 'all' || selectedPathVisible) && <div className="live-geo-route-legend" aria-label="Flight path legend">
      <span><i className="live-geo-route-dash" aria-hidden="true" />Planned route</span>
      <span><i className="live-geo-route-solid" aria-hidden="true" />Recorded GPS</span>
    </div>}
    {/* <div className="live-geo-hint">Scroll to zoom · Drag to pan · Right-drag to rotate / tilt</div> */}
  </div>;
});
