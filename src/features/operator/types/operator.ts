export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type TechnicalStatus = 'Available' | 'In Flight' | 'Maintenance' | 'Unknown';

export type MissionStatus =
  | 'Scheduled'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | 'Failed';

export type MissionLegStatus = 'Pending' | 'In Progress' | 'Completed';

export type MissionType = 'Delivery';

export type DeliveryMode = 'Express' | 'Scheduled';

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
  status: OrderStatus;

  /** Authoritative package receipt flag from originPackage.received (independent of received_at). */
  originPackageReceived?: boolean;
  /** Technician receipt timestamp; may be absent even when received is true. */
  originHubReceivedAt?: string;
  /** Technician event at the Pick-up Point. Completing this event closes Operator scope. */
  destinationHubReceivedAt?: string;
  /** Set when a Mission is cancelled/failed and a new customer delivery window is required. */
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
  /** Actual battery persisted for this flight leg by BE. */
  batteryId?: string;
  batteryModel?: string;
  batteryChargePct?: number;
  batteryEnergyWh?: number;
}

export interface Mission {
  id: string;
  orderId: string;
  type: MissionType;
  name: string;
  droneId: string;
  batteryId?: string;
  drone: string;
  originHubId: string;
  destinationHubId: string;
  relayHubIds?: string[];
  legs?: MissionLeg[];
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
  /** BE-selected battery used to depart this leg's origin hub. */
  batteryId?: string;
  batteryModel?: string;
  batteryChargePct?: number;
  batteryEnergyWh?: number;
  batteryCapacityWh?: number;
  batteryConsumptionPct?: number;
  minimumReservePct?: number;
  feasible?: boolean;
}

/** Technician will swap a compatible spare battery set at this relay hub. */
export interface PlannedRelayBattery {
  hubId: string;
  batteryModel?: string;
  requiredBatteryCount?: number;
  availableBatteryCount?: number;
  batteryIds?: string[];
  /** Authoritative auto-allocation at this Relay Hub from Analyze. */
  swapBatteryId?: string;
  selectedBatteryModel?: string;
  selectedBatteryChargePct?: number;
  selectedBatteryEnergyWh?: number;
  selectedBatteryCapacityWh?: number;
  ready?: boolean;
}

/** Snapshot of the exact BE leg geometry used for Create Mission and Mission Detail. */
export interface RouteLegSnapshot {
  from_hub_code: string;
  to_hub_code: string;
  distance_km: number;
  sequence_no?: number;
  from_hub_id?: number;
  to_hub_id?: number;
  from_hub_name?: string;
  to_hub_name?: string;
  /** Preserve BE Analyze battery allocation when handing the snapshot to Create Mission. */
  battery_id?: string;
  battery_serial?: string;
  battery_model?: string;
  battery_capacity_wh?: number;
  battery_charge_pct?: number;
  battery_energy_wh?: number;
  energy_wh?: number;
  battery_consumption_pct?: number;
  remaining_battery_pct?: number;
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
  /** Optional intermediate Hub(s) selected by route planning for long-distance Missions. */
  relayHubIds?: string[];
  relayStopMinutes?: number;
  /** BE-authoritative feasibility flag. Only BE can validate reserve/availability atomically. */
  feasible?: boolean;
  infeasibleReason?: string;
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
  relayBatterySelections?: RelayBatterySelection[];
  updatedAt: string;
}

export interface OperatorNavItem {
  label: string;
  path: string;
  icon: import('../../../components/ui/Icon').IconName;
  children?: Array<{ label: string; path: string }>;
}
