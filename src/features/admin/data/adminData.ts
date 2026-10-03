import type {
  AdminActivityLog,
  AdminAlert,
  AdminAuditLog,
  AdminBattery,
  AdminDrone,
  AdminHub,
  AdminSystemLog,
  AdminUser,
  DataQualityMetric,
} from "../types";

export const defaultAdminHubs: AdminHub[] = [
  { id: "hub-01", name: "Hub HCM-01", code: "HCM-01", area: "Thu Duc", address: "Thu Duc City, Ho Chi Minh City", latitude: 10.8492, longitude: 106.7717, status: "Active", capacity: 24, technicianIds: ["tech-01"], createdAt: "2026-02-12T08:00:00+07:00", updatedAt: "2026-09-30T15:20:00+07:00" },
  { id: "hub-02", name: "Hub HCM-02", code: "HCM-02", area: "District 7", address: "District 7, Ho Chi Minh City", latitude: 10.7325, longitude: 106.7219, status: "Active", capacity: 20, technicianIds: ["tech-02"], createdAt: "2026-03-03T08:00:00+07:00", updatedAt: "2026-10-01T09:10:00+07:00" },
  { id: "hub-03", name: "Hub HCM-03", code: "HCM-03", area: "Tan Binh", address: "Tan Binh District, Ho Chi Minh City", latitude: 10.8018, longitude: 106.6520, status: "Active", capacity: 18, technicianIds: ["tech-03"], createdAt: "2026-03-24T08:00:00+07:00", updatedAt: "2026-10-01T10:22:00+07:00" },
  { id: "hub-04", name: "Hub HCM-04", code: "HCM-04", area: "Binh Thanh", address: "Binh Thanh District, Ho Chi Minh City", latitude: 10.8106, longitude: 106.7091, status: "Active", capacity: 16, technicianIds: ["tech-04"], createdAt: "2026-04-18T08:00:00+07:00", updatedAt: "2026-09-28T13:00:00+07:00" },
  { id: "hub-05", name: "Hub HCM-05", code: "HCM-05", area: "Binh Tan", address: "Binh Tan District, Ho Chi Minh City", latitude: 10.7653, longitude: 106.6037, status: "Maintenance", capacity: 14, technicianIds: [], createdAt: "2026-05-11T08:00:00+07:00", updatedAt: "2026-10-02T07:45:00+07:00" },
  { id: "hub-06", name: "Hub HCM-06", code: "HCM-06", area: "Go Vap", address: "Go Vap District, Ho Chi Minh City", latitude: 10.8387, longitude: 106.6654, status: "Active", capacity: 14, technicianIds: ["tech-05"], createdAt: "2026-06-02T08:00:00+07:00", updatedAt: "2026-09-29T17:10:00+07:00" },
];

