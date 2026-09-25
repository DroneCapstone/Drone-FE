export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type TechnicalStatus = 'Available' | 'Maintenance';

export type MissionStatus =
  | 'Scheduled'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | 'Failed';

export type MissionType = 'Delivery';

export type DeliveryMode = 'Express' | 'Scheduled';

export type OrderStatus =
  | 'Pending'
  | 'Ready for Pickup'
  | 'Completed'
  | 'Disposed'
  | 'Cancelled';

export type PlanningState =
  | 'Planning Overdue'
  | 'Ready for Planning'
  | 'Awaiting Package'
  | 'Upcoming'
  | 'Future';

export type PickupState =
  | 'Waiting'
  | 'Contact Required'
  | 'Final Reminder'
  | 'Disposal Required';

export type PackageDisposition = 'Delivered' | 'Disposed';

export type CustomerContactChannel = 'Phone' | 'SMS';
export type CustomerContactResult = 'Reached' | 'No Answer' | 'Will Pick Up' | 'Sent' | 'Failed';

export interface CustomerContactEntry {
  id: string;
  channel: CustomerContactChannel;
  result: CustomerContactResult;
  contactedAt: string;
  note?: string;
}

export interface DeliveryWindow {
  start: string;
  end: string;
}

export interface OrderCharges {
  deliveryFee: number;
  penaltyFee?: number;
  refundAmount?: number;
  currency: 'VND';
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  packageLabel: string;
  packageType: string;
  payloadKg: number;
  originHubId: string;
  destinationHubId: string;
  deliveryMode: DeliveryMode;
  requestedDeliveryAt?: string;
  requestedDate: string;
  initialEstimatedWindow: DeliveryWindow;
  currentEstimatedWindow: DeliveryWindow;
  planningAt: string;
  status: OrderStatus;
  originHubReceivedAt?: string;
  readyForPickupAt?: string;
  expectedPickupAt?: string;
  pickupDeadline?: string;
  pickupState?: PickupState;
  contactHistory?: CustomerContactEntry[];
  packageDisposition?: PackageDisposition;
  disposedAt?: string;
  disposalConfirmedBy?: string;
  charges?: OrderCharges;
  createdAt: string;
}

export interface DroneAssignmentHistory {
  droneId: string;
  droneName: string;
  replacedAt: string;
  reason: string;
}

export interface Mission {
  id: string;
  orderId: string;
  type: MissionType;
  name: string;
  droneId: string;
  drone: string;
  originHubId: string;
  destinationHubId: string;
  routeId: string;
  route: string;
  status: MissionStatus;
  tone: Tone;
  eta: string;
  battery: number;
  plannedStartAt: string;
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

export interface RouteOption {
  id: string;
  name: string;
  distanceKm: number;
  predictedDurationMin: number;
  predictedEnergyWh: number;
  batteryConsumptionPct: number;
  confidencePct: number;
  risk: 'Low' | 'Medium' | 'High';
  weatherImpact: string;
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
  selectedRouteId: string;
  updatedAt: string;
}

export interface OperatorNavItem {
  label: string;
  path: string;
  icon: import('../../../components/ui/Icon').IconName;
  children?: Array<{ label: string; path: string }>;
}
