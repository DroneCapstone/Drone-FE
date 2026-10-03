import type { OperatorDrone, TechnicalStatus } from '../types/operator';
import { operatorApiRequest } from './orderApi';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function parseJsonString(payload: unknown): unknown {
  if (typeof payload !== 'string') return payload;
  const value = payload.trim();
  if (!value || (!value.startsWith('{') && !value.startsWith('['))) return payload;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return payload;
  }
}

function pickString(record: Record<string, unknown>, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return fallback;
}

function pickNumber(record: Record<string, unknown>, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
}

function unwrapFleetList(payload: unknown): unknown[] {
  const normalized = parseJsonString(payload);
  if (Array.isArray(normalized)) return normalized;
  if (!isRecord(normalized)) return [];

  for (const key of ['drones', 'fleet', 'data', 'items', 'results', 'rows']) {
    const candidate = parseJsonString(normalized[key]);
    if (Array.isArray(candidate)) return candidate;
    if (isRecord(candidate)) {
      const nested = unwrapFleetList(candidate);
      if (nested.length > 0) return nested;
    }
  }

  const firstArray = Object.values(normalized).find(Array.isArray);
  return Array.isArray(firstArray) ? firstArray : [];
}

function normalizeTechnicalStatus(value: unknown): TechnicalStatus {
  const status = String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (
    status.includes('MAINTENANCE') ||
    status.includes('OUT_OF_SERVICE') ||
    status.includes('UNSERVICEABLE') ||
    status.includes('REPAIR')
  ) {
    return 'Maintenance';
  }
  return 'Available';
}

function normalizeDisplayId(rawId: string, explicitDisplayId: string) {
  if (explicitDisplayId) return explicitDisplayId;
  const match = rawId.match(/(\d+)$/);
  return match ? match[1].padStart(2, '0') : rawId;
}

function mapFleetDrone(raw: unknown): OperatorDrone | null {
  if (!isRecord(raw)) return null;

  const id = pickString(raw, ['id', 'drone_id', 'droneId']);
  if (!id) return null;

  const nestedHub = isRecord(raw.hub) ? raw.hub : undefined;
  const hubId = pickString(
    raw,
    ['hub_id', 'hubId', 'current_hub_id', 'currentHubId', 'location_hub_id'],
    nestedHub ? pickString(nestedHub, ['id', 'hub_id', 'hubId']) : '',
  );

  const name = pickString(raw, ['name', 'drone_name', 'droneName', 'code'], `DR-${id}`);
  const displayId = normalizeDisplayId(
    id,
    pickString(raw, ['display_id', 'displayId', 'display_code', 'displayCode']),
  );

  return {
    id,
    name,
    displayId,
    model: pickString(raw, ['model', 'drone_model', 'droneModel', 'model_name', 'modelName'], '—'),
    hubId,
    technicalStatus: normalizeTechnicalStatus(
      raw.technical_status ?? raw.technicalStatus ?? raw.status ?? raw.operational_status,
    ),
    maxPayloadKg: pickNumber(
      raw,
      ['max_payload_kg', 'maxPayloadKg', 'payload_capacity_kg', 'payloadCapacityKg', 'max_payload'],
      0,
    ),
  };
}

export async function listFleetDronesApi(): Promise<OperatorDrone[]> {
  const payload = await operatorApiRequest<unknown>('/fleet/drones');
  return unwrapFleetList(payload)
    .map(mapFleetDrone)
    .filter((drone): drone is OperatorDrone => Boolean(drone));
}
