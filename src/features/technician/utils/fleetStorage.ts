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
  unwrapObject,
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
  // Fields returned by GET /technician/fleet/drones/{drone_id}.
  // Optional: a missing value must never be displayed as a made-up zero.
  operationalStatus?: string;
  payloadKg?: number;
  maxSpeed?: number;
  currentHubId?: string | number | null;
  batteryLevelPct?: number;
  utilizationPct?: number;
  batteryCode?: string;
  lastFlightAt?: string;
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


function readOptionalNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const raw = record[key];
    if (raw === null || raw === undefined || raw === "") continue;
    const value = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(value)) return value;
  }
  return undefined;
}

function mapApiDrone(value: unknown, forDetail = false): FleetDrone | null {
  if (!isRecord(value)) return null;

  const rawId = pickString(value, ["drone_id", "id", "droneId"]);
  if (!rawId) return null;

  // Preserve the Backend drone ID exactly (e.g. DRN-0005).
  // Do not generate an extra DR- prefix: DR-DRN-0005 is not a real ID.
  const id = rawId.trim();

  const name = pickString(value, ["name", "drone_name", "code"], id);
  const model = pickString(value, ["model", "drone_model"], "—");
  // Hub Fleet is *physical hub inventory*. Never display a flying drone as
  // Available. BE should also clear its hub assignment on successful Dispatch.
  const rawStatus = pickString(
    value, ["status", "operational_status", "flight_status", "technical_status"], "",
  ).trim().toUpperCase().replace(/[\s-]+/g, "_");
  // Explicit null hub means BE has unassigned this drone from physical hub stock.
  // Do not do this check for older responses which omit current_hub_id.
  const currentHub = value.current_hub_id ?? value.currentHubId;
  if (!forDetail && ((Object.prototype.hasOwnProperty.call(value, "current_hub_id") && value.current_hub_id === null) ||
      (Object.prototype.hasOwnProperty.call(value, "currentHubId") && value.currentHubId === null))) {
    return null;
  }
  const flightStatuses = [
    "FLYING", "IN_FLIGHT", "IN_MISSION", "ON_MISSION", "IN_TRANSIT",
    "DEPARTED", "DISPATCHED", "AIRBORNE",
  ];
  const hasFlyingStatus = ["status", "operational_status", "flight_status", "technical_status"]
    .some((key) => {
      const valueAtKey = value[key];
      return typeof valueAtKey === "string" &&
        flightStatuses.includes(valueAtKey.trim().toUpperCase().replace(/[\s-]+/g, "_"));
    });
  if (!forDetail && hasFlyingStatus) return null;
  const status = normalizeDroneStatus(rawStatus || "Available");
  const hub = pickString(value, ["hub_name", "hub", "location"], "") || "—";
  const batteryPct = readOptionalNumber(value, ["battery_level_pct", "battery_pct", "charge_level_pct"]);
  const battery = batteryPct ?? pickNumber(value, ["battery"], 0);
  const utilizationPct = readOptionalNumber(value, ["utilization_pct", "utilization_percent", "utilization"]);

  const installedBatteryId = (() => {
    const raw = pickString(value, ["installed_battery_id", "battery_id"], "");
    if (!raw) return undefined;
    // Never fabricate a battery identifier; API ids and serials may differ.
    return raw.trim();
  })();

  return {
    id,
    name,
    model,
    status,
    battery,
    utilization: utilizationPct ?? 0,
    lastFlight: pickString(value, ["last_flight", "last_mission_id", "last_flight_id"], "") || "—",
    location: hub,
    installedBatteryId,
    installedBatteryPct: installedBatteryId ? batteryPct : undefined,
    batteryCode: pickString(value, ["battery_code", "installed_battery_code", "battery_serial_number"], "") || undefined,
    batteryLevelPct: batteryPct,
    utilizationPct,
    payloadKg: readOptionalNumber(value, ["payload_kg", "max_payload_kg", "max_payload"]),
    maxSpeed: readOptionalNumber(value, ["max_speed", "max_speed_m_s", "max_speed_mps"]),
    currentHubId: currentHub === null ? null :
      typeof currentHub === "string" || typeof currentHub === "number" ? currentHub : undefined,
    operationalStatus: pickString(value, ["status", "operational_status", "flight_status"], "") || undefined,
    lastFlightAt: pickString(value, ["last_flight_at", "last_flight_time"], "") || undefined,
    lastMaintenanceAt: pickString(value, ["last_maintenance_at", "last_maintenance"], "") || undefined,
    nextMaintenanceAt: pickString(value, ["next_maintenance_at", "next_maintenance"], "") || undefined,
  };
}

export async function refreshFleetFromApi() {
  const payload = await getFleetDronesApi();
  const next = unwrapList(payload)
    .map((value) => mapApiDrone(value, false))
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
  const record = unwrapObject(payload);
  // The detail endpoint may legitimately return an in-flight drone or a
  // null current_hub_id. Do not apply the physical Hub Fleet inventory filter.
  const mapped = mapApiDrone(record, true);
  if (!mapped) {
    throw new Error("Backend returned an invalid drone detail response.");
  }
  // Do NOT insert a drone that is flying into Hub Fleet's local inventory.
  return { ...mapped };
}
