import type { Mission, MissionLeg, MissionStatus, PlannedRelayBattery, PlannedRouteLeg, RouteLegSnapshot, RouteOption, RouteAiExplanation, RouteComparisonVsRecommended, RoutePlanningExplanation, RouteAlternativeExplanation, Tone } from '../types/operator';
import { OperatorApiError, operatorApiRequest } from './orderApi';

export interface MissionHubSummary {
  id: string;
  name: string;
  code?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  totalDrones?: number;
  availableDrones?: number;
}

export interface LiveTrackingDrone {
  id: string;
  missionId: string;
  orderId: string;
  route: string;
  health: 'Normal' | 'Attention' | 'Critical';
  /** Explicit BE status only; never infer the Mission status from GPS metrics. */
  missionStatusRaw?: string;
  /** Optional status fields if BE exposes these in live-tracking. */
  failsafeStatus?: string;
  batterySwapStatus?: string;
  alertId?: string;
  anomaly?: string;
  anomalyDuration?: string;
  battery?: number;
  batteryVoltage?: number;
  signal?: number;
  altitudeM?: number;
  speedKmh?: number;
  detectedAt?: string;
  aiAssessment: string;
  incidentPolicy: 'none' | 'monitor' | 'recommended';
  incidentReason?: string;
  latitude?: number;
  longitude?: number;
  mapPosition: string;
  lastUpdated?: string;
  checkpointsPassed?: number;
  /** GPS history supplied by GET /operator/missions/live-tracking. */
  trail?: MissionTelemetryPoint[];
  weather?: {
    temperature?: number;
    apparentTemperature?: number;
    dewPoint?: number;
    humidity?: number;
    windSpeed?: number;
    windGust?: number;
    windDirection?: number;
    precipitation?: number;
    pressure?: number;
    cloudCover?: number;
  };
}

export interface MissionTelemetryPoint {
  id: string;
  missionId: string;
  recordedAt: string;
  latitude?: number;
  longitude?: number;
  altitudeM?: number;
  speedKmh?: number;
  batteryPct?: number;
  batteryVoltage?: number;
  signalPct?: number;
  energyConsumedWh?: number;
  windSpeed?: number;
  raw: Record<string, unknown>;
}

// export interface HubCheckpoint {
//   id: string;
//   hubId: string;
//   hubName: string;
//   reachedAt?: string;
//   sequence: number;
//   raw: Record<string, unknown>;
// }

export interface HubCheckpoint {
  id: string;
  hubId: string;
  hubName: string;

  /** Hub coordinates from the recorded checkpoint event (hub_latitude, hub_longitude). */

  latitude?: number;
  longitude?: number;
  reachedAt?: string;
  sequence: number;
  raw: Record<string, unknown>;
}

export type IncidentSeverity = 'Critical' | 'Major' | 'Minor';

export interface OperatorIncident {
  id: string;
  missionId: string;
  droneId: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: string;
  detectedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  raw: Record<string, unknown>;
}

export interface MissionPlanningAnalysis {
  routes: RouteOption[];
  /** BE Analyze response-level XAI recommendation details (v8.5). */
  routeExplanation?: RoutePlanningExplanation;
  totalPayloadKg?: number;
  bundledOrderIds?: string[];
  raw: unknown;
}

/** GET /missions/dashboard/active-flights provides an active_count and mission IDs (strings). */
export interface MissionActiveFlightsSnapshot {
  activeCount: number;
  missionIds: string[];
  missions: Mission[];
}

export interface MissionDashboardKpi {
  totalMissions?: number;
  activeMissions?: number;
  scheduledMissions?: number;
  completedMissions?: number;
  cancelledMissions?: number;
  failedMissions?: number;
  readyForPlanning?: number;
  raw: unknown;
}

export interface MissionDashboardStatus {
  scheduled?: number;
  inProgress?: number;
  completed?: number;
  cancelled?: number;
  failed?: number;
  total?: number;
  raw: unknown;
}

export interface CreateMissionInput {
  orderId: string;
  droneId: string;
  routeId: string;
  batteryId: string;
  /** Exact selected Analyze route snapshot accepted by the updated Create Mission schema. */
  routeString: string;
  legDetails: RouteLegSnapshot[];
  distanceKm: number;
  predictedEnergyWh: number;
  predictedDurationMin: number;
  bundledOrderIds?: string[];
}

export interface AnalyzeMissionPlanningInput {
  orderId: string;
  droneId: string;
  batteryId: string;
  bundledOrderIds?: string[];
}

/** Resource recommendation is read-only: unlike /auto-dispatch, it never creates a Mission. */
export interface RecommendDispatchResourcesInput {
  orderId: string;
  bundledOrderIds?: string[];
}

/** BE's descriptive, criteria-based resource selection explanation (not a numeric SHAP score). */
export interface DispatchResourceAlternative {
  id: string;
  label: string;
  reason: string;
  feasible?: boolean;
}

export interface DispatchResourceExplanation {
  selectedId?: string;
  selectedLabel?: string;
  summary?: string;
  reasonsSelected: string[];
  whyNotOthers: DispatchResourceAlternative[];
}

export interface DispatchResourceRecommendation {
  selectedDroneId: string;
  selectedBatteryId: string;
  droneExplanation: DispatchResourceExplanation;
  batteryExplanation: DispatchResourceExplanation;
  /** Preserve BE's per-drone eligible_batteries data without guessing its schema. */
  availableDrones: unknown[];
}

/** Eligible origin-hub battery for the selected drone. API eligibility is authoritative. */
export interface EligibleMissionBattery {
  id: string;
  serialNumber: string;
  model?: string;
  capacityWh?: number;
  chargeLevelPct?: number;
  availableEnergyWh?: number;
  hubId?: string;
  droneId?: string;
  availableStatus?: string;
  /** BE v2 battery flag. Missing for legacy APIs: eligibility is inferred from READY. */
  isSelectable?: boolean;
  unavailableReason?: string;
  assignedMissionId?: string;
  isInstalledOnDrone?: boolean;
}


export interface CreateIncidentInput {
  missionId: string;
  droneId?: string;
  severity: IncidentSeverity;
  title: string;
  description: string;
  detectedAt?: string;
}

export interface UpdateIncidentStatusInput {
  incidentId: string;
  status: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
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

function pickOptionalNumber(record: Record<string, unknown>, keys: string[]) {
  const value = pickNumber(record, keys, Number.NaN);
  return Number.isFinite(value) ? value : undefined;
}

function pickBoolean(record: Record<string, unknown>, keys: string[], fallback = false) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
    }
  }
  return fallback;
}