export const defaultAdminDrones: AdminDrone[] = [
  { id: "DR-001", name: "CX", displayId: "01", model: "DJI FlyCart 30", serialNumber: "FC30-HCM-0001", hubId: "hub-01", technicalStatus: "Serviceable", operationalStatus: "Idle", batteryPct: 100, installedBatteryId: "BAT-001", maxPayloadKg: 30, utilizationPct: 66, lastFlightAt: "2026-10-02T17:42:00+07:00", lastMaintenanceAt: "2026-09-12T09:00:00+07:00", nextMaintenanceAt: "2026-10-12T09:00:00+07:00" },
  { id: "DR-002", name: "CX", displayId: "02", model: "DJI FlyCart 30", serialNumber: "FC30-HCM-0002", hubId: "hub-02", technicalStatus: "Serviceable", operationalStatus: "Assigned", batteryPct: 92, installedBatteryId: "BAT-002", maxPayloadKg: 30, utilizationPct: 74, lastFlightAt: "2026-10-02T18:22:00+07:00", lastMaintenanceAt: "2026-09-14T11:30:00+07:00", nextMaintenanceAt: "2026-10-14T11:30:00+07:00" },
  { id: "DR-003", name: "CX", displayId: "03", model: "Matrice 350 RTK", serialNumber: "M350-HCM-0003", hubId: "hub-01", technicalStatus: "Maintenance", operationalStatus: "Idle", batteryPct: 48, installedBatteryId: "BAT-003", maxPayloadKg: 9.2, utilizationPct: 41, lastFlightAt: "2026-10-01T13:10:00+07:00", lastMaintenanceAt: "2026-10-02T08:30:00+07:00", nextMaintenanceAt: "2026-10-02T15:30:00+07:00" },
  { id: "DR-004", name: "CX", displayId: "04", model: "DJI FlyCart 30", serialNumber: "FC30-HCM-0004", hubId: "hub-03", technicalStatus: "Serviceable", operationalStatus: "In Flight", batteryPct: 71, installedBatteryId: "BAT-004", maxPayloadKg: 30, utilizationPct: 82, lastFlightAt: "2026-10-02T20:52:00+07:00", lastMaintenanceAt: "2026-09-18T10:20:00+07:00", nextMaintenanceAt: "2026-10-18T10:20:00+07:00" },
  { id: "DR-005", name: "CX", displayId: "05", model: "Matrice 350 RTK", serialNumber: "M350-HCM-0005", hubId: "hub-04", technicalStatus: "Serviceable", operationalStatus: "Charging", batteryPct: 63, installedBatteryId: "BAT-005", maxPayloadKg: 9.2, utilizationPct: 53, lastFlightAt: "2026-10-02T16:05:00+07:00", lastMaintenanceAt: "2026-09-19T09:50:00+07:00", nextMaintenanceAt: "2026-10-19T09:50:00+07:00" },
  { id: "DR-006", name: "CX", displayId: "06", model: "DJI FlyCart 30", serialNumber: "FC30-HCM-0006", hubId: "hub-04", technicalStatus: "Serviceable", operationalStatus: "Idle", batteryPct: 100, installedBatteryId: "BAT-006", maxPayloadKg: 30, utilizationPct: 61, lastFlightAt: "2026-10-02T15:34:00+07:00", lastMaintenanceAt: "2026-09-20T14:40:00+07:00", nextMaintenanceAt: "2026-10-20T14:40:00+07:00" },
  { id: "DR-007", name: "CX", displayId: "07", model: "DJI FlyCart 30", serialNumber: "FC30-HCM-0007", hubId: "hub-06", technicalStatus: "Serviceable", operationalStatus: "Idle", batteryPct: 88, installedBatteryId: "BAT-007", maxPayloadKg: 30, utilizationPct: 47, lastFlightAt: "2026-10-02T12:15:00+07:00", lastMaintenanceAt: "2026-09-22T11:15:00+07:00", nextMaintenanceAt: "2026-10-22T11:15:00+07:00" },
  { id: "DR-008", name: "CX", displayId: "08", model: "Matrice 350 RTK", serialNumber: "M350-HCM-0008", hubId: "hub-03", technicalStatus: "Serviceable", operationalStatus: "Idle", batteryPct: 96, installedBatteryId: "BAT-008", maxPayloadKg: 9.2, utilizationPct: 39, lastFlightAt: "2026-10-01T19:20:00+07:00", lastMaintenanceAt: "2026-09-23T16:00:00+07:00", nextMaintenanceAt: "2026-10-23T16:00:00+07:00" },
  { id: "DR-009", name: "CX", displayId: "09", model: "DJI FlyCart 30", serialNumber: "FC30-HCM-0009", hubId: "hub-02", technicalStatus: "Serviceable", operationalStatus: "Idle", batteryPct: 100, installedBatteryId: "BAT-009", maxPayloadKg: 30, utilizationPct: 57, lastFlightAt: "2026-10-02T14:38:00+07:00", lastMaintenanceAt: "2026-09-24T13:15:00+07:00", nextMaintenanceAt: "2026-10-24T13:15:00+07:00" },
  { id: "DR-010", name: "CX", displayId: "10", model: "DJI FlyCart 30", serialNumber: "FC30-HCM-0010", hubId: "hub-06", technicalStatus: "Maintenance", operationalStatus: "Idle", batteryPct: 31, installedBatteryId: "BAT-010", maxPayloadKg: 30, utilizationPct: 68, lastFlightAt: "2026-10-01T17:44:00+07:00", lastMaintenanceAt: "2026-10-02T09:20:00+07:00", nextMaintenanceAt: "2026-10-02T16:20:00+07:00" },
];

