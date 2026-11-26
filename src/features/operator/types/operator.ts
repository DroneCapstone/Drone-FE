export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type TechnicalStatus = 'Available' | 'In Flight' | 'Maintenance' | 'Unknown';

// Canonical Operator Mission labels. Keep legacy BE aliases in missionApi.ts.
export type MissionStatus =
  | 'Scheduled'
  | 'Flying'
  | 'Completed'
  | 'Failed';

export type MissionLegStatus = 'Pending' | 'In Progress' | 'Completed';

export type MissionType = 'Delivery';

export type DeliveryMode = 'Express' | 'Scheduled' | 'Normal';

export type OrderPriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type CustomerContactChannel = 'Phone' | 'SMS';

export type CustomerContactOutcome =
  | 'Reached'
  | 'No Answer'
  | 'Will Pick Up'
  | 'Sent'
  | 'Failed';

/**
 * Operator-facing Order lifecycle.
 * Operator scope ends when the package is received at the Pick-up Point.
 */
export type OrderStatus =
  | 'Pending'
  | 'Awaiting Drop-off'
  | 'At Hub'
  | 'In Delivery'
  | 'Delivered to Hub'
  | 'Cancelled';

/**
 * Planning state is separate from Order status.
 * It only answers whether Operator needs to create/re-create a Mission.
 */
export type PlanningState =
  | 'Waiting for package'
  | 'Future'
  | 'Ready for Planning'
  | 'Planned'
  | 'Needs Replanning';

export interface DeliveryWindow {
  start: string;
  end: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  packageLabel: string;
  packageType: string;
  payloadKg: number;
  originHubId: string;
  originHubName?: string;
  destinationHubId: string;
  destinationHubName?: string;
  deliveryMode: DeliveryMode;
  requestedDeliveryAt?: string;
  requestedDate: string;
  initialEstimatedWindow: DeliveryWindow;
  currentEstimatedWindow: DeliveryWindow;
  planningAt: string;
  /** Planning State returned/computed by Backend for API-backed Orders. */
  planningState?: PlanningState;
  /** BE localization of the planning state, for optional tooltip/detail. */
  planningStateLabel?: string;
  /** Official permission returned by BE. Never infer true from a date. */
  canCreateMission?: boolean;
  /** BE-calculated Operator coordination priority; these fields may be missing on older responses. */
  priorityLevel?: OrderPriorityLevel;
  priorityScore?: number;
  slackMinutes?: number;
  coordinationDeadline?: string;
  customerDeadline?: string;
  overdueMinutes?: number;
  isOverdue?: boolean;
  status: OrderStatus;

  /** Authoritative package receipt flag from originPackage.received (independent of received_at). */
  originPackageReceived?: boolean;
  /** Technician receipt timestamp; may be absent even when received is true. */
  originHubReceivedAt?: string;
  /** Technician event at the Pick-up Point. Completing this event closes Operator scope. */
  destinationHubReceivedAt?: string;
  /** An Order may require a new planning cycle; this is separate from Mission status. */
  replanRequiredAt?: string;

  createdAt: string;
}

export interface DroneAssignmentHistory {
  droneId: string;
  droneName: string;
  replacedAt: string;
  reason: string;
}

export interface MissionLeg {
  id: string;
  fromHubId: string;
  toHubId: string;
  status: MissionLegStatus;
  legType?: string;
  isDispatch?: boolean;
  payloadKg?: number;
  batteryId?: string;
  batteryModel?: string;
  batteryChargePct?: number;
  batteryEnergyWh?: number;
}

export interface Mission {
  id: string;
  orderId: string;
  /** Other orders assigned to this mission (excludes the primary order). */
  bundledOrderIds?: string[];
  totalOrdersCount?: number;
  payloadWeightKg?: number;
  type: MissionType;
  name: string;
  droneId: string;
  batteryId?: string;
  drone: string;
  originHubId: string;
  destinationHubId: string;
  relayHubIds?: string[];
  legs?: MissionLeg[];
  /** Planned hub-to-hub segments from the assigned Mission route (not recorded GPS). */
  plannedRouteLegs?: RouteLegSnapshot[];
  routeId: string;
  route: string;
  status: MissionStatus;
  tone: Tone;
  eta: string;
  battery: number;
  plannedStartAt: string;
  /** Customer has 3 hours after Mission assignment to hand the package to the Drop-off Point. */
  packageReceiveDeadlineAt?: string;
  actualStartedAt?: string;
  actualCompletedAt?: string;
  /** Physical departure and landing, used in Operator Flight History. */
  flightDepartedAt?: string;
  flightArrivedAt?: string;
  estimatedArrivalAt: string;
  predictedDurationMin: number;
  estimatedEnergyWh: number;
  batteryConsumptionPct: number;
  confidencePct?: number;
  risk?: 'Low' | 'Medium' | 'High';
  scheduleState?: 'On Time' | 'Delayed';
  assignmentHistory?: DroneAssignmentHistory[];
  createdAt: string;
}