function pickArray(record: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [];
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

function unwrapArray(payload: unknown, keys: string[]): unknown[] {
  const normalized = parseJsonString(payload);
  if (Array.isArray(normalized)) return normalized;
  if (!isRecord(normalized)) return [];

  const candidateKeys = [
    ...keys,
    'data',
    'items',
    'results',
    'rows',
    'missions',
    'flights',
    'active_flights',
    'activeFlights',
  ];

  for (const key of candidateKeys) {
    const candidate = parseJsonString(normalized[key]);
    if (Array.isArray(candidate)) return candidate;
    if (isRecord(candidate)) {
      const nested = unwrapArray(candidate, keys);
      if (nested.length > 0) return nested;
    }
  }

  const firstArray = Object.values(normalized).find(Array.isArray);
  return Array.isArray(firstArray) ? firstArray : [];
}

function unwrapObject(payload: unknown): Record<string, unknown> {
  const normalized = parseJsonString(payload);
  if (!isRecord(normalized)) return {};

  for (const key of ['data', 'result', 'mission', 'kpi', 'status', 'summary']) {
    const candidate = parseJsonString(normalized[key]);
    if (isRecord(candidate)) return unwrapObject(candidate);
  }

  return normalized;
}

function normalizeIso(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function normalizeMissionStatus(value: unknown): MissionStatus {
  // Operator uses 'Flying' for active missions. The BE may still return legacy or
  // operational aliases; normalize those at the API boundary, not in the UI.
  // A completed destination arrival is treated as Completed here. The BE
  // should eventually return the canonical value `Completed` consistently.
  const status = String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  switch (status) {
    case 'SCHEDULED':
    case 'PENDING_APPROVAL':
    case 'APPROVED':
    case 'AWAITING_PAYMENT':
      return 'Scheduled';
    case 'IN_PROGRESS':
    case 'FLYING':
    case 'ACTIVE':
    case 'ACTIVE_MISSION':
      return 'Flying';
    case 'COMPLETED':
    case 'MISSION_COMPLETED':
    case 'ARRIVAL_COMPLETED':
      return 'Completed';
    case 'FAILED':
    case 'REJECTED':
      return 'Failed';
    default:
      // Do not mislabel legacy `Cancelled` as Failed, or pretend that an
      // unrecognized future status is Scheduled.
      throw new Error(`Unsupported Mission status from API: ${status || '(empty)'}`);
  }
}

function missionTone(status: MissionStatus): Tone {
  if (status === 'Completed') return 'success';
  if (status === 'Flying') return 'warning';
  if (status === 'Failed') return 'danger';
  return 'info';
}

function normalizeRisk(value: unknown): 'Low' | 'Medium' | 'High' {
  const risk = String(value ?? '').trim().toLowerCase();
  if (risk === 'high' || risk === 'critical') return 'High';
  if (risk === 'medium' || risk === 'moderate') return 'Medium';
  return 'Low';
}

function normalizeHealth(value: unknown): LiveTrackingDrone['health'] {
  const health = String(value ?? '').trim().toLowerCase();
  if (health === 'critical' || health === 'danger' || health === 'failed') return 'Critical';
  if (health === 'attention' || health === 'warning' || health === 'alert') return 'Attention';
  return 'Normal';
}

function normalizeIncidentPolicy(value: unknown, health: LiveTrackingDrone['health']): LiveTrackingDrone['incidentPolicy'] {
  const policy = String(value ?? '').trim().toLowerCase();
  if (policy === 'recommended' || policy === 'required' || policy === 'create') return 'recommended';
  if (policy === 'monitor' || policy === 'watch') return 'monitor';
  if (health === 'Critical') return 'recommended';
  if (health === 'Attention') return 'monitor';
  return 'none';
}

function mapHub(raw: unknown): MissionHubSummary {
  const record = asRecord(raw);
  const latitude = pickNumber(record, ['latitude', 'lat'], Number.NaN);
  const longitude = pickNumber(record, ['longitude', 'lng', 'lon'], Number.NaN);
  const totalDrones = pickNumber(record, ['totalDrones', 'total_drones'], Number.NaN);
  const availableDrones = pickNumber(record, ['availableDrones', 'available_drones'], Number.NaN);
  return {
    id: pickString(record, ['id', 'hub_id', 'hubId']),
    name: pickString(record, ['name', 'hub_name', 'hubName'], 'Unnamed Hub'),
    code: pickString(record, ['code', 'hub_code', 'hubCode']) || undefined,
    address: pickString(record, ['address', 'location']) || undefined,
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
    totalDrones: Number.isFinite(totalDrones) ? totalDrones : undefined,
    availableDrones: Number.isFinite(availableDrones) ? availableDrones : undefined,
  };
}

function mapMissionLeg(raw: unknown, index: number, routeLeg?: unknown): MissionLeg {
  const record = asRecord(raw);
  const snapshot = asRecord(routeLeg);
  const rawStatus = pickString(record, ['status'], 'PENDING').toUpperCase();
  const batteryId = pickString(record, ['battery_id', 'batteryId']) || pickString(snapshot, ['battery_id', 'batteryId']);
  return {
    id: pickString(record, ['id', 'leg_id', 'legId'], `LEG-${index + 1}`),
    fromHubId: pickString(record, ['from_hub_id', 'fromHubId', 'origin_hub_id', 'originHubId']) || pickString(snapshot, ['from_hub_id', 'fromHubId']),
    toHubId: pickString(record, ['to_hub_id', 'toHubId', 'destination_hub_id', 'destinationHubId']) || pickString(snapshot, ['to_hub_id', 'toHubId']),
    status: rawStatus === 'COMPLETED' ? 'Completed' : ['IN_PROGRESS', 'FLYING', 'IN_FLIGHT'].includes(rawStatus) ? 'In Progress' : 'Pending',
    legType: pickString(record, ['leg_type', 'legType']) || pickString(snapshot, ['leg_type', 'legType']) || undefined,
    isDispatch: pickOptionalBoolean(record, ['is_dispatch', 'isDispatch']) ??
      pickOptionalBoolean(snapshot, ['is_dispatch', 'isDispatch']) ??
      ((pickString(record, ['leg_type', 'legType']) || pickString(snapshot, ['leg_type', 'legType'])).toUpperCase() === 'DISPATCH'),
    payloadKg: pickOptionalNumber(record, ['payload_kg', 'payloadKg']) ?? pickOptionalNumber(snapshot, ['payload_kg', 'payloadKg']),
    batteryId: batteryId || undefined,
    batteryModel: pickString(record, ['battery_model', 'batteryModel']) || pickString(snapshot, ['battery_model', 'batteryModel']) || undefined,
    batteryChargePct: pickOptionalNumber(record, ['battery_charge_pct', 'batteryChargePct']) ?? pickOptionalNumber(snapshot, ['battery_charge_pct', 'batteryChargePct']),
    batteryEnergyWh: pickOptionalNumber(record, ['battery_energy_wh', 'batteryEnergyWh']) ?? pickOptionalNumber(snapshot, ['battery_energy_wh', 'batteryEnergyWh']),
  };
}

function mapMission(raw: unknown): Mission {
  const record = unwrapObject(raw);
  const scheduledRoute = asRecord(record.scheduled_route ?? record.scheduledRoute);
  // New BE GET Mission Detail may store the snapshot under scheduled_route or top-level.
  const routeRecord = Object.keys(scheduledRoute).length > 0 ? scheduledRoute : record;
  const status = normalizeMissionStatus(record.status);
  const id = pickString(record, ['id', 'mission_id', 'missionId']);
  const orderId = pickString(record, ['order_id', 'orderId']);
  const droneId = pickString(record, ['drone_id', 'droneId']);
  const droneName = pickString(record, ['drone', 'drone_name', 'droneName', 'drone_code'], droneId);
  const routePath = pickString(record, ['route_string', 'route_path_string', 'routePathString']) ||
    pickString(routeRecord, ['route_string', 'routeString', 'route_path_string']);
  const routeId = pickString(record, ['route_id', 'routeId']) || pickString(routeRecord, ['routeId', 'route_id']);
  const routeName = pickString(record, ['route', 'route_name', 'routeName'], routePath || routeId || '—');

  const plannedStartAt = normalizeIso(pickString(record, ['planned_start_at', 'plannedStartAt', 'scheduled_time', 'scheduledTime'])) ?? '';
  const predictedDuration = pickOptionalNumber(routeRecord, ['predictedDurationMin', 'predicted_duration_min', 'duration_min']) ??
    pickOptionalNumber(record, ['predictedDurationMin', 'predicted_duration_min', 'duration_min']);
  const explicitEstimatedArrival = normalizeIso(pickString(record, ['estimated_arrival_at', 'estimatedArrivalAt']));
  const calculatedArrival = plannedStartAt && predictedDuration !== undefined && predictedDuration > 0
    ? new Date(new Date(plannedStartAt).getTime() + predictedDuration * 60_000).toISOString()
    : undefined;
  const estimatedArrivalAt = explicitEstimatedArrival ?? calculatedArrival ?? '';
  const actualStartedAt = normalizeIso(pickString(record, ['actual_started_at', 'actualStartedAt', 'start_time', 'startTime', 'departed_at', 'departedAt']));
  const actualCompletedAt = normalizeIso(pickString(record, ['actual_completed_at', 'actualCompletedAt', 'end_time', 'endTime', 'arrived_at', 'arrivedAt']));
  // Preserve true physical-flight timestamps separately. Mission `start_time`
  // can be set before take-off, so it must not impersonate `departed_at`.
  const flightDepartedAt = normalizeIso(pickString(record, ['departed_at', 'departedAt']));
  const flightArrivedAt = normalizeIso(pickString(record, ['arrived_at', 'arrivedAt']));
  const createdAt = normalizeIso(pickString(record, ['created_at', 'createdAt'])) ?? plannedStartAt;

  const rawLegs = pickArray(record, ['legs_detail', 'legs', 'mission_legs']);
  const plannedLegs = pickArray(routeRecord, ['legs_detail', 'legs']);
  const plannedLegSnapshots = (plannedLegs.length ? plannedLegs : rawLegs)
    .map(mapRouteLegSnapshot)
    .filter((leg): leg is RouteLegSnapshot => leg !== null);
  const legsRecords = rawLegs.length > 0 ? rawLegs : plannedLegs;
  // MissionLeg can hold the operational status while scheduled_route holds the
  // exact assigned battery snapshot. Merge by sequence, never fabricate an ID.
  const legs = legsRecords.map((leg, index) => mapMissionLeg(leg, index, plannedLegs[index]));
  // A DISPATCH leg ends at the order origin, NOT a relay battery-swap Hub.
  const deliveryLegs = legs.filter((leg) => !leg.isDispatch);
  const relayHubIds = deliveryLegs.length > 1
    ? deliveryLegs.slice(0, -1).map((leg) => leg.toHubId).filter(Boolean)
    : pickArray(record, ['relay_hub_ids', 'relayHubIds']).map(String);
  const estimatedArrivalDate = estimatedArrivalAt ? new Date(estimatedArrivalAt) : undefined;
  const eta = pickString(record, ['eta']) || (
    estimatedArrivalDate && !Number.isNaN(estimatedArrivalDate.getTime())
      ? estimatedArrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '—'
  );

  const predictedEnergy = pickOptionalNumber(routeRecord, ['predictedEnergyWh', 'predicted_energy_wh', 'estimated_energy_wh', 'energy_wh']) ??
    pickOptionalNumber(record, ['predictedEnergyWh', 'predicted_energy_wh', 'estimated_energy_wh', 'energy_wh']);
  const batteryUse = pickOptionalNumber(routeRecord, ['batteryConsumptionPct', 'battery_consumption_pct']) ??
    pickOptionalNumber(record, ['batteryConsumptionPct', 'battery_consumption_pct']);
  const batteryRemaining = pickOptionalNumber(routeRecord, ['remainingBatteryPct', 'remaining_battery_pct', 'predicted_remaining_battery_pct']) ??
    pickOptionalNumber(record, ['remainingBatteryPct', 'remaining_battery_pct', 'predicted_remaining_battery_pct', 'battery_pct']);
  const riskRaw = pickString(routeRecord, ['risk', 'risk_level']) || pickString(record, ['risk', 'risk_level']);

  return {
    id, orderId,
    bundledOrderIds: pickArray(record, ['bundled_order_ids', 'bundledOrderIds'])
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0 && item !== orderId),
    totalOrdersCount: pickOptionalNumber(record, ['total_orders_count', 'totalOrdersCount']),
    payloadWeightKg: pickOptionalNumber(record, ['payload_weight', 'payloadWeight', 'total_payload_kg', 'totalPayloadKg']),
    type: 'Delivery',
    name: pickString(record, ['name', 'mission_name', 'missionName'], `Delivery ${orderId || id}`),
    droneId, batteryId: pickString(record, ['battery_id', 'batteryId', 'assignedBatteryId']) || undefined, drone: droneName,
    originHubId: pickString(record, ['origin_hub_id', 'originHubId']),
    destinationHubId: pickString(record, ['destination_hub_id', 'destinationHubId']),
    relayHubIds, legs, plannedRouteLegs: plannedLegSnapshots, routeId, route: routeName,
    status, tone: missionTone(status), eta,
    // NaN is a missing-metric sentinel; UI must display —, never invented 0%/0 Wh.
    battery: batteryRemaining ?? Number.NaN,
    plannedStartAt,
    packageReceiveDeadlineAt: normalizeIso(pickString(record, ['package_receive_deadline_at', 'packageReceiveDeadlineAt'])),
    actualStartedAt, actualCompletedAt, flightDepartedAt, flightArrivedAt, estimatedArrivalAt,
    predictedDurationMin: predictedDuration ?? Number.NaN,
    estimatedEnergyWh: predictedEnergy ?? Number.NaN,
    batteryConsumptionPct: batteryUse ?? Number.NaN,
    confidencePct: pickOptionalNumber(routeRecord, ['confidencePct', 'confidence_pct']) ??
      pickOptionalNumber(record, ['confidencePct', 'confidence_pct']),
    risk: riskRaw ? normalizeRisk(riskRaw) : undefined,
    createdAt,
  };
}

function mapLiveDrone(raw: unknown, index: number): LiveTrackingDrone {
  const record = asRecord(raw);
  const telemetry = isRecord(record.telemetry) ? record.telemetry : record;
  const health = normalizeHealth(record.health ?? record.health_status ?? record.alert_level);
  // New Live Tracking schema has top-level latest_lat/latest_lng, which must
  // override any older nested telemetry. Never derive marker GPS from the route.
  const liveLat = pickNumber(record, ['latest_lat', 'latestLat'], Number.NaN);
  const liveLng = pickNumber(record, ['latest_lng', 'latestLng'], Number.NaN);
  const latitude = Number.isFinite(liveLat)
    ? liveLat : pickNumber(telemetry, ['latitude', 'lat', 'latest_lat', 'latestLat'], Number.NaN);
  const longitude = Number.isFinite(liveLng)
    ? liveLng : pickNumber(telemetry, ['longitude', 'lng', 'lon', 'latest_lng', 'latestLng'], Number.NaN);
  const missionId = pickString(record, ['mission_id', 'missionId']);
  const trail = pickArray(record, ['trail'])
    .map((point, pointIndex) => mapTelemetryPoint(point, pointIndex, missionId))
    .filter(point => point.latitude !== undefined && point.longitude !== undefined);
  return {
    id: pickString(record, ['drone_id', 'droneId', 'id', 'drone'], `DR-${index + 1}`),
    missionId,
    orderId: pickString(record, ['order_id', 'orderId']),
    route: pickString(record, ['route', 'route_name', 'routeName', 'route_id', 'routeId'], 'Active route'),
    health,
    missionStatusRaw: pickString(record, ['mission_status', 'missionStatus', 'status']) || undefined,
    failsafeStatus: pickString(record, ['failsafe_status', 'failsafeStatus']) || undefined,
    batterySwapStatus: pickString(record, ['battery_swap_status', 'batterySwapStatus']) || undefined,
    alertId: pickString(record, ['alert_id', 'alertId']) || undefined,
    anomaly: pickString(record, ['anomaly', 'alert', 'issue']) || undefined,
    anomalyDuration: pickString(record, ['anomaly_duration', 'anomalyDuration', 'duration']) || undefined,
    battery: pickOptionalNumber(telemetry, ['battery_pct', 'battery', 'battery_level', 'batteryLevel']),
    batteryVoltage: pickOptionalNumber(telemetry, ['latest_battery_voltage', 'latestBatteryVoltage', 'battery_voltage', 'batteryVoltage']),
    signal: pickOptionalNumber(telemetry, ['signal_pct', 'signal', 'signal_strength', 'signalStrength']),
    altitudeM: pickOptionalNumber(telemetry, ['latest_altitude', 'latestAltitude', 'altitude_m', 'altitude', 'altitudeM']),
    // LIVE_TRACKING_API.md: latest_speed is in m/s; show km/h in Operator.
    speedKmh: (() => {
      const explicitKmh = pickOptionalNumber(telemetry, ['speed_kmh', 'speedKmh']);
      if (explicitKmh !== undefined) return explicitKmh;
      const explicitMps = pickOptionalNumber(telemetry, ['latest_speed', 'latestSpeed', 'speed_mps', 'speedMps']);
      if (explicitMps !== undefined) return explicitMps * 3.6;
      const legacy = pickOptionalNumber(telemetry, ['speed']);
      if (legacy === undefined) return undefined;
      return import.meta.env.VITE_OPERATOR_TELEMETRY_SPEED_UNIT === 'kmh' ? legacy : legacy * 3.6;
    })(),
    detectedAt: pickString(record, ['detected_at', 'detectedAt', 'updated_at', 'updatedAt', 'last_updated', 'lastUpdated']) || undefined,
    aiAssessment: pickString(record, ['ai_assessment', 'aiAssessment', 'assessment'], ''),
    incidentPolicy: normalizeIncidentPolicy(record.incident_policy ?? record.incidentPolicy, health),
    incidentReason: pickString(record, ['incident_reason', 'incidentReason', 'reason']) || undefined,
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
    lastUpdated: normalizeIso(pickString(record, ['last_updated', 'lastUpdated'])) ?? undefined,
    checkpointsPassed: pickOptionalNumber(record, ['checkpoints_passed', 'checkpointsPassed']),
    trail,
    weather: {
      temperature: pickOptionalNumber(record, ['weather_temperature']),
      apparentTemperature: pickOptionalNumber(record, ['weather_apparent_temp']),
      dewPoint: pickOptionalNumber(record, ['weather_dew_point']),
      humidity: pickOptionalNumber(record, ['weather_humidity']),
      windSpeed: pickOptionalNumber(record, ['weather_wind_speed']),
      windGust: pickOptionalNumber(record, ['weather_wind_gust']),
      windDirection: pickOptionalNumber(record, ['weather_wind_direction']),
      precipitation: pickOptionalNumber(record, ['weather_precipitation']),
      pressure: pickOptionalNumber(record, ['weather_pressure']),
      cloudCover: pickOptionalNumber(record, ['weather_cloud_cover']),
    },
    mapPosition: `pos-${(index % 12) + 1}`,
  };
}

function mapTelemetryPoint(raw: unknown, index: number, missionId: string): MissionTelemetryPoint {
  const record = asRecord(raw);
  const latitude = pickNumber(record, ['latitude', 'lat'], Number.NaN);
  const longitude = pickNumber(record, ['longitude', 'lng', 'lon'], Number.NaN);
  const altitude = pickNumber(record, ['altitude_m', 'altitude', 'altitudeM'], Number.NaN);
  const explicitKmh = pickOptionalNumber(record, ['speed_kmh', 'speedKmh']);
  const explicitMps = pickOptionalNumber(record, ['speed_mps', 'speedMps']);
  const genericSpeed = pickOptionalNumber(record, ['speed']);
  const speed = explicitKmh ?? (explicitMps !== undefined ? explicitMps * 3.6 :
    genericSpeed === undefined ? undefined :
      import.meta.env.VITE_OPERATOR_TELEMETRY_SPEED_UNIT === 'kmh' ? genericSpeed : genericSpeed * 3.6);
  const battery = pickNumber(record, ['battery_pct', 'batteryPct', 'battery', 'battery_level'], Number.NaN);
  const batteryVoltage = pickNumber(record, ['battery_voltage', 'batteryVoltage'], Number.NaN);
  const signal = pickNumber(record, ['signal_pct', 'signal', 'signal_strength'], Number.NaN);
  const energyConsumedWh = pickNumber(record, ['energy_consumed_wh', 'energyConsumedWh'], Number.NaN);
  const windSpeed = pickNumber(record, ['wind_speed', 'windSpeed'], Number.NaN);
  return {
    id: pickString(record, ['id', 'telemetry_id', 'telemetryId'], `${missionId}-${index + 1}`),
    missionId: pickString(record, ['mission_id', 'missionId'], missionId),
    recordedAt: normalizeIso(pickString(record, ['recorded_at', 'timestamp', 'created_at', 'time'])) ?? '',
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
    altitudeM: Number.isFinite(altitude) ? altitude : undefined,
    speedKmh: speed !== undefined && Number.isFinite(speed) ? speed : undefined,
    batteryPct: Number.isFinite(battery) && battery >= 0 && battery <= 100 ? battery : undefined,
    batteryVoltage: Number.isFinite(batteryVoltage) ? batteryVoltage : undefined,
    signalPct: Number.isFinite(signal) ? signal : undefined,
    energyConsumedWh: Number.isFinite(energyConsumedWh) ? energyConsumedWh : undefined,
    windSpeed: Number.isFinite(windSpeed) ? windSpeed : undefined,
    raw: record,
  };
}

function mapCheckpoint(raw: unknown, index: number): HubCheckpoint {
  const record = asRecord(raw);
  return {
    id: pickString(record, ['id', 'checkpoint_id', 'checkpointId'], `CHK-${index + 1}`),
    hubId: pickString(record, ['hub_id', 'hubId']),
    hubName: pickString(record, ['hub_name', 'hubName', 'name'], 'Hub'),
    latitude: pickOptionalNumber(record, ['hub_latitude', 'hubLatitude']),
    longitude: pickOptionalNumber(record, ['hub_longitude', 'hubLongitude']),
    reachedAt: normalizeIso(pickString(record, ['reached_at', 'arrived_at', 'created_at', 'timestamp', 'passed_at', 'passedAt'])),
    sequence: pickNumber(record, ['sequence', 'sequence_no', 'order', 'checkpoint_order', 'checkpointOrder'], index + 1),
    raw: record,
  };
}

function normalizeSeverity(value: unknown): IncidentSeverity {
  const severity = String(value ?? '').trim().toLowerCase();
  if (severity === 'critical' || severity === 'high') return 'Critical';
  if (severity === 'minor' || severity === 'low') return 'Minor';
  return 'Major';
}

function mapIncident(raw: unknown): OperatorIncident {
  const record = unwrapObject(raw);
  const description = pickString(record, ['description', 'detail', 'message']);
  const derivedTitle = description.split(/\r?\n/, 1)[0]?.trim();
  return {
    id: pickString(record, ['id', 'incident_id', 'incidentId']),
    missionId: pickString(record, ['mission_id', 'missionId']),
    droneId: pickString(record, ['drone_id', 'droneId', 'aircraft_id', 'aircraftId']),
    title: pickString(record, ['title', 'incident_title', 'name'], derivedTitle || 'Technical incident'),
    description,
    severity: normalizeSeverity(record.severity ?? record.level),
    status: pickString(record, ['status', 'state'], 'OPEN'),
    detectedAt: normalizeIso(pickString(record, ['detected_at', 'detectedAt', 'reported_at', 'reportedAt'])),
    createdAt: normalizeIso(pickString(record, ['created_at', 'createdAt', 'reported_at', 'reportedAt'])),
    updatedAt: normalizeIso(pickString(record, ['updated_at', 'updatedAt'])),
    raw: record,
  };
}

/** Unknown is deliberately different from false, especially for relay validation. */
function pickOptionalBoolean(record: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    if (record[key] === true || record[key] === 'true') return true;
    if (record[key] === false || record[key] === 'false') return false;
  }
  return undefined;
}

