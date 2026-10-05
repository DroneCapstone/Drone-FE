import {
  confirmMissionArrivalApi,
  getIncomingMissionsApi,
  getTechnicianMissionsApi,
} from "../api/transitApi";

import {
  isRecord,
  pickBoolean,
  pickNumber,
  pickString,
  unwrapList,
} from "../api/httpClient";

export type TransitMissionStatus =
  | "Incoming"
  | "At Hub"
  | "Ready"
  | "Cannot Continue"
  | "Replacement Requested";

export type TransitMissionPurpose =
  | "BATTERY_STOP"
  | "RETURN_TO_HUB"
  | "INCIDENT_RETURN";

export type TransitMission = {
  id: string;

  missionId: string;
  legId: string;

  /** Raw mission state returned by Backend, e.g. "In Progress". */
  missionState?: string;

  /** Backend drone display code/name when provided. */
  droneCode?: string;

  purpose:
    TransitMissionPurpose;

  currentDroneId: string;
  droneType: string;
  droneModel: string;

  /*
   * Physical battery ID currently installed on the flying drone.
   * This value travels with the mission so another Hub can identify
   * the exact battery when the drone arrives.
   */
  batteryId?: string;

  batteryLevelPct: number;

  requiredDepartureBatteryPct:
    number;

  batteryServiceRequired:
    boolean;

  origin: string;
  hub: string;
  destination: string;

  status:
    TransitMissionStatus;

  arrivalConfirmedAt?: string;

  cannotContinueReason?: string;

  replacementRequestedAt?: string;
  replacementReason?: string;

  replacementDroneId?: string;
  replacementAssignedAt?: string;

  incidentAlertId?: string;
};

export type TransitMissionHistory = {
  id: string;

  missionId: string;
  legId: string;

  /** Raw mission state returned by Backend, e.g. "In Progress". */
  missionState?: string;

  /** Backend drone display code/name when provided. */
  droneCode?: string;

  purpose:
    TransitMissionPurpose;

  droneId: string;
  droneType: string;
  droneModel: string;

  batteryId?: string;
  batteryLevelPct: number;

  origin: string;
  hub: string;
  destination: string;

  handledAt: string;

  outcome:
    | "Continued"
    | "Returned to hub"
    | "Sent to maintenance";
};

let demoTransitMissions:
  TransitMission[] = [
  {
    id: "TM-1024",

    missionId: "MS-1024",
    legId: "LEG-1024-02",

    purpose:
      "BATTERY_STOP",

    currentDroneId:
      "DR-002",
    droneType: "CX",
    droneModel:
      "DJI Matrice 300 RTK",

    batteryId:
      "BAT-006",
    batteryLevelPct: 61,

    requiredDepartureBatteryPct:
      80,

    batteryServiceRequired:
      false,

    origin:
      "Hub HCM-01",
    hub:
      "Hub HCM-02",
    destination:
      "Customer Zone 08",

    status: "Incoming",
  },

  {
    id: "TM-1034",

    missionId: "MS-1034",
    legId: "LEG-1034-RETURN",

    purpose:
      "RETURN_TO_HUB",

    currentDroneId:
      "DR-005",
    droneType: "AX",
    droneModel:
      "Autel EVO Max 4T",

    batteryId:
      "BAT-007",
    batteryLevelPct: 84,

    requiredDepartureBatteryPct:
      0,

    batteryServiceRequired:
      false,

    origin:
      "Customer Zone 07",
    hub:
      "Hub HCM-02",
    destination:
      "Hub HCM-02",

    status: "Incoming",
  },

  {
    id: "TM-1040",

    missionId: "MS-1040",
    legId: "LEG-1040-INCIDENT",

    purpose:
      "INCIDENT_RETURN",

    currentDroneId:
      "DR-006",
    droneType: "CX",
    droneModel:
      "DJI Matrice 30",

    batteryId:
      "BAT-008",
    batteryLevelPct: 68,

    requiredDepartureBatteryPct:
      0,

    batteryServiceRequired:
      false,

    origin:
      "In-flight route segment",
    hub:
      "Hub HCM-02",
    destination:
      "Hub HCM-02",

    status: "Incoming",

    incidentAlertId:
      "ALT-301",
  },
];

