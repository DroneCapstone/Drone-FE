import { formatHubName } from '../../../operator/utils/displayEnglish';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { fetchFlightTelemetry, gpsDistanceKm, hasReplayableTelemetry, type HistoricalTelemetry } from '../../api/adminHistoryTelemetry';
import { getMission, getCheckpoints, isHistory, swapHistory } from '../../api/adminHistoryApi';
import type { HubCheckpoint } from '../../../operator/api/missionApi';
import { DropdownSelect } from '../../../../components/ui/DropdownSelect';
import { HistoryShell, LoadState, useLoad, useBack, useHubs, paths, detailPath, dateText, pct, Partial } from './HistoryUI';
import '../../../operator/pages/operations/flight-history.css';
type GeoPoint = [
    number,
    number
];
type LineFeature = {
    type: 'Feature';
    id?: number;
    properties: Record<string, never>;
    geometry: {
        type: 'LineString';
        coordinates: GeoPoint[];
    };
};
type LineCollection = {
    type: 'FeatureCollection';
    features: LineFeature[];
};
const KEY = (import.meta.env.VITE_MAPTILER_API_KEY ?? '').trim();
maplibregl.setWorkerUrl(maplibreWorkerUrl);
function millis(p: HistoricalTelemetry) { return Date.parse(p.recordedAt); }
function point(p?: HistoricalTelemetry): GeoPoint | null {
    return p?.latitude !== undefined && p?.longitude !== undefined && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) ? [p.longitude, p.latitude] : null;
}
function positionAt(points: HistoricalTelemetry[], cursor: number): {
    coord: GeoPoint;
    row: HistoricalTelemetry;
    bearing: number;
} | null {
    if (!points.length)
        return null;
    let lo = 0;
    let hi = points.length - 1;
    while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (millis(points[mid]) <= cursor)
            lo = mid;
        else
            hi = mid - 1;
    }
    const from = points[lo];
    const to = points[lo + 1];
    const a = point(from);
    if (!a)
        return null;
    const b = point(to);
    const span = to ? millis(to) - millis(from) : 0;
    // A gap is an unknown flight interval. Do not interpolate across missing telemetry.
    const t = b && span > 0 && span <= 30000 ? Math.min(1, Math.max(0, (cursor - millis(from)) / span)) : 0;
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
        if (!p)
            continue;
        const gap = i ? millis(points[i]) - millis(points[i - 1]) : 0;
        if (i > 0 && (gap > 30000 || gap <= 0)) {
            if (current.length > 1)
                groups.push(current);
            current = [];
        }
        current.push(p);
    }
    if (current.length > 1)
        groups.push(current);
    return groups;
}
function clock(value: number) { return new Date(value).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
function format(value?: number, suffix = '') { return value == null ? '—' : `${value.toFixed(1)}${suffix}`; }
function getStyle(): string {
    const dark = document.documentElement.dataset.theme === 'dark';
    return `https://api.maptiler.com/maps/${dark ? 'streets-v4-dark' : 'streets-v4'}/style.json?key=${encodeURIComponent(KEY)}`;
}
function FlightReplayMap({ points, checkpoints, elapsed, follow, onLeaveFollow }: {
    points: HistoricalTelemetry[];
    checkpoints: HubCheckpoint[];
    elapsed: number;
    follow: boolean;
    onLeaveFollow: () => void;
}) {
    const container = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markerRef = useRef<maplibregl.Marker | null>(null);
    const checkpointMarkersRef = useRef<maplibregl.Marker[]>([]);
    const lastTravelledRef = useRef<LineCollection>({ type: 'FeatureCollection', features: [] });
    const lastTrailPaintRef = useRef<{
        wall: number;
        cursor: number;
    }>({ wall: -Infinity, cursor: -Infinity });
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
        if (!KEY || !container.current || !coords.length)
            return;
        let disposed = false;
        let map: maplibregl.Map;
        try {
            map = new maplibregl.Map({
                container: container.current, style: getStyle(), center: coords[0], zoom: 14,
                attributionControl: false, canvasContextAttributes: { antialias: true }
            });
        }
        catch (e) {
            setMapError(e instanceof Error ? e.message : 'Cannot initialize MapTiler map');
            return;
        }
        mapRef.current = map;
        map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
        const node = document.createElement('div');
        node.className = 'fh-replay-marker';
        node.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 10v28M10 24h28" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><circle cx="11" cy="11" r="6"/><circle cx="37" cy="11" r="6"/><circle cx="11" cy="37" r="6"/><circle cx="37" cy="37" r="6"/><path d="M24 15l-5 10h10z" fill="white" stroke="none"/></svg>';
        const marker = new maplibregl.Marker({ element: node, rotationAlignment: 'map' }).setLngLat(coords[0]).addTo(map);
        markerRef.current = marker;
        const setup = () => {
            if (disposed || !map.isStyleLoaded())
                return;
            try {
                if (!map.getSource('flight-history-track'))
                    map.addSource('flight-history-track', { type: 'geojson', data: sourceData });
                if (!map.getLayer('flight-history-track'))
                    map.addLayer({
                        id: 'flight-history-track', source: 'flight-history-track', type: 'line',
                        paint: { 'line-color': '#64748b', 'line-width': 2.5, 'line-opacity': .52, 'line-dasharray': [3, 2] }
                    });
                if (!map.getSource('flight-history-travelled'))
                    map.addSource('flight-history-travelled', { type: 'geojson', data: lastTravelledRef.current });
                if (!map.getLayer('flight-history-travelled'))
                    map.addLayer({
                        id: 'flight-history-travelled', source: 'flight-history-travelled', type: 'line',
                        paint: { 'line-color': '#ea580c', 'line-width': 4, 'line-opacity': .95 }
                    });
            }
            catch (e) {
                setMapError(e instanceof Error ? e.message : 'Unable to draw flight path');
            }
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
            if (disposed)
                return;
            const msg = String(e.error?.message ?? 'Map load failed');
            if (/401|403|forbidden|unauthoriz|failed to fetch|worker|style/i.test(msg))
                setMapError(`Unable to load the map.`);
        });
        map.on('dragstart', onLeaveFollow);
        const themeObserver = new MutationObserver(() => map.setStyle(getStyle()));
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        const ro = new ResizeObserver(() => map.resize());
        ro.observe(container.current);
        return () => { disposed = true; ro.disconnect(); themeObserver.disconnect(); checkpointMarkersRef.current.forEach(cp => cp.remove()); checkpointMarkersRef.current = []; marker.remove(); markerRef.current = null; map.remove(); mapRef.current = null; };
        // Recreate only on a new mission/history, not on each playback frame.
    }, [points, sourceData, coords]);
    useEffect(() => {
        const map = mapRef.current;
        checkpointMarkersRef.current.forEach(marker => marker.remove());
        checkpointMarkersRef.current = [];
        if (!map)
            return;
        for (const cp of checkpoints) {
            if (cp.latitude === undefined || cp.longitude === undefined ||
                Math.abs(cp.latitude) > 90 || Math.abs(cp.longitude) > 180)
                continue;
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
        if (!map || !current)
            return;
        markerRef.current?.setLngLat(current.coord).setRotation(current.bearing);
        if (follow)
            map.jumpTo({ center: current.coord });
        // Update the travelled GeoJSON a few times per second; the marker itself stays smooth.
        const wall = performance.now();
        const previousPaint = lastTrailPaintRef.current;
        const cursor = timeStart + elapsed;
        if (wall - previousPaint.wall < 160 && Math.abs(cursor - previousPaint.cursor) < 5000 && elapsed !== 0)
            return;
        lastTrailPaintRef.current = { wall, cursor };
        const travelled: LineFeature[] = [];
        let currentSegment: GeoPoint[] = [];
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (millis(p) > cursor)
                break;
            const gp = point(p);
            if (!gp)
                continue;
            if (i > 0 && (millis(points[i]) - millis(points[i - 1]) > 30000 || millis(points[i]) - millis(points[i - 1]) <= 0)) {
                if (currentSegment.length > 1)
                    travelled.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: currentSegment } });
                currentSegment = [];
            }
            currentSegment.push(gp);
        }
        let last = -1;
        for (let i = 0; i < points.length; i++) {
            if (millis(points[i]) <= cursor)
                last = i;
            else
                break;
        }
        if (last >= 0 && last < points.length - 1 && currentSegment.length) {
            const gap = millis(points[last + 1]) - millis(points[last]);
            if (gap > 0 && gap <= 30000)
                currentSegment.push(current.coord);
        }
        if (currentSegment.length > 1)
            travelled.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: currentSegment } });
        const data: LineCollection = { type: 'FeatureCollection', features: travelled };
        lastTravelledRef.current = data;
        const src = map.getSource('flight-history-travelled') as maplibregl.GeoJSONSource | undefined;
        src?.setData(data);
    }, [points, elapsed, timeStart, follow, current]);
    return <div className="fh-replay-map-wrap"><div className="fh-replay-map" ref={container} aria-label="MapTiler historical flight route"/>
    {!KEY && <div className="fh-map-message">Map is unavailable. Please check the map configuration.</div>}
    {mapError && <div className="fh-map-message" role="alert">{mapError}</div>}
    <div className="fh-map-caption">Historical playback · Streets map · GPS recorded route</div>
  </div>;
}
export function AdminFlightReplayPage() {
    const { missionId = '' } = useParams();
    const loc = useLocation();
    const back = useBack(paths.missions);
    const { name } = useHubs();
    const flightId = new URLSearchParams(loc.search).get('flight') || undefined;
    const mission = useLoad(`mission:${missionId}:${flightId ?? ''}`, () => getMission(missionId, flightId), !!missionId);
    const replayAllowed = Boolean(mission.data && isHistory(mission.data));
    const checkpoints = useLoad(`checkpoints:${missionId}`, () => getCheckpoints(missionId), replayAllowed);
    const telemetry = useLoad(`telemetry:${missionId}`, () => fetchFlightTelemetry(missionId), replayAllowed);
    const swaps = useLoad(`swap-history:${mission.data?.drone ?? ''}`, () => swapHistory(mission.data?.drone), replayAllowed && !!mission.data?.drone);
    const points = useMemo(() => (telemetry.data ?? []).filter(p => Number.isFinite(millis(p)) && point(p) !== null), [telemetry.data]);
    const recordedCheckpoints = useMemo(() => checkpoints.data ?? [], [checkpoints.data]);
    const [elapsed, setElapsed] = useState(0), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(1), [follow, setFollow] = useState(false);
    const firstMs = points.length ? millis(points[0]) : 0;
    const duration = points.length > 1 ? Math.max(0, millis(points[points.length - 1]) - firstMs) : 0;
    const selected = useMemo(() => positionAt(points, firstMs + elapsed), [points, elapsed, firstMs]);
    const gapCount = useMemo(() => points.slice(1).filter((p, i) => millis(p) - millis(points[i]) > 30000).length, [points]);
    const distance = useMemo(() => gpsDistanceKm(points), [points]);
    const cursor = useRef(elapsed), frameTime = useRef<number | null>(null);
    useEffect(() => { cursor.current = elapsed; }, [elapsed]);
    useEffect(() => { setElapsed(0); cursor.current = 0; setPlaying(false); setFollow(false); }, [missionId, telemetry.data]);
    useEffect(() => { if (!playing || duration <= 0)
        return; let frame = 0; const tick = (now: number) => { const delta = frameTime.current == null ? 0 : Math.min(250, now - frameTime.current); frameTime.current = now; const next = Math.min(duration, cursor.current + delta * speed); cursor.current = next; setElapsed(next); if (next >= duration) {
        setPlaying(false);
        return;
    } frame = requestAnimationFrame(tick); }; frame = requestAnimationFrame(tick); return () => { cancelAnimationFrame(frame); frameTime.current = null; }; }, [playing, speed, duration]);
    const seek = (ms: number) => { const next = Math.max(0, Math.min(duration, ms)); cursor.current = next; setElapsed(next); };
    const swapEvents = useMemo(() => (swaps.data?.items ?? []).filter(s => s.mission === missionId).sort((a, b) => Date.parse(a.at) - Date.parse(b.at)), [swaps.data, missionId]);
    const currentSwap = swapEvents.filter(s => s.at && Date.parse(s.at) <= firstMs + elapsed).at(-1);
    const recordedBattery = selected?.row.raw.battery_id;
    const batteryId = currentSwap && (!selected || Date.parse(currentSwap.at) > millis(selected.row)) ? currentSwap.newBattery : typeof recordedBattery === 'string' ? recordedBattery : currentSwap?.newBattery || '';
    const m = mission.data;
    return <HistoryShell title="Flight playback" back={back} refresh={() => { mission.reload(); checkpoints.reload(); telemetry.reload(); swaps.reload(); }}><div className="flight-history-screen"><div className="fh-card fh-playback-panel">
    <header className="fh-playback-header"><div><h2>{missionId}</h2>{m && <p>{m.drone || '—'} · {name(m.origin)} → {name(m.destination)}</p>}</div><Link className="fh-button" to={detailPath('missions', missionId) + loc.search} state={{ back: loc.pathname + loc.search }}>Mission details</Link></header>
    <LoadState {...mission} label="Checking flight status…"/>{m && !replayAllowed && <div className="fh-empty"><strong>Flight replay unavailable</strong><p>This mission has no confirmed historical flight.</p></div>}
    {replayAllowed && <><LoadState {...telemetry} label="Loading recorded flight…"/>{telemetry.data && (!hasReplayableTelemetry(points) ? <div className="fh-empty"><strong>Flight recording unavailable</strong><p>Fewer than two valid recorded GPS points.</p></div> : <>
      <FlightReplayMap points={points} checkpoints={recordedCheckpoints} elapsed={elapsed} follow={follow} onLeaveFollow={() => setFollow(false)}/>
      <div className="fh-player"><div className="fh-player-buttons"><button type="button" className="fh-button" onClick={() => { if (elapsed >= duration)
                seek(0); setPlaying(v => !v); }}>{playing ? 'Ⅱ Pause' : '▶ Play'}</button><button type="button" className="fh-button" onClick={() => { seek(0); setPlaying(false); }}>↺ Reset</button><button type="button" className={`fh-button ${follow ? 'fh-button-active' : ''}`} onClick={() => setFollow(v => !v)}>{follow ? '✓ Following' : 'Follow drone'}</button></div>
      <div className="fh-player-timeline"><span>{clock(firstMs + elapsed)}</span><input type="range" aria-label="Flight playback timeline" min={0} max={Math.max(1, duration)} step={100} value={elapsed} onChange={e => seek(Number(e.target.value))}/><span>{clock(firstMs + duration)}</span></div><div className="fh-speed-control"><span>Speed</span><DropdownSelect value={String(speed)} options={[1, 2, 4, 8, 16, 32].map(v => ({ value: String(v), label: `${v}×` }))} onChange={v => setSpeed(Number(v))} ariaLabel="Flight replay speed" className="w-[80px] !h-8 !text-xs"/></div></div>
      {gapCount > 0 && <div className="fh-warning" role="status">{gapCount} telemetry gap{gapCount > 1 ? 's' : ''} detected (over 30 seconds). Missing GPS intervals are not interpolated.</div>}
      <div className="fh-replay-metrics"><div><small>Recorded points</small><strong>{points.length}</strong></div><div><small>GPS distance</small><strong>{distance.toFixed(2)} km</strong></div><div><small>Speed</small><strong>{format(selected?.row.speedKmh, ' km/h')}</strong></div><div><small>Altitude</small><strong>{format(selected?.row.altitudeM, ' m')}</strong></div><div><small>Battery</small><strong>{selected?.row.batteryPct != null ? format(selected.row.batteryPct, '%') : format(selected?.row.batteryVoltage, ' V')}</strong></div><div><small>Energy</small><strong>{format(selected?.row.energyConsumedWh, ' Wh')}</strong></div></div>
      <div className="ah-replay-events"><h2>Battery history</h2><div className="ah-current-battery">Recorded battery: {batteryId ? <Link className="ah-id" to={`/admin/network/batteries/${encodeURIComponent(batteryId)}`}>{batteryId}</Link> : '—'}</div><LoadState {...swaps} label="Loading battery swaps…"/><Partial partial={swaps.data?.partial}/>{swaps.data && (swapEvents.length ? swapEvents.map(s => { const at = Date.parse(s.at), inWindow = Number.isFinite(at) && at >= firstMs && at <= firstMs + duration; return <div className="ah-event" key={s.id}><span>{dateText(s.at)}</span><div><strong>{name(s.hub)}</strong><small>{s.oldBattery} ({pct(s.oldPct)}) → {s.newBattery} ({pct(s.newPct)})</small></div>{inWindow ? <button className="fh-button" onClick={() => { setPlaying(false); seek(at - firstMs); }}>Go to</button> : <span className="ah-muted">Outside recording</span>}</div>; }) : <p className="ah-muted">No recorded battery swaps found.</p>)}<LoadState {...checkpoints} label="Loading checkpoints…"/></div>
    </>)}</>}
  </div></div></HistoryShell>;
}