function mapRouteLeg(raw: unknown): PlannedRouteLeg {
  const record = asRecord(raw);
  return {
    fromHubId: pickString(record, ['from_hub_id', 'fromHubId', 'origin_hub_id', 'originHubId']),
    toHubId: pickString(record, ['to_hub_id', 'toHubId', 'destination_hub_id', 'destinationHubId']),
    predictedEnergyWh: pickOptionalNumber(record, ['energy_wh', 'predicted_energy_wh', 'predictedEnergyWh']),
    endingSocPct: pickOptionalNumber(record, ['remaining_battery_pct', 'remainingBatteryPct', 'ending_soc_pct', 'endingSocPct', 'battery_after_pct', 'batteryAfterPct']),
    batteryId: pickString(record, ['battery_id', 'batteryId']) || undefined,
    batteryModel: pickString(record, ['battery_model', 'batteryModel']) || undefined,
    batteryChargePct: pickOptionalNumber(record, ['battery_charge_pct', 'batteryChargePct']),
    batteryEnergyWh: pickOptionalNumber(record, ['battery_energy_wh', 'batteryEnergyWh']),
    batteryCapacityWh: pickOptionalNumber(record, ['battery_capacity_wh', 'batteryCapacityWh']),
    batteryConsumptionPct: pickOptionalNumber(record, ['battery_consumption_pct', 'batteryConsumptionPct']),
    minimumReservePct: pickOptionalNumber(record, ['minimum_reserve_pct', 'minimumReservePct']),
    feasible: (() => {
      const feasible = pickOptionalBoolean(record, ['feasible', 'is_feasible', 'isFeasible']);
      const selectable = pickOptionalBoolean(record, ['is_selectable', 'isSelectable']);
      return feasible === false || selectable === false ? false : feasible ?? selectable;
    })(),
  };
}

