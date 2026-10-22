import type { Mission, MissionLeg, MissionStatus, PlannedRelayBattery, PlannedRouteLeg, RouteLegSnapshot, RouteOption, Tone } from '../types/operator';
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

export interface HubCheckpoint {
  id: string;
  hubId: string;
  hubName: string;
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
}

export interface AnalyzeMissionPlanningInput {
  orderId: string;
  droneId: string;
  batteryId: string;
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
  const status = String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  switch (status) {
    case 'IN_PROGRESS':
    case 'FLYING':
    case 'ACTIVE':
    case 'ACTIVE_MISSION':
      return 'In Progress';
    case 'COMPLETED':
    case 'MISSION_COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    case 'FAILED':
    case 'REJECTED':
      return 'Failed';
    case 'PENDING_APPROVAL':
    case 'APPROVED':
    case 'AWAITING_PAYMENT':
    case 'SCHEDULED':
    default:
      return 'Scheduled';
  }
}

function missionTone(status: MissionStatus): Tone {
  if (status === 'Completed') return 'success';
  if (status === 'In Progress') return 'warning';
  if (status === 'Cancelled' || status === 'Failed') return 'danger';
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
    status: rawStatus === 'COMPLETED' ? 'Completed' : rawStatus === 'IN_PROGRESS' ? 'In Progress' : 'Pending',
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
  const createdAt = normalizeIso(pickString(record, ['created_at', 'createdAt'])) ?? plannedStartAt;

  const rawLegs = pickArray(record, ['legs_detail', 'legs', 'mission_legs']);
  const plannedLegs = pickArray(routeRecord, ['legs_detail', 'legs']);
  const legsRecords = rawLegs.length > 0 ? rawLegs : plannedLegs;
  // MissionLeg can hold the operational status while scheduled_route holds the
  // exact assigned battery snapshot. Merge by sequence, never fabricate an ID.
  const legs = legsRecords.map((leg, index) => mapMissionLeg(leg, index, plannedLegs[index]));
  const relayHubIds = legs.length > 1
    ? legs.slice(0, -1).map((leg) => leg.toHubId).filter(Boolean)
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
    id, orderId, type: 'Delivery',
    name: pickString(record, ['name', 'mission_name', 'missionName'], `Delivery ${orderId || id}`),
    droneId, batteryId: pickString(record, ['battery_id', 'batteryId', 'assignedBatteryId']) || undefined, drone: droneName,
    originHubId: pickString(record, ['origin_hub_id', 'originHubId']),
    destinationHubId: pickString(record, ['destination_hub_id', 'destinationHubId']),
    relayHubIds, legs, routeId, route: routeName,
    status, tone: missionTone(status), eta,
    // NaN is a missing-metric sentinel; UI must display —, never invented 0%/0 Wh.
    battery: batteryRemaining ?? Number.NaN,
    plannedStartAt,
    packageReceiveDeadlineAt: normalizeIso(pickString(record, ['package_receive_deadline_at', 'packageReceiveDeadlineAt'])),
    actualStartedAt, actualCompletedAt, estimatedArrivalAt,
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
    alertId: pickString(record, ['alert_id', 'alertId']) || undefined,
    anomaly: pickString(record, ['anomaly', 'alert', 'issue']) || undefined,
    anomalyDuration: pickString(record, ['anomaly_duration', 'anomalyDuration', 'duration']) || undefined,
    battery: pickOptionalNumber(telemetry, ['battery_pct', 'battery', 'battery_level', 'batteryLevel']),
    batteryVoltage: pickOptionalNumber(telemetry, ['latest_battery_voltage', 'latestBatteryVoltage', 'battery_voltage', 'batteryVoltage']),
    signal: pickOptionalNumber(telemetry, ['signal_pct', 'signal', 'signal_strength', 'signalStrength']),
    altitudeM: pickOptionalNumber(telemetry, ['altitude_m', 'altitude', 'altitudeM', 'latest_altitude', 'latestAltitude']),
    speedKmh: pickOptionalNumber(telemetry, ['speed_kmh', 'speed', 'speedKmh', 'latest_speed', 'latestSpeed']),
    detectedAt: pickString(record, ['detected_at', 'detectedAt', 'updated_at', 'updatedAt', 'last_updated', 'lastUpdated']) || undefined,
    aiAssessment: pickString(record, ['ai_assessment', 'aiAssessment', 'assessment'], 'Live telemetry is within the latest Backend state.'),
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
  const speed = pickNumber(record, ['speed_kmh', 'speed', 'speedKmh'], Number.NaN);
  const battery = pickNumber(record, ['battery_pct', 'battery', 'battery_level'], Number.NaN);
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
    speedKmh: Number.isFinite(speed) ? speed : undefined,
    batteryPct: Number.isFinite(battery) ? battery : undefined,
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
    feasible: pickOptionalBoolean(record, ['feasible', 'is_feasible', 'isFeasible']),
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

function mapRouteOption(raw: unknown, index: number): RouteOption {
  const record = asRecord(raw);
  const legRecords = pickArray(record, ['legs_detail', 'legsDetail', 'legs', 'route_legs', 'routeLegs']);
  const legDetails = legRecords.map(mapRouteLegSnapshot).filter((leg): leg is RouteLegSnapshot => Boolean(leg));
  // relayHubs is an array of NAMES in BE's new response, not IDs.
  // Use intermediate leg.to_hub_id instead, so Hub + Battery lookups work.
  const derivedRelayIds = legRecords.length > 1
    ? legRecords.slice(0, -1).map((leg) => pickString(asRecord(leg), ['to_hub_id', 'toHubId'])).filter(Boolean)
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
    infeasibleReason: pickString(record, ['infeasible_reason', 'infeasibleReason']) || undefined,
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
    activeMissions: pickOptionalNumber(record, ['active_missions', 'activeMissions', 'active', 'in_progress', 'inProgress']),
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
    inProgress: pickOptionalNumber(record, ['in_progress', 'inProgress', 'IN_PROGRESS', 'active']),
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
    else if (status === 'COMPLETED' || status === 'MISSION_COMPLETED') result.completed = count;
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

export async function listMissionsApi(): Promise<Mission[]> {
  const payload = await operatorApiRequest<unknown>('/missions/');
  return unwrapArray(payload, ['missions']).map(mapMission).filter((mission) => mission.id);
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
  const missions = items.filter(isRecord).map(mapMission).filter((mission) => mission.id);
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

/** GET /operator/missions/eligible-batteries — actual compatibility check belongs to BE. */
export async function getEligibleMissionBatteriesApi(
  droneId: string,
  orderId: string,
): Promise<EligibleMissionBattery[]> {
  if (!droneId.trim() || !orderId.trim()) return [];
  const query = new URLSearchParams({ drone_id: droneId.trim(), order_id: orderId.trim() });
  const response = await operatorApiRequest<unknown>(
    `/operator/missions/eligible-batteries?${query.toString()}`,
  );
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
    } as EligibleMissionBattery;
  }).filter((item): item is EligibleMissionBattery => item !== null);
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

  return { routes, raw: payload };
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
      route_string: input.routeString,
      // Send the exact per-leg battery snapshot selected by BE Analyze.
      // BE remains authoritative and validates/re-reserves relay batteries on Assign.
      legs_detail: input.legDetails.map((leg) => ({
        from_hub_code: leg.from_hub_code,
        to_hub_code: leg.to_hub_code,
        distance_km: leg.distance_km,
        sequence_no: leg.sequence_no,
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
