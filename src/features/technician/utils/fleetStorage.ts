import {
  getDroneDetailApi,
  getFleetDronesApi,
  updateDroneStatusApi,
} from "../api/fleetApi";

import {
  isRecord,
  pickNumber,
  pickString,
  unwrapList,
} from "../api/httpClient";

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
  installedBatteryId?: string;
  installedBatteryPct?: number;
  lastMaintenanceAt?: string;
  nextMaintenanceAt?: string;
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
  if (status.trim().toUpperCase() === "MAINTENANCE") {
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


function mapApiDrone(value: unknown): FleetDrone | null {
  if (!isRecord(value)) return null;

  const rawId = pickString(value, ["drone_id", "id", "droneId"]);
  if (!rawId) return null;

  const id = /^DR-/i.test(rawId)
    ? rawId.toUpperCase()
    : `DR-${String(Number(rawId) || rawId).padStart(3, "0")}`;

  const name = pickString(value, ["name", "drone_name", "code"], id);
  const model = pickString(value, ["model", "drone_model"], "—");
  const status = normalizeDroneStatus(
    pickString(value, ["status", "technical_status", "operational_status"], "Available"),
  );
  const hub = pickString(value, ["hub_name", "hub", "location"], TECHNICIAN_HUB);
  const battery = pickNumber(value, ["battery_level_pct", "battery_pct", "battery", "charge_level_pct"], 0);

  const installedBatteryId = (() => {
    const raw = pickString(value, ["installed_battery_id", "battery_id"], "");
    if (!raw) return undefined;
    if (/^BAT-/i.test(raw)) return raw.toUpperCase();
    const match = raw.match(/(\d+)$/);
    return match ? `BAT-${match[1].padStart(3, "0")}` : `BAT-${raw}`;
  })();

  return {
    id,
    name,
    model,
    status,
    battery,
    utilization: 0,
    lastFlight: pickString(value, ["last_flight", "last_mission_id"], "Not flown"),
    location: hub,
    installedBatteryId,
    installedBatteryPct: installedBatteryId ? battery : undefined,
    lastMaintenanceAt: pickString(value, ["last_maintenance", "last_maintenance_at"], "") || undefined,
    nextMaintenanceAt: pickString(value, ["next_maintenance", "next_maintenance_at"], "") || undefined,
  };
}

export async function refreshFleetFromApi() {
  const payload = await getFleetDronesApi();
  const next = unwrapList(payload)
    .map(mapApiDrone)
    .filter((item): item is FleetDrone => Boolean(item));

  demoFleet = next;
  window.dispatchEvent(new Event("technician-fleet-updated"));
  return loadFleet();
}

export async function updateDroneStatusOnServer(
  droneId: string,
  status: DroneStatus,
) {
  await updateDroneStatusApi(droneId, status);

  demoFleet = demoFleet.map((drone) =>
    drone.id === droneId ? { ...drone, status } : drone,
  );

  window.dispatchEvent(new Event("technician-fleet-updated"));
  return loadFleet();
}

export async function fetchDroneDetailFromApi(droneId: string) {
  const payload = await getDroneDetailApi(droneId);
  const record = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const mapped = mapApiDrone(record);
  if (!mapped) {
    throw new Error("Backend returned an invalid drone detail response.");
  }

  demoFleet = [
    mapped,
    ...demoFleet.filter((drone) => drone.id !== mapped.id),
  ];
  window.dispatchEvent(new Event("technician-fleet-updated"));
  return { ...mapped };
}
