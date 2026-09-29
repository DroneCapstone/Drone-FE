import { authService } from "../../auth/services/authService";

/**
 * Technician backend API client.
 *
 * API source: FE-Technician-APIs.docx supplied by Backend.
 * The base URL can change (Cloudflare tunnel), so prefer configuring:
 *   VITE_API_BASE_URL=https://your-backend-host/api/v1
 */

export const DEFAULT_TECHNICIAN_API_BASE_URL =
  "https://execute-blind-pitch-frequently.trycloudflare.com/api/v1";

const viteEnv = (import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
}).env;

const configuredApiBaseUrl = (
  viteEnv?.VITE_API_BASE_URL ??
  DEFAULT_TECHNICIAN_API_BASE_URL
).replace(/\/+$/, "");

export const TECHNICIAN_API_BASE_URL =
  /\/api\/v1$/i.test(configuredApiBaseUrl)
    ? configuredApiBaseUrl
    : `${configuredApiBaseUrl}/api/v1`;

export class TechnicianApiError extends Error {
  status: number;
  payload: unknown;

  constructor(
    message: string,
    status: number,
    payload?: unknown,
  ) {
    super(message);
    this.name = "TechnicianApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function parseResponseBody(response: Response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text || null;
}

export async function technicianApiRequest<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const withCredentials =
    viteEnv?.VITE_API_WITH_CREDENTIALS ===
    "true";

  const execute = async (
    accessToken?: string | null,
  ) => {
    const headers = new Headers(
      init.headers,
    );

    headers.set(
      "Accept",
      "application/json",
    );

    if (
      init.body &&
      !headers.has("Content-Type")
    ) {
      headers.set(
        "Content-Type",
        "application/json",
      );
    }

    if (
      accessToken &&
      !headers.has("Authorization")
    ) {
      headers.set(
        "Authorization",
        `Bearer ${accessToken}`,
      );
    }

    return fetch(
      `${TECHNICIAN_API_BASE_URL}${path}`,
      {
        ...init,
        headers,
        credentials: withCredentials
          ? "include"
          : "omit",
      },
    );
  };

  let accessToken =
    authService.getAccessToken();

  let response: Response;

  try {
    response = await execute(accessToken);
  } catch (error) {
    throw new TechnicianApiError(
      "Unable to reach Backend. Check the API URL, Backend availability, or CORS configuration for this endpoint.",
      0,
      error,
    );
  }

  if (
    response.status === 401 &&
    accessToken
  ) {
    const refreshedToken =
      await authService.refreshAccessToken();

    if (refreshedToken) {
      accessToken = refreshedToken;

      try {
        response = await execute(accessToken);
      } catch (error) {
        throw new TechnicianApiError(
          "Unable to reach Backend after refreshing the session. Check CORS or Backend availability.",
          0,
          error,
        );
      }
    }
  }

  const payload =
    await parseResponseBody(response);

  if (!response.ok) {
    throw new TechnicianApiError(
      getApiErrorMessage(
        payload,
        response.status,
      ),
      response.status,
      payload,
    );
  }

  return payload as T;
}

export function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

function getApiErrorMessage(
  payload: unknown,
  status: number,
) {
  // HTTP response was received from Backend, so this is NOT a CORS/network error.
  if (!isRecord(payload)) {
    if (status >= 500) {
      return `Backend internal error (${status}). The request reached the server, but the endpoint failed while processing it.`;
    }

    return `API request failed (${status})`;
  }

  if (typeof payload.detail === "string") {
    return payload.detail;
  }

  if (Array.isArray(payload.detail)) {
    const messages = payload.detail
      .map((item) => {
        if (!isRecord(item)) return null;

        const msg =
          typeof item.msg === "string"
            ? item.msg
            : "Invalid value";

        const location =
          Array.isArray(item.loc)
            ? item.loc
                .filter(
                  (part) =>
                    typeof part === "string" ||
                    typeof part === "number",
                )
                .map(String)
                .filter(
                  (part) =>
                    part !== "body" &&
                    part !== "query",
                )
                .join(".")
            : "";

        return location
          ? `${location}: ${msg}`
          : msg;
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(" · ");
    }
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  if (status >= 500) {
    return `Backend internal error (${status}). The request reached the server, but the endpoint failed while processing it.`;
  }

  return `API request failed (${status})`;
}

export function unwrapList<T = unknown>(
  payload: unknown,
): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!isRecord(payload)) {
    return [];
  }

  /*
   * Backend endpoints do not all use the same envelope key.
   * Support the common FastAPI response shapes used by Technician APIs
   * instead of treating a successful 200 response as an empty list.
   */
  const candidateKeys = [
    "data",
    "items",
    "results",
    "rows",
    "drones",
    "missions",
    "batteries",
    "deliveries",
    "orders",
    "confirmations",
    "alerts",
    "maintenance_alerts",
    "work_orders",
    "records",
    "maintenance_records",
    "logs",
    "schedules",
    "notifications",
  ];

  for (const key of candidateKeys) {
    const candidate = payload[key];

    if (Array.isArray(candidate)) {
      return candidate as T[];
    }

    if (isRecord(candidate)) {
      const nested = unwrapList<T>(candidate);
      if (nested.length > 0) {
        return nested;
      }
    }
  }

  // Last-resort compatibility for a single list property with a custom name.
  const firstArray = Object.values(payload).find(Array.isArray);
  return Array.isArray(firstArray)
    ? (firstArray as T[])
    : [];
}

