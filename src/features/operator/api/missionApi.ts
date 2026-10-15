import type { Mission, MissionLeg, MissionStatus, PlannedRelayBattery, PlannedRouteLeg, RouteOption, Tone } from '../types/operator';
import { OperatorApiError, operatorApiRequest } from './orderApi';

export interface MissionHubSummary {
  id: string;
  name: string;
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
  batteryPlanId?: string;
}

export interface AnalyzeMissionPlanningInput {
  orderId: string;
  droneId: string;
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
    address: pickString(record, ['address', 'location']) || undefined,
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
    totalDrones: Number.isFinite(totalDrones) ? totalDrones : undefined,
    availableDrones: Number.isFinite(availableDrones) ? availableDrones : undefined,
  };
}

function mapMissionLeg(raw: unknown, index: number): MissionLeg {
  const record = asRecord(raw);
  const rawStatus = pickString(record, ['status'], 'PENDING').toUpperCase();
  return {
    id: pickString(record, ['id', 'leg_id', 'legId'], `LEG-${index + 1}`),
    fromHubId: pickString(record, ['from_hub_id', 'fromHubId', 'origin_hub_id', 'originHubId']),
    toHubId: pickString(record, ['to_hub_id', 'toHubId', 'destination_hub_id', 'destinationHubId']),
    status: rawStatus === 'COMPLETED' ? 'Completed' : rawStatus === 'IN_PROGRESS' ? 'In Progress' : 'Pending',
  };
}

function mapMission(raw: unknown): Mission {
  const record = unwrapObject(raw);
  const status = normalizeMissionStatus(record.status);
  const id = pickString(record, ['id', 'mission_id', 'missionId']);
  const orderId = pickString(record, ['order_id', 'orderId']);
  const droneId = pickString(record, ['drone_id', 'droneId']);
  const droneName = pickString(record, ['drone', 'drone_name', 'droneName', 'drone_code'], droneId);
  const routePath = pickString(record, ['route_path_string', 'routePathString']);
  const routeId = pickString(record, ['route_id', 'routeId']);
  const routeName = pickString(record, ['route', 'route_name', 'routeName'], routePath || routeId || '—');
  const plannedStartAt = normalizeIso(pickString(record, ['planned_start_at', 'plannedStartAt', 'scheduled_time', 'scheduledTime'])) ?? '';
  const estimatedArrivalAt = normalizeIso(pickString(record, ['estimated_arrival_at', 'estimatedArrivalAt', 'end_time', 'endTime'])) ?? plannedStartAt;
  const actualStartedAt = normalizeIso(pickString(record, ['actual_started_at', 'actualStartedAt', 'start_time', 'startTime', 'departed_at', 'departedAt']));
  const actualCompletedAt = normalizeIso(pickString(record, ['actual_completed_at', 'actualCompletedAt', 'end_time', 'endTime', 'arrived_at', 'arrivedAt']));
  const createdAt = normalizeIso(pickString(record, ['created_at', 'createdAt'])) ?? plannedStartAt;
  const relayIds = pickArray(record, ['relay_hub_ids', 'relayHubIds']).map(String);
  const legs = pickArray(record, ['legs', 'mission_legs']).map(mapMissionLeg);
  const estimatedArrivalDate = estimatedArrivalAt ? new Date(estimatedArrivalAt) : undefined;
  const eta = pickString(record, ['eta']) || (
    estimatedArrivalDate && !Number.isNaN(estimatedArrivalDate.getTime())
      ? estimatedArrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '—'
  );

  return {
    id,
    orderId,
    type: 'Delivery',
    name: pickString(record, ['name', 'mission_name', 'missionName'], `Delivery ${orderId || id}`),
    droneId,
    drone: droneName,
    originHubId: pickString(record, ['origin_hub_id', 'originHubId']),
    destinationHubId: pickString(record, ['destination_hub_id', 'destinationHubId']),
    relayHubIds: relayIds,
    legs,
    routeId,
    route: routeName,
    status,
    tone: missionTone(status),
    eta,
    battery: pickNumber(record, ['predicted_remaining_battery_pct', 'remaining_battery_pct', 'battery', 'battery_pct']),
    plannedStartAt,
    packageReceiveDeadlineAt: normalizeIso(pickString(record, ['package_receive_deadline_at', 'packageReceiveDeadlineAt'])),
    actualStartedAt,
    actualCompletedAt,
    estimatedArrivalAt,
    predictedDurationMin: pickNumber(record, ['predicted_duration_min', 'predictedDurationMin', 'duration_min']),
    estimatedEnergyWh: pickNumber(record, ['estimated_energy_wh', 'estimatedEnergyWh', 'energy_wh']),
    batteryConsumptionPct: pickNumber(record, ['battery_consumption_pct', 'batteryConsumptionPct']),
    confidencePct: pickNumber(record, ['confidence_pct', 'confidencePct'], Number.NaN),
    risk: normalizeRisk(record.risk_level ?? record.risk),
    createdAt,
  };
}

