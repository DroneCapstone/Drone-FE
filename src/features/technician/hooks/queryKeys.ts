export const technicianQueryKeys = {
  all: ["technician"] as const,

  technicianAuth: () =>
    [
      ...technicianQueryKeys.all,
      "auth",
    ] as const,

  technicianUsers: () =>
    [
      ...technicianQueryKeys.all,
      "users",
    ] as const,

  aiPredictions: () =>
    [
      ...technicianQueryKeys.all,
      "ai-predictions",
    ] as const,

  fleet: () =>
    [...technicianQueryKeys.all, "fleet"] as const,

  drone: (droneId: string) =>
    [
      ...technicianQueryKeys.all,
      "drone",
      droneId,
    ] as const,

  droneMaintenance: (droneId: string) =>
    [
      ...technicianQueryKeys.all,
      "drone-maintenance",
      droneId,
    ] as const,

  transit: () =>
    [...technicianQueryKeys.all, "transit"] as const,

  missions: () =>
    [...technicianQueryKeys.all, "missions"] as const,


  batteries: () =>
    [...technicianQueryKeys.all, "batteries"] as const,

  battery: (batteryId: string) =>
    [
      ...technicianQueryKeys.all,
      "battery",
      batteryId,
    ] as const,

  outbound: () =>
    [...technicianQueryKeys.all, "outbound"] as const,

  confirmations: () =>
    [...technicianQueryKeys.all, "confirmations"] as const,

  maintenanceAlerts: () =>
    [
      ...technicianQueryKeys.all,
      "maintenance-alerts",
    ] as const,

  workOrders: () =>
    [...technicianQueryKeys.all, "work-orders"] as const,

  workOrder: (workOrderId: string) =>
    [
      ...technicianQueryKeys.all,
      "work-order",
      workOrderId,
    ] as const,


  maintenanceAlert: (alertId: string) =>
    [
      ...technicianQueryKeys.all,
      "maintenance-alert",
      alertId,
    ] as const,

  maintenanceRecords: (droneId: string) =>
    [
      ...technicianQueryKeys.all,
      "maintenance-records",
      droneId,
    ] as const,

  workOrderLogs: (workOrderId: string) =>
    [
      ...technicianQueryKeys.all,
      "work-order-logs",
      workOrderId,
    ] as const,

  maintenanceSchedules: () =>
    [
      ...technicianQueryKeys.all,
      "maintenance-schedules",
    ] as const,

  droneMaintenanceSchedules: (droneId: string) =>
    [
      ...technicianQueryKeys.all,
      "maintenance-schedules",
      "drone",
      droneId,
    ] as const,

  notifications: () =>
    [...technicianQueryKeys.all, "notifications"] as const,

  unreadCount: () =>
    [...technicianQueryKeys.all, "unread-count"] as const,

  profile: () =>
    [...technicianQueryKeys.all, "profile"] as const,
};