export const defaultAdminBatteries: AdminBattery[] = Array.from({ length: 16 }, (_, index) => {
  const id = `BAT-${String(index + 1).padStart(3, "0")}`;
  const installed = index < 10;
  const droneId = installed ? `DR-${String(index + 1).padStart(3, "0")}` : undefined;
  const hubMap = ["hub-01", "hub-02", "hub-01", "hub-03", "hub-04", "hub-04", "hub-06", "hub-03", "hub-02", "hub-06", "hub-01", "hub-02", "hub-03", "hub-04", "hub-06", "hub-02"];
  const status = installed ? (index === 2 || index === 9 ? "Maintenance" : "In Use") : index % 3 === 0 ? "Charging" : "Ready";
  return {
    id,
    model: index % 2 === 0 ? "FC30 Battery Pack" : "TB65",
    serialNumber: `BAT-SN-${2026001 + index}`,
    hubId: hubMap[index],
    droneId,
    chargeLevelPct: installed ? defaultAdminDrones[index]?.batteryPct ?? 80 : status === "Ready" ? 100 : 62 + index,
    status,
    cycleCount: 44 + index * 7,
    healthPct: Math.max(84, 99 - index),
    createdAt: "2026-03-01T08:00:00+07:00",
    updatedAt: "2026-10-02T20:00:00+07:00",
  } as AdminBattery;
});

export const defaultAdminUsers: AdminUser[] = [
  { id: "admin-01", fullName: "System Administrator", email: "admin@droneopt.ai", role: "admin", status: "Active", createdAt: "2026-01-15T08:00:00+07:00", lastLoginAt: "2026-10-02T20:55:00+07:00" },
  { id: "op-01", fullName: "Nguyen Minh Operator", email: "operator@droneopt.ai", role: "operator", status: "Active", createdAt: "2026-02-01T08:00:00+07:00", lastLoginAt: "2026-10-02T20:34:00+07:00" },
  { id: "tech-01", fullName: "Tran An Technician", email: "tech01@droneopt.ai", role: "technician", status: "Active", hubId: "hub-01", createdAt: "2026-02-06T08:00:00+07:00", lastLoginAt: "2026-10-02T19:52:00+07:00" },
  { id: "tech-02", fullName: "Le Vy Technician", email: "tech02@droneopt.ai", role: "technician", status: "Active", hubId: "hub-02", createdAt: "2026-02-08T08:00:00+07:00", lastLoginAt: "2026-10-02T18:15:00+07:00" },
  { id: "tech-03", fullName: "Pham Khoa Technician", email: "tech03@droneopt.ai", role: "technician", status: "Active", hubId: "hub-03", createdAt: "2026-03-12T08:00:00+07:00", lastLoginAt: "2026-10-02T17:40:00+07:00" },
  { id: "tech-04", fullName: "Hoang Nam Technician", email: "tech04@droneopt.ai", role: "technician", status: "Active", hubId: "hub-04", createdAt: "2026-04-22T08:00:00+07:00", lastLoginAt: "2026-10-02T16:33:00+07:00" },
  { id: "tech-05", fullName: "Do Minh Technician", email: "tech05@droneopt.ai", role: "technician", status: "Active", hubId: "hub-06", createdAt: "2026-06-10T08:00:00+07:00", lastLoginAt: "2026-10-02T15:28:00+07:00" },
  { id: "cust-01", fullName: "Customer One", email: "customer1@example.com", role: "customer", status: "Active", createdAt: "2026-07-18T08:00:00+07:00", lastLoginAt: "2026-10-02T20:20:00+07:00" },
  { id: "cust-02", fullName: "Customer Two", email: "customer2@example.com", role: "customer", status: "Active", createdAt: "2026-08-07T08:00:00+07:00", lastLoginAt: "2026-10-02T18:45:00+07:00" },
  { id: "cust-03", fullName: "Customer Pending", email: "customer3@example.com", role: "customer", status: "Pending", createdAt: "2026-10-01T11:15:00+07:00" },
];

export const adminAlerts: AdminAlert[] = [
  { id: "ALT-001", severity: "Critical", title: "Hub HCM-05 unavailable", detail: "Hub is in Maintenance state. New mission allocation is blocked.", source: "Hub Network", occurredAt: "2026-10-02T19:42:00+07:00" },
  { id: "ALT-002", severity: "Warning", title: "2 drones require maintenance", detail: "DR-003 and DR-010 are not serviceable.", source: "Fleet", occurredAt: "2026-10-02T18:28:00+07:00" },
  { id: "ALT-003", severity: "Warning", title: "Payment reconciliation delayed", detail: "3 payment records are pending reconciliation longer than 15 minutes.", source: "Payment", occurredAt: "2026-10-02T18:10:00+07:00" },
  { id: "ALT-004", severity: "Info", title: "AI prediction batch completed", detail: "Energy prediction metrics refreshed for the last 24 hours.", source: "AI/ML", occurredAt: "2026-10-02T17:00:00+07:00" },
];

