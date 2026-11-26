import type {
  AdminAlert,
  AdminAuditLog,
  AdminBattery,
  AdminDrone,
  AdminHub,
  AdminPayment,
  AdminRefund,
  AdminSettings,
  AdminUser,
} from "../types";

export const defaultAdminHubs: AdminHub[] = [
  { id: "hub-01", name: "Hub HCM-01", code: "HCM-01", area: "Thu Duc", address: "Thu Duc City, Ho Chi Minh City", latitude: 10.8492, longitude: 106.7717, status: "ACTIVE", capacity: 24, technicianIds: ["tech-01"], createdAt: "2026-02-12T08:00:00+07:00", updatedAt: "2026-09-30T15:20:00+07:00" },
  { id: "hub-02", name: "Hub HCM-02", code: "HCM-02", area: "District 7", address: "District 7, Ho Chi Minh City", latitude: 10.7325, longitude: 106.7219, status: "ACTIVE", capacity: 20, technicianIds: ["tech-02"], createdAt: "2026-03-03T08:00:00+07:00", updatedAt: "2026-10-01T09:10:00+07:00" },
  { id: "hub-03", name: "Hub HCM-03", code: "HCM-03", area: "Tan Binh", address: "Tan Binh District, Ho Chi Minh City", latitude: 10.8018, longitude: 106.652, status: "ACTIVE", capacity: 18, technicianIds: ["tech-03"], createdAt: "2026-03-24T08:00:00+07:00", updatedAt: "2026-10-01T10:22:00+07:00" },
  { id: "hub-04", name: "Hub HCM-04", code: "HCM-04", area: "Binh Thanh", address: "Binh Thanh District, Ho Chi Minh City", latitude: 10.8106, longitude: 106.7091, status: "ACTIVE", capacity: 16, technicianIds: ["tech-04"], createdAt: "2026-04-18T08:00:00+07:00", updatedAt: "2026-09-28T13:00:00+07:00" },
  { id: "hub-05", name: "Hub HCM-05", code: "HCM-05", area: "Binh Tan", address: "Binh Tan District, Ho Chi Minh City", latitude: 10.7653, longitude: 106.6037, status: "INACTIVE", capacity: 14, technicianIds: [], createdAt: "2026-05-11T08:00:00+07:00", updatedAt: "2026-10-02T07:45:00+07:00" },
  { id: "hub-06", name: "Hub HCM-06", code: "HCM-06", area: "Go Vap", address: "Go Vap District, Ho Chi Minh City", latitude: 10.8387, longitude: 106.6654, status: "ACTIVE", capacity: 14, technicianIds: ["tech-05"], createdAt: "2026-06-02T08:00:00+07:00", updatedAt: "2026-09-29T17:10:00+07:00" },
];

