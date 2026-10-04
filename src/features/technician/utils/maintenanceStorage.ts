import {
  createMaintenanceRecordApi,
  createWorkOrderApi,
  deleteWorkOrderApi,
  getMaintenanceRecordsApi,
  getWorkOrderApi,
  getWorkOrderLogsApi,
  getWorkOrdersApi,
  updateWorkOrderApi,
  updateWorkOrderInspectionApi,
} from "../api/maintenanceApi";

import {
  getDroneMaintenanceHistoryApi,
} from "../api/fleetApi";

import {
  formatApiDateTime,
  isRecord,
  pickString,
  toBackendNumericId,
  unwrapList,
  unwrapObject,
} from "../api/httpClient";

import type {
  DroneStatus,
} from "./fleetStorage";

export type WorkOrderStatus =
  | "Pending"
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
  batteryId?: string;
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
    status: "Pending",
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
    status: "Pending",
    assignedTo: "Technician Demo",
    createdAt: "19 Sep · 16:20",
    scheduledAt: "20 Sep 2026 · 13:00",
    relatedAlertId: "ALT-203",
  },
];

const defaultWorkOrderLogs: WorkOrderLog[] = [];

function normalizeStatus(
  status: unknown,
): WorkOrderStatus {
  const key = String(status ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (key === "IN_PROGRESS") {
    return "In Progress";
  }

  if (key === "COMPLETED") {
    return "Completed";
  }

  // Backward-compatible with the previous local UI label.
  return "Pending";
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

// ---------------------------------------------------------------------------
// Backend API integration
// ---------------------------------------------------------------------------


function maintenanceDisplayId(prefix: string, value: string, width = 4) {
  if (!value) return "";
  if (value.toUpperCase().startsWith(`${prefix}-`)) return value.toUpperCase();
  const match = value.match(/(\d+)$/);
  return match ? `${prefix}-${match[1].padStart(width, "0")}` : `${prefix}-${value}`;
}

function normalizeApiWorkOrderStatus(value: string): WorkOrderStatus {
  const key = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (key === "COMPLETED") return "Completed";
  if (key === "IN_PROGRESS") return "In Progress";
  return "Pending";
}

function normalizeApiPriority(value: string): WorkOrderPriority {
  const key = value.trim().toUpperCase();
  if (key === "HIGH" || key === "CRITICAL") return "High";
  if (key === "LOW") return "Low";
  return "Medium";
}

function mapApiWorkOrder(value: unknown): WorkOrder | null {
  if (!isRecord(value)) return null;

  const rawId = pickString(value, ["work_order_id", "id"]);
  const rawDroneId = pickString(value, ["drone_id", "droneId"]);
  if (!rawId || !rawDroneId) return null;

  const droneId = maintenanceDisplayId("DR", rawDroneId, 3);

  return {
    id: maintenanceDisplayId("WO", rawId, 4),
    drone: pickString(value, ["drone_name", "drone_code", "drone"], droneId),
    droneId,
    batteryId: (() => {
      const rawBatteryId = pickString(
        value,
        ["battery_id", "test_battery_id", "batteryId"],
        "",
      );

      return rawBatteryId
        ? maintenanceDisplayId("BAT", rawBatteryId, 3)
        : undefined;
    })(),
    title: pickString(value, ["title", "issue_description", "task", "description"], "Maintenance work order"),
    priority: normalizeApiPriority(
      pickString(value, ["priority"], "Medium"),
    ),
    status: normalizeApiWorkOrderStatus(
      pickString(value, ["status"], "Pending"),
    ),
    assignedTo: pickString(value, ["assigned_to", "technician_name", "assignee"], "Technician"),
    createdAt: formatApiDateTime(
      pickString(value, ["created_at"], ""),
      "—",
    ),
    scheduledAt: (() => {
      const scheduled = pickString(value, ["scheduled_at", "due_at"], "");
      return scheduled ? formatApiDateTime(scheduled, scheduled) : undefined;
    })(),
    relatedAlertId: (() => {
      const alert = pickString(value, ["alert_id", "maintenance_alert_id"], "");
      return alert ? maintenanceDisplayId("ALT", alert, 3) : undefined;
    })(),
  };
}

function mapApiWorkOrderLog(value: unknown): WorkOrderLog | null {
  if (!isRecord(value)) return null;

  const rawId = pickString(value, ["log_id", "id"]);
  const rawWorkOrderId = pickString(value, ["work_order_id", "workOrderId"]);
  if (!rawWorkOrderId) return null;

  const status = normalizeApiWorkOrderStatus(
    pickString(value, ["status", "work_order_status"], "Pending"),
  );

  return {
    id: rawId
      ? maintenanceDisplayId("WOL", rawId, 4)
      : `WOL-${rawWorkOrderId}`,
    workOrderId: maintenanceDisplayId("WO", rawWorkOrderId, 4),
    drone: pickString(value, ["drone_name", "drone_code", "drone"], "—"),
    action: pickString(value, ["action", "message", "description", "event"], "Work order updated"),
    status,
    changedAt: formatApiDateTime(
      pickString(value, ["changed_at", "created_at", "updated_at", "timestamp"], ""),
      "—",
    ),
    changedBy: pickString(value, ["changed_by", "technician_name", "actor_name", "created_by"], "Technician"),
  };
}

function mapApiMaintenanceRecord(value: unknown): CompletedMaintenanceRecord | null {
  if (!isRecord(value)) return null;

  const rawWorkOrderId = pickString(value, ["work_order_id", "workOrderId"]);
  const rawDroneId = pickString(value, ["drone_id", "droneId"]);
  if (!rawWorkOrderId || !rawDroneId) return null;

  const inspectionRaw = value.inspection_items;
  const inspectionItems = Array.isArray(inspectionRaw)
    ? inspectionRaw.map((item) =>
        typeof item === "string"
          ? item
          : isRecord(item)
            ? pickString(item, ["label", "name", "item", "description"], JSON.stringify(item))
            : String(item),
      )
    : [];

  const resultStatus = pickString(
    value,
    ["resulting_drone_status", "resulting_status"],
    "Available",
  );

  return {
    id: maintenanceDisplayId(
      "MR",
      pickString(value, ["maintenance_record_id", "id"], `${rawWorkOrderId}`),
      4,
    ),
    workOrderId: maintenanceDisplayId("WO", rawWorkOrderId, 4),
    droneId: maintenanceDisplayId("DR", rawDroneId, 3),
    drone: pickString(value, ["drone_name", "drone_code"], maintenanceDisplayId("DR", rawDroneId, 3)),
    title: pickString(value, ["title", "issue_description"], "Maintenance record"),
    priority: normalizeApiPriority(
      pickString(value, ["priority"], "Medium"),
    ),
    assignedTo: pickString(value, ["assigned_to", "technician_name"], "Technician"),
    diagnosis: pickString(value, ["diagnosis"], "—"),
    correctiveAction: pickString(value, ["corrective_action", "action_taken"], "—"),
    inspectionItems,
    resultingStatus:
      resultStatus.trim().toUpperCase() === "MAINTENANCE"
        ? "Maintenance"
        : "Available",
    createdAt: formatApiDateTime(
      pickString(value, ["created_at"], ""),
      "—",
    ),
    scheduledAt: (() => {
      const scheduled = pickString(value, ["scheduled_at"], "");
      return scheduled ? formatApiDateTime(scheduled, scheduled) : undefined;
    })(),
    completedAt: formatApiDateTime(
      pickString(value, ["completed_at", "updated_at"], ""),
      "—",
    ),
  };
}

export async function refreshWorkOrdersFromApi() {
  const payload = await getWorkOrdersApi();
  const next = unwrapList(payload)
    .map(mapApiWorkOrder)
    .filter((item): item is WorkOrder => Boolean(item));

  saveWorkOrders(next);
  window.dispatchEvent(new Event("technician-work-orders-updated"));
  return next;
}

export async function fetchWorkOrderFromApi(workOrderId: string) {
  const payload = await getWorkOrderApi(workOrderId);
  return mapApiWorkOrder(unwrapObject(payload));
}

export async function createWorkOrderOnServer(payload: {
  droneId: string;
  batteryId: string;
  issueDescription: string;
}) {
  const result = await createWorkOrderApi({
    drone_id: toBackendNumericId(payload.droneId),
    battery_id: toBackendNumericId(payload.batteryId),
    issue_description: payload.issueDescription,
  });

  await refreshWorkOrdersFromApi();
  return result;
}

export async function updateWorkOrderOnServer(
  workOrderId: string,
  payload: Record<string, unknown>,
) {
  const result = await updateWorkOrderApi(workOrderId, payload);
  await refreshWorkOrdersFromApi();
  return result;
}

export async function updateWorkOrderInspectionOnServer(
  workOrderId: string,
  payload: Record<string, unknown>,
) {
  const result = await updateWorkOrderInspectionApi(workOrderId, payload);
  await refreshWorkOrdersFromApi();
  return result;
}

export async function createMaintenanceRecordOnServer(payload: {
  workOrderId: string;
  droneId: string;
  title: string;
  diagnosis: string;
  correctiveAction: string;
  resultingDroneStatus: DroneStatus;
  inspectionItems: unknown[];
}) {
  const result = await createMaintenanceRecordApi({
    work_order_id: toBackendNumericId(payload.workOrderId),
    drone_id: toBackendNumericId(payload.droneId),
    title: payload.title,
    diagnosis: payload.diagnosis,
    corrective_action: payload.correctiveAction,
    resulting_drone_status:
      payload.resultingDroneStatus === "Maintenance"
        ? "MAINTENANCE"
        : "AVAILABLE",
    inspection_items: payload.inspectionItems,
  });

  return result;
}

export async function refreshDroneMaintenanceHistoryFromApi(droneId: string) {
  const payload = await getDroneMaintenanceHistoryApi(droneId);
  const next = unwrapList(payload)
    .map(mapApiMaintenanceRecord)
    .filter((item): item is CompletedMaintenanceRecord => Boolean(item));

  const all = loadMaintenanceRecords();
  const withoutDrone = all.filter((record) => record.droneId !== droneId);
  saveMaintenanceRecords([...next, ...withoutDrone]);
  window.dispatchEvent(new Event("technician-maintenance-records-updated"));
  return next;
}

export async function fetchWorkOrderLogsFromApi(
  workOrderId: string,
) {
  const payload = await getWorkOrderLogsApi(workOrderId);
  const next = unwrapList(payload)
    .map(mapApiWorkOrderLog)
    .filter((item): item is WorkOrderLog => Boolean(item));

  const current = loadWorkOrderLogs();
  const withoutCurrent = current.filter(
    (item) => item.workOrderId !== workOrderId,
  );
  saveWorkOrderLogs([...next, ...withoutCurrent]);
  return next;
}

export async function refreshMaintenanceRecordsFromApi(
  droneId: string,
) {
  const payload = await getMaintenanceRecordsApi(droneId);
  const next = unwrapList(payload)
    .map(mapApiMaintenanceRecord)
    .filter((item): item is CompletedMaintenanceRecord => Boolean(item));

  const current = loadMaintenanceRecords();
  const withoutDrone = current.filter(
    (record) => record.droneId !== droneId,
  );
  saveMaintenanceRecords([...next, ...withoutDrone]);
  return next;
}

export async function deleteWorkOrderOnServer(
  workOrderId: string,
) {
  const result = await deleteWorkOrderApi(workOrderId);
  await refreshWorkOrdersFromApi();
  return result;
}