function mapRelayBattery(raw: unknown): PlannedRelayBattery {
  const record = asRecord(raw);
  return {
    hubId: pickString(record, ['hub_id', 'hubId', 'relay_hub_id', 'relayHubId']),
    batteryModel: pickString(record, ['selected_battery_model', 'selectedBatteryModel', 'battery_model', 'batteryModel']) || undefined,
    requiredBatteryCount: pickOptionalNumber(record, ['required_battery_count', 'requiredBatteryCount']),
    availableBatteryCount: pickOptionalNumber(record, ['ready_count', 'readyCount', 'available_battery_count', 'availableBatteryCount']),
    batteryIds: pickArray(record, ['battery_ids', 'batteryIds']).map(String),
    swapBatteryId: pickString(record, ['swap_battery_id', 'swapBatteryId', 'selected_battery_id', 'selectedBatteryId']) || undefined,
    selectedBatteryModel: pickString(record, ['selected_battery_model', 'selectedBatteryModel']) || undefined,
    selectedBatteryChargePct: pickOptionalNumber(record, ['selected_battery_charge_pct', 'selectedBatteryChargePct']),
    selectedBatteryEnergyWh: pickOptionalNumber(record, ['selected_battery_energy_wh', 'selectedBatteryEnergyWh']),
    selectedBatteryCapacityWh: pickOptionalNumber(record, ['selected_battery_capacity_wh', 'selectedBatteryCapacityWh']),
    ready: pickOptionalBoolean(record, ['feasible', 'ready', 'verified', 'is_ready', 'isReady']),
  };
}