function mapLiveDrone(raw: unknown, index: number): LiveTrackingDrone {
  const record = asRecord(raw);
  const telemetry = isRecord(record.telemetry) ? record.telemetry : record;
  const health = normalizeHealth(record.health ?? record.status ?? record.alert_level);
  const latitude = pickNumber(telemetry, ['latitude', 'lat', 'latest_lat', 'latestLat'], Number.NaN);
  const longitude = pickNumber(telemetry, ['longitude', 'lng', 'lon', 'latest_lng', 'latestLng'], Number.NaN);
  return {
    id: pickString(record, ['drone_id', 'droneId', 'id', 'drone'], `DR-${index + 1}`),
    missionId: pickString(record, ['mission_id', 'missionId']),
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
    predictedEnergyWh: pickOptionalNumber(record, ['predicted_energy_wh', 'predictedEnergyWh']),
    endingSocPct: pickOptionalNumber(record, ['ending_soc_pct', 'endingSocPct', 'battery_after_pct', 'batteryAfterPct']),
    minimumReservePct: pickOptionalNumber(record, ['minimum_reserve_pct', 'minimumReservePct']),
    feasible: pickOptionalBoolean(record, ['feasible', 'is_feasible', 'isFeasible']),
  };
}

function mapRelayBattery(raw: unknown): PlannedRelayBattery {
  const record = asRecord(raw);
  return {
    hubId: pickString(record, ['hub_id', 'hubId', 'relay_hub_id', 'relayHubId']),
    batteryModel: pickString(record, ['battery_model', 'batteryModel']) || undefined,
    requiredBatteryCount: pickOptionalNumber(record, ['required_battery_count', 'requiredBatteryCount']),
    availableBatteryCount: pickOptionalNumber(record, ['available_battery_count', 'availableBatteryCount']),
    batteryIds: pickArray(record, ['battery_ids', 'batteryIds']).map(String),
    ready: pickOptionalBoolean(record, ['ready', 'verified', 'is_ready', 'isReady']),
  };
}

function mapRouteOption(raw: unknown, index: number): RouteOption {
  const record = asRecord(raw);
  const relayHubIds = pickArray(record, ['relay_hub_ids', 'relayHubIds', 'relay_hubs', 'relayHubs']).map((item) => {
    if (isRecord(item)) return pickString(item, ['id', 'hub_id', 'hubId']);
    return String(item);
  }).filter(Boolean);
  const reasons = pickArray(record, ['recommendation_reasons', 'recommendationReasons', 'reasons']).map(String);
  const reason = pickString(record, ['reason']);
  if (reason) reasons.push(reason);
  return {
    id: pickString(record, ['route_id', 'routeId', 'id'], `ROUTE-${index + 1}`),
    name: pickString(record, ['route_name', 'routeName', 'name', 'route_string', 'routeString'], `Route ${index + 1}`),
    distanceKm: pickNumber(record, ['distance_km', 'distanceKm', 'distance']),
    predictedDurationMin: pickNumber(record, ['predicted_duration_min', 'predictedDurationMin', 'duration_min']),
    predictedEnergyWh: pickNumber(record, ['predicted_energy_wh', 'predictedEnergyWh', 'estimated_energy_wh', 'energy_wh']),
    batteryConsumptionPct: pickNumber(record, ['battery_consumption_pct', 'batteryConsumptionPct', 'battery_use_pct']),
    confidencePct: pickNumber(record, ['confidence_pct', 'confidencePct', 'confidence'], 0),
    risk: normalizeRisk(record.risk_level ?? record.risk),
    weatherImpact: pickString(record, ['weather_impact', 'weatherImpact'], 'Backend weather assessment'),
    relayHubIds,
    relayStopMinutes: pickNumber(record, ['relay_stop_minutes', 'relayStopMinutes'], Number.NaN),
    feasible: pickOptionalBoolean(record, ['feasible', 'is_feasible', 'isFeasible']),
    legs: pickArray(record, ['legs', 'route_legs', 'routeLegs']).map(mapRouteLeg),
    relayBatteryPlan: pickArray(record, ['relay_battery_plan', 'relayBatteryPlan']).map(mapRelayBattery),
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

console.count('[CreateMission] POST mission');
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

export async function getMissionActiveFlightsApi(): Promise<Mission[]> {
  const payload = await operatorApiRequest<unknown>('/missions/dashboard/active-flights');
  return unwrapArray(payload, ['active_flights', 'activeFlights', 'flights', 'missions'])
    .map(mapMission)
    .filter((mission) => mission.id);
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

export async function getMissionTelemetryApi(missionId: string): Promise<MissionTelemetryPoint[]> {
  if (!missionId.trim()) return [];
  const payload = await operatorApiRequest<unknown>(
    `/operator/missions/${encodeURIComponent(missionId.trim())}/telemetry`,
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

export async function analyzeMissionPlanningApi(
  input: AnalyzeMissionPlanningInput,
): Promise<MissionPlanningAnalysis> {
  const numericDroneId = Number(input.droneId);
  if (!Number.isInteger(numericDroneId)) {
    throw new OperatorApiError('Drone ID must be a number.', 400);
  }

  const payload = await operatorApiRequest<unknown>('/operator/missions/mission-planning/analyze', {
    method: 'POST',
    body: JSON.stringify({
      orderId: input.orderId,
      droneId: numericDroneId,
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
  const numericDroneId = Number(input.droneId);
  if (!Number.isInteger(numericDroneId)) {
    throw new OperatorApiError('Drone ID must be a number.', 400);
  }

  const payload = await operatorApiRequest<unknown>('/operator/missions', {
    method: 'POST',
    body: JSON.stringify({
      orderId: input.orderId,
      droneId: numericDroneId,
      routeId: input.routeId,
      ...(input.batteryPlanId ? { batteryPlanId: input.batteryPlanId } : {}),
    }),
  });
  return mapMission(payload);
}