export function unwrapObject(
  payload: unknown,
): Record<string, unknown> {
  if (!isRecord(payload)) {
    return {};
  }

  if (isRecord(payload.data)) {
    return payload.data;
  }

  return payload;
}

export function pickValue(
  record: Record<string, unknown>,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
}

export function pickString(
  record: Record<string, unknown>,
  keys: string[],
  fallback = "",
) {
  const value = pickValue(record, ...keys);

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return fallback;
}

export function pickNumber(
  record: Record<string, unknown>,
  keys: string[],
  fallback = 0,
) {
  const value = pickValue(record, ...keys);

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

export function pickBoolean(
  record: Record<string, unknown>,
  keys: string[],
  fallback = false,
) {
  const value = pickValue(record, ...keys);

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }

  return fallback;
}

export function toBackendNumericId(
  value: string | number,
) {
  if (typeof value === "number") {
    return value;
  }

  if (/^\d+$/.test(value.trim())) {
    return Number(value);
  }

  const match = value.match(/(\d+)$/);
  if (!match) {
    throw new Error(`Cannot derive numeric backend id from \"${value}\".`);
  }

  return Number(match[1]);
}

export function formatApiDateTime(
  value: unknown,
  fallback = "—",
) {
  if (!value) return fallback;

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(",", " ·");
}


async function requestWithFlexibleId<T = unknown>(
  buildPath: (id: string) => string,
  id: string | number,
  init: RequestInit = {},
): Promise<T> {
  const raw = String(id);
  const candidates: string[] = [];

  try {
    candidates.push(String(toBackendNumericId(id)));
  } catch {
    // Keep raw id only.
  }

  if (!candidates.includes(raw)) {
    candidates.push(raw);
  }

  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      return await technicianApiRequest<T>(
        buildPath(encodeURIComponent(candidate)),
        init,
      );
    } catch (error) {
      lastError = error;
      if (
        error instanceof TechnicianApiError &&
        (error.status === 404 || error.status === 422)
      ) {
        continue;
      }
      throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("API resource was not found.");
}

// ---------------------------------------------------------------------------
// Fleet
// ---------------------------------------------------------------------------

export const getFleetDronesApi = () =>
  technicianApiRequest("/technician/fleet/drones");

export const getDroneDetailApi = (
  droneId: string | number,
) =>
  requestWithFlexibleId(
    (id) => `/technician/fleet/drones/${id}`,
    droneId,
  );

export const updateDroneStatusApi = (
  droneId: string | number,
  status: string,
) =>
  requestWithFlexibleId(
    (id) => `/technician/fleet/drones/${id}/status`,
    droneId,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );

export const getDroneMaintenanceHistoryApi = (
  droneId: string | number,
) =>
  requestWithFlexibleId(
    (id) => `/technician/fleet/drones/${id}/maintenance-history`,
    droneId,
  );

// ---------------------------------------------------------------------------
// Technician missions
// ---------------------------------------------------------------------------

export const getTechnicianMissionsApi = () =>
  technicianApiRequest("/technician/missions/");

// ---------------------------------------------------------------------------
// Transit missions
// ---------------------------------------------------------------------------

export const getIncomingMissionsApi = () =>
  technicianApiRequest("/technician/fleet/incoming");

export const confirmMissionArrivalApi = (
  missionId: string | number,
) =>
  requestWithFlexibleId(
    (id) => `/technician/fleet/missions/${id}/confirm-arrival`,
    missionId,
    { method: "POST" },
  );

// ---------------------------------------------------------------------------
// Battery management
// ---------------------------------------------------------------------------

export const getBatteriesApi = () =>
  technicianApiRequest("/technician/fleet/batteries");

export const useBatteryApi = (
  batteryId: string | number,
  missionId: string | number,
) =>
  requestWithFlexibleId(
    (id) => `/technician/fleet/batteries/${id}/use`,
    batteryId,
    {
      method: "POST",
      body: JSON.stringify({
        mission_id: toBackendNumericId(missionId),
      }),
    },
  );

export const markBatteryChargedApi = (
  batteryId: string | number,
) =>
  requestWithFlexibleId(
    (id) => `/technician/fleet/batteries/${id}/mark-charged`,
    batteryId,
    { method: "POST" },
  );