function mapRouteLegSnapshot(raw: unknown): RouteLegSnapshot | null {
  const item = asRecord(raw);
  const from = pickString(item, ['from_hub_code', 'fromHubCode']);
  const to = pickString(item, ['to_hub_code', 'toHubCode']);
  const distance = pickOptionalNumber(item, ['distance_km', 'distanceKm']);
  if (!from || !to || distance === undefined) return null;
  return {
    from_hub_code: from,
    to_hub_code: to,
    distance_km: distance,
    leg_type: pickString(item, ['leg_type', 'legType']) || undefined,
    is_dispatch: pickOptionalBoolean(item, ['is_dispatch', 'isDispatch']),
    payload_kg: pickOptionalNumber(item, ['payload_kg', 'payloadKg']),
    from_latitude: pickOptionalNumber(item, ['from_latitude', 'fromLatitude']),
    from_longitude: pickOptionalNumber(item, ['from_longitude', 'fromLongitude']),
    to_latitude: pickOptionalNumber(item, ['to_latitude', 'toLatitude']),
    to_longitude: pickOptionalNumber(item, ['to_longitude', 'toLongitude']),
    sequence_no: pickOptionalNumber(item, ['sequence_no', 'sequenceNo']),
    from_hub_id: pickOptionalNumber(item, ['from_hub_id', 'fromHubId']),
    to_hub_id: pickOptionalNumber(item, ['to_hub_id', 'toHubId']),
    from_hub_name: pickString(item, ['from_hub_name', 'fromHubName']) || undefined,
    to_hub_name: pickString(item, ['to_hub_name', 'toHubName']) || undefined,
    battery_id: pickString(item, ['battery_id', 'batteryId']) || undefined,
    battery_serial: pickString(item, ['battery_serial', 'batterySerial']) || undefined,
    battery_model: pickString(item, ['battery_model', 'batteryModel']) || undefined,
    battery_capacity_wh: pickOptionalNumber(item, ['battery_capacity_wh', 'batteryCapacityWh']),
    battery_charge_pct: pickOptionalNumber(item, ['battery_charge_pct', 'batteryChargePct']),
    battery_energy_wh: pickOptionalNumber(item, ['battery_energy_wh', 'batteryEnergyWh']),
    energy_wh: pickOptionalNumber(item, ['energy_wh', 'energyWh']),
    battery_consumption_pct: pickOptionalNumber(item, ['battery_consumption_pct', 'batteryConsumptionPct']),
    remaining_battery_pct: pickOptionalNumber(item, ['remaining_battery_pct', 'remainingBatteryPct']),
  };
}

/** Only finite, numeric SHAP values are plotted; absent/null values stay absent. */
function mapRouteShapValues(raw: unknown): Record<string, number> | undefined {
  if (!isRecord(raw)) return undefined;
  const numeric = Object.entries(raw).filter((entry): entry is [string, number] =>
    typeof entry[1] === 'number' && Number.isFinite(entry[1]));
  return numeric.length ? Object.fromEntries(numeric) : undefined;
}

function mapRouteAiExplanation(raw: unknown): RouteAiExplanation | undefined {
  if (!isRecord(raw)) return undefined;
  return {
    flightSpeedMps: pickOptionalNumber(raw, ['flight_speed_mps', 'flightSpeedMps']),
    flightSpeedKmh: pickOptionalNumber(raw, ['flight_speed_kmh', 'flightSpeedKmh']),
    totalEnergyWh: pickOptionalNumber(raw, ['total_energy_wh', 'totalEnergyWh']),
    summary: pickString(raw, ['summary']) || undefined,
    featureContributions: pickArray(raw, ['feature_contributions', 'featureContributions']),
    legsBreakdown: pickArray(raw, ['legs_breakdown', 'legsBreakdown']),
  };
}

/** BE v8.5 optional, snake_case and camelCase response compatibility. */
function mapRouteComparison(raw: unknown): RouteComparisonVsRecommended | undefined {
  if (!isRecord(raw)) return undefined;
  return {
    deltaDistanceKm: pickOptionalNumber(raw, ['delta_distance_km', 'deltaDistanceKm']),
    deltaDurationMin: pickOptionalNumber(raw, ['delta_duration_min', 'deltaDurationMin']),
    deltaEnergyWh: pickOptionalNumber(raw, ['delta_energy_wh', 'deltaEnergyWh']),
    sameHubPath: pickOptionalBoolean(raw, ['same_hub_path', 'sameHubPath']),
    differenceSummary: pickString(raw, ['difference_summary', 'differenceSummary']) || undefined,
  };
}

function mapRoutePlanningExplanation(raw: unknown): RoutePlanningExplanation | undefined {
  if (!isRecord(raw)) return undefined;
  const alternatives: RouteAlternativeExplanation[] = pickArray(raw, ['why_not_others', 'whyNotOthers'])
    .map(asRecord)
    .map((item) => ({
      id: pickString(item, ['id', 'route_id', 'routeId']),
      label: pickString(item, ['label']) || undefined,
      feasible: pickOptionalBoolean(item, ['feasible', 'is_feasible', 'isFeasible']),
      reason: pickString(item, ['reason']) || undefined,
    }))
    .filter((item) => Boolean(item.id));
  return {
    selectedId: pickString(raw, ['selected_id', 'selectedId']) || undefined,
    selectedLabel: pickString(raw, ['selected_label', 'selectedLabel']) || undefined,
    summary: pickString(raw, ['summary']) || undefined,
    reasonsSelected: pickArray(raw, ['reasons_selected', 'reasonsSelected'])
      .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
      .map((value) => value.trim()),
    whyNotOthers: alternatives,
  };
}

function mapRouteOption(raw: unknown, index: number): RouteOption {
  const record = asRecord(raw);
  const legRecords = pickArray(record, ['legs_detail', 'legsDetail', 'legs', 'route_legs', 'routeLegs']);
  const legDetails = legRecords.map(mapRouteLegSnapshot).filter((leg): leg is RouteLegSnapshot => Boolean(leg));
  // relayHubs is an array of NAMES in BE's new response, not IDs.
  // Use intermediate leg.to_hub_id instead, so Hub + Battery lookups work.
  const deliveryLegs = legRecords.filter((leg) => {
    const record = asRecord(leg);
    return pickString(record, ['leg_type', 'legType']).toUpperCase() !== 'DISPATCH' &&
      !pickBoolean(record, ['is_dispatch', 'isDispatch']);
  });
  const derivedRelayIds = deliveryLegs.length > 1
    ? deliveryLegs.slice(0, -1).map((leg) => pickString(asRecord(leg), ['to_hub_id', 'toHubId'])).filter(Boolean)
    : [];
  const explicitRelayIds = pickArray(record, ['relay_hub_ids', 'relayHubIds']).map((hub) =>
    isRecord(hub) ? pickString(hub, ['id', 'hub_id', 'hubId']) : String(hub),
  ).filter(Boolean);
  const relayHubIds = derivedRelayIds.length ? derivedRelayIds : explicitRelayIds;

  const reasons = pickArray(record, ['recommendation_reasons', 'recommendationReasons', 'reasons']).map(String);
  const reason = pickString(record, ['reason']);
  if (reason) reasons.push(reason);
  const relayBatteryStatus = pickArray(record, ['relay_battery_status', 'relayBatteryStatus']);
  const detailedPlan = pickArray(record, ['relay_battery_plan', 'relayBatteryPlan']);
  const routeString = pickString(record, ['route_string', 'routeString']);
  return {
    id: pickString(record, ['route_id', 'routeId', 'id'], `ROUTE-${index + 1}`),
    name: pickString(record, ['route_name', 'routeName', 'name'], routeString || `Route ${index + 1}`),
    routeString,
    legDetails,
    distanceKm: pickNumber(record, ['distance_km', 'distanceKm', 'distance']),
    predictedDurationMin: pickNumber(record, ['predicted_duration_min', 'predictedDurationMin', 'duration_min']),
    predictedEnergyWh: pickNumber(record, ['predicted_energy_wh', 'predictedEnergyWh', 'estimated_energy_wh', 'energy_wh']),
    batteryConsumptionPct: pickNumber(record, ['battery_consumption_pct', 'batteryConsumptionPct', 'battery_use_pct']),
    confidencePct: pickNumber(record, ['confidence_pct', 'confidencePct', 'confidence'], 0),
    risk: normalizeRisk(record.risk_level ?? record.risk),
    weatherImpact: pickString(record, ['weather_impact', 'weatherImpact']),
    relayHubIds,
    relayStopMinutes: pickNumber(record, ['relay_stop_minutes', 'relayStopMinutes'], Number.NaN),
    feasible: pickOptionalBoolean(record, ['feasible', 'is_feasible', 'isFeasible']),
    isSelectable: pickOptionalBoolean(record, ['is_selectable', 'isSelectable']),
    infeasibleReason: pickString(record, ['infeasible_reason', 'infeasibleReason']) || undefined,
    unselectableReason: pickString(record, ['unselectable_reason', 'unselectableReason']) || undefined,
    shapValues: mapRouteShapValues(record.shap_values ?? record.shapValues),
    flightSpeedMps: pickOptionalNumber(record, ['flight_speed_mps', 'flightSpeedMps']),
    speedProfileLabel: pickString(record, ['speed_profile_label', 'speedProfileLabel']) || undefined,
    strategyCode: pickString(record, ['strategy_code', 'strategyCode']) || undefined,
    displayTitle: pickString(record, ['display_title', 'displayTitle']) || undefined,
    corridorType: pickString(record, ['corridor_type', 'corridorType']) || undefined,
    differentiatorTag: pickString(record, ['differentiator_tag', 'differentiatorTag']) || undefined,
    comparisonVsRecommended: mapRouteComparison(record.comparison_vs_recommended ?? record.comparisonVsRecommended),
    aiExplanation: mapRouteAiExplanation(record.ai_explanation ?? record.aiExplanation),
    legs: legRecords.map(mapRouteLeg),
    relayBatteryPlan: (detailedPlan.length > 0 ? detailedPlan : relayBatteryStatus).map(mapRelayBattery),
    rawRelayBatteryStatus: relayBatteryStatus,
    batteryPlanId: pickString(record, ['battery_plan_id', 'batteryPlanId']) || undefined,
    recommended: pickBoolean(record, ['recommended', 'is_recommended', 'isRecommended']),
    recommendationReasons: reasons,
    tradeOff: pickString(record, ['trade_off', 'tradeOff'], ''),
  };
}

