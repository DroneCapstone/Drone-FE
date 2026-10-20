import { technicianApiRequest } from "../utils/technicianApi";

/**
 * Backend has published ONLY /technician/fleet/missions/{mission_id}/dispatch
 * for the Relay Hub continuation flow. Do not presume it supports an
 * INITIAL departure from Origin. Enable when BE confirms the initial dispatch
 * contract by setting VITE_TECHNICIAN_INITIAL_DISPATCH_PATH to e.g.
 *   /technician/fleet/missions/{mission_id}/dispatch
 * ONLY if BE explicitly confirms that endpoint accepts an initial departure.
 * If BE exposes a different endpoint, configure its exact path template.
 * Must include {mission_id}; no guessed URL or fake status update.
 */
const pathTemplate = String(
  import.meta.env.VITE_TECHNICIAN_INITIAL_DISPATCH_PATH ?? "",
).trim();

export const initialDispatchEnabled =
  pathTemplate.startsWith("/") &&
  !pathTemplate.startsWith("//") &&
  pathTemplate.includes("{mission_id}") &&
  !/[?#]/.test(pathTemplate);

export function dispatchInitialOutboundMissionApi(missionId: string) {
  if (!initialDispatchEnabled) {
    return Promise.reject(new Error(
      "Backend has not confirmed an initial Outbound Dispatch API. " +
      "Ask BE to confirm the route and configure VITE_TECHNICIAN_INITIAL_DISPATCH_PATH.",
    ));
  }
  const path = pathTemplate.replaceAll(
    "{mission_id}", encodeURIComponent(missionId),
  );
  return technicianApiRequest(path, { method: "POST" });
}