export const defaultAdminDrones: AdminDrone[] = [
  { id: "DR-001", name: "CX-01", displayId: "01", model: "DJI FlyCart 30", hubId: "hub-01", status: "AVAILABLE", isActive: true, batteryPct: 100, installedBatteryId: "BAT-001", maxPayloadKg: 30, lastFlightAt: "2026-10-02T17:42:00+07:00", lastMaintenanceAt: "2026-09-12T09:00:00+07:00", nextMaintenanceAt: "2026-10-12T09:00:00+07:00", createdAt: "2026-02-12T08:30:00+07:00", updatedAt: "2026-10-02T17:42:00+07:00" },
  { id: "DR-002", name: "CX-02", displayId: "02", model: "DJI FlyCart 30", hubId: "hub-02", status: "IN_FLIGHT", isActive: true, batteryPct: 74, installedBatteryId: "BAT-002", maxPayloadKg: 30, lastFlightAt: "2026-10-04T14:32:00+07:00", lastMaintenanceAt: "2026-09-14T11:30:00+07:00", nextMaintenanceAt: "2026-10-14T11:30:00+07:00", createdAt: "2026-02-15T08:30:00+07:00", updatedAt: "2026-10-04T14:32:00+07:00" },
  { id: "DR-003", name: "CX-03", displayId: "03", model: "Matrice 350 RTK", hubId: "hub-01", status: "MAINTENANCE", isActive: true, batteryPct: 48, installedBatteryId: "BAT-003", maxPayloadKg: 9.2, lastFlightAt: "2026-10-01T13:10:00+07:00", lastMaintenanceAt: "2026-10-02T08:30:00+07:00", nextMaintenanceAt: "2026-10-08T08:30:00+07:00", createdAt: "2026-03-01T08:30:00+07:00", updatedAt: "2026-10-02T08:30:00+07:00" },
  { id: "DR-004", name: "CX-04", displayId: "04", model: "DJI FlyCart 30", hubId: "hub-03", status: "AVAILABLE", isActive: true, batteryPct: 96, installedBatteryId: "BAT-004", maxPayloadKg: 30, lastFlightAt: "2026-10-03T11:42:00+07:00", createdAt: "2026-03-22T08:30:00+07:00", updatedAt: "2026-10-03T11:42:00+07:00" },
  { id: "DR-005", name: "CX-05", displayId: "05", model: "DJI FlyCart 30", hubId: "hub-04", status: "AVAILABLE", isActive: true, batteryPct: 89, installedBatteryId: "BAT-005", maxPayloadKg: 30, lastFlightAt: "2026-10-03T09:20:00+07:00", createdAt: "2026-04-20T08:30:00+07:00", updatedAt: "2026-10-03T09:20:00+07:00" },
  { id: "DR-006", name: "CX-06", displayId: "06", model: "Matrice 350 RTK", hubId: "hub-06", status: "AVAILABLE", isActive: true, batteryPct: 91, installedBatteryId: "BAT-006", maxPayloadKg: 9.2, lastFlightAt: "2026-10-03T16:40:00+07:00", createdAt: "2026-05-07T08:30:00+07:00", updatedAt: "2026-10-03T16:40:00+07:00" },
  { id: "DR-007", name: "CX-07", displayId: "07", model: "DJI FlyCart 30", hubId: "hub-03", status: "AVAILABLE", isActive: false, batteryPct: 100, installedBatteryId: "BAT-007", maxPayloadKg: 30, createdAt: "2026-06-02T08:30:00+07:00", updatedAt: "2026-09-29T09:00:00+07:00" },
  { id: "DR-008", name: "CX-08", displayId: "08", model: "DJI FlyCart 30", hubId: "hub-02", status: "IN_FLIGHT", isActive: true, batteryPct: 63, installedBatteryId: "BAT-008", maxPayloadKg: 30, lastFlightAt: "2026-10-04T14:50:00+07:00", createdAt: "2026-06-18T08:30:00+07:00", updatedAt: "2026-10-04T14:50:00+07:00" },
  { id: "DR-009", name: "CX-09", displayId: "09", model: "Matrice 350 RTK", hubId: "hub-04", status: "AVAILABLE", isActive: true, batteryPct: 84, installedBatteryId: "BAT-009", maxPayloadKg: 9.2, createdAt: "2026-07-12T08:30:00+07:00", updatedAt: "2026-10-03T12:10:00+07:00" },
  { id: "DR-010", name: "CX-10", displayId: "10", model: "DJI FlyCart 30", hubId: "hub-06", status: "MAINTENANCE", isActive: true, batteryPct: 35, installedBatteryId: "BAT-010", maxPayloadKg: 30, lastMaintenanceAt: "2026-10-04T08:20:00+07:00", createdAt: "2026-08-01T08:30:00+07:00", updatedAt: "2026-10-04T08:20:00+07:00" },
];

const batteryHubMap = ["hub-01", "hub-02", "hub-01", "hub-03", "hub-04", "hub-06", "hub-03", "hub-02", "hub-04", "hub-06", "hub-01", "hub-02", "hub-03", "hub-04", "hub-06", "hub-02"];

