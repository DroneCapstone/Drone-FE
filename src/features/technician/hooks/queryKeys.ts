export const technicianQueryKeys = {
  all: ["technician"] as const,

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

  batteries: () =>
    [...technicianQueryKeys.all, "batteries"] as const,

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

  notifications: () =>
    [...technicianQueryKeys.all, "notifications"] as const,

  unreadCount: () =>
    [...technicianQueryKeys.all, "unread-count"] as const,

  profile: () =>
    [...technicianQueryKeys.all, "profile"] as const,
};
