import { technicianDrones } from "../data/technicianMockData";

export type DroneStatus =
  | "Available"
  | "Maintenance"
  | "Battery Replacement";

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

/*
 * Đổi sang v2 để không bị dữ liệu localStorage cũ
 * từ phiên bản trước ghi đè location mới.
 */
export const FLEET_STORAGE_KEY =
  "droneoptai.technician.fleet.v2";

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
 * Mock dữ liệu dành cho Technician Hub HCM-02
 *
 * CX-09: đang ở Hub HCM-02
 * CX-12: đang từ Hub khác bay tới Hub HCM-02
 * AX-04: đang ở Hub HCM-02
 * AX-08: đang ở Hub HCM-02
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

  if (
    status === "Battery Replacement"
  ) {
    return "Battery Replacement";
  }

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

      battery: Number(drone.battery),

      utilization: Number(
        drone.utilization,
      ),

      lastFlight:
        drone.lastFlight ?? "Not flown",

      location:
        defaultLocationById[drone.id] ??
        HUB_OPTIONS[
          index % HUB_OPTIONS.length
        ],
    }),
  );
}

export function loadFleet(): FleetDrone[] {
  if (typeof window === "undefined") {
    return createDefaultFleet();
  }

  try {
    const stored =
      localStorage.getItem(
        FLEET_STORAGE_KEY,
      );

    if (!stored) {
      return createDefaultFleet();
    }

    const parsed = JSON.parse(
      stored,
    ) as FleetDrone[];

    if (!Array.isArray(parsed)) {
      return createDefaultFleet();
    }

    return parsed.map(
      (drone, index) => ({
        ...drone,

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
          drone.location ||
          defaultLocationById[
            drone.id
          ] ||
          HUB_OPTIONS[
            index %
              HUB_OPTIONS.length
          ],
      }),
    );
  } catch {
    return createDefaultFleet();
  }
}

export function saveFleet(
  drones: FleetDrone[],
) {
  localStorage.setItem(
    FLEET_STORAGE_KEY,
    JSON.stringify(drones),
  );
}