import {
  confirmMissionArrivalApi,
  getIncomingMissionsApi,
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

  const missionRaw = pickString(value, ["mission_id", "missionId", "id"]);
  if (!missionRaw) return null;

  const droneRaw = pickString(value, ["drone_id", "current_drone_id", "droneId"], "0");
  const missionId = displayId("MSN", missionRaw);
  const droneId = displayId("DR", droneRaw, 3);
  const droneName = pickString(value, ["drone_name", "drone_code", "name"], "DR");
  const droneType = (droneName.match(/[A-Za-z]+/)?.[0] ?? pickString(value, ["drone_type"], "DR")).toUpperCase();

  const status = normalizeTransitStatus(
    pickString(value, ["handling_status", "status"], "INCOMING"),
  );

  const purpose = normalizeTransitPurpose(
    pickString(value, ["purpose", "mission_purpose", "arrival_reason"], "BATTERY_STOP"),
  );

  return {
    id: pickString(value, ["transit_id", "id"], `TM-${missionRaw}`),
    missionId,
    legId: pickString(value, ["leg_id", "mission_leg_id"], `LEG-${missionRaw}`),
    purpose,
    currentDroneId: droneId,
    droneType,
    droneModel: pickString(value, ["drone_model", "model"], "—"),
    batteryId: (() => {
      const battery = pickString(value, ["battery_id", "installed_battery_id"], "");
      return battery ? displayId("BAT", battery, 3) : undefined;
    })(),
    batteryLevelPct: pickNumber(value, ["battery_level_pct", "battery_pct", "charge_level_pct"], 0),
    requiredDepartureBatteryPct: pickNumber(value, ["required_departure_battery_pct", "required_battery_pct"], 100),
    batteryServiceRequired: pickBoolean(value, ["battery_service_required", "requires_battery_service"], status === "At Hub" && purpose === "BATTERY_STOP"),
    origin: pickString(value, ["origin", "origin_hub_name", "origin_name"], "—"),
    hub: pickString(value, ["hub", "hub_name", "target_hub_name"], "Hub"),
    destination: pickString(value, ["destination", "destination_hub_name", "destination_name"], "—"),
    status,
    arrivalConfirmedAt: pickString(value, ["arrival_confirmed_at"], "") || undefined,
    cannotContinueReason: pickString(value, ["cannot_continue_reason"], "") || undefined,
    replacementRequestedAt: pickString(value, ["replacement_requested_at"], "") || undefined,
    replacementReason: pickString(value, ["replacement_reason"], "") || undefined,
    replacementDroneId: (() => {
      const replacement = pickString(value, ["replacement_drone_id"], "");
      return replacement ? displayId("DR", replacement, 3) : undefined;
    })(),
    replacementAssignedAt: pickString(value, ["replacement_assigned_at"], "") || undefined,
    incidentAlertId: pickString(value, ["incident_alert_id", "maintenance_alert_id"], "") || undefined,
  };
}

export async function refreshTransitMissionsFromApi() {
  const payload = await getIncomingMissionsApi();
  const next = unwrapList(payload)
    .map(mapApiTransitMission)
    .filter((item): item is TransitMission => Boolean(item));

  demoTransitMissions = next;
  window.dispatchEvent(new Event("technician-transit-missions-updated"));
  return loadTransitMissions();
}

export async function confirmTransitArrivalOnServer(missionId: string) {
  const result = await confirmMissionArrivalApi(missionId);
  await refreshTransitMissionsFromApi();
  return result;
}