export const defaultAdminBatteries: AdminBattery[] = Array.from({ length: 16 }, (_, index) => {
  const id = `BAT-${String(index + 1).padStart(3, "0")}`;
  const installed = index < 10;
  const sohPct = [96, 93, 88, 91, 86, 84, 82, 79, 94, 77, 89, 83, 92, 81, 76, 87][index];
  const cycleCount = [62, 91, 148, 116, 202, 236, 271, 318, 105, 361, 179, 254, 128, 287, 402, 220][index];
  const maxCycles = index % 2 === 0 ? 400 : 500;
  const delta = [0.018, 0.024, 0.041, 0.029, 0.052, 0.061, 0.073, 0.11, 0.032, 0.12, 0.045, 0.067, 0.028, 0.083, 0.052, 0.048][index];
  const physicalCondition = index === 14 ? "SWOLLEN" : "NORMAL";
  const retirementRecommended = sohPct < 80 || cycleCount >= maxCycles || physicalCondition !== "NORMAL";
  const retirementReason =
    physicalCondition !== "NORMAL"
      ? "PHYSICAL_DAMAGE"
      : sohPct < 80
        ? "SOH_BELOW_THRESHOLD"
        : cycleCount >= maxCycles
          ? "MAX_CYCLE_REACHED"
          : undefined;
  const retired = index === 14;
  const designCapacityMah = index % 2 === 0 ? 12000 : 5880;
  const designEnergyWh = index % 2 === 0 ? 532 : 263;
  const fullChargeCapacityMah = Math.round((designCapacityMah * sohPct) / 100);
  const baseCell = 4.16;
  const cellVoltages = Array.from({ length: 6 }, (_, cell) => Number((baseCell - (cell === 4 ? delta : cell * 0.003)).toFixed(3)));

  return {
    id,
    model: index % 2 === 0 ? "FC30 Battery Pack" : "TB65",
    hubId: batteryHubMap[index],
    droneId: installed && !retired ? `DR-${String(index + 1).padStart(3, "0")}` : undefined,
    chargeLevelPct: installed ? defaultAdminDrones[index]?.batteryPct ?? 80 : index % 3 === 0 ? 68 : 100,
    operationalStatus: retired ? "MAINTENANCE" : installed ? (index === 2 || index === 9 ? "MAINTENANCE" : "INSTALLED") : index % 3 === 0 ? "CHARGING" : "READY",
    administrativeStatus: retired ? "RETIRED" : "ACTIVE",
    designCapacityMah,
    designEnergyWh,
    fullChargeCapacityMah,
    sohPct,
    cycleCount,
    maxCycles,
    cellVoltages,
    maxCellVoltageDelta: delta,
    physicalCondition,
    retirementRecommended,
    retirementReason,
    retirementRecommendedBy: retirementRecommended ? "Battery Health Policy" : undefined,
    retirementRecommendedAt: retirementRecommended ? "2026-10-04T09:30:00+07:00" : undefined,
    retiredBy: retired ? "admin-01" : undefined,
    retiredAt: retired ? "2026-10-04T10:05:00+07:00" : undefined,
    createdAt: "2026-03-01T08:00:00+07:00",
    updatedAt: "2026-10-04T10:05:00+07:00",
  };
});

export const defaultAdminUsers: AdminUser[] = [
  { id: "admin-01", fullName: "System Administrator", email: "admin@droneopt.ai", role: "admin", status: "ACTIVE", createdAt: "2026-01-15T08:00:00+07:00", updatedAt: "2026-10-04T08:00:00+07:00", lastLoginAt: "2026-10-04T14:55:00+07:00" },
  { id: "op-01", fullName: "Nguyen Minh Operator", email: "operator@droneopt.ai", role: "operator", status: "ACTIVE", createdAt: "2026-02-01T08:00:00+07:00", updatedAt: "2026-09-20T08:00:00+07:00", lastLoginAt: "2026-10-04T14:34:00+07:00" },
  { id: "tech-01", fullName: "Tran An Technician", email: "tech01@droneopt.ai", role: "technician", status: "ACTIVE", hubId: "hub-01", createdAt: "2026-02-06T08:00:00+07:00", updatedAt: "2026-09-12T08:00:00+07:00", lastLoginAt: "2026-10-04T13:52:00+07:00" },
  { id: "tech-02", fullName: "Le Vy Technician", email: "tech02@droneopt.ai", role: "technician", status: "ACTIVE", hubId: "hub-02", createdAt: "2026-02-08T08:00:00+07:00", updatedAt: "2026-09-13T08:00:00+07:00", lastLoginAt: "2026-10-04T13:15:00+07:00" },
  { id: "tech-03", fullName: "Pham Khoa Technician", email: "tech03@droneopt.ai", role: "technician", status: "ACTIVE", hubId: "hub-03", createdAt: "2026-03-12T08:00:00+07:00", updatedAt: "2026-09-14T08:00:00+07:00", lastLoginAt: "2026-10-04T12:40:00+07:00" },
  { id: "tech-04", fullName: "Hoang Nam Technician", email: "tech04@droneopt.ai", role: "technician", status: "ACTIVE", hubId: "hub-04", createdAt: "2026-04-22T08:00:00+07:00", updatedAt: "2026-09-15T08:00:00+07:00", lastLoginAt: "2026-10-04T11:33:00+07:00" },
  { id: "tech-05", fullName: "Do Minh Technician", email: "tech05@droneopt.ai", role: "technician", status: "ACTIVE", hubId: "hub-06", createdAt: "2026-06-10T08:00:00+07:00", updatedAt: "2026-09-16T08:00:00+07:00", lastLoginAt: "2026-10-04T10:28:00+07:00" },
  { id: "cust-01", fullName: "Customer One", email: "customer1@example.com", role: "customer", status: "ACTIVE", createdAt: "2026-07-18T08:00:00+07:00", updatedAt: "2026-09-20T08:00:00+07:00", lastLoginAt: "2026-10-04T14:20:00+07:00" },
  { id: "cust-02", fullName: "Customer Two", email: "customer2@example.com", role: "customer", status: "ACTIVE", createdAt: "2026-08-07T08:00:00+07:00", updatedAt: "2026-09-21T08:00:00+07:00", lastLoginAt: "2026-10-04T12:45:00+07:00" },
  { id: "cust-03", fullName: "Customer Three", email: "customer3@example.com", role: "customer", status: "INACTIVE", createdAt: "2026-09-01T11:15:00+07:00", updatedAt: "2026-10-01T11:15:00+07:00" },
];

