import { operatorApiRequest } from './orderApi';

/** The Swagger endpoint accepts limit <= 5000 and offset >= 0. */
export interface HistoricalTelemetry {
  id: string;
  recordedAt: string;
  latitude?: number;
  longitude?: number;
  altitudeM?: number;
  speed?: number;
  batteryVoltage?: number;
  batteryPct?: number;
  energyConsumedWh?: number;
  raw: Record<string, unknown>;
}

function recordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function asNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
function numeric(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const v = asNumber(record[key]);
    if (v !== undefined) return v;
  }
  return undefined;
}
function unwrapRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = recordOf(payload);
  for (const key of ['data', 'telemetry', 'points', 'history', 'items', 'results']) {
    const candidate = root[key];
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === 'object') {
      const child = unwrapRows(candidate);
      if (child.length) return child;
    }
  }
  return [];
}

/** Full history is requested on demand, not on every row of Flight History. */
export async function fetchFlightTelemetry(missionId: string): Promise<HistoricalTelemetry[]> {
  const limit = 5000;
  const all: HistoricalTelemetry[] = [];
  for (let page = 0; page < 20; page++) {
    const payload = await operatorApiRequest<unknown>(
      `/operator/missions/${encodeURIComponent(missionId)}/telemetry?limit=${limit}&offset=${page * limit}`,
    );
    const rows = unwrapRows(payload);
    for (const item of rows) {
      const r = recordOf(item);
      const recordedAt = String(r.timestamp ?? r.recorded_at ?? r.recordedAt ?? r.time ?? '');
      const latitude = numeric(r, 'latitude', 'lat');
      const longitude = numeric(r, 'longitude', 'lng', 'lon');
      all.push({
        id: String(r.id ?? `${missionId}-${all.length}`),
        recordedAt,
        latitude: latitude !== undefined && Math.abs(latitude) <= 90 ? latitude : undefined,
        longitude: longitude !== undefined && Math.abs(longitude) <= 180 ? longitude : undefined,
        altitudeM: numeric(r, 'altitude', 'altitude_m', 'altitudeM'),
        speed: numeric(r, 'speed', 'speed_kmh', 'speedKmh'),
        batteryVoltage: numeric(r, 'battery_voltage', 'batteryVoltage'),
        batteryPct: numeric(r, 'battery_pct', 'batteryPct'),
        energyConsumedWh: numeric(r, 'energy_consumed_wh', 'energyConsumedWh'),
        raw: r,
      });
    }
    if (rows.length < limit) break;
    if (page === 19) throw new Error('Telemetry exceeds 100,000 records. A time-range export is required.');
  }
  return all.sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
}

export function gpsDistanceKm(points: HistoricalTelemetry[]): number {
  let meters = 0;
  const R = 6371000;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]; const b = points[i];
    if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) continue;
    const gap = Date.parse(b.recordedAt) - Date.parse(a.recordedAt);
    if (gap <= 0 || gap > 30_000) continue; // never join disjoint runs
    const rad = Math.PI / 180;
    const dLat = (b.latitude - a.latitude) * rad;
    const dLon = (b.longitude - a.longitude) * rad;
    const h = Math.sin(dLat/2)**2 + Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dLon/2)**2;
    meters += 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  return meters / 1000;
}
