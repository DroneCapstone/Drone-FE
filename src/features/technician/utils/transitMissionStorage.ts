import {
  confirmMissionArrivalApi,
  confirmRelayArrivalApi,
  getTransitHistoryApi,
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
  originHubId?: number;
  destinationHubId?: number;
  droneCurrentHubId?: number;
  /** Exact Backend handling enum, not the mission flight status. */
  handlingStatus?: string;

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
  /** Confirmed arrival is NOT the same as inspection/battery detachment completion. */
  arrivalConfirmed: boolean;
  /** Only Backend can declare that the post-flight intake process is complete. */
  intakeCompleted: boolean;

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
  /** Exact Backend handling enum, not the mission flight status. */
  handlingStatus?: string;

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

// ---------------------------------------------------------------------------
// Backend API integration
// ---------------------------------------------------------------------------


function normalizeTransitStatus(value: string): TransitMissionStatus {
  const key = value.trim().toUpperCase().replace(/[\s-]+/g, "_");

  if (["WAITING_BATTERY_SWAP", "AT_HUB"].includes(key)) return "At Hub";
  if (["READY_FOR_RELAUNCH", "READY"].includes(key)) return "Ready";
  if (["AT_RELAY_HUB", "ARRIVED_AT_HUB"].includes(key)) return "Incoming";
  if (key === "CANNOT_CONTINUE") return "Cannot Continue";
  if (key === "REPLACEMENT_REQUESTED") return "Cannot Continue";
  return "Incoming";
}

/**
 * The mission flight state is not a Technician handling state.
 * Scheduled/Ready belong to Outbound (preflight), even if an older
 * /fleet/incoming response mistakenly attaches a hub/ready label.
 */
function normalizedKey(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

const RELAY_HANDLING_STATES = [
  "AT_RELAY_HUB",
  "WAITING_BATTERY_SWAP",
  "READY_FOR_RELAUNCH",
];

function isPreflightMissionState(value?: string) {
  return ["SCHEDULED", "READY", "PLANNED", "PENDING", "NOT_STARTED"].includes(
    normalizedKey(value ?? ""),
  );
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

/** Relay is a specific hub-handling step, not an arbitrary BATTERY_STOP label. */
export function isContinuationMission(mission: TransitMission) {
  return (
    mission.purpose === "BATTERY_STOP" &&
    RELAY_HANDLING_STATES.includes(normalizedKey(mission.handlingStatus ?? "")) &&
    !isPreflightMissionState(mission.missionState) &&
    !isCompletedMissionState(mission.missionState) &&
    !isIncidentMissionState(mission.missionState)
  );
}

/**
 * Single rule for the active Transit page, regardless of what GET /incoming
 * includes. Scheduled/Ready missions are prepared in Outbound, never here.
 * A confirmed/processed final landing belongs to GET /fleet/history.
 */
export function isActiveTechnicianTransitMission(mission: TransitMission): boolean {
  if (isPreflightMissionState(mission.missionState) || mission.intakeCompleted) {
    return false;
  }

  const handling = normalizedKey(mission.handlingStatus ?? "");
  if (RELAY_HANDLING_STATES.includes(handling)) {
    return isContinuationMission(mission) || mission.purpose === "INCIDENT_RETURN";
  }

  // The BE also returns human-readable values (Incoming, Cannot continue,
  // At hub), not just the enum names documented for the Relay flow.
  // An en-route mission is visible for monitoring, but NEVER confirmable yet.
  if (handling === "INCOMING") {
    return ["FLYING", "IN_PROGRESS", "IN_FLIGHT", "ACTIVE"].includes(
      normalizedKey(mission.missionState ?? ""),
    );
  }
  if (handling === "CANNOT_CONTINUE") {
    return isIncidentMissionState(mission.missionState) ||
      mission.purpose === "INCIDENT_RETURN";
  }

  // A confirmed arrival may still need inspection. Only Backend's explicit
  // intake_completed flag/time moves it out of the active list.
  if (["AT_HUB", "ARRIVED_AT_HUB"].includes(handling)) {
    return isCompletedMissionState(mission.missionState) ||
      isIncidentMissionState(mission.missionState) ||
      mission.purpose === "INCIDENT_RETURN" ||
      mission.purpose === "RETURN_TO_HUB";
  }

  return false;
}

/** A final flight cannot be accepted at the destination if the drone is still
 * assigned to a different hub. Show the mission, but require BE correction. */
export function hasFinalHubMismatch(mission: TransitMission): boolean {
  return mission.purpose === "RETURN_TO_HUB" &&
    isCompletedMissionState(mission.missionState) &&
    mission.droneCurrentHubId !== undefined &&
    mission.destinationHubId !== undefined &&
    mission.droneCurrentHubId !== mission.destinationHubId;
}

/** Whether Technician may OPEN the Confirm Arrival action.
 * A row from /incoming is not proof the drone has landed: Technician must
 * verify physical receipt in the dialog and Backend authorizes the POST.
 * A hub mismatch is a warning, never a silent disappearance of Confirm.
 */
export function canConfirmTransitArrival(mission: TransitMission): boolean {
  if (!isActiveTechnicianTransitMission(mission) ||
      mission.arrivalConfirmed || mission.intakeCompleted) return false;
  const handling = normalizedKey(mission.handlingStatus ?? "");
  if (handling === "INCOMING") {
    // The incoming list may contain approaching drones. The user must verify
    // actual landing before sending the confirmation request.
    return ["FLYING", "IN_PROGRESS", "IN_FLIGHT", "ACTIVE"].includes(
      normalizedKey(mission.missionState ?? ""),
    );
  }
  if (handling === "CANNOT_CONTINUE" || handling === "AT_RELAY_HUB") {
    // Incident arrivals also need an acknowledgement/inspection, not only an
    // inert Review Incident label. BE remains authoritative about eligibility.
    return mission.purpose === "INCIDENT_RETURN" ||
      isContinuationMission(mission);
  }
  if (["AT_HUB", "ARRIVED_AT_HUB"].includes(handling)) {
    return isCompletedMissionState(mission.missionState) ||
      isIncidentMissionState(mission.missionState) ||
      mission.purpose === "RETURN_TO_HUB" ||
      mission.purpose === "INCIDENT_RETURN";
  }
  return false;
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
    ["drone_code", "drone_name", "drone", "name"],
    "",
  );

  const droneRaw = pickString(
    value,
    ["drone_id", "current_drone_id", "droneId"],
    "",
  );

  // Prefer the canonical BE drone_id. Do not derive an ID from drone name.
  const droneId = droneRaw.trim();

  // Some versions of GET /technician/fleet/incoming return the mission
  // identifier under `id` / `mission_code`, without a `mission_id` field.
  // Use it ONLY when it is explicitly a mission code (MSN-...), never a
  // transit-row, drone or order ID. Avoid inventing a numeric suffix.
  const fallbackMissionId =
    /^MSN[-_]/i.test(fallbackRowId)
      ? fallbackRowId
      : /^MSN[-_]/i.test(missionCodeRaw)
        ? missionCodeRaw
        : "";
  const backendMissionId = backendMissionIdRaw || fallbackMissionId || null;
  const missionId = missionCodeRaw
    ? missionCodeRaw
    : displayId("MSN", missionRaw);
  const droneType = (
    rawDroneCode.match(/[A-Za-z]+/)?.[0] ??
    pickString(value, ["drone_type"], "DR")
  ).toUpperCase();

  const rawHandlingStatus = pickString(value, ["handling_status", "handlingStatus"], "");
  const status = normalizeTransitStatus(rawHandlingStatus || "INCOMING");

  const explicitMissionState = pickString(
    value,
    ["mission_state", "mission_status", "flight_status"],
    "",
  );
  // Some Incoming responses use `status: Completed` for the flight and
  // `handling_status: At hub` for the drone's arrival. Do not treat the
  // generic status as a mission lifecycle if it is actually a handling state.
  const rawStatus = pickString(value, ["status"], "");
  const missionState = explicitMissionState ||
    (["COMPLETED", "COMPLETE", "IN_PROGRESS", "SCHEDULED", "FAILED",
      "ABORTED", "CANCELLED", "CANCELED", "ACTIVE", "FLYING"].includes(normalizedKey(rawStatus))
      ? rawStatus
      : "");

  // Backend handling enum determines the step; explicit incident signals
  // take precedence over a relay/battery-stop fallback.
  const handlingKey = normalizedKey(rawHandlingStatus);
  const rawPurpose = pickString(
    value, ["purpose", "mission_purpose", "arrival_reason"], "",
  );
  const incidentReported = (
    ["INCIDENT", "INCIDENT_RETURN"].includes(normalizedKey(rawPurpose)) ||
    isIncidentMissionState(missionState) ||
    pickBoolean(value, ["is_incident", "has_incident", "has_issue"], false) ||
    Boolean(pickString(value, ["incident_id", "incident_alert_id", "maintenance_alert_id"], ""))
  );
  const purpose: TransitMissionPurpose = incidentReported
    ? "INCIDENT_RETURN"
    : RELAY_HANDLING_STATES.includes(handlingKey)
      ? "BATTERY_STOP"
      : handlingKey === "ARRIVED_AT_HUB"
        ? "RETURN_TO_HUB"
        : normalizeTransitPurpose(rawPurpose, missionState);

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
    originHubId: pickNumber(value, ["origin_hub_id"], -1) >= 0
      ? pickNumber(value, ["origin_hub_id"], -1) : undefined,
    destinationHubId: pickNumber(value, ["destination_hub_id"], -1) >= 0
      ? pickNumber(value, ["destination_hub_id"], -1) : undefined,
    droneCurrentHubId: pickNumber(value, ["drone_current_hub_id"], -1) >= 0
      ? pickNumber(value, ["drone_current_hub_id"], -1) : undefined,
    handlingStatus: rawHandlingStatus || undefined,
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
      handlingKey === "WAITING_BATTERY_SWAP",
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
      pickString(value, ["arrival_confirmed_at", "confirmed_arrival_at"], "") || undefined,
    // Do not infer confirmation from the ambiguous "At hub" label.
    // A timestamp or explicit boolean from BE is the only reliable signal.
    arrivalConfirmed: (
      pickBoolean(value, ["arrival_confirmed", "is_arrival_confirmed"], false) ||
      Boolean(pickString(value, ["arrival_confirmed_at", "confirmed_arrival_at"], "")) ||
      handlingKey === "WAITING_BATTERY_SWAP"
    ),
    intakeCompleted: (
      pickBoolean(value, ["intake_completed", "inspection_completed", "hub_intake_completed"], false) ||
      Boolean(pickString(value, ["intake_completed_at", "hub_intake_completed_at"], ""))
    ),
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

  // React Query owns the cache. Never invent local history or overwrite the
  // real GET /incoming result with browser-memory state.
  return unwrapList(payload)
    .map(mapApiTransitMission)
    .filter((item): item is TransitMission =>
      item !== null && isActiveTechnicianTransitMission(item),
    );
}

export async function confirmTransitArrivalOnServer(input: {
  missionId: string;
  relay: boolean;
  hasIssue?: boolean;
  notes?: string;
}) {
  if (!input.missionId.trim()) throw new Error("Backend mission ID is missing.");
  if (input.relay) return confirmRelayArrivalApi(input.missionId);
  return confirmMissionArrivalApi(input.missionId, {
    has_issue: input.hasIssue === true,
    notes: input.notes?.trim() ?? "",
  });
}

/** GET /fleet/history is the single source of truth, including after reload. */
export async function refreshTransitMissionHistoryFromApi(): Promise<TransitMissionHistory[]> {
  const result = await getTransitHistoryApi();
  return unwrapList(result).map(mapApiTransitHistory).filter(
    (item): item is TransitMissionHistory => item !== null,
  );
}

export function mapApiTransitHistory(value: unknown): TransitMissionHistory | null {
  if (!isRecord(value)) return null;
  const id = pickString(value, ["mission_id", "mission_code", "id"], "");
  if (!id) return null;
  const state = pickString(value, ["status", "mission_status", "mission_state"], "");
  const purpose = normalizeTransitPurpose(
    pickString(value, ["purpose", "mission_purpose", "arrival_reason"], ""), state,
  );
  const droneId = pickString(value, ["drone_id", "current_drone_id", "droneId"], "");
  const batteryId = pickString(value, ["battery_code", "battery_id", "battery"], "");
  const outcome = isIncidentMissionState(state) ? "Sent to maintenance" :
    isCompletedMissionState(state) ? "Returned to hub" : "Continued";
  return {
    id: `BE-${id}-${pickString(value, ["arrival_confirmed_at", "handled_at", "id"], "")}`,
    missionId: id,
    legId: pickString(value, ["leg_id", "mission_leg_id"], ""),
    missionState: state || undefined,
    droneCode: pickString(value, ["drone_code", "drone"], "") || undefined,
    purpose,
    droneId, droneType: pickString(value, ["drone_type"], "DR"),
    droneModel: pickString(value, ["drone_model"], "—"),
    batteryId: batteryId || undefined,
    batteryLevelPct: pickNumber(value, ["battery_level_pct", "battery_percent", "battery_pct"], 0),
    origin: pickString(value, ["origin_hub", "origin", "origin_hub_name"], "—"),
    hub: pickString(value, ["hub", "hub_name"], "—"),
    destination: pickString(value, ["destination_hub", "destination", "destination_hub_name"], "—"),
    handledAt: pickString(value, ["arrival_confirmed_at", "handled_at", "completed_at", "updated_at"], "—"),
    outcome,
  };
}