export const adminPayments: AdminPayment[] = [
  { id: "PAY-24031", orderId: "ORD-6302", customerName: "Customer One", customerEmail: "customer1@example.com", amountVnd: 485000, status: "PAID", paymentMethod: "VNPay", providerReference: "VNP-884201", refundable: true, createdAt: "2026-10-04T08:40:00+07:00", paidAt: "2026-10-04T08:42:00+07:00" },
  { id: "PAY-24030", orderId: "ORD-6301", customerName: "Customer Two", customerEmail: "customer2@example.com", amountVnd: 620000, status: "PAID", paymentMethod: "MoMo", providerReference: "MM-550912", refundable: true, createdAt: "2026-10-04T08:10:00+07:00", paidAt: "2026-10-04T08:12:00+07:00" },
  { id: "PAY-24029", orderId: "ORD-6300", customerName: "Customer Three", customerEmail: "customer3@example.com", amountVnd: 390000, status: "FAILED", paymentMethod: "VNPay", refundable: false, refundBlockReason: "Payment was not captured.", createdAt: "2026-10-04T07:44:00+07:00" },
  { id: "PAY-24028", orderId: "ORD-6299", customerName: "Linh Tran", customerEmail: "linh@example.com", amountVnd: 710000, status: "PENDING", paymentMethod: "VNPay", refundable: false, refundBlockReason: "Payment is still pending.", createdAt: "2026-10-04T07:12:00+07:00" },
  { id: "PAY-24027", orderId: "ORD-6298", customerName: "Minh Nguyen", customerEmail: "minh@example.com", amountVnd: 520000, status: "REFUNDED", paymentMethod: "MoMo", providerReference: "MM-550101", refundable: false, refundBlockReason: "Transaction has already been refunded.", createdAt: "2026-10-03T18:22:00+07:00", paidAt: "2026-10-03T18:24:00+07:00", refundedAt: "2026-10-04T09:20:00+07:00" },
];

export const adminRefunds: AdminRefund[] = [
  { id: "REF-1008", paymentId: "PAY-24027", orderId: "ORD-6298", customerName: "Minh Nguyen", amountVnd: 520000, reason: "Order cancelled before Drop-off Point receive", status: "COMPLETED", requestedAt: "2026-10-04T09:05:00+07:00", processedAt: "2026-10-04T09:20:00+07:00" },
  { id: "REF-1009", paymentId: "PAY-24021", orderId: "ORD-6292", customerName: "Vy Le", amountVnd: 440000, reason: "Duplicate payment", status: "PENDING", requestedAt: "2026-10-04T10:18:00+07:00" },
];

export const adminAlerts: AdminAlert[] = [
  { id: "ALT-001", severity: "Warning", title: "3 batteries need retirement review", detail: "Battery health policy detected low SOH, maximum cycle count or physical damage.", source: "Battery Health", occurredAt: "2026-10-04T09:30:00+07:00" },
  { id: "ALT-002", severity: "Warning", title: "2 drones are in maintenance", detail: "DR-003 and DR-010 are unavailable for new missions.", source: "Fleet", occurredAt: "2026-10-04T08:28:00+07:00" },
  { id: "ALT-003", severity: "Info", title: "1 payment pending reconciliation", detail: "PAY-24028 remains pending and should be monitored.", source: "Payments", occurredAt: "2026-10-04T07:30:00+07:00" },
];

