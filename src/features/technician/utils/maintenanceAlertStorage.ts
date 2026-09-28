import {
  getMaintenanceAlertsApi,
  syncMaintenanceAlertsApi,
} from "../api/maintenanceApi";

import {
  formatApiDateTime,
  isRecord,
  pickString,
  unwrapList,
} from "../api/httpClient";

export type AlertSource =
  | "Schedule"
  | "Incident"
  | "Hub inspection";

export type AlertStatus =
  | "Pending"
  | "Handled";

export type MaintenanceAlert = {
  id: string;

  drone: string;
  droneId: string;

  title: string;
  source: AlertSource;
  createdAt: string;

  missionId?: string;
  legId?: string;
  reason?: string;

  /*
   * Ai đã report / phát hiện alert này ở mức nghiệp vụ.
   * Với Incident demo hiện tại: Operator.
   */
  reportedBy?: string;

  /*
   * Có thể dùng sau này để trace về incidents.id.
   */
  incidentId?: string;
};

const defaultMaintenanceAlerts:
  MaintenanceAlert[] = [
  {
    id: "ALT-201",
    drone: "CX-09",
    droneId: "DR-001",
    title:
      "Scheduled inspection is due",
    source: "Schedule",
    createdAt: "20 Sep · 08:20",
  },

  /*
   * Demo cho INCIDENT_RETURN.
   *
   * Alert này giả lập việc Operator/System đã phát hiện Incident
   * trong lúc drone đang bay và gửi yêu cầu kiểm tra kỹ thuật
   * cho Technician trước khi drone tới Hub.
   */
  {
    id: "ALT-301",
    drone: "CX-06",
    droneId: "DR-006",
    title:
      "Operator reported in-flight incident — inspection required",
    source: "Incident",
    createdAt: "22 Sep · 14:20",

    missionId: "MS-1040",
    legId: "LEG-1040-INCIDENT",
    incidentId: "INC-1040",
    reportedBy: "Operator",

    reason:
      "Operator reported an in-flight technical incident. Drone must return to Hub HCM-02 for technical inspection.",
  },
];

/*
 * DEMO RUNTIME STORE
 *
 * - Giữ state khi điều hướng trong SPA.
 * - Refresh browser sẽ reset demo.
 * - Sau này thay bằng backend API.
 */
let demoMaintenanceAlerts:
  MaintenanceAlert[] =
  defaultMaintenanceAlerts.map(
    (alert) => ({
      ...alert,
    }),
  );

export function loadMaintenanceAlerts():
  MaintenanceAlert[] {
  return demoMaintenanceAlerts.map(
    (alert) => ({
      ...alert,
    }),
  );
}

function formatAlertTime() {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  )
    .format(new Date())
    .replace(",", " ·");
}

function getNextAlertId() {
  const maxId =
    demoMaintenanceAlerts.reduce(
      (max, alert) => {
        const match =
          alert.id.match(/(\d+)$/);

        if (!match) {
          return max;
        }

        return Math.max(
          max,
          Number(match[1]),
        );
      },
      200,
    );

  return `ALT-${maxId + 1}`;
}

/*
 * Dùng khi Technician phát hiện lỗi trong Hub Readiness Check.
 *
 * INCIDENT_RETURN không gọi hàm này.
 * Incident alert do Operator/System tạo trước.
 */
export function createMaintenanceAlert(
  input: Omit<
    MaintenanceAlert,
    "id" | "createdAt"
  >,
): MaintenanceAlert {
  const existing =
    demoMaintenanceAlerts.find(
      (alert) =>
        alert.source ===
          input.source &&
        alert.droneId ===
          input.droneId &&
        alert.missionId ===
          input.missionId &&
        alert.title ===
          input.title,
    );

  if (existing) {
    return {
      ...existing,
    };
  }

  const created:
    MaintenanceAlert = {
    ...input,
    id: getNextAlertId(),
    createdAt:
      formatAlertTime(),
  };

  demoMaintenanceAlerts = [
    created,
    ...demoMaintenanceAlerts,
  ];

  window.dispatchEvent(
    new Event(
      "technician-maintenance-alerts-updated",
    ),
  );

  return {
    ...created,
  };
}

export function resetDemoMaintenanceAlerts() {
  demoMaintenanceAlerts =
    defaultMaintenanceAlerts.map(
      (alert) => ({
        ...alert,
      }),
    );

  window.dispatchEvent(
    new Event(
      "technician-maintenance-alerts-updated",
    ),
  );
}

// ---------------------------------------------------------------------------
// Backend API integration
// ---------------------------------------------------------------------------


function alertDisplayId(prefix: string, value: string, width = 3) {
  if (!value) return "";
  if (value.toUpperCase().startsWith(`${prefix}-`)) return value.toUpperCase();
  const match = value.match(/(\d+)$/);
  return match ? `${prefix}-${match[1].padStart(width, "0")}` : `${prefix}-${value}`;
}

function normalizeAlertSource(value: string): AlertSource {
  const key = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (key.includes("INCIDENT")) return "Incident";
  if (key.includes("HUB") || key.includes("INSPECTION")) return "Hub inspection";
  return "Schedule";
}

function mapApiMaintenanceAlert(value: unknown): MaintenanceAlert | null {
  if (!isRecord(value)) return null;

  const rawId = pickString(value, ["alert_id", "id"]);
  const rawDroneId = pickString(value, ["drone_id", "droneId"]);
  if (!rawId || !rawDroneId) return null;

  const droneName = pickString(value, ["drone_name", "drone_code", "name"], "");
  const droneId = alertDisplayId("DR", rawDroneId, 3);

  return {
    id: alertDisplayId("ALT", rawId, 3),
    drone: droneName || droneId,
    droneId,
    title: pickString(value, ["title", "message", "issue_description", "reason"], "Maintenance alert"),
    source: normalizeAlertSource(
      pickString(value, ["source", "alert_type", "type"], "Schedule"),
    ),
    createdAt: formatApiDateTime(
      pickString(value, ["created_at", "alerted_at", "due_at"], ""),
      "—",
    ),
    missionId: (() => {
      const mission = pickString(value, ["mission_id"], "");
      return mission ? alertDisplayId("MSN", mission, 4) : undefined;
    })(),
    legId: pickString(value, ["leg_id", "mission_leg_id"], "") || undefined,
    reason: pickString(value, ["reason", "description", "message"], "") || undefined,
    reportedBy: pickString(value, ["reported_by", "created_by"], "") || undefined,
    incidentId: pickString(value, ["incident_id"], "") || undefined,
  };
}

export async function refreshMaintenanceAlertsFromApi() {
  const payload = await getMaintenanceAlertsApi();
  demoMaintenanceAlerts = unwrapList(payload)
    .map(mapApiMaintenanceAlert)
    .filter((item): item is MaintenanceAlert => Boolean(item));

  window.dispatchEvent(new Event("technician-maintenance-alerts-updated"));
  return loadMaintenanceAlerts();
}

export async function syncMaintenanceAlertsOnServer() {
  const result = await syncMaintenanceAlertsApi();
  await refreshMaintenanceAlertsFromApi();
  return result;
}