function mapMissionDashboardKpi(payload: unknown): MissionDashboardKpi {
  const rows = unwrapArray(payload, ['kpi', 'metrics']);
  const record = rows.length > 0 ? asRecord(rows[0]) : unwrapObject(payload);
  return {
    totalMissions: pickOptionalNumber(record, ['total_missions', 'totalMissions', 'total']),
    activeMissions: pickOptionalNumber(record, ['active_missions', 'activeMissions', 'active', 'flying_missions', 'flying', 'FLYING', 'in_progress', 'inProgress']),
    scheduledMissions: pickOptionalNumber(record, ['scheduled_missions', 'scheduledMissions', 'scheduled']),
    completedMissions: pickOptionalNumber(record, ['completed_missions', 'completedMissions', 'completed']),
    cancelledMissions: pickOptionalNumber(record, ['cancelled_missions', 'canceled_missions', 'cancelledMissions', 'canceledMissions', 'cancelled', 'canceled']),
    failedMissions: pickOptionalNumber(record, ['failed_missions', 'failedMissions', 'failed', 'rejected']),
    readyForPlanning: pickOptionalNumber(record, ['ready_for_planning', 'readyForPlanning', 'pending_requests', 'pendingRequests']),
    raw: payload,
  };
}

function mapMissionDashboardStatus(payload: unknown): MissionDashboardStatus {
  const record = unwrapObject(payload);
  const statusBreakdown = isRecord(record.status_breakdown)
    ? record.status_breakdown
    : isRecord(record.statusBreakdown)
      ? record.statusBreakdown
      : {};
  const rows = unwrapArray(payload, ['statuses', 'status_counts', 'statusCounts']);
  const result: MissionDashboardStatus = {
    scheduled: pickOptionalNumber(record, ['scheduled', 'SCHEDULED']),
    inProgress: pickOptionalNumber(record, ['flying', 'FLYING', 'in_progress', 'inProgress', 'IN_PROGRESS', 'active']),
    completed: pickOptionalNumber(record, ['completed', 'COMPLETED']),
    cancelled: pickOptionalNumber(record, ['cancelled', 'canceled', 'CANCELLED', 'CANCELED']),
    failed: pickOptionalNumber(record, ['failed', 'FAILED']),
    total: pickOptionalNumber(record, ['total', 'total_missions', 'totalMissions']),
    raw: payload,
  };

  const applyStatusCount = (statusValue: string, count: number | undefined) => {
    if (count === undefined) return;
    const status = statusValue.trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (status === 'SCHEDULED' || status === 'PENDING_APPROVAL' || status === 'APPROVED' || status === 'AWAITING_PAYMENT') result.scheduled = count;
    else if (status === 'IN_PROGRESS' || status === 'ACTIVE' || status === 'FLYING' || status === 'ACTIVE_MISSION') result.inProgress = count;
    else if (status === 'COMPLETED' || status === 'MISSION_COMPLETED' || status === 'ARRIVAL_COMPLETED') result.completed = count;
    else if (status === 'CANCELLED' || status === 'CANCELED') result.cancelled = count;
    else if (status === 'FAILED' || status === 'REJECTED') result.failed = count;
  };

  for (const [key, value] of Object.entries(record)) {
    const count = typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() && Number.isFinite(Number(value))
        ? Number(value)
        : undefined;
    applyStatusCount(key, count);
  }

  for (const [key, value] of Object.entries(statusBreakdown)) {
    const count = typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() && Number.isFinite(Number(value))
        ? Number(value)
        : undefined;
    applyStatusCount(key, count);
  }

  for (const row of rows) {
    const item = asRecord(row);
    applyStatusCount(
      pickString(item, ['status', 'name', 'key']),
      pickOptionalNumber(item, ['count', 'value', 'total', 'missions']),
    );
  }

  if (result.total === undefined) {
    const values = [result.scheduled, result.inProgress, result.completed, result.cancelled, result.failed];
    if (values.some((value) => value !== undefined)) {
      result.total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    }
  }

  return result;
}

/**
 * Preserve the usable Mission list when old BE records contain statuses
 * outside the four-status UI contract. Never silently recast them as another
 * official status; skip and log only those incompatible records.
 */
function mapMissionCollection(items: unknown[]): Mission[] {
  const missions: Mission[] = [];
  const skippedStatuses = new Set<string>();
  for (const item of items) {
    try {
      const mission = mapMission(item);
      if (mission.id) missions.push(mission);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Unsupported Mission status from API:')) {
        skippedStatuses.add(error.message.replace('Unsupported Mission status from API: ', ''));
        continue;
      }
      throw error;
    }
  }
  if (skippedStatuses.size > 0) {
    console.warn(
      '[Operator] Skipped mission records with unsupported statuses:',
      Array.from(skippedStatuses).join(', '),
      '— these statuses need review.',
    );
  }
  if (items.length > 0 && missions.length === 0 && skippedStatuses.size > 0) {
    throw new Error(`No missions with supported statuses were found: ${Array.from(skippedStatuses).join(', ')}`);
  }
  return missions;
}

export async function listMissionsApi(): Promise<Mission[]> {
  const payload = await operatorApiRequest<unknown>('/missions/');
  return mapMissionCollection(unwrapArray(payload, ['missions']));
}

export async function getMissionDashboardKpiApi(): Promise<MissionDashboardKpi> {
  const payload = await operatorApiRequest<unknown>('/missions/dashboard/kpi');
  return mapMissionDashboardKpi(payload);
}

export async function getMissionDashboardStatusApi(): Promise<MissionDashboardStatus> {
  const payload = await operatorApiRequest<unknown>('/missions/dashboard/status');
  return mapMissionDashboardStatus(payload);
}

export async function getMissionActiveFlightsApi(): Promise<MissionActiveFlightsSnapshot> {
  const payload = await operatorApiRequest<unknown>('/missions/dashboard/active-flights');
  const root = unwrapObject(payload);
  const items = unwrapArray(payload, ['missions', 'active_flights', 'activeFlights', 'flights']);
  const missionIds = items
    .map((item) => typeof item === 'string' ? item : pickString(asRecord(item), ['id', 'mission_id', 'missionId']))
    .filter(Boolean);
  // Swagger declares missions: string[]. Do not parse a string as a full Mission object.
  const missions = mapMissionCollection(items.filter(isRecord));
  return {
    activeCount: pickOptionalNumber(root, ['active_count', 'activeCount']) ?? missionIds.length,
    missionIds,
    missions,
  };
}

export async function listMissionHubsApi(): Promise<MissionHubSummary[]> {
  const payload = await operatorApiRequest<unknown>('/operator/missions/hubs');
  return unwrapArray(payload, ['hubs']).map(mapHub).filter((hub) => hub.id);
}

export async function listMissionMiniHubsApi(): Promise<MissionHubSummary[]> {
  const payload = await operatorApiRequest<unknown>('/operator/missions/mini-hubs');
  return unwrapArray(payload, ['mini_hubs', 'miniHubs', 'hubs']).map(mapHub).filter((hub) => hub.id);
}

