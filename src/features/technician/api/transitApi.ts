/** Technician Mission API (TECHNICIAN_MISSION_API.md, 2026-10-21).
 * Keep the GET endpoints exported from the existing shared client, but call
 * the confirmed /fleet/missions/{mission_id}/... paths for every action.
 */
import { technicianApiRequest } from "../api/httpClient";

export {
  getTransitHistoryApi,
  getIncomingMissionsApi,
  getTechnicianMissionsApi,
} from "../utils/technicianApi";

function missionPath(missionId: string | number, operation: string): string {
  const id = String(missionId).trim();
  if (!id) throw new Error("Backend mission ID is missing.");
  return `/technician/fleet/missions/${encodeURIComponent(id)}/${operation}`;
}

/** Hub đích / Incident. BE documents these three optional fields. */
export function confirmMissionArrivalApi(
  missionId: string | number,
  payload: { has_issue?: boolean; has_incident?: boolean; battery_faulty?: boolean } = {},
) {
  return technicianApiRequest(missionPath(missionId, "confirm-arrival"), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Relay: the Technician acknowledges the actual landing exactly once. */
export function confirmRelayArrivalApi(missionId: string | number) {
  return technicianApiRequest(missionPath(missionId, "confirm-relay-arrival"), {
    method: "POST",
  });
}

/** new_battery_id is the canonical BAT-... string (not a numeric suffix).
 * If omitted, BE selects a compatible battery. */
export function swapRelayBatteryApi(
  missionId: string | number,
  payload: { new_battery_id?: string } = {},
) {
  return technicianApiRequest(missionPath(missionId, "swap-battery"), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** The same BE route supports origin and relay; Backend validates Ready. */
export function dispatchRelayMissionApi(missionId: string | number) {
  return technicianApiRequest(missionPath(missionId, "dispatch"), {
    method: "POST",
  });
}
