import { formatHubName } from '../../utils/displayEnglish';
import { useEffect, useMemo, useRef, useState } from 'react';
import { OperatorLoadingState } from '../../components/OperatorLoadingState';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { fetchFlightTelemetry, gpsDistanceKm, hasReplayableTelemetry, type HistoricalTelemetry } from '../../api/flightHistoryApi';
import { canReplayFlight } from '../../api/flightHistoryEligibility';
import type { HubCheckpoint } from '../../api/missionApi';
import { useMissionDetailQuery, useMissionHubCheckpointsQuery, useMissionHubsQuery } from '../../hooks/useMissionQueries';
import { PageHeader } from '../../components/PageHeader';
import './flight-history.css';

type GeoPoint = [number, number];
type LineFeature = { type: 'Feature'; id?: number; properties: Record<string, never>; geometry: { type: 'LineString'; coordinates: GeoPoint[] } };
type LineCollection = { type: 'FeatureCollection'; features: LineFeature[] };
const KEY = (import.meta.env.VITE_MAPTILER_API_KEY ?? '').trim();
maplibregl.setWorkerUrl(maplibreWorkerUrl);

function millis(p: HistoricalTelemetry) { return Date.parse(p.recordedAt); }
function point(p?: HistoricalTelemetry): GeoPoint | null {
  return p?.latitude !== undefined && p?.longitude !== undefined && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) ? [p.longitude, p.latitude] : null;
}
function positionAt(points: HistoricalTelemetry[], cursor: number): { coord: GeoPoint; row: HistoricalTelemetry; bearing: number } | null {
  if (!points.length) return null;
  let lo = 0; let hi = points.length - 1;
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (millis(points[mid]) <= cursor) lo = mid; else hi = mid - 1; }
  const from = points[lo]; const to = points[lo + 1];
  const a = point(from);
  if (!a) return null;
  const b = point(to);
  const span = to ? millis(to) - millis(from) : 0;
  // A gap is an unknown flight interval. Do not interpolate across missing telemetry.
  const t = b && span > 0 && span <= 30_000 ? Math.min(1, Math.max(0, (cursor - millis(from)) / span)) : 0;
  const coord: GeoPoint = b ? [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] : a;
  const dx = b ? (b[0] - a[0]) * Math.cos(a[1] * Math.PI / 180) : 0;
  const dy = b ? b[1] - a[1] : 0;
  const bearing = Math.atan2(dx, dy) * 180 / Math.PI;
  return { coord, row: from, bearing };
}
function splitSegments(points: HistoricalTelemetry[]): GeoPoint[][] {
  const groups: GeoPoint[][] = [];
  let current: GeoPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = point(points[i]);
    if (!p) continue;
    const gap = i ? millis(points[i]) - millis(points[i - 1]) : 0;
    if (i > 0 && (gap > 30_000 || gap <= 0)) {
      if (current.length > 1) groups.push(current);
      current = [];
    }
    current.push(p);
  }
  if (current.length > 1) groups.push(current);
  return groups;
}
function clock(value: number) { return new Date(value).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
function format(value?: number, suffix = '') { return value == null ? '—' : `${value.toFixed(1)}${suffix}`; }
function getStyle(): string {
  const dark = document.documentElement.dataset.theme === 'dark';
  return `https://api.maptiler.com/maps/${dark ? 'streets-v4-dark' : 'streets-v4'}/style.json?key=${encodeURIComponent(KEY)}`;
}

function FlightReplayMap({ points, checkpoints, elapsed, follow, onLeaveFollow }: { points: HistoricalTelemetry[]; checkpoints: HubCheckpoint[]; elapsed: number; follow: boolean; onLeaveFollow: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const checkpointMarkersRef = useRef<maplibregl.Marker[]>([]);
  const lastTravelledRef = useRef<LineCollection>({ type: 'FeatureCollection', features: [] });
  const lastTrailPaintRef = useRef<{ wall: number; cursor: number }>({ wall: -Infinity, cursor: -Infinity });
  const [mapError, setMapError] = useState('');
  const timeStart = points.length ? millis(points[0]) : 0;
  const current = useMemo(() => positionAt(points, timeStart + elapsed), [points, timeStart, elapsed]);
  const segments = useMemo(() => splitSegments(points), [points]);
  const coords = useMemo(() => points.map(point).filter((p): p is GeoPoint => p !== null), [points]);
  const sourceData = useMemo((): LineCollection => ({
    type: 'FeatureCollection', features: segments.map((line, i) => ({
      type: 'Feature', id: i, properties: {}, geometry: { type: 'LineString', coordinates: line },
    })),
  }), [segments]);

  useEffect(() => {
    if (!KEY || !container.current || !coords.length) return;
    let disposed = false;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: container.current, style: getStyle(), center: coords[0], zoom: 14,
        attributionControl: false, canvasContextAttributes: { antialias: true }
      });
    } catch (e) { setMapError(e instanceof Error ? e.message : 'Cannot initialize MapTiler map'); return; }
    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    const node = document.createElement('div'); node.className = 'fh-replay-marker';
    node.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 10v28M10 24h28" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><circle cx="11" cy="11" r="6"/><circle cx="37" cy="11" r="6"/><circle cx="11" cy="37" r="6"/><circle cx="37" cy="37" r="6"/><path d="M24 15l-5 10h10z" fill="white" stroke="none"/></svg>';
    const marker = new maplibregl.Marker({ element: node, rotationAlignment: 'map' }).setLngLat(coords[0]).addTo(map);
    markerRef.current = marker;
    const setup = () => {
      if (disposed || !map.isStyleLoaded()) return;
      try {
        if (!map.getSource('flight-history-track')) map.addSource('flight-history-track', { type: 'geojson', data: sourceData });
        if (!map.getLayer('flight-history-track')) map.addLayer({
          id: 'flight-history-track', source: 'flight-history-track', type: 'line',
          paint: { 'line-color': '#64748b', 'line-width': 2.5, 'line-opacity': .52, 'line-dasharray': [3, 2] }
        });
        if (!map.getSource('flight-history-travelled')) map.addSource('flight-history-travelled', { type: 'geojson', data: lastTravelledRef.current });
        if (!map.getLayer('flight-history-travelled')) map.addLayer({
          id: 'flight-history-travelled', source: 'flight-history-travelled', type: 'line',
          paint: { 'line-color': '#ea580c', 'line-width': 4, 'line-opacity': .95 }
        });
      } catch (e) { setMapError(e instanceof Error ? e.message : 'Unable to draw flight path'); }
    };
    const loaded = () => {
      setup();
      if (coords.length > 1) {
        const bounds = coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
        map.fitBounds(bounds, { padding: 68, maxZoom: 16, duration: 0 });
      }
    };
    map.on('load', loaded);
    map.on('style.load', setup);
    map.on('error', e => {
      if (disposed) return;
      const msg = String(e.error?.message ?? 'Map load failed');
      if (/401|403|forbidden|unauthoriz|failed to fetch|worker|style/i.test(msg)) setMapError(`MapTiler: ${msg}`);
    });
    map.on('dragstart', onLeaveFollow);
    const themeObserver = new MutationObserver(() => map.setStyle(getStyle()));
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const ro = new ResizeObserver(() => map.resize()); ro.observe(container.current);
    return () => { disposed = true; ro.disconnect(); themeObserver.disconnect(); checkpointMarkersRef.current.forEach(cp => cp.remove()); checkpointMarkersRef.current = []; marker.remove(); markerRef.current = null; map.remove(); mapRef.current = null; };
    // Recreate only on a new mission/history, not on each playback frame.
  }, [points, sourceData, coords]);

  useEffect(() => {
    const map = mapRef.current;
    checkpointMarkersRef.current.forEach(marker => marker.remove());
    checkpointMarkersRef.current = [];
    if (!map) return;
    for (const cp of checkpoints) {
      if (cp.latitude === undefined || cp.longitude === undefined ||
        Math.abs(cp.latitude) > 90 || Math.abs(cp.longitude) > 180) continue;
      // These coordinates come from the recorded BE checkpoint event, never
      // from the scheduled route. The label is not a live GPS position.
      const el = document.createElement('div');
      el.className = 'fh-replay-checkpoint-pin';
      el.textContent = String(cp.sequence);
      el.title = `${formatHubName(cp.hubName)} · ${cp.reachedAt ? new Date(cp.reachedAt).toLocaleString('en-GB') : 'Recorded checkpoint'}`;
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([cp.longitude, cp.latitude]).addTo(map);
      checkpointMarkersRef.current.push(marker);
    }
    return () => { checkpointMarkersRef.current.forEach(marker => marker.remove()); checkpointMarkersRef.current = []; };
  }, [checkpoints, points]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !current) return;
    markerRef.current?.setLngLat(current.coord).setRotation(current.bearing);
    if (follow) map.jumpTo({ center: current.coord });
    // Update the travelled GeoJSON a few times per second; the marker itself stays smooth.
    const wall = performance.now();
    const previousPaint = lastTrailPaintRef.current;
    const cursor = timeStart + elapsed;
    if (wall - previousPaint.wall < 160 && Math.abs(cursor - previousPaint.cursor) < 5000 && elapsed !== 0) return;
    lastTrailPaintRef.current = { wall, cursor };
    const travelled: LineFeature[] = [];
    let currentSegment: GeoPoint[] = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (millis(p) > cursor) break;
      const gp = point(p); if (!gp) continue;
      if (i > 0 && (millis(points[i]) - millis(points[i - 1]) > 30_000 || millis(points[i]) - millis(points[i - 1]) <= 0)) {
        if (currentSegment.length > 1) travelled.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: currentSegment } });
        currentSegment = [];
      }
      currentSegment.push(gp);
    }
    let last = -1;
    for (let i = 0; i < points.length; i++) { if (millis(points[i]) <= cursor) last = i; else break; }
    if (last >= 0 && last < points.length - 1 && currentSegment.length) {
      const gap = millis(points[last + 1]) - millis(points[last]);
      if (gap > 0 && gap <= 30_000) currentSegment.push(current.coord);
    }
    if (currentSegment.length > 1) travelled.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: currentSegment } });
    const data: LineCollection = { type: 'FeatureCollection', features: travelled };
    lastTravelledRef.current = data;
    const src = map.getSource('flight-history-travelled') as maplibregl.GeoJSONSource | undefined;
    src?.setData(data);
  }, [points, elapsed, timeStart, follow, current]);

  return <div className="fh-replay-map-wrap"><div className="fh-replay-map" ref={container} aria-label="MapTiler historical flight route" />
    {!KEY && <div className="fh-map-message">MapTiler key is missing. Set VITE_MAPTILER_API_KEY in .env.local and restart Vite.</div>}
    {mapError && <div className="fh-map-message" role="alert">{mapError}</div>}
    <div className="fh-map-caption">Historical playback · Streets map · GPS recorded route</div>
  </div>;
}

