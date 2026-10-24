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
  /** The active leg's destination; lets FE distinguish relay from final hub. */
  currentLegToHubId?: number;
  /** Backend MissionLeg.status: PENDING | IN_PROGRESS | COMPLETED. */
  legStatus?: string;

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

  /** New battery assigned by Operator for this relay, NOT the installed battery_id. */
  assignedReplacementBatteryId?: string;

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
  /** Only show when returned in GET /fleet/history. */
  orderId?: string;
  arrivedAt?: string;
  flightEndedAt?: string;
  arrivalConfirmedAt?: string;
  batteryLevelReported?: boolean;

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
    | "Arrival confirmed"
    | "Cancelled"
    | "Failed";
};

// ---------------------------------------------------------------------------
// Backend API integration
// ---------------------------------------------------------------------------


/** Normalize BE display values without treating mission and hub handling as one lifecycle. */
function normalizedKey(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function normalizeTransitStatus(value: string): TransitMissionStatus {
  switch (normalizedKey(value)) {
    case "AT_HUB":
    case "ARRIVED_AT_HUB": return "At Hub";
    case "READY": return "Ready";
    case "CANNOT_CONTINUE": return "Cannot Continue";
    // Older API rows are display-only; do not use their old labels for actions.
    case "REPLACEMENT_REQUESTED": return "Replacement Requested";
    default: return "Incoming";
  }
}

function isPreflightMissionState(value?: string) {
  return ["SCHEDULED", "READY", "PLANNED", "PENDING", "NOT_STARTED"].includes(
    normalizedKey(value ?? ""),
  );
}

/** Completed = landed at final hub, still waiting for Technician confirmation. */
export function isCompletedMissionState(value?: string) {
  return normalizedKey(value ?? "") === "COMPLETED";
}

/** Mission completed is a different, terminal lifecycle state. */
export function isFinalizedMissionState(value?: string) {
  return [
    "MISSION_COMPLETED", "CANCELLED", "CANCELED", "FAILED",
  ].includes(normalizedKey(value ?? ""));
}

export function isIncidentMissionState(value?: string) {
  return ["INCIDENT_RETURN", "INCIDENT"].includes(normalizedKey(value ?? ""));
}

function isFlyingMissionState(value?: string) {
  return ["FLYING", "IN_PROGRESS", "IN_FLIGHT"].includes(normalizedKey(value ?? ""));
}

/** Relay stays in the Flying mission lifecycle; its hub handling advances
 * Incoming → At hub (confirm-relay-arrival) → Ready (swap-battery) → Incoming (dispatch).
 * A Ready Scheduled mission still belongs to Outbound, not Transit. */
export function isContinuationMission(mission: TransitMission) {
  return mission.purpose === "BATTERY_STOP" &&
    isFlyingMissionState(mission.missionState) &&
    ["INCOMING", "AT_HUB", "READY"].includes(normalizedKey(mission.handlingStatus ?? "")) &&
    !mission.intakeCompleted;
}

/** GET /incoming can also contain en-route drones. No preflight or terminal
 * missions should remain in this active Technician page. */
export function isActiveTechnicianTransitMission(mission: TransitMission): boolean {
  if (isPreflightMissionState(mission.missionState) ||
      isFinalizedMissionState(mission.missionState) || mission.intakeCompleted) return false;

  const handling = normalizedKey(mission.handlingStatus ?? "");
  if (isCompletedMissionState(mission.missionState)) {
    // BE documents both Incoming and At hub before final receipt.
    return ["INCOMING", "AT_HUB"].includes(handling);
  }
  if (isIncidentMissionState(mission.missionState)) {
    return ["INCOMING", "CANNOT_CONTINUE", "AT_HUB"].includes(handling);
  }
  if (isFlyingMissionState(mission.missionState)) {
    // Incoming is visible for both relay and final destinations. Technician
    // confirms the physical landing; it is not auto-confirmed by the frontend.
    if (handling === "INCOMING") return true;

    // BE may keep mission_state=Flying when the drone reaches its final hub
    // while changing handling_status to "At hub". The older relay-only rule
    // incorrectly hid these records, even though arrival_confirmed_at is null.
    if (handling === "AT_HUB") {
      const atFinalHub =
        (mission.droneCurrentHubId !== undefined &&
          mission.destinationHubId !== undefined &&
          mission.droneCurrentHubId === mission.destinationHubId) ||
        mission.purpose === "RETURN_TO_HUB";
      return atFinalHub || isContinuationMission(mission);
    }

    // Only a relay may be Ready for the next leg. Preflight Ready missions
    // are already excluded above and must remain on Outbound, not Transit.
    return handling === "READY" && isContinuationMission(mission);
  }
  return false;
}

/** Current hub is the planned stop at which this Technician receives the drone.
 * A different final destination means this hub is a relay, not an error. */
export function hasFinalHubMismatch(mission: TransitMission): boolean {
  // There is no mismatch under the BE contract: current != destination denotes relay.
  // Preserve the exported utility for existing imports.
  void mission;
  return false;
}

/** One click confirms PHYSICAL receipt. "Incoming" alone is not landing proof.
 * Routing is determined by BE destination_hub_id vs drone_current_hub_id. */
export function getTransitConfirmKind(mission: TransitMission): "RELAY" | "FINAL" | null {
  if (!isActiveTechnicianTransitMission(mission) ||
      mission.arrivalConfirmed || mission.intakeCompleted) return null;
  const handling = normalizedKey(mission.handlingStatus ?? "");
  if (!["INCOMING", "CANNOT_CONTINUE", "AT_HUB"].includes(handling)) return null;

  // Safety first: an incident never authorizes a relay launch.
  if (mission.purpose === "INCIDENT_RETURN" || isIncidentMissionState(mission.missionState)) {
    return "FINAL";
  }
  // The hub IDs represent the planned stop and ultimate destination.
  if (mission.droneCurrentHubId !== undefined && mission.destinationHubId !== undefined) {
    if (mission.droneCurrentHubId === mission.destinationHubId) return "FINAL";
    return handling === "INCOMING" ? "RELAY" : null;
  }
  // Older responses may still explicitly identify a relay or final stop.
  if (handling === "INCOMING" && mission.purpose === "BATTERY_STOP") return "RELAY";
  if (mission.purpose === "RETURN_TO_HUB" || isCompletedMissionState(mission.missionState)) return "FINAL";
  return null; // Missing routing information: show Confirm but explain the missing IDs.
}

export function canConfirmTransitArrival(mission: TransitMission): boolean {
  return getTransitConfirmKind(mission) !== null;
}

function normalizeTransitPurpose(value: string, missionState?: string): TransitMissionPurpose {
  const key = normalizedKey(value);
  if (isIncidentMissionState(missionState) || ["INCIDENT", "INCIDENT_RETURN"].includes(key))
    return "INCIDENT_RETURN";
  if (isCompletedMissionState(missionState) || ["RETURN_TO_HUB", "MISSION_RETURN", "FINAL", "DESTINATION"].includes(key))
    return "RETURN_TO_HUB";
  if (["BATTERY_STOP", "TRANSIT_STOP", "BATTERY_SWAP", "TRANSIT", "RELAY"].includes(key))
    return "BATTERY_STOP";
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

  const legObject = [value.current_leg, value.active_leg, value.mission_leg, value.leg]
    .find(isRecord);
  const legToHub = pickNumber(value, ["current_leg_to_hub_id", "leg_to_hub_id", "to_hub_id"], -1);
  const nestedLegToHub = legObject
    ? pickNumber(legObject, ["to_hub_id", "destination_hub_id"], -1)
    : -1;
  const currentLegToHubId = legToHub >= 0 ? legToHub
    : nestedLegToHub >= 0 ? nestedLegToHub : undefined;
  const legStatus = pickString(value, ["leg_status", "current_leg_status"], "") ||
    (legObject ? pickString(legObject, ["status", "leg_status"], "") : "");

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
      "ABORTED", "CANCELLED", "CANCELED", "ACTIVE", "FLYING",
      "INCIDENT_RETURN", "INCIDENT", "MISSION_COMPLETED"].includes(normalizedKey(rawStatus))
      ? rawStatus
      : "");

  // BE now uses only Incoming, At hub, Ready, Cannot continue for handling.
  // Infer relay from explicit purpose / active-leg destination, NOT an old
  // the removed old relay-only handling enums.
  const handlingKey = normalizedKey(rawHandlingStatus);
  const rawPurpose = pickString(value, ["purpose", "mission_purpose", "arrival_reason"], "");
  const destinationHubId = pickNumber(value, ["destination_hub_id"], -1);
  const stopHubId = pickNumber(value, ["drone_current_hub_id"], -1);
  // Contract confirmed by BE/user: this is the HUB THE DRONE WILL STOP AT,
  // not necessarily a historical physical location.
  const stopIsRelay = stopHubId >= 0 && destinationHubId >= 0 && stopHubId !== destinationHubId;
  const stopIsFinal = stopHubId >= 0 && destinationHubId >= 0 && stopHubId === destinationHubId;
  // Fall back to active-leg details only if the hub IDs are absent.
  const distinctRelayTarget = currentLegToHubId !== undefined && destinationHubId >= 0 &&
    currentLegToHubId !== destinationHubId;
  const finalLegTarget = currentLegToHubId !== undefined && destinationHubId >= 0 &&
    currentLegToHubId === destinationHubId;
  const incidentReported = isIncidentMissionState(missionState) ||
    ["INCIDENT", "INCIDENT_RETURN"].includes(normalizedKey(rawPurpose)) ||
    pickBoolean(value, ["is_incident", "has_incident", "has_issue"], false) ||
    Boolean(pickString(value, ["incident_id", "incident_alert_id", "maintenance_alert_id"], ""));
  // Hub routing wins when BE provides both hub IDs. When they are absent,
  // honor an explicitly classified purpose before using handling as fallback.
  // "Flying / At hub" alone does not prove that this is a relay stop.
  const declaredPurpose = normalizeTransitPurpose(rawPurpose, missionState);
  const purpose: TransitMissionPurpose = incidentReported
    ? "INCIDENT_RETURN"
    : stopIsRelay
      ? "BATTERY_STOP"
      : stopIsFinal
        ? "RETURN_TO_HUB"
        : isCompletedMissionState(missionState)
          ? "RETURN_TO_HUB"
          : declaredPurpose !== "UNKNOWN"
            ? declaredPurpose
            : isFlyingMissionState(missionState) && distinctRelayTarget
              ? "BATTERY_STOP"
              : isFlyingMissionState(missionState) && finalLegTarget
                ? "RETURN_TO_HUB"
                : isFlyingMissionState(missionState) && ["AT_HUB", "READY"].includes(handlingKey)
                  ? "BATTERY_STOP"
                  : "UNKNOWN";

  const batteryCode = pickString(
    value,
    ["battery_code", "battery_id", "installed_battery_id"],
    "",
  );

  return {
    id: pickString(value, ["transit_id", "id"], `TM-${missionRaw}`),
    backendMissionId,
    missionId,
    legId: pickString(value, ["leg_id", "mission_leg_id"], "") ||
      (legObject ? pickString(legObject, ["id", "leg_id"], "") : ""),
    currentLegToHubId,
    legStatus: legStatus || undefined,
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
    batteryId: batteryCode || undefined,
    // Never reuse battery_id here: it is the OLD installed battery.
    assignedReplacementBatteryId: pickString(value, [
      "assigned_replacement_battery_id", "replacement_battery_id",
      "operator_assigned_battery_id", "next_battery_id",
    ], "") || undefined,
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
    // Per new BE flow, a confirmed relay stop always requires a battery swap
    // before Ready / Dispatch (even when the old API omits the boolean).
    batteryServiceRequired: purpose === "BATTERY_STOP" && handlingKey === "AT_HUB",
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
    // BE says relay confirmation writes At hub, but the Incoming table also
    // documents At hub as a possible pre-confirmation state. Only a BE flag,
    // timestamp or a subsequent Ready (successful battery swap) proves receipt.
    arrivalConfirmed: purpose === "BATTERY_STOP" && ["AT_HUB", "READY"].includes(handlingKey)
      ? true
      : handlingKey === "INCOMING" ? false
      : pickBoolean(value, ["arrival_confirmed", "is_arrival_confirmed"], false) ||
        Boolean(pickString(value, ["arrival_confirmed_at", "confirmed_arrival_at"], "")),
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
      return replacement || undefined;
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
  // New BE contract accepts has_issue / has_incident / battery_faulty.
  // Do not submit old `notes` field or an invented inspection outcome.
  return confirmMissionArrivalApi(input.missionId, {
    has_issue: input.hasIssue === true,
    has_incident: input.hasIssue === true,
    battery_faulty: false,
  });
}

