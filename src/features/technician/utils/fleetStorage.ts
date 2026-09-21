import {
  technicianDrones,
} from "../data/technicianMockData";

export type DroneStatus =
  | "Available"
  | "Maintenance";

export type FleetDrone = {
  id: string;
  name: string;
  model: string;
  status: DroneStatus;
  battery: number;
  utilization: number;
  lastFlight: string;
  location: string;
};

export const TECHNICIAN_HUB =
  "Hub HCM-02";

export const HUB_OPTIONS = [
  "Hub HCM-01",
  "Hub HCM-02",
  "Hub HCM-03",
];

export const LOCATION_OPTIONS = [
  "Hub HCM-01",
  "Hub HCM-02",
  "Hub HCM-03",
  "Heading to Hub HCM-01",
  "Heading to Hub HCM-02",
  "Heading to Hub HCM-03",
];

/*
 * DEMO INITIAL LOCATION
 * ---------------------------------------------------------
 * DR-002 is the drone used by the Incoming transit mission.
 * Therefore it must NOT appear in Hub HCM-02 before
 * Technician confirms its arrival.
 */
const defaultLocationById: Record<
  string,
  string
> = {
  "DR-001": "Hub HCM-02",
  "DR-002": "Heading to Hub HCM-02",
  "DR-003": "Hub HCM-02",
  "DR-004": "Hub HCM-02",
};

export function normalizeDroneStatus(
  status: string,
): DroneStatus {
  if (status === "Maintenance") {
    return "Maintenance";
  }

  /*
   * Legacy "Battery Replacement" is no longer an
   * operational status. Battery service is handled
   * separately by Transit missions.
   */
  return "Available";
}

function createDefaultFleet(): FleetDrone[] {
  return technicianDrones.map(
    (drone, index) => ({
      id: drone.id,
      name: drone.name,
      model: drone.model,
      status: normalizeDroneStatus(
        String(drone.status),
      ),
      battery: Number(
        drone.battery,
      ),
      utilization: Number(
        drone.utilization ?? 0,
      ),
      lastFlight:
        drone.lastFlight ??
        "Not flown",
      location:
        defaultLocationById[
          drone.id
        ] ??
        HUB_OPTIONS[
          index %
            HUB_OPTIONS.length
        ],
    }),
  );
}

/*
 * DEMO RUNTIME STORE
 * ---------------------------------------------------------
 * Keep changes while navigating inside the SPA.
 *
 * Full browser refresh:
 * -> module reloads
 * -> fleet resets to createDefaultFleet()
 *
 * This keeps demo data consistent with Transit missions:
 * - Incoming DR-002 starts outside Hub HCM-02
 * - Confirm arrival moves DR-002 into Hub HCM-02
 * - Refresh restores the initial demo state
 *
 * Later, replace this runtime store with backend APIs.
 */
let demoFleet: FleetDrone[] =
  createDefaultFleet();

export function loadFleet(): FleetDrone[] {
  return demoFleet.map(
    (drone) => ({
      ...drone,
    }),
  );
}

export function saveFleet(
  drones: FleetDrone[],
) {
  demoFleet =
    drones.map(
      (drone) => ({
        ...drone,
        status:
          normalizeDroneStatus(
            String(
              drone.status,
            ),
          ),
      }),
    );

  window.dispatchEvent(
    new Event(
      "technician-fleet-updated",
    ),
  );
}

export function resetDemoFleet() {
  demoFleet =
    createDefaultFleet();

  window.dispatchEvent(
    new Event(
      "technician-fleet-updated",
    ),
  );
}