// ---------------------------------------------------------------------------
// Outbound deliveries
// ---------------------------------------------------------------------------

export const getOutboundDeliveriesApi = () =>
  technicianApiRequest("/technician/deliveries/outbound");

export const receiveOutboundOrderApi = (
  orderId: string | number,
) =>
  requestWithFlexibleId(
    (id) => `/technician/deliveries/outbound/${id}/receive`,
    orderId,
    { method: "POST" },
  );

export const prepareOutboundBatteryApi = (
  orderId: string | number,
) =>
  requestWithFlexibleId(
    (id) => `/technician/deliveries/outbound/${id}/prepare-battery`,
    orderId,
    { method: "POST" },
  );

// NOTE: The supplied API document does not define an outbound dispatch endpoint.

// ---------------------------------------------------------------------------
// Delivery confirmations
// ---------------------------------------------------------------------------

export const getDeliveryConfirmationsApi = () =>
  technicianApiRequest("/technician/deliveries/confirmations");

export const confirmDeliveryPickupApi = (
  orderId: string | number,
) =>
  requestWithFlexibleId(
    (id) => `/technician/deliveries/confirmations/${id}/confirm-pickup`,
    orderId,
    { method: "POST" },
  );

// ---------------------------------------------------------------------------
// Maintenance alerts
// ---------------------------------------------------------------------------

export const getMaintenanceAlertsApi = () =>
  technicianApiRequest("/technician/fleet/maintenance-alerts");

export const getMaintenanceAlertApi = (
  alertId: string | number,
) =>
  requestWithFlexibleId(
    (id) => `/technician/fleet/maintenance-alerts/${id}`,
    alertId,
  );

export const syncMaintenanceAlertsApi = () =>
  technicianApiRequest("/technician/fleet/cron/maintenance-alerts", {
    method: "POST",
  });

export const syncBatteryOverdueAlertsApi = () =>
  technicianApiRequest("/technician/fleet/cron/battery-overdue-alerts", {
    method: "POST",
  });

// ---------------------------------------------------------------------------
// Work orders / maintenance records
// ---------------------------------------------------------------------------

export const getWorkOrdersApi = () =>
  technicianApiRequest("/technician/fleet/work-orders");

export const createWorkOrderApi = (payload: {
  drone_id: number;
  battery_id: number;
  issue_description: string;
}) =>
  technicianApiRequest("/technician/fleet/work-orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getWorkOrderApi = (
  workOrderId: string | number,
) =>
  requestWithFlexibleId(
    (id) => `/technician/fleet/work-orders/${id}`,
    workOrderId,
  );

export const updateWorkOrderApi = (
  workOrderId: string | number,
  payload: Record<string, unknown>,
) =>
  requestWithFlexibleId(
    (id) => `/technician/fleet/work-orders/${id}`,
    workOrderId,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );

export const updateWorkOrderInspectionApi = (
  workOrderId: string | number,
  payload: Record<string, unknown>,
) =>
  requestWithFlexibleId(
    (id) => `/technician/fleet/work-orders/${id}/inspection`,
    workOrderId,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );

export const deleteWorkOrderApi = (
  workOrderId: string | number,
) =>
  requestWithFlexibleId(
    (id) => `/technician/fleet/work-orders/${id}`,
    workOrderId,
    { method: "DELETE" },
  );

export const getWorkOrderLogsApi = (
  workOrderId: string | number,
) =>
  requestWithFlexibleId(
    (id) => `/technician/fleet/work-orders/${id}/logs`,
    workOrderId,
  );

export const getMaintenanceRecordsApi = (
  droneId: string | number,
) =>
  requestWithFlexibleId(
    (id) => `/technician/fleet/maintenance-records/${id}`,
    droneId,
  );

export const createMaintenanceRecordApi = (
  payload: Record<string, unknown>,
) =>
  technicianApiRequest("/technician/fleet/maintenance-records", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getMaintenanceSchedulesApi = () =>
  technicianApiRequest("/technician/fleet/maintenance-schedules");

export const createMaintenanceScheduleApi = (
  payload: Record<string, unknown>,
) =>
  technicianApiRequest("/technician/fleet/maintenance-schedules", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getDroneMaintenanceSchedulesApi = (
  droneId: string | number,
) =>
  requestWithFlexibleId(
    (id) => `/technician/fleet/maintenance-schedules/drone/${id}`,
    droneId,
  );

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const getNotificationsApi = () =>
  technicianApiRequest("/notifications/");

export const getUnreadNotificationCountApi = () =>
  technicianApiRequest("/notifications/unread-count");

export const markAllNotificationsReadApi = () =>
  technicianApiRequest("/notifications/read-all", {
    method: "PATCH",
  });

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export const getMyProfileApi = () =>
  technicianApiRequest("/users/me");

export const updateMyProfileApi = (
  payload: Record<string, unknown>,
) =>
  technicianApiRequest("/users/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
