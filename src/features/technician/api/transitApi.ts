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
  payload: { has_issue?: boolean; has_incident?: boolean; battery_faulty?: boolean; proof_image_url?: string } = {},
) {
  return technicianApiRequest(missionPath(missionId, "confirm-arrival"), {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      stage: "PACKAGE_UNLOADED_FROM_DRONE",
    }),
  });
}

/** Relay: the Technician acknowledges the actual landing exactly once. */
export function confirmRelayArrivalApi(missionId: string | number, proofImageUrl?: string) {
  return technicianApiRequest(missionPath(missionId, "confirm-relay-arrival"), {
    method: "POST",
    ...(proofImageUrl ? { body: JSON.stringify({ proof_image_url: proofImageUrl }) } : {}),
  });
}

/** new_battery_id is the canonical BAT-... string (not a numeric suffix).
 * If omitted, BE selects a compatible battery. */
export function swapRelayBatteryApi(
  missionId: string | number,
  payload: { new_battery_id?: string; proof_image_url?: string } = {},
) {
  return technicianApiRequest(missionPath(missionId, "swap-battery"), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** The same BE route supports origin and relay; Backend validates Ready. */
export function dispatchRelayMissionApi(missionId: string | number, proofImageUrl?: string) {
  return technicianApiRequest(missionPath(missionId, "dispatch"), {
    method: "POST",
    body: JSON.stringify({
      stage: "PACKAGE_LOADED_TO_DRONE",
      ...(proofImageUrl ? { proof_image_url: proofImageUrl } : {}),
    }),
  });
}