let demoTransitHistory:
  TransitMissionHistory[] = [];

export function formatTransitTime() {
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

export function loadTransitMissions():
  TransitMission[] {
  return demoTransitMissions.map(
    (mission) => ({
      ...mission,
    }),
  );
}

export function saveTransitMissions(
  missions: TransitMission[],
) {
  demoTransitMissions =
    missions.map(
      (mission) => ({
        ...mission,
      }),
    );

  window.dispatchEvent(
    new Event(
      "technician-transit-missions-updated",
    ),
  );
}

export function loadTransitMissionHistory():
  TransitMissionHistory[] {
  return demoTransitHistory.map(
    (item) => ({
      ...item,
    }),
  );
}

export function saveTransitMissionHistory(
  history:
    TransitMissionHistory[],
) {
  demoTransitHistory =
    history.map(
      (item) => ({
        ...item,
      }),
    );
}

// ---------------------------------------------------------------------------
// Backend API integration
// ---------------------------------------------------------------------------


function normalizeTransitStatus(value: string): TransitMissionStatus {
  const key = value.trim().toUpperCase().replace(/[\s-]+/g, "_");

  if (key === "AT_HUB") return "At Hub";
  if (key === "READY") return "Ready";
  if (key === "CANNOT_CONTINUE") return "Cannot Continue";
  if (key === "REPLACEMENT_REQUESTED") return "Cannot Continue";
  return "Incoming";
}

function normalizeTransitPurpose(value: string): TransitMissionPurpose {
  const key = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (key === "RETURN_TO_HUB") return "RETURN_TO_HUB";
  if (key === "INCIDENT_RETURN") return "INCIDENT_RETURN";
  return "BATTERY_STOP";
}

function displayId(prefix: string, value: string, width = 4) {
  if (!value) return `${prefix}-UNKNOWN`;
  if (value.toUpperCase().startsWith(`${prefix}-`)) return value.toUpperCase();
  const match = value.match(/(\d+)$/);
  return match ? `${prefix}-${match[1].padStart(width, "0")}` : `${prefix}-${value}`;
}

function mapApiTransitMission(value: unknown): TransitMission | null {
  if (!isRecord(value)) return null;

  // /technician/missions/ returns mission_code, while /fleet/incoming
  // may return mission_id/id. Support all variants so Transit Missions can
  // consume the real Backend payload instead of depending on one shape.
  const missionRaw = pickString(
    value,
    ["mission_code", "mission_id", "missionId", "id"],
  );

  if (!missionRaw) return null;

  const rawDroneCode = pickString(
    value,
    ["drone_code", "drone_name", "name"],
    "",
  );

  const droneRaw = pickString(
    value,
    ["drone_id", "current_drone_id", "droneId"],
    "",
  );

  const derivedDroneId =
    droneRaw ||
    rawDroneCode.match(/(\d+)$/)?.[1] ||
    "0";

  const missionId = displayId("MSN", missionRaw);
  const droneId = displayId("DR", derivedDroneId, 3);
  const droneType = (
    rawDroneCode.match(/[A-Za-z]+/)?.[0] ??
    pickString(value, ["drone_type"], "DR")
  ).toUpperCase();

  const status = normalizeTransitStatus(
    pickString(value, ["handling_status", "status"], "INCOMING"),
  );

  const purpose = normalizeTransitPurpose(
    pickString(
      value,
      ["purpose", "mission_purpose", "arrival_reason"],
      "BATTERY_STOP",
    ),
  );

  const batteryCode = pickString(
    value,
    ["battery_code", "battery_id", "installed_battery_id"],
    "",
  );

  return {
    id: pickString(value, ["transit_id", "id"], `TM-${missionRaw}`),
    missionId,
    legId: pickString(
      value,
      ["leg_id", "mission_leg_id"],
      `LEG-${missionRaw}`,
    ),
    missionState:
      pickString(value, ["mission_state", "mission_status"], "") ||
      undefined,
    droneCode: rawDroneCode || undefined,
    purpose,
    currentDroneId: droneId,
    droneType,
    droneModel: pickString(value, ["drone_model", "model"], rawDroneCode || "—"),
    batteryId: batteryCode
      ? displayId("BAT", batteryCode, 3)
      : undefined,
    batteryLevelPct: pickNumber(
      value,
      ["battery_percent", "battery_level_pct", "battery_pct", "charge_level_pct"],
      0,
    ),
    requiredDepartureBatteryPct: pickNumber(
      value,
      ["required_departure_battery_pct", "required_battery_pct"],
      100,
    ),
    batteryServiceRequired: pickBoolean(
      value,
      ["battery_service_required", "requires_battery_service"],
      status === "At Hub" && purpose === "BATTERY_STOP",
    ),
    origin: pickString(value, ["origin", "origin_hub_name", "origin_name"], "—"),
    hub: pickString(value, ["hub", "hub_name", "target_hub_name"], "Hub"),
    destination: pickString(
      value,
      ["destination", "destination_hub_name", "destination_name"],
      "—",
    ),
    status,
    arrivalConfirmedAt:
      pickString(value, ["arrival_confirmed_at"], "") || undefined,
    cannotContinueReason:
      pickString(value, ["cannot_continue_reason"], "") || undefined,
    replacementRequestedAt:
      pickString(value, ["replacement_requested_at"], "") || undefined,
    replacementReason:
      pickString(value, ["replacement_reason"], "") || undefined,
    replacementDroneId: (() => {
      const replacement = pickString(value, ["replacement_drone_id"], "");
      return replacement ? displayId("DR", replacement, 3) : undefined;
    })(),
    replacementAssignedAt:
      pickString(value, ["replacement_assigned_at"], "") || undefined,
    incidentAlertId:
      pickString(value, ["incident_alert_id", "maintenance_alert_id"], "") ||
      undefined,
  };
}

export async function refreshTransitMissionsFromApi() {
  // Transit Missions needs both missions still approaching the hub and missions
  // already at the hub. The Backend /technician/missions/ endpoint currently
  // returns that state (mission_code, mission_state, handling_status), while
  // /fleet/incoming can be empty because it only represents the narrower
  // incoming-fleet queue. Merge both responses and let the incoming payload
  // override a mission when it contains richer arrival data.
  const [missionsResult, incomingResult] = await Promise.allSettled([
    getTechnicianMissionsApi(),
    getIncomingMissionsApi(),
  ]);

  const merged = new Map<string, TransitMission>();

  const addPayload = (payload: unknown) => {
    unwrapList(payload)
      .map(mapApiTransitMission)
      .filter((item): item is TransitMission => Boolean(item))
      .forEach((mission) => {
        merged.set(mission.missionId, {
          ...(merged.get(mission.missionId) ?? {}),
          ...mission,
        } as TransitMission);
      });
  };

  if (missionsResult.status === "fulfilled") {
    addPayload(missionsResult.value);
  }

  if (incomingResult.status === "fulfilled") {
    addPayload(incomingResult.value);
  }

  if (merged.size === 0) {
    if (missionsResult.status === "rejected") {
      throw missionsResult.reason;
    }

    if (incomingResult.status === "rejected") {
      throw incomingResult.reason;
    }
  }

  demoTransitMissions = [...merged.values()];
  window.dispatchEvent(new Event("technician-transit-missions-updated"));
  return loadTransitMissions();
}

export async function confirmTransitArrivalOnServer(missionId: string) {
  // Do not refetch here. The TanStack mutation invalidates the transit query
  // after a successful confirmation, which produces one fresh request cycle.
  // Refetching here as well caused duplicate missions/incoming requests.
  return confirmMissionArrivalApi(missionId);
}