export interface Hub {
  id: string;
  name: string;
  area: string;
  address: string;
  latitude: number;
  longitude: number;
  status: 'Active' | 'Inactive';
}

export interface OperatorDrone {
  /** Internal record key used for Technician/Fleet synchronization. */
  id: string;
  /** Customer-facing drone name, e.g. CX. */
  name: string;
  /** Customer-facing numeric ID, e.g. 09. */
  displayId: string;
  model: string;
  hubId: string;
  technicalStatus: TechnicalStatus;
  maxPayloadKg: number;
  maxSpeed?: number;
  batteryLevelPct?: number;
  utilizationPct?: number;
  hubName?: string;
  /** Optional compatibility key when Backend exposes it. */
  batteryModel?: string;
  /** BE v2: drone is currently stationed at a different Hub than the Order origin. */
  isCrossHub?: boolean;
  /** BE v2: authoritative eligibility for the specific Order. */
  isSelectable?: boolean;
  unavailableReason?: string;
}

export interface OperatorBattery {
  id: string;
  serialNumber: string;
  capacityWh: number;
  /** Technical/health status returned as `status` (e.g. Active). */
  status: string;
  /** Inventory availability returned as `available_status` (Ready, Charging, In Use, etc.). */
  availableStatus?: string;
  /** `drone_id` indicates installation, not model compatibility. */
  droneId?: string;
  currentHubId: string;
  hubName: string;
  chargeLevelPct: number;
  /** Future-proof: mapper reads this if Backend later exposes battery model/type. */
  model?: string;
}

export interface RelayBatterySelection {
  hubId: string;
  batteryId: string;
}

export interface WeatherSnapshot {
  temperatureC: number;
  humidityPct: number;
  windSpeedMs: number;
  windGustMs: number;
  windDirectionDeg: number;
  precipitationMm: number;
  cloudCoverPct: number;
  relativeWindAngleDeg: number;
}

export interface ShapFactor {
  feature: string;
  impactWh: number;
  direction: 'increase' | 'decrease';
  note: string;
}

/** One flight leg. Verified results must come from mission-planning/analyze. */
export interface PlannedRouteLeg {
  fromHubId: string;
  toHubId: string;
  predictedEnergyWh?: number;
  endingSocPct?: number;
  minimumReservePct?: number;
  feasible?: boolean;
  batteryId?: string;
  batteryModel?: string;
  batteryChargePct?: number;
  batteryEnergyWh?: number;
  batteryCapacityWh?: number;
  batteryConsumptionPct?: number;
}

/** Technician will swap a compatible spare battery set at this relay hub. */
export interface PlannedRelayBattery {
  hubId: string;
  batteryModel?: string;
  requiredBatteryCount?: number;
  availableBatteryCount?: number;
  batteryIds?: string[];
  ready?: boolean;
  swapBatteryId?: string;
  selectedBatteryModel?: string;
  selectedBatteryChargePct?: number;
  selectedBatteryEnergyWh?: number;
  selectedBatteryCapacityWh?: number;
}

/** Weather values attached to a route or flight leg by Mission Planning Analyze. */
export interface RouteWeatherConditions {
  temperatureC?: number;
  windSpeedMs?: number;
  windGustMs?: number;
  precipitationMm?: number;
  humidityPct?: number;
  conditionLabel?: string;
  weatherSummary?: string;
  isBadWeather?: boolean;
  warningMessage?: string;
}

/** Snapshot of the exact BE leg geometry used for Create Mission and Mission Detail. */
export interface RouteLegSnapshot {
  from_hub_code: string;
  to_hub_code: string;
  distance_km: number;
  sequence_no?: number;
  /** BE v2: ferry flight without a parcel, versus a delivery leg. */
  leg_type?: 'DISPATCH' | 'DELIVERY' | string;
  is_dispatch?: boolean;
  payload_kg?: number;
  from_latitude?: number;
  from_longitude?: number;
  to_latitude?: number;
  to_longitude?: number;
  from_hub_id?: number;
  to_hub_id?: number;
  from_hub_name?: string;
  to_hub_name?: string;
  battery_id?: string;
  battery_serial?: string;
  battery_model?: string;
  battery_capacity_wh?: number;
  battery_charge_pct?: number;
  battery_energy_wh?: number;
  energy_wh?: number;
  battery_consumption_pct?: number;
  remaining_battery_pct?: number;
  weather?: RouteWeatherConditions;
  weather_summary?: string;
}

