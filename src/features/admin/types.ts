export type AdminHubStatus = "Active" | "Inactive" | "Maintenance";
export type AdminDroneTechnicalStatus = "Serviceable" | "Maintenance";
export type AdminDroneOperationalStatus = "Idle" | "Assigned" | "In Flight" | "Charging";
export type AdminBatteryStatus = "Ready" | "Charging" | "In Use" | "Maintenance" | "Retired";
export type AdminUserRole = "admin" | "operator" | "technician" | "customer";
export type AdminUserStatus = "Active" | "Suspended" | "Pending";

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
  serialNumber: string;
  hubId: string;
  technicalStatus: AdminDroneTechnicalStatus;
  operationalStatus: AdminDroneOperationalStatus;
  batteryPct: number;
  installedBatteryId?: string;
  maxPayloadKg: number;
  utilizationPct: number;
  lastFlightAt?: string;
  lastMaintenanceAt?: string;
  nextMaintenanceAt?: string;
}

export interface AdminBattery {
  id: string;
  model: string;
  serialNumber: string;
  hubId: string;
  droneId?: string;
  chargeLevelPct: number;
  status: AdminBatteryStatus;
  cycleCount: number;
  healthPct: number;
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
  lastLoginAt?: string;
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
  resource: string;
  detail: string;
  ipAddress: string;
  occurredAt: string;
}

export interface AdminSystemLog {
  id: string;
  level: "ERROR" | "WARN" | "INFO";
  service: string;
  message: string;
  occurredAt: string;
}

export interface AdminActivityLog {
  id: string;
  user: string;
  activity: string;
  module: string;
  occurredAt: string;
}

export interface DataQualityMetric {
  key: "missing" | "duplicate" | "outlier" | "validity";
  label: string;
  count: number;
  ratePct: number;
  trend: "up" | "down" | "stable";
  affectedDataset: string;
}