export function FlightReplayPage() {
  const { missionId = '' } = useParams();
  const mission = useMissionDetailQuery(missionId);
  const hubsQuery = useMissionHubsQuery();
  const replayAllowed = Boolean(mission.data && canReplayFlight(mission.data));
  // A scheduled mission can have stale/test telemetry in BE. Do not load or replay it.
  const checkpoints = useMissionHubCheckpointsQuery(replayAllowed ? missionId : '');
  const telemetry = useQuery({ queryKey: ['operator', 'flight-history', 'telemetry-all', missionId], queryFn: () => fetchFlightTelemetry(missionId), enabled: Boolean(missionId) && replayAllowed, staleTime: 60_000, retry: 1, refetchOnWindowFocus: false });
  const points = useMemo(() => (telemetry.data ?? []).filter(p => Number.isFinite(millis(p)) && point(p) !== null), [telemetry.data]);
  const recordedCheckpoints = useMemo(() => checkpoints.data ?? [], [checkpoints.data]);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [follow, setFollow] = useState(false);
  const firstMs = points.length ? millis(points[0]) : 0;
  const duration = points.length > 1 ? Math.max(0, millis(points[points.length - 1]) - firstMs) : 0;
  const selected = useMemo(() => positionAt(points, firstMs + elapsed), [points, elapsed, firstMs]);
  const gapCount = useMemo(() => points.slice(1).filter((p, i) => millis(p) - millis(points[i]) > 30_000).length, [points]);
  const distance = useMemo(() => gpsDistanceKm(points), [points]);
  const cursor = useRef(elapsed);
  const frameTime = useRef<number | null>(null);
  useEffect(() => { cursor.current = elapsed; }, [elapsed]);
  useEffect(() => { setElapsed(0); cursor.current = 0; setPlaying(false); setFollow(false); }, [missionId]);
  useEffect(() => {
    if (!playing || duration <= 0) return;
    let frame = 0;
    const tick = (now: number) => {
      const delta = frameTime.current == null ? 0 : Math.min(250, now - frameTime.current);
      frameTime.current = now;
      const next = Math.min(duration, cursor.current + delta * speed);
      cursor.current = next; setElapsed(next);
      if (next >= duration) { setPlaying(false); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); frameTime.current = null; };
  }, [playing, speed, duration]);

  const m = mission.data;
  const hubNames = new Map((hubsQuery.data ?? []).map(h => [h.id, h.name]));
  const fromName = m ? formatHubName(hubNames.get(m.originHubId)) || m.originHubId : '—';
  const toName = m ? formatHubName(hubNames.get(m.destinationHubId)) || m.destinationHubId : '—';
  return <div className="flight-history-screen">
    <PageHeader section="operations" title="Flight playback" subtitle="Review a recorded mission using its original GPS and telemetry timestamps." />
    <div className="fh-playback-top"><Link className="fh-button" to="/operator/operations/history">← Flight history</Link><span className="fh-historical-tag"></span></div>
    <div className="fh-card fh-playback-panel">
      <header className="fh-playback-header"><div><h2>{missionId}</h2><p>{m?.drone || m?.droneId || 'Drone'} · {fromName} → {toName}</p></div><Link className="fh-button" to={`/operator/missions/${encodeURIComponent(missionId)}`}>Mission details →</Link></header>
      {(mission.isError || telemetry.isError) && <div className="fh-warning" role="alert">{telemetry.error instanceof Error ? telemetry.error.message : mission.error instanceof Error ? mission.error.message : 'Unable to load flight data.'}</div>}
      {mission.isLoading ? <OperatorLoadingState label="Checking flight status…" />
        : mission.isError ? <div className="fh-empty"><strong>Unable to verify mission status</strong><p>Flight Replay is unavailable until the mission status can be confirmed.</p></div>
          : !m ? <div className="fh-empty"><strong>Mission not found</strong><p>Unable to verify the recorded flight.</p></div>
            : !replayAllowed ? <div className="fh-empty"><strong>Flight replay unavailable</strong><p>{m.status === 'Scheduled' ? 'This mission has not departed. Scheduled routes and any telemetry attached to a Scheduled mission must not be shown as a recorded flight.' : m.status === 'Flying' ? 'This mission is still flying. Use Live tracking to monitor the flight; replay will be available after it ends.' : 'This mission has no confirmed take-off event, so there is no historical flight to replay.'}</p></div>
              : telemetry.isLoading ? <OperatorLoadingState label="Loading recorded flight…" /> : !hasReplayableTelemetry(points) ? <div className="fh-empty"><strong>Flight recording unavailable</strong><p>This mission has fewer than two valid timestamped GPS points at distinct times. Check telemetry storage and mission data integrity.</p></div> : <>
                <FlightReplayMap points={points} checkpoints={recordedCheckpoints} elapsed={elapsed} follow={follow} onLeaveFollow={() => setFollow(false)} />
                <div className="fh-player"><div className="fh-player-buttons">
                  <button type="button" className="fh-button" onClick={() => { if (elapsed >= duration) { cursor.current = 0; setElapsed(0); } setPlaying(v => !v); }}>{playing ? 'Ⅱ Pause' : '▶ Play'}</button>
                  <button type="button" className="fh-button" onClick={() => { cursor.current = 0; setElapsed(0); setPlaying(false); }}>↺ Reset</button>
                  <button type="button" className={`fh-button ${follow ? 'fh-button-active' : ''}`} onClick={() => setFollow(v => !v)}>{follow ? '✓ Following' : 'Follow drone'}</button>
                </div>
                  <div className="fh-player-timeline"><span>{clock(firstMs + elapsed)}</span><input type="range" aria-label="Flight playback timeline" min={0} max={Math.max(1, duration)} step={100} value={elapsed} onChange={e => { const v = Number(e.target.value); cursor.current = v; setElapsed(v); }} /><span>{clock(firstMs + duration)}</span></div>
                  <label className="fh-speed-control">Speed <select value={speed} onChange={e => setSpeed(Number(e.target.value))}>{[1, 2, 4, 8, 16, 32].map(v => <option key={v} value={v}>{v}×</option>)}</select></label>
                </div>
                {gapCount > 0 && <div className="fh-warning" role="status">{gapCount} telemetry gap{gapCount > 1 ? 's' : ''} detected (over 30 seconds). Playback does not invent movement across missing GPS intervals.</div>}
                <div className="fh-replay-metrics"><div><small>Recorded points</small><strong>{points.length}</strong></div><div><small>GPS distance</small><strong>{distance.toFixed(2)} km</strong></div><div><small>Speed</small><strong>{format(selected?.row.speedKmh, ' km/h')}</strong></div><div><small>Altitude</small><strong>{format(selected?.row.altitudeM, ' m')}</strong></div><div><small>Battery</small><strong>{selected?.row.batteryPct != null ? format(selected.row.batteryPct, '%') : format(selected?.row.batteryVoltage, ' V')}</strong></div><div><small>Energy</small><strong>{format(selected?.row.energyConsumedWh, ' Wh')}</strong></div></div>

              </>}
    </div>
  </div>;
}
