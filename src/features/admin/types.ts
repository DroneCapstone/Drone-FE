export type AdminHubStatus = "ACTIVE" | "INACTIVE";
export type AdminDroneStatus = "AVAILABLE" | "MAINTENANCE" | "IN_FLIGHT";
export type AdminBatteryOperationalStatus = "READY" | "CHARGING" | "INSTALLED" | "MAINTENANCE";
export type AdminBatteryStatus = "ACTIVE" | "RETIRED";
export type AdminBatteryPhysicalCondition = "NORMAL" | "SWOLLEN" | "LEAKING" | "CRACKED" | "DAMAGED";
export type AdminUserRole = "admin" | "operator" | "technician" | "customer";
export type AdminUserStatus = "ACTIVE" | "INACTIVE";
export type AdminPaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type AdminRefundStatus = "PENDING" | "COMPLETED" | "FAILED";
export type AdminAuditResult = "SUCCESS" | "FAILED";

export interface AdminHub {
  id: string;
  name: string;
  code: string;
  area: string;
  address: string;
  latitude: number;
  longitude: number;
  status: AdminHubStatus;
  capacity: number;
  technicianIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminDrone {
  id: string;
  name: string;
  displayId: string;
  model: string;
  hubId: string;
  status: AdminDroneStatus;
  isActive: boolean;
  batteryPct: number;
  installedBatteryId?: string;
  maxPayloadKg: number;
  lastFlightAt?: string;
  lastMaintenanceAt?: string;
  nextMaintenanceAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBattery {
  id: string;
  model: string;
  hubId: string;
  droneId?: string;
  chargeLevelPct: number;
  operationalStatus: AdminBatteryOperationalStatus;
  administrativeStatus: AdminBatteryStatus;
  designCapacityMah: number;
  designEnergyWh: number;
  fullChargeCapacityMah: number;
  sohPct: number;
  cycleCount: number;
  maxCycles: number;
  cellVoltages?: number[];
  maxCellVoltageDelta?: number;
  physicalCondition: AdminBatteryPhysicalCondition;
  retirementRecommended: boolean;
  retirementReason?: string;
  retirementRecommendedBy?: string;
  retirementRecommendedAt?: string;
  retiredBy?: string;
  retiredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  hubId?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  invitationSentAt?: string; // Prototype metadata only, no email delivery.
  accessResetAt?: string;
}

export interface AdminPayment {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  amountVnd: number;
  status: AdminPaymentStatus;
  paymentMethod: string;
  providerReference?: string;
  refundable: boolean;
  refundBlockReason?: string;
  createdAt: string;
  paidAt?: string;
  refundedAt?: string;
}

export interface AdminRefund {
  id: string;
  paymentId: string;
  orderId: string;
  customerName: string;
  amountVnd: number;
  reason: string;
  status: AdminRefundStatus;
  requestedAt: string;
  processedAt?: string;
}

export interface AdminAlert {
  id: string;
  severity: "Critical" | "Warning" | "Info";
  title: string;
  detail: string;
  source: string;
  occurredAt: string;
}

export interface AdminAuditLog {
  id: string;
  actor: string;
  role: AdminUserRole;
  action: string;
  entityType: string;
  entityId: string;
  result: AdminAuditResult;
  beforeValue?: string;
  afterValue?: string;
  occurredAt: string;
}

export interface AdminSettings {
  missionTimeoutMinutes: number;
  planningLeadTimeMinutes: number;
  minimumMissionBatteryPct: number;
  lowBatteryWarningPct: number;
  minimumBatterySohPct: number;
  maximumCellVoltageDelta: number;
  batterySafetyReservePct: number;
  telemetryTimeoutSeconds: number;
  paymentNotifications: boolean;
  orderStatusNotifications: boolean;
  missionIncidentNotifications: boolean;
  maintenanceNotifications: boolean;
  batteryHealthNotifications: boolean;
  retirementRecommendationNotifications: boolean;
  systemNotifications: boolean;
  emailNotifications: boolean;
}