/** GET /fleet/history is the single source of truth, including after reload.
 * Keep the raw list mapping here; the Technician History UI displays only
 * arrivals with arrival_confirmed_at returned by Backend. */
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
  const state = pickString(value, ["mission_status", "mission_state", "status"], "");
  const purpose = normalizedKey(state) === "MISSION_COMPLETED"
    ? "RETURN_TO_HUB"
    : normalizeTransitPurpose(
      pickString(value, ["purpose", "mission_purpose", "arrival_reason"], ""), state,
    );
  const droneId = pickString(value, ["drone_id", "current_drone_id", "droneId"], "");
  const batteryId = pickString(value, ["battery_code", "battery_id", "battery"], "");
  // These are different events: arriving/flight ending is NOT technician receipt.
  const arrivedAt = pickString(value, ["arrived_at", "landed_at", "actual_arrival_at"], "");
  const flightEndedAt = pickString(value, ["end_time", "flight_ended_at", "ended_at"], "");
  // Do not use end_time as the Technician confirmation: that would falsely mark unconfirmed arrivals as handled.
  const confirmedAt = pickString(value, ["arrival_confirmed_at", "confirmed_arrival_at", "handled_at"], "");
  const originHubId = pickNumber(value, ["origin_hub_id"], -1);
  const destinationHubId = pickNumber(value, ["destination_hub_id"], -1);
  const currentHubId = pickNumber(value, ["drone_current_hub_id", "current_hub_id", "hub_id"], -1);
  const getHubName = (fields: string[], fallbackId: number) => {
    const name = pickString(value, fields, "");
    return name || (fallbackId >= 0 ? `Hub #${fallbackId}` : "—");
  };
  // Never fabricate a charge percentage if Backend omits it.
  const batteryPctKeys = ["battery_level_pct", "battery_percent", "battery_pct"];
  const batteryLevelReported = batteryPctKeys.some((key) => {
    const reading = value[key];
    return (typeof reading === "number" && Number.isFinite(reading)) ||
      (typeof reading === "string" && reading.trim() !== "" && Number.isFinite(Number(reading)));
  });
  const outcome = ["CANCELLED", "CANCELED"].includes(normalizedKey(state)) ? "Cancelled" :
    normalizedKey(state) === "FAILED" ? "Failed" :
    isIncidentMissionState(state) ? "Sent to maintenance" :
    confirmedAt ? "Arrival confirmed" :
    (isCompletedMissionState(state) || normalizedKey(state) === "MISSION_COMPLETED")
      ? "Returned to hub" : "Continued";
  return {
    id: `BE-${id}-${pickString(value, ["leg_id", "mission_leg_id"], "") || id}`,
    missionId: id,
    legId: pickString(value, ["leg_id", "mission_leg_id"], ""),
    orderId: pickString(value, ["order_id", "order_code"], "") || undefined,
    arrivedAt: arrivedAt || undefined,
    flightEndedAt: flightEndedAt || undefined,
    arrivalConfirmedAt: confirmedAt || undefined,
    batteryLevelReported,
    missionState: state || undefined,
    handlingStatus: pickString(value, ["handling_status", "handlingStatus"], "") || undefined,
    droneCode: pickString(value, ["drone_code", "drone"], "") || undefined,
    purpose,
    droneId, droneType: pickString(value, ["drone_type"], "DR"),
    droneModel: pickString(value, ["drone_model", "model"], "—"),
    batteryId: batteryId || undefined,
    batteryLevelPct: pickNumber(value, batteryPctKeys, 0),
    origin: getHubName(["origin_hub_name", "origin_hub", "origin"], originHubId),
    hub: getHubName(["hub_name", "hub", "target_hub_name"], currentHubId),
    destination: getHubName(["destination_hub_name", "destination_hub", "destination"], destinationHubId),
    // Kept for backwards compatibility. Do NOT substitute mission completed_at
    // or updated_at here; those are not Technician receipt timestamps.
    handledAt: confirmedAt || "—",
    outcome,
  };
}