export async function getLiveTrackingApi(): Promise<LiveTrackingDrone[]> {
  const payload = await operatorApiRequest<unknown>('/operator/missions/live-tracking');
  return unwrapArray(payload, ['drones', 'aircraft', 'missions', 'live_tracking', 'liveTracking'])
    .map(mapLiveDrone);
}

export async function getMissionApi(missionId: string): Promise<Mission> {
  const normalizedMissionId = missionId.trim();
  if (!normalizedMissionId) throw new Error('Mission ID is required.');
  const payload = await operatorApiRequest<unknown>(
    `/operator/missions/${encodeURIComponent(normalizedMissionId)}`,
  );
  return mapMission(payload);
}

/**
 * Producer-side endpoint for the drone/simulator/telemetry collector.
 * Operator UI does not call this automatically; it is exposed here for simulator integration.
 */
export async function collectMissionTelemetryApi(
  missionId: string,
  telemetry: Record<string, unknown> | Array<Record<string, unknown>>,
) {
  if (!missionId.trim()) throw new Error('Mission ID is required.');
  return operatorApiRequest<unknown>(
    `/operator/missions/${encodeURIComponent(missionId.trim())}/telemetry`,
    { method: 'POST', body: JSON.stringify(Array.isArray(telemetry) ? telemetry : [telemetry]) },
  );
}

export async function getMissionTelemetryApi(
  missionId: string,
  pagination?: { limit?: number; offset?: number },
): Promise<MissionTelemetryPoint[]> {
  if (!missionId.trim()) return [];
  const query = new URLSearchParams();
  if (pagination?.limit !== undefined) query.set('limit', String(Math.min(5000, Math.max(1, Math.round(pagination.limit)))));
  if (pagination?.offset !== undefined) query.set('offset', String(Math.max(0, Math.round(pagination.offset))));
  const queryString = query.toString();
  const suffix = queryString ? `?${queryString}` : '';
  const payload = await operatorApiRequest<unknown>(
    `/operator/missions/${encodeURIComponent(missionId.trim())}/telemetry${suffix}`,
  );
  return unwrapArray(payload, ['telemetry', 'points', 'history']).map((item, index) =>
    mapTelemetryPoint(item, index, missionId),
  );
}

/** Read every recorded telemetry page for the selected mission; never silently truncate logs. */
export async function getAllMissionTelemetryApi(missionId: string): Promise<MissionTelemetryPoint[]> {
  if (!missionId.trim()) return [];
  const pageSize = 5000; // Maximum documented by GET /telemetry.
  const points: MissionTelemetryPoint[] = [];
  // Explicit guard against a broken API returning a full identical page forever.
  for (let page = 0; page < 1000; page++) {
    const batch = await getMissionTelemetryApi(missionId, { limit: pageSize, offset: points.length });
    points.push(...batch);
    if (batch.length < pageSize) return points;
  }
  throw new Error('Telemetry exceeded the supported pagination safety limit; data was not silently truncated.');
}

export async function getMissionHubCheckpointsApi(missionId: string): Promise<HubCheckpoint[]> {
  if (!missionId.trim()) return [];
  const payload = await operatorApiRequest<unknown>(
    `/operator/missions/${encodeURIComponent(missionId.trim())}/hub-checkpoints`,
  );
  return unwrapArray(payload, ['checkpoints', 'hub_checkpoints', 'hubCheckpoints'])
    .map(mapCheckpoint)
    .sort((a, b) => a.sequence - b.sequence);
}

export async function listIncidentsApi(): Promise<OperatorIncident[]> {
  const payload = await operatorApiRequest<unknown>('/operator/missions/incidents');
  return unwrapArray(payload, ['incidents']).map(mapIncident);
}

export async function getIncidentApi(incidentId: string): Promise<OperatorIncident> {
  if (!incidentId.trim()) throw new Error('Incident ID is required.');
  const payload = await operatorApiRequest<unknown>(
    `/operator/missions/incidents/${encodeURIComponent(incidentId.trim())}`,
  );
  return mapIncident(payload);
}

export async function createIncidentApi(input: CreateIncidentInput): Promise<OperatorIncident> {
  const numericDroneId = input.droneId ? Number(input.droneId) : undefined;
  if (numericDroneId !== undefined && !Number.isInteger(numericDroneId)) {
    throw new OperatorApiError('Drone ID must be a number.', 400);
  }

  const severity = input.severity === 'Critical'
    ? 'High'
    : input.severity === 'Minor'
      ? 'Low'
      : 'Medium';
  const payload = await operatorApiRequest<unknown>('/operator/missions/incidents', {
    method: 'POST',
    body: JSON.stringify({
      mission_id: input.missionId || null,
      ...(numericDroneId !== undefined ? { drone_id: numericDroneId } : {}),
      severity,
      description: input.title.trim()
        ? `${input.title.trim()}\n${input.description}`
        : input.description,
      requires_technical_inspection: input.severity !== 'Minor',
    }),
  });
  return mapIncident(payload);
}

export async function updateIncidentStatusApi(
  input: UpdateIncidentStatusInput,
): Promise<OperatorIncident> {
  const query = new URLSearchParams({ status: input.status });
  const payload = await operatorApiRequest<unknown>(
    `/operator/missions/incidents/${encodeURIComponent(input.incidentId)}/status?${query.toString()}`,
    { method: 'PATCH' },
  );
  return mapIncident(payload);
}

/** BE v2 order-scoped batteries API (with fallback for deployed legacy endpoints).
 * For Cross-Hub Dispatch the authoritative endpoint must return batteries at the drone's
 * current Hub; the Create Mission screen validates that Hub without inventing availability. */
export async function getEligibleMissionBatteriesApi(
  droneId: string,
  orderId: string,
  crossHubCurrentHubId?: string,
): Promise<EligibleMissionBattery[]> {
  if (!droneId.trim() || !orderId.trim()) return [];
  const id = encodeURIComponent(orderId.trim());
  const droneQuery = new URLSearchParams({ drone_id: droneId.trim() }).toString();
  const legacyQuery = new URLSearchParams({ drone_id: droneId.trim(), order_id: orderId.trim() }).toString();
  const paths = crossHubCurrentHubId ? [
    // Cross-hub: check actual donor Hub, not the package origin Hub.
    `/operator/missions/eligible-batteries?${new URLSearchParams({ drone_id: droneId.trim(), hub_id: crossHubCurrentHubId }).toString()}`,
    `/orders/${id}/eligible-batteries?${droneQuery}`,
    `/operator/orders/${id}/eligible-batteries?${droneQuery}`,
  ] : [
    `/operator/orders/${id}/eligible-batteries?${droneQuery}`,
    `/operator/missions/eligible-batteries?${legacyQuery}`,
    `/orders/${id}/eligible-batteries?${droneQuery}`,
  ];
  let response: unknown;
  for (const [index, path] of paths.entries()) {
    try {
      response = await operatorApiRequest<unknown>(path);
      break;
    } catch (error) {
      if (!(error instanceof OperatorApiError) || ![404, 405].includes(error.status) || index === paths.length - 1) throw error;
    }
  }
  const payload = parseJsonString(response);
  const records = Array.isArray(payload) ? payload :
    isRecord(payload) ? unwrapArray(payload, ['eligible_batteries', 'eligibleBatteries', 'batteries', 'compatible_batteries', 'compatibleBatteries']) : [];
  if (typeof payload === 'string' || (isRecord(payload) && records.length === 0 &&
    !('batteries' in payload || 'eligible_batteries' in payload || 'eligibleBatteries' in payload ||
      'items' in payload || 'data' in payload || 'results' in payload))) {
    throw new Error('Eligible-batteries API response is not a supported battery list. Check its actual JSON response.');
  }
  return records.map((entry) => {
    const record = asRecord(entry);
    const nested = isRecord(record.battery) ? record.battery : record;
    const id = pickString(nested, ['id', 'battery_id', 'batteryId']);
    if (!id || record.eligible === false || record.compatible === false) return null;
    return {
      id,
      serialNumber: pickString(nested, ['serial_number', 'serialNumber', 'battery_serial', 'batterySerial'], id),
      model: pickString(nested, ['battery_model', 'batteryModel', 'model']) || undefined,
      capacityWh: pickOptionalNumber(nested, ['capacity_wh', 'capacityWh']),
      chargeLevelPct: pickOptionalNumber(nested, ['charge_level_pct', 'chargeLevelPct', 'battery_charge_pct', 'batteryChargePct']),
      availableEnergyWh: pickOptionalNumber(nested, ['available_energy_wh', 'availableEnergyWh', 'battery_energy_wh', 'batteryEnergyWh']),
      hubId: pickString(nested, ['current_hub_id', 'hub_id', 'hubId']) || undefined,
      droneId: pickString(nested, ['drone_id', 'droneId']) || undefined,
      availableStatus: pickString(nested, ['available_status', 'availableStatus']) || undefined,
      isSelectable: pickOptionalBoolean(nested, ['is_selectable', 'isSelectable']),
      unavailableReason: pickString(nested, ['unavailable_reason', 'unavailableReason']) || undefined,
      assignedMissionId: pickString(nested, ['assigned_mission_id', 'assignedMissionId']) || undefined,
      isInstalledOnDrone: pickOptionalBoolean(nested, ['is_installed_on_drone', 'isInstalledOnDrone']),
    } as EligibleMissionBattery;
  }).filter((item): item is EligibleMissionBattery => item !== null);
}