export const adminAuditLogs: AdminAuditLog[] = [
  { id: "AUD-1001", actor: "System Administrator", role: "admin", action: "RETIRE_BATTERY", entityType: "Battery", entityId: "BAT-015", result: "SUCCESS", beforeValue: "administrativeStatus=ACTIVE", afterValue: "administrativeStatus=RETIRED", occurredAt: "2026-10-04T10:05:00+07:00" },
  { id: "AUD-1002", actor: "Nguyen Minh Operator", role: "operator", action: "CREATE_MISSION", entityType: "Mission", entityId: "MS-2042", result: "SUCCESS", occurredAt: "2026-10-04T09:20:02+07:00" },
  { id: "AUD-1003", actor: "Le Vy Technician", role: "technician", action: "UPDATE_DRONE_STATUS", entityType: "Drone", entityId: "DR-003", result: "SUCCESS", beforeValue: "AVAILABLE", afterValue: "MAINTENANCE", occurredAt: "2026-10-04T08:44:33+07:00" },
  { id: "AUD-1004", actor: "System Administrator", role: "admin", action: "DEACTIVATE_HUB", entityType: "Hub", entityId: "hub-05", result: "SUCCESS", beforeValue: "ACTIVE", afterValue: "INACTIVE", occurredAt: "2026-10-03T19:42:15+07:00" },
  { id: "AUD-1005", actor: "System Administrator", role: "admin", action: "ASSIGN_TECHNICIAN_HUB", entityType: "User", entityId: "tech-04", result: "SUCCESS", beforeValue: "hubId=null", afterValue: "hubId=hub-04", occurredAt: "2026-10-03T15:11:10+07:00" },
];

export const defaultAdminSettings: AdminSettings = {
  missionTimeoutMinutes: 180,
  planningLeadTimeMinutes: 60,
  minimumMissionBatteryPct: 30,
  lowBatteryWarningPct: 20,
  minimumBatterySohPct: 80,
  maximumCellVoltageDelta: 0.1,
  batterySafetyReservePct: 20,
  telemetryTimeoutSeconds: 30,
  paymentNotifications: true,
  orderStatusNotifications: true,
  missionIncidentNotifications: true,
  maintenanceNotifications: true,
  batteryHealthNotifications: true,
  retirementRecommendationNotifications: true,
  systemNotifications: true,
  emailNotifications: true,
};

export const adminDashboardRevenue = {
  totalVnd: 684_200_000,
  todayVnd: 18_600_000,
  monthVnd: 128_400_000,
  todayDelta: "+8.4%",
  paidOrdersToday: 23,
  paidOrdersMonth: 286,
  pendingPayments: 31,
  refundsMonth: 9,
};

export const adminRevenueTrend = {
  Today: {
    totalVnd: 18_600_000,
    caption: "captured today",
    delta: "+8.4% vs yesterday",
    values: [1.8, 2.7, 3.1, 4.2, 3.7, 3.1],
    labels: ["06:00", "09:00", "12:00", "15:00", "18:00", "Now"],
  },
  "7 Days": {
    totalVnd: 112_400_000,
    caption: "last 7 days",
    delta: "+12.8%",
    values: [12.8, 15.4, 13.9, 18.1, 16.7, 16.9, 18.6],
    labels: ["Sep 28", "Sep 29", "Sep 30", "Oct 01", "Oct 02", "Oct 03", "Oct 04"],
  },
  Month: {
    totalVnd: 128_400_000,
    caption: "October 2026",
    delta: "+10.6% vs Sep",
    values: [27.2, 29.6, 32.8, 38.8],
    labels: ["W1", "W2", "W3", "W4"],
  },
} as const;

export const adminDashboardMissionSummary = {
  scheduled: 12,
  inProgress: 7,
  completed: 82,
  failed: 3,
  cancelled: 2,
  completedToday: 23,
  successRatePct: 94.3,
};

// Kept for compatibility with any older admin UI import.
export const revenueSeries = adminRevenueTrend["7 Days"].values;

/**
 * Prototype-only system logs, used by SystemLogsPage.
 * These are sample entries, NOT runtime/backend logs.
 */
export const adminSystemLogs = [
  {
    id: "SYS-DEMO-001",
    level: "INFO",
    service: "Prototype",
    message: "Demo event: administration prototype initialized (sample only).",
    occurredAt: "2026-10-04T09:00:00+07:00",
  },
  {
    id: "SYS-DEMO-002",
    level: "WARN",
    service: "Mission Monitoring",
    message: "Demo warning: a telemetry update was delayed (sample only).",
    occurredAt: "2026-10-04T09:12:00+07:00",
  },
  {
    id: "SYS-DEMO-003",
    level: "ERROR",
    service: "Payment Gateway",
    message: "Demo error: simulated payment gateway timeout (sample only).",
    occurredAt: "2026-10-04T09:25:00+07:00",
  },
] as const;

/** Seed activity feed from existing demo audit events. New prototype actions
 * are displayed separately via getPrototypeActivity() in ActivityLogPage. */
export const adminActivityLogs = adminAuditLogs.map((log) => ({
  id: `ACT-${log.id}`,
  user: log.actor,
  activity: `${log.action.replace(/_/g, " ")} · ${log.entityType} ${log.entityId}`,
  module: log.entityType,
  occurredAt: log.occurredAt,
}));