export const adminAuditLogs: AdminAuditLog[] = [
  { id: "AUD-1001", actor: "System Administrator", role: "admin", action: "UPDATE", resource: "Hub HCM-05", detail: "Changed hub status from Active to Maintenance", ipAddress: "10.10.4.21", occurredAt: "2026-10-02T19:42:15+07:00" },
  { id: "AUD-1002", actor: "Nguyen Minh Operator", role: "operator", action: "CREATE", resource: "Mission MS-2042", detail: "Mission created for paid order ORD-6302", ipAddress: "10.10.3.18", occurredAt: "2026-10-02T19:20:02+07:00" },
  { id: "AUD-1003", actor: "Le Vy Technician", role: "technician", action: "UPDATE", resource: "DR-003", detail: "Technical status changed to Maintenance", ipAddress: "10.10.2.61", occurredAt: "2026-10-02T18:44:33+07:00" },
  { id: "AUD-1004", actor: "Customer One", role: "customer", action: "CREATE", resource: "Order ORD-6302", detail: "Customer submitted delivery order", ipAddress: "113.161.42.19", occurredAt: "2026-10-02T18:09:51+07:00" },
  { id: "AUD-1005", actor: "System Administrator", role: "admin", action: "UPDATE", resource: "User tech-04", detail: "Assigned technician to Hub HCM-04", ipAddress: "10.10.4.21", occurredAt: "2026-10-02T15:11:10+07:00" },
];

export const adminSystemLogs: AdminSystemLog[] = [
  { id: "SYS-01", level: "ERROR", service: "payment-service", message: "Gateway reconciliation timeout for payment PAY-19023", occurredAt: "2026-10-02T19:55:14+07:00" },
  { id: "SYS-02", level: "WARN", service: "telemetry-service", message: "Signal gap detected for DR-004 (8.6 seconds)", occurredAt: "2026-10-02T19:48:22+07:00" },
  { id: "SYS-03", level: "INFO", service: "prediction-service", message: "Energy model inference batch completed: 178 predictions", occurredAt: "2026-10-02T19:30:00+07:00" },
  { id: "SYS-04", level: "INFO", service: "mission-service", message: "Mission MS-2041 completed successfully", occurredAt: "2026-10-02T19:14:07+07:00" },
  { id: "SYS-05", level: "WARN", service: "hub-service", message: "Hub HCM-05 removed from eligible route graph", occurredAt: "2026-10-02T18:59:42+07:00" },
];

export const adminActivityLogs: AdminActivityLog[] = [
  { id: "ACT-01", user: "System Administrator", activity: "Edited Hub HCM-05", module: "Hub Network", occurredAt: "2026-10-02T19:42:15+07:00" },
  { id: "ACT-02", user: "Nguyen Minh Operator", activity: "Approved order ORD-6302", module: "Orders", occurredAt: "2026-10-02T19:24:18+07:00" },
  { id: "ACT-03", user: "Le Vy Technician", activity: "Opened maintenance work order WO-311", module: "Maintenance", occurredAt: "2026-10-02T18:44:33+07:00" },
  { id: "ACT-04", user: "Customer One", activity: "Paid order ORD-6302", module: "Customer / Payment", occurredAt: "2026-10-02T18:13:45+07:00" },
];

export const dataQualityMetrics: DataQualityMetric[] = [
  { key: "missing", label: "Missing Data", count: 6665, ratePct: 2.57, trend: "down", affectedDataset: "Weather telemetry" },
  { key: "duplicate", label: "Duplicate", count: 118, ratePct: 0.05, trend: "down", affectedDataset: "Raw telemetry" },
  { key: "outlier", label: "Outlier", count: 923, ratePct: 0.36, trend: "stable", affectedDataset: "Energy / flight telemetry" },
  { key: "validity", label: "Validity Issues", count: 41, ratePct: 0.02, trend: "down", affectedDataset: "Mission + fleet records" },
];

export const revenueSeries = [18.2, 21.4, 19.8, 25.6, 29.4, 26.9, 33.8, 37.1, 35.7, 42.6, 44.1, 48.9];
export const missionSeries = [12, 18, 14, 22, 25, 21, 28, 31, 27, 35, 37, 41];