function mapDispatchResourceExplanation(value: unknown): DispatchResourceExplanation {
  const record = asRecord(value);
  return {
    selectedId: pickString(record, ['selected_id', 'selectedId']) || undefined,
    selectedLabel: pickString(record, ['selected_label', 'selectedLabel']) || undefined,
    summary: pickString(record, ['summary']) || undefined,
    reasonsSelected: pickArray(record, ['reasons_selected', 'reasonsSelected'])
      .filter((reason): reason is string => typeof reason === 'string'),
    whyNotOthers: pickArray(record, ['why_not_others', 'whyNotOthers'])
      .map((item): DispatchResourceAlternative | null => {
        const alternative = asRecord(item);
        const id = pickString(alternative, ['id']);
        const label = pickString(alternative, ['label']) || id;
        const reason = pickString(alternative, ['reason']);
        if (!id || !reason) return null;
        return {
          id,
          label,
          reason,
          feasible: pickOptionalBoolean(alternative, ['feasible']),
        };
      })
      .filter((item): item is DispatchResourceAlternative => item !== null),
  };
}

/** Step 1 resource-only suggestion. No dry_run flag: this endpoint never creates a Mission.
 * Route selection stays in /mission-planning/analyze using the final Operator choice. */
export async function recommendDispatchResourcesApi(
  input: RecommendDispatchResourcesInput,
): Promise<DispatchResourceRecommendation> {
  if (!input.orderId.trim()) {
    throw new OperatorApiError('An Order is required for AI suggestions.', 400);
  }

  const payload = await operatorApiRequest<unknown>('/operator/missions/auto-dispatch/recommend-resources', {
    method: 'POST',
    body: JSON.stringify({
      orderId: input.orderId,
      bundledOrderIds: input.bundledOrderIds ?? [],
    }),
  });
  const parsed = parseJsonString(payload);
  const wrapper = asRecord(parsed);
  const wrapped = parseJsonString(wrapper.data ?? wrapper.result);
  const root = isRecord(wrapped) ? wrapped : wrapper;

  const returnedOrderId = pickString(root, ['order_id', 'orderId']);
  if (returnedOrderId && returnedOrderId !== input.orderId) {
    throw new OperatorApiError('Resource recommendation returned a different Order.', 502, payload);
  }

  const selectedDroneId = pickString(root, ['recommended_drone_id', 'recommendedDroneId']);
  const selectedBatteryId = pickString(root, ['recommended_battery_id', 'recommendedBatteryId']);
  if (!selectedDroneId || !selectedBatteryId) {
    throw new OperatorApiError('AI did not return an eligible Drone and Battery suggestion.', 502, payload);
  }
  return {
    selectedDroneId,
    selectedBatteryId,
    droneExplanation: mapDispatchResourceExplanation(root.drone_explanation ?? root.droneExplanation),
    batteryExplanation: mapDispatchResourceExplanation(root.battery_explanation ?? root.batteryExplanation),
    availableDrones: pickArray(root, ['available_drones', 'availableDrones']),
  };
}

export async function analyzeMissionPlanningApi(
  input: AnalyzeMissionPlanningInput,
): Promise<MissionPlanningAnalysis> {
  if (!input.droneId.trim() || !input.batteryId.trim()) {
    throw new OperatorApiError('Select a drone and its origin battery before analysis.', 400);
  }

  const payload = await operatorApiRequest<unknown>('/operator/missions/mission-planning/analyze', {
    method: 'POST',
    body: JSON.stringify({
      orderId: input.orderId,
      droneId: input.droneId,
      batteryId: input.batteryId,
      ...(input.bundledOrderIds?.length ? { bundledOrderIds: input.bundledOrderIds } : {}),
    }),
  });
  const root = unwrapObject(payload);
  let routeRecords = unwrapArray(
    root,
    ['routes', 'route_options', 'routeOptions', 'options', 'recommendations'],
  );

  if (routeRecords.length === 0) {
    const recommended = root.recommended_route ?? root.recommendedRoute;
    const alternatives = pickArray(root, ['alternatives', 'alternative_routes', 'alternativeRoutes']);
    routeRecords = [recommended, ...alternatives].filter(Boolean);
  }

  const recommendedRouteId = pickString(root, [
    'recommended_route_id',
    'recommendedRouteId',
    'recommended_id',
    'recommendedId',
  ]);

  const routes = routeRecords.map(mapRouteOption).map((route) => ({
    ...route,
    recommended: route.recommended || Boolean(recommendedRouteId && route.id === recommendedRouteId),
  }));

  const rawBundleIds = root.bundledOrderIds ?? root.bundled_order_ids;
  const analyzedBundleIds = Array.isArray(rawBundleIds)
    ? rawBundleIds.filter((id): id is string => typeof id === 'string')
    : undefined;
  const analyzedTotalPayloadKg = pickOptionalNumber(root, ['totalPayloadKg', 'total_payload_kg']);
  if (input.bundledOrderIds?.length) {
    // A single-order energy estimate must not be reused for multiple packages.
    // Swagger Analyze includes both fields; a missing/mismatched response is unsafe.
    const expectedIds = new Set(input.bundledOrderIds);
    const confirmed = analyzedBundleIds && analyzedBundleIds.length === expectedIds.size &&
      new Set(analyzedBundleIds).size === expectedIds.size &&
      analyzedBundleIds.every((id) => expectedIds.has(id));
    if (!confirmed || analyzedTotalPayloadKg === undefined || analyzedTotalPayloadKg <= 0) {
      throw new OperatorApiError(
        'The selected order group and total payload could not be verified. Please analyze again.',
        502, payload,
      );
    }
  }
  return {
    routes,
    routeExplanation: mapRoutePlanningExplanation(root.route_explanation ?? root.routeExplanation),
    totalPayloadKg: analyzedTotalPayloadKg,
    bundledOrderIds: analyzedBundleIds,
    raw: payload,
  };
}

export async function createMissionApi(input: CreateMissionInput): Promise<Mission> {
  if (!input.droneId.trim() || !input.batteryId.trim()) {
    throw new OperatorApiError('Select a drone and a battery before assigning a Mission.', 400);
  }

  const payload = await operatorApiRequest<unknown>('/operator/missions', {
    method: 'POST',
    body: JSON.stringify({
      orderId: input.orderId,
      droneId: input.droneId,
      batteryId: input.batteryId,
      routeId: input.routeId,
      ...(input.bundledOrderIds?.length ? { bundledOrderIds: input.bundledOrderIds } : {}),
      route_string: input.routeString,
      // Send the exact per-leg battery snapshot selected by BE Analyze.
      // BE remains authoritative and validates/re-reserves relay batteries on Assign.
      legs_detail: input.legDetails.map((leg) => ({
        from_hub_code: leg.from_hub_code,
        to_hub_code: leg.to_hub_code,
        distance_km: leg.distance_km,
        sequence_no: leg.sequence_no,
        leg_type: leg.leg_type,
        is_dispatch: leg.is_dispatch,
        payload_kg: leg.payload_kg,
        from_latitude: leg.from_latitude,
        from_longitude: leg.from_longitude,
        to_latitude: leg.to_latitude,
        to_longitude: leg.to_longitude,
        from_hub_id: leg.from_hub_id,
        to_hub_id: leg.to_hub_id,
        from_hub_name: leg.from_hub_name,
        to_hub_name: leg.to_hub_name,
        battery_id: leg.battery_id,
        battery_serial: leg.battery_serial,
        battery_model: leg.battery_model,
        battery_capacity_wh: leg.battery_capacity_wh,
        battery_charge_pct: leg.battery_charge_pct,
        battery_energy_wh: leg.battery_energy_wh,
        energy_wh: leg.energy_wh,
        battery_consumption_pct: leg.battery_consumption_pct,
        remaining_battery_pct: leg.remaining_battery_pct,
      })),
      distance_km: input.distanceKm,
      predicted_energy_wh: input.predictedEnergyWh,
      predicted_duration_min: input.predictedDurationMin,
    }),
  });
  return mapMission(payload);
}
