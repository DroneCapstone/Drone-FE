import type {
  DroneStatus,
} from "./fleetStorage";

export type WorkOrderStatus =
  | "Not Started"
  | "In Progress"
  | "Completed";

export type WorkOrderPriority =
  | "High"
  | "Medium"
  | "Low";

export type WorkOrder = {
  id: string;
  drone: string;
  droneId: string;
  title: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  assignedTo: string;
  createdAt: string;
  scheduledAt?: string;
  relatedAlertId?: string;
};

export type WorkOrderLog = {
  id: string;
  workOrderId: string;
  drone: string;
  action: string;
  status: WorkOrderStatus;
  changedAt: string;
  changedBy: string;
};

export type CompletedMaintenanceRecord = {
  id: string;
  workOrderId: string;
  droneId: string;
  drone: string;
  title: string;
  priority: WorkOrderPriority;
  assignedTo: string;
  diagnosis: string;
  correctiveAction: string;
  inspectionItems: string[];
  resultingStatus: DroneStatus;
  createdAt: string;
  scheduledAt?: string;
  completedAt: string;
};

export const WORK_ORDERS_STORAGE_KEY =
  "droneoptai.technician.work-orders.v2";

export const WORK_ORDER_LOG_STORAGE_KEY =
  "droneoptai.technician.work-order-log.v1";

export const MAINTENANCE_RECORDS_STORAGE_KEY =
  "droneoptai.technician.maintenance-records.v1";

export const defaultWorkOrders: WorkOrder[] = [
  {
    id: "WO-1054",
    drone: "CX-09",
    droneId: "DR-001",
    title: "Scheduled drone inspection",
    priority: "High",
    status: "In Progress",
    assignedTo: "Technician Demo",
    createdAt: "20 Sep · 08:30",
    scheduledAt: "20 Sep 2026 · 09:00",
    relatedAlertId: "ALT-201",
  },
  {
    id: "WO-1055",
    drone: "AX-08",
    droneId: "DR-004",
    title:
      "Inspect after abnormal landing",
    priority: "High",
    status: "Not Started",
    assignedTo: "Technician Demo",
    createdAt: "20 Sep · 07:55",
    scheduledAt: "20 Sep 2026 · 10:00",
    relatedAlertId: "ALT-202",
  },
  {
    id: "WO-1056",
    drone: "CX-12",
    droneId: "DR-002",
    title:
      "Technical inspection after incident",
    priority: "Medium",
    status: "Not Started",
    assignedTo: "Technician Demo",
    createdAt: "19 Sep · 16:20",
    scheduledAt: "20 Sep 2026 · 13:00",
    relatedAlertId: "ALT-203",
  },
];

const defaultWorkOrderLogs: WorkOrderLog[] = [
  {
    id: "WOL-001",
    workOrderId: "WO-1054",
    drone: "CX-09",
    action:
      "Work order moved to In Progress",
    status: "In Progress",
    changedAt: "20 Sep · 09:05",
    changedBy: "Technician Demo",
  },
];

function normalizeStatus(
  status: unknown,
): WorkOrderStatus {
  if (status === "In Progress") {
    return "In Progress";
  }

  if (status === "Completed") {
    return "Completed";
  }

  return "Not Started";
}

export function formatMaintenanceTime() {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  )
    .format(new Date())
    .replace(",", " ·");
}

export function loadWorkOrders(): WorkOrder[] {
  try {
    const stored = localStorage.getItem(
      WORK_ORDERS_STORAGE_KEY,
    );

    if (!stored) {
      return defaultWorkOrders;
    }

    const parsed = JSON.parse(
      stored,
    ) as WorkOrder[];

    if (!Array.isArray(parsed)) {
      return defaultWorkOrders;
    }

    return parsed.map((order) => ({
      ...order,
      status: normalizeStatus(
        order.status,
      ),
    }));
  } catch {
    return defaultWorkOrders;
  }
}

export function saveWorkOrders(
  orders: WorkOrder[],
) {
  localStorage.setItem(
    WORK_ORDERS_STORAGE_KEY,
    JSON.stringify(orders),
  );
}

export function loadWorkOrderLogs(): WorkOrderLog[] {
  try {
    const stored = localStorage.getItem(
      WORK_ORDER_LOG_STORAGE_KEY,
    );

    if (!stored) {
      return defaultWorkOrderLogs;
    }

    const parsed = JSON.parse(
      stored,
    ) as WorkOrderLog[];

    return Array.isArray(parsed)
      ? parsed.map((log) => ({
          ...log,
          status: normalizeStatus(
            log.status,
          ),
        }))
      : defaultWorkOrderLogs;
  } catch {
    return defaultWorkOrderLogs;
  }
}

export function saveWorkOrderLogs(
  logs: WorkOrderLog[],
) {
  localStorage.setItem(
    WORK_ORDER_LOG_STORAGE_KEY,
    JSON.stringify(logs),
  );
}

export function appendWorkOrderLog(
  log: Omit<WorkOrderLog, "id">,
) {
  const current =
    loadWorkOrderLogs();

  const next: WorkOrderLog = {
    ...log,
    id: `WOL-${Date.now()}`,
  };

  saveWorkOrderLogs([
    next,
    ...current,
  ]);

  return next;
}

export function loadMaintenanceRecords(): CompletedMaintenanceRecord[] {
  try {
    const stored = localStorage.getItem(
      MAINTENANCE_RECORDS_STORAGE_KEY,
    );

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(
      stored,
    ) as CompletedMaintenanceRecord[];

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export function saveMaintenanceRecords(
  records: CompletedMaintenanceRecord[],
) {
  localStorage.setItem(
    MAINTENANCE_RECORDS_STORAGE_KEY,
    JSON.stringify(records),
  );
}

export function addMaintenanceRecord(
  record: CompletedMaintenanceRecord,
) {
  const current =
    loadMaintenanceRecords();

  const withoutSameWorkOrder =
    current.filter(
      (item) =>
        item.workOrderId !==
        record.workOrderId,
    );

  saveMaintenanceRecords([
    record,
    ...withoutSameWorkOrder,
  ]);
}
