import { adminRequest } from './adminOperationsApi';
import { rows } from './adminHistoryApi';
/** The Swagger endpoint accepts limit <= 5000 and offset >= 0. */
export interface HistoricalTelemetry {
    id: string;
    recordedAt: string;
    latitude?: number;
    longitude?: number;
    altitudeM?: number;
    /** Normalized display speed. Generic BE `speed` is interpreted in m/s. */
    speedKmh?: number;
    batteryVoltage?: number;
    batteryPct?: number;
    energyConsumedWh?: number;
    raw: Record<string, unknown>;
}
function recordOf(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function asNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '')
        return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
}
function numeric(record: Record<string, unknown>, ...keys: string[]) {
    for (const key of keys) {
        const v = asNumber(record[key]);
        if (v !== undefined)
            return v;
    }
    return undefined;
}
function normalizedSpeedKmh(record: Record<string, unknown>): number | undefined {
    // Prefer an explicitly documented speed unit; the existing BE `speed` uses
    // the mission flight-speed convention (m/s). Set VITE_OPERATOR_TELEMETRY_SPEED_UNIT=kmh
    // only when the deployment's BE sends generic `speed` in km/h instead.
    const kmh = numeric(record, 'speed_kmh', 'speedKmh');
    if (kmh !== undefined)
        return kmh;
    const mps = numeric(record, 'speed_mps', 'speedMps');
    if (mps !== undefined)
        return mps * 3.6;
    const generic = numeric(record, 'speed');
    const genericIsKmh = import.meta.env.VITE_OPERATOR_TELEMETRY_SPEED_UNIT === 'kmh';
    return generic === undefined ? undefined : genericIsKmh ? generic : generic * 3.6;
}
function batteryPercent(record: Record<string, unknown>): number | undefined {
    const value = numeric(record, 'battery_pct', 'batteryPct');
    // Do not invent 0% or silently clamp invalid BE telemetry.
    return value !== undefined && value >= 0 && value <= 100 ? value : undefined;
}
function unwrapRows(payload: unknown): unknown[] { return rows(payload, ['telemetry', 'points', 'history']); }
/**
 * A replay needs at least two actual timestamped GPS fixes at distinct times.
 * An eligible Mission status alone is NOT evidence that telemetry was recorded.
 */
export function hasReplayableTelemetry(points: HistoricalTelemetry[]): boolean {
    let firstTime: number | undefined;
    for (const point of points) {
        const at = Date.parse(point.recordedAt);
        if (!Number.isFinite(at) || point.latitude === undefined || point.longitude === undefined ||
            !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) ||
            Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180)
            continue;
        if (firstTime === undefined)
            firstTime = at;
        else if (firstTime !== at)
            return true;
    }
    return false;
}
/**
 * Lightweight existence check for the current Flight History table page.
 * Never draw a Replay button unless BE returns at least two valid GPS fixes.
 * This intentionally avoids downloading entire recordings for every table row.
 */
export async function hasReplayableFlightRecording(missionId: string): Promise<boolean> {
    const limit = 200;
    let firstTime: number | undefined;
    let previousPageFingerprint: string | undefined;
    // Same 100,000-point ceiling as the full replay endpoint fetcher.
    for (let page = 0; page < 500; page++) {
        const payload = await adminRequest<unknown>(`/operator/missions/${encodeURIComponent(missionId)}/telemetry?limit=${limit}&offset=${page * limit}`);
        const rows = unwrapRows(payload);
        if (rows.length) {
            const first = recordOf(rows[0]);
            const last = recordOf(rows[rows.length - 1]);
            const fingerprint = JSON.stringify([
                first.id, first.timestamp ?? first.recorded_at,
                last.id, last.timestamp ?? last.recorded_at, rows.length,
            ]);
            // A non-paginating BE must not cause hundreds of identical fetches.
            if (page > 0 && fingerprint === previousPageFingerprint)
                return false;
            previousPageFingerprint = fingerprint;
        }
        for (const item of rows) {
            const r = recordOf(item);
            const at = Date.parse(String(r.timestamp ?? r.recorded_at ?? r.recordedAt ?? r.time ?? ''));
            const lat = numeric(r, 'latitude', 'lat');
            const lng = numeric(r, 'longitude', 'lng', 'lon');
            if (!Number.isFinite(at) || lat === undefined || lng === undefined ||
                Math.abs(lat) > 90 || Math.abs(lng) > 180)
                continue;
            if (firstTime === undefined)
                firstTime = at;
            else if (firstTime !== at)
                return true;
        }
        if (rows.length < limit)
            return false;
    }
    return false;
}
/** Full history is requested on demand, not on every row of Flight History. */
export async function fetchFlightTelemetry(missionId: string): Promise<HistoricalTelemetry[]> {
    const limit = 5000;
    const all: HistoricalTelemetry[] = [];
    const seenIds = new Set<string>();
    let previousPageFingerprint: string | undefined;
    for (let page = 0; page < 20; page++) {
        const payload = await adminRequest<unknown>(`/operator/missions/${encodeURIComponent(missionId)}/telemetry?limit=${limit}&offset=${page * limit}`);
        const rows = unwrapRows(payload);
        if (rows.length) {
            const a = recordOf(rows[0]), b = recordOf(rows[rows.length - 1]);
            const fp = JSON.stringify([a.id, a.timestamp ?? a.recorded_at, b.id, b.timestamp ?? b.recorded_at, rows.length]);
            if (page > 0 && fp === previousPageFingerprint)
                throw new Error('The flight recording could not be loaded completely.');
            previousPageFingerprint = fp;
        }
        for (const item of rows) {
            const r = recordOf(item);
            const recordedAt = String(r.timestamp ?? r.recorded_at ?? r.recordedAt ?? r.time ?? '');
            const latitude = numeric(r, 'latitude', 'lat');
            const longitude = numeric(r, 'longitude', 'lng', 'lon');
            // Pagination may overlap when new records arrive. Eliminate only real
            // duplicate BE IDs; generated IDs are deliberately not deduplicated.
            const explicitId = r.id == null ? '' : String(r.id);
            if (explicitId && seenIds.has(explicitId))
                continue;
            if (explicitId)
                seenIds.add(explicitId);
            all.push({
                id: explicitId || `${missionId}-${all.length}`,
                recordedAt,
                latitude: latitude !== undefined && Math.abs(latitude) <= 90 ? latitude : undefined,
                longitude: longitude !== undefined && Math.abs(longitude) <= 180 ? longitude : undefined,
                altitudeM: numeric(r, 'altitude_m', 'altitude', 'altitudeM'),
                speedKmh: normalizedSpeedKmh(r),
                batteryVoltage: numeric(r, 'battery_voltage', 'batteryVoltage'),
                batteryPct: batteryPercent(r),
                energyConsumedWh: numeric(r, 'energy_consumed_wh', 'energyConsumedWh'),
                raw: r,
            });
        }
        if (rows.length < limit)
            break;
        if (page === 19)
            throw new Error('Telemetry exceeds 100,000 records. A time-range export is required.');
    }
    return all.sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
}
export function gpsDistanceKm(points: HistoricalTelemetry[]): number {
    let meters = 0;
    const R = 6371000;
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null)
            continue;
        const gap = Date.parse(b.recordedAt) - Date.parse(a.recordedAt);
        if (gap <= 0 || gap > 30000)
            continue; // never join disjoint runs
        const rad = Math.PI / 180;
        const dLat = (b.latitude - a.latitude) * rad;
        const dLon = (b.longitude - a.longitude) * rad;
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
        meters += 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
    }
    return meters / 1000;
}