/** Explicit AI explanation returned for one Analyze route; arrays have undocumented item shapes. */
export interface RouteAiExplanation {
  flightSpeedMps?: number;
  flightSpeedKmh?: number;
  totalEnergyWh?: number;
  summary?: string;
  /** Preserve every BE contribution item, without inventing a SHAP unit or field schema. */
  featureContributions: unknown[];
  /** Preserve BE leg breakdown as supplied, including future fields. */
  legsBreakdown: unknown[];
}

/** Presentation metadata added to Analyze routes in BE v8.5 (all fields optional). */
export interface RouteComparisonVsRecommended {
  deltaDistanceKm?: number;
  deltaDurationMin?: number;
  deltaEnergyWh?: number;
  sameHubPath?: boolean;
  differenceSummary?: string;
}

/** BE's reason for preferring another route. */
export interface RouteAlternativeExplanation {
  id: string;
  label?: string;
  feasible?: boolean;
  reason?: string;
}

/** Explanation shared by all route options in one Analyze response. */
export interface RoutePlanningExplanation {
  selectedId?: string;
  selectedLabel?: string;
  summary?: string;
  reasonsSelected: string[];
  whyNotOthers: RouteAlternativeExplanation[];
}

export interface RouteOption {
  id: string;
  name: string;
  routeString?: string;
  legDetails?: RouteLegSnapshot[];
  distanceKm: number;
  predictedDurationMin: number;
  predictedEnergyWh: number;
  batteryConsumptionPct: number;
  confidencePct: number;
  risk: 'Low' | 'Medium' | 'High';
  weatherImpact: string;
  weather?: RouteWeatherConditions;
  weatherSummary?: string;
  /** Optional intermediate Hub(s) selected by route planning for long-distance Missions. */
  relayHubIds?: string[];
  relayStopMinutes?: number;
  /** BE-authoritative feasibility flag. Only BE can validate reserve/availability atomically. */
  feasible?: boolean;
  /** BE permission to assign this particular route. False overrides feasible=true. */
  isSelectable?: boolean;
  infeasibleReason?: string;
  unselectableReason?: string;
  /** Model output: signed SHAP values, as supplied by BE; target units are not assumed. */
  shapValues?: Record<string, number>;
  flightSpeedMps?: number;
  speedProfileLabel?: string;
  /** BE v8.5: strategy classification; do not derive from route ID. */
  strategyCode?: string;
  /** BE v8.5: e.g. Energy Saver Relay, Safe Low-Speed Relay. */
  displayTitle?: string;
  /** BE v8.5: e.g. DIRECT, RELAY_PRIMARY, RELAY_ALTERNATE. */
  corridorType?: string;
  /** BE v8.5: short differentiation supplied by backend. */
  differentiatorTag?: string;
  /** BE v8.5: comparison to recommended strategy; values may be zero. */
  comparisonVsRecommended?: RouteComparisonVsRecommended;
  aiExplanation?: RouteAiExplanation;
  /** Optional FE display of the new BE relay_battery_status payload (schema not documented). */
  rawRelayBatteryStatus?: unknown[];
  legs?: PlannedRouteLeg[];
  relayBatteryPlan?: PlannedRelayBattery[];
  batteryPlanId?: string;
  recommended?: boolean;
  recommendationReasons: string[];
  tradeOff: string;
}

export interface RouteAiAnalysis {
  routeId: string;
  weather: WeatherSnapshot;
  shapFactors: ShapFactor[];
  operationalRisks: Array<{
    label: string;
    level: 'Low' | 'Medium' | 'High';
    detail: string;
  }>;
}

export interface DroneEligibilityResult {
  eligible: boolean;
  reasons: string[];
}

export interface MissionDraft {
  orderId: string;
  step: number;
  selectedDroneId: string;
  selectedBatteryId: string;
  selectedRouteId: string;
  /** Set after any manual Drone/Battery choice so refresh does not re-apply AI. */
  manualSelectionOverride?: boolean;
  relayBatterySelections?: RelayBatterySelection[];
  bundledOrderIds?: string[];
  updatedAt: string;
}

export interface OperatorNavItem {
  label: string;
  path: string;
  icon: import('../../../components/ui/Icon').IconName;
  children?: Array<{ label: string; path: string }>;
}
