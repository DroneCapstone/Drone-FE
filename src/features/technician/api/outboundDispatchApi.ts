import { technicianApiRequest } from "../utils/technicianApi";

/**
 * BE-confirmed Origin Hub flow:
 *   Scheduled + AT_HUB --POST ready--> Scheduled + READY
 *   Scheduled + READY  --POST dispatch--> Flying
 *
 * These calls use the real mission ID (MSN-...), never a numeric suffix.
 * BE is authoritative for drone/battery checks, scheduled departure time,
 * mission transition and physical inventory changes.
 */
function missionEndpoint(missionId: string, operation: "ready" | "dispatch"): string {
  const id = missionId.trim();
  if (!id) {
    throw new Error("Backend mission ID is missing.");
  }
  return `/technician/fleet/missions/${encodeURIComponent(id)}/${operation}`;
}

export function markOutboundMissionReadyApi(missionId: string) {
  return technicianApiRequest(missionEndpoint(missionId, "ready"), { method: "POST" });
}

export function dispatchInitialOutboundMissionApi(missionId: string) {
  return technicianApiRequest(missionEndpoint(missionId, "dispatch"), { method: "POST" });
}
