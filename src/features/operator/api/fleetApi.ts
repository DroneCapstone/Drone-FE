import type { OperatorBattery, OperatorDrone, TechnicalStatus } from '../types/operator';
import { OperatorApiError, operatorApiRequest } from './orderApi';

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

function unwrapList(payload: unknown, preferredKeys: string[]): unknown[] {
  const normalized = parseJsonString(payload);
  if (Array.isArray(normalized)) return normalized;
  if (!isRecord(normalized)) return [];

  for (const key of [...preferredKeys, 'data', 'items', 'results', 'rows']) {
    const candidate = parseJsonString(normalized[key]);
    if (Array.isArray(candidate)) return candidate;
    if (isRecord(candidate)) {
      const nested = unwrapList(candidate, preferredKeys);
      if (nested.length > 0) return nested;
    }
  }

  const firstArray = Object.values(normalized).find(Array.isArray);
  return Array.isArray(firstArray) ? firstArray : [];
}

function normalizeDroneStatus(value: unknown): TechnicalStatus {
  const status = String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');

  if (
    status.includes('MAINTENANCE') ||
    status.includes('OUT_OF_SERVICE') ||
    status.includes('UNSERVICEABLE') ||
    status.includes('REPAIR')
  ) {
    return 'Maintenance';
  }

  if (
    status.includes('IN_FLIGHT') ||
    status.includes('INFLIGHT') ||
    status === 'FLYING' ||
    status === 'ACTIVE_FLIGHT'
  ) {
    return 'In Flight';
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
    ['current_hub_id', 'currentHubId', 'hub_id', 'hubId', 'location_hub_id'],
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
    hubName: pickString(raw, ['hub_name', 'hubName'], nestedHub ? pickString(nestedHub, ['name']) : ''),
    technicalStatus: normalizeDroneStatus(raw.status ?? raw.operational_status ?? raw.technical_status),
    maxPayloadKg: pickNumber(
      raw,
      ['payload_capacity_kg', 'payloadCapacityKg', 'max_payload_kg', 'maxPayloadKg', 'max_payload'],
      0,
    ),
    maxSpeed: pickNumber(raw, ['max_speed', 'maxSpeed'], 0),
    batteryLevelPct: pickNumber(raw, ['battery_level_pct', 'batteryLevelPct', 'battery_pct'], 0),
    utilizationPct: pickNumber(raw, ['utilization_pct', 'utilizationPct'], 0),
    batteryModel: pickString(raw, ['battery_model', 'batteryModel', 'battery_model_name', 'batteryModelName']) || undefined,
  };
}

function mapFleetBattery(raw: unknown): OperatorBattery | null {
  if (!isRecord(raw)) return null;

  const id = pickString(raw, ['id', 'battery_id', 'batteryId']);
  if (!id) return null;

  const droneId = pickString(raw, ['drone_id', 'droneId']);

  return {
    id,
    serialNumber: pickString(raw, ['serial_number', 'serialNumber'], `BAT-${id}`),
    capacityWh: pickNumber(raw, ['capacity_wh', 'capacityWh'], 0),
    // Keep only the value supplied by BE; an absent status is not a synthetic category.
    status: pickString(raw, ['status']),
    availableStatus: pickString(raw, ['available_status', 'availableStatus']) || undefined,
    droneId: droneId && droneId !== '0' ? droneId : undefined,
    currentHubId: pickString(raw, ['current_hub_id', 'currentHubId', 'hub_id', 'hubId']),
    hubName: pickString(raw, ['hub_name', 'hubName']),
    chargeLevelPct: pickNumber(raw, ['charge_level_pct', 'chargeLevelPct', 'battery_level_pct'], 0),
    model: pickString(raw, ['model', 'battery_model', 'batteryModel', 'battery_model_name']) || undefined,
  };
}

export async function listFleetDronesApi(): Promise<OperatorDrone[]> {
  const payload = await operatorApiRequest<unknown>('/operator/fleet/drones');
  return unwrapList(payload, ['drones', 'fleet'])
    .map(mapFleetDrone)
    .filter((drone): drone is OperatorDrone => Boolean(drone));
}

export async function getFleetDroneApi(droneId: string): Promise<OperatorDrone> {
  const normalizedDroneId = droneId.trim();
  if (!normalizedDroneId) throw new OperatorApiError('Drone ID is required.', 400);

  const payload = await operatorApiRequest<unknown>(
    `/operator/fleet/drones/${encodeURIComponent(normalizedDroneId)}`,
  );
  const drone = mapFleetDrone(payload);
  if (!drone) throw new OperatorApiError('Drone response is invalid.', 500, payload);
  return drone;
}

export async function listFleetBatteriesApi(): Promise<OperatorBattery[]> {
  const payload = await operatorApiRequest<unknown>('/operator/fleet/batteries');
  return unwrapList(payload, ['batteries', 'battery'])
    .map(mapFleetBattery)
    .filter((battery): battery is OperatorBattery => Boolean(battery));
}
