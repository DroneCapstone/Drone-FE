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
  | "INCIDENT_RETURN"
  | "UNKNOWN";

export type TransitMission = {
  id: string;

  /** Backend mission_id used for API actions. Keep this separate from missionId, which is only the display code. */
  backendMissionId: string | null;

  /** Human-readable mission code shown in the UI, e.g. MSN-20261007-0004. */
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
    | "Sent to maintenance"
    | "Arrival confirmed";
};

// Backend is authoritative: do not display fictitious incoming missions.
let demoTransitMissions: TransitMission[] = [];

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

/** Only a genuinely active transit stop can receive another mission battery. */
function normalizedKey(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

export function isCompletedMissionState(value?: string) {
  return [
    "COMPLETED", "COMPLETE", "FINISHED", "SUCCEEDED", "SUCCESS",
    "MISSION_COMPLETED", "DELIVERED",
  ].includes(normalizedKey(value ?? ""));
}

export function isIncidentMissionState(value?: string) {
  return [
    "ABORTED", "FAILED", "EMERGENCY", "INCIDENT",
    "INCIDENT_RETURN", "RETURNING_FOR_MAINTENANCE",
  ].includes(normalizedKey(value ?? ""));
}

export function isContinuationMission(mission: TransitMission) {
  return (
    mission.purpose === "BATTERY_STOP" &&
    !isCompletedMissionState(mission.missionState) &&
    !isIncidentMissionState(mission.missionState)
  );
}

function normalizeTransitPurpose(
  value: string,
  missionState?: string,
): TransitMissionPurpose {
  // Explicit incident or incident lifecycle must never become a normal return.
  const key = normalizedKey(value);
  if (key === "INCIDENT_RETURN" || key === "INCIDENT" || isIncidentMissionState(missionState))
    return "INCIDENT_RETURN";
  // Terminal mission lifecycle overrides a stale BATTERY_STOP flag.
  if (isCompletedMissionState(missionState)) return "RETURN_TO_HUB";
  if (key === "RETURN_TO_HUB" || key === "MISSION_RETURN")
    return "RETURN_TO_HUB";
  if (["BATTERY_STOP", "TRANSIT_STOP", "BATTERY_SWAP", "TRANSIT"].includes(key))
    return "BATTERY_STOP";

  // Missing purpose cannot safely be treated as BATTERY_STOP.
  return "UNKNOWN";
}

function displayId(prefix: string, value: string, width = 4) {
  if (!value) return `${prefix}-UNKNOWN`;
  if (value.toUpperCase().startsWith(`${prefix}-`)) return value.toUpperCase();
  const match = value.match(/(\d+)$/);
  return match ? `${prefix}-${match[1].padStart(width, "0")}` : `${prefix}-${value}`;
}

function mapApiTransitMission(value: unknown): TransitMission | null {
  if (!isRecord(value)) return null;

  // Swagger source of truth is GET /technician/fleet/incoming.
  // Keep the backend mission_id separate from the human-readable mission_code:
  // - backendMissionId -> API actions such as confirm-arrival / battery use
  // - missionId        -> display/search only
  const backendMissionIdRaw = pickString(
    value,
    ["mission_id", "missionId"],
    "",
  ).trim();

  const missionCodeRaw = pickString(
    value,
    ["mission_code", "missionCode", "code"],
    "",
  ).trim();

  const fallbackRowId = pickString(
    value,
    ["id"],
    "",
  ).trim();

  const missionRaw =
    missionCodeRaw || backendMissionIdRaw || fallbackRowId;

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

  const backendMissionId = backendMissionIdRaw || null;
  const missionId = missionCodeRaw
    ? missionCodeRaw
    : displayId("MSN", missionRaw);
  const droneId = displayId("DR", derivedDroneId, 3);
  const droneType = (
    rawDroneCode.match(/[A-Za-z]+/)?.[0] ??
    pickString(value, ["drone_type"], "DR")
  ).toUpperCase();

  const status = normalizeTransitStatus(
    pickString(value, ["handling_status", "status"], "INCOMING"),
  );

  const missionState = pickString(
    value,
    ["mission_state", "mission_status", "flight_status"],
    "",
  );

  const purpose = normalizeTransitPurpose(
    pickString(
      value,
      ["purpose", "mission_purpose", "arrival_reason"],
      "",
    ),
    missionState,
  );

  const batteryCode = pickString(
    value,
    ["battery_code", "battery_id", "installed_battery_id"],
    "",
  );

  return {
    id: pickString(value, ["transit_id", "id"], `TM-${missionRaw}`),
    backendMissionId,
    missionId,
    legId: pickString(
      value,
      ["leg_id", "mission_leg_id"],
      `LEG-${missionRaw}`,
    ),
    missionState: missionState || undefined,
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
    ) && purpose === "BATTERY_STOP",
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
  // Swagger source of truth for Technician Transit Missions:
  // GET /api/v1/technician/fleet/incoming
  // Do not call the removed /api/v1/technician/missions/ route here.
  const payload = await getIncomingMissionsApi();

  demoTransitMissions = unwrapList(payload)
    .map(mapApiTransitMission)
    .filter((item): item is TransitMission => Boolean(item));

  window.dispatchEvent(
    new Event("technician-transit-missions-updated"),
  );

  return loadTransitMissions();
}

export async function confirmTransitArrivalOnServer(missionId: string) {
  if (!missionId?.trim()) {
    throw new Error("Cannot confirm arrival: Backend mission_id was not provided.");
  }
  // Do not refetch here. The TanStack mutation invalidates the transit query
  // after a successful confirmation, which produces one fresh request cycle.
  // Refetching here as well caused duplicate missions/incoming requests.
  return confirmMissionArrivalApi(missionId);
}
