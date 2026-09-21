export type TransitMissionStatus =
  | "Incoming"
  | "At Hub"
  | "Ready"
  | "Cannot Continue"
  | "Replacement Requested"
  | "Replacement Assigned"
  | "In Transit"
  | "Completed";

export type TransitMission = {
  id: string;
  missionId: string;
  legId: string;

  currentDroneId: string;
  originalDroneId: string;

  droneType: string;
  droneModel: string;

  originalDroneType?: string;
  originalDroneModel?: string;

  origin: string;
  hub: string;
  destination: string;

  status: TransitMissionStatus;

  batteryLevelPct: number;

  /*
   * Minimum battery required before this mission leg may depart.
   * This is mission-specific readiness, not a general Fleet status.
   */
  requiredDepartureBatteryPct: number;
  batteryServiceRequired: boolean;

  arrivalConfirmedAt?: string;

  cannotContinueReason?: string;

  replacementRequestedAt?: string;

  replacementDroneId?: string;
  replacementReason?: string;
  replacementAssignedAt?: string;

  departedAt?: string;
};

export const TRANSIT_MISSIONS_STORAGE_KEY =
  "droneoptai.technician.transit-missions.demo";

export const defaultTransitMissions: TransitMission[] = [
  {
    id: "TR-001",
    missionId: "MS-1024",
    legId: "LEG-1024-01",

    currentDroneId: "DR-002",
    originalDroneId: "DR-002",

    droneType: "CX",
    droneModel: "DJI Matrice 350",

    originalDroneType: "CX",
    originalDroneModel: "DJI Matrice 350",

    origin: "Hub HCM-01",
    hub: "Hub HCM-02",
    destination: "Harbor Station 04",

    status: "Incoming",

    batteryLevelPct: 61,
    requiredDepartureBatteryPct: 80,
    batteryServiceRequired: true,
  },

  {
    id: "TR-002",
    missionId: "MS-1028",
    legId: "LEG-1028-02",

    currentDroneId: "DR-001",
    originalDroneId: "DR-001",

    droneType: "CX",
    droneModel: "DJI Matrice 350",

    originalDroneType: "CX",
    originalDroneModel: "DJI Matrice 350",

    origin: "Medical Depot 02",
    hub: "Hub HCM-02",
    destination: "District Clinic 07",

    status: "At Hub",

    batteryLevelPct: 86,
    requiredDepartureBatteryPct: 80,
    batteryServiceRequired: false,

    arrivalConfirmedAt:
      "21 Sep 2026 · 16:42",
  },

  {
    id: "TR-003",
    missionId: "MS-1031",
    legId: "LEG-1031-02",

    currentDroneId: "DR-003",
    originalDroneId: "DR-003",

    droneType: "AX",
    droneModel: "DJI M300 RTK",

    originalDroneType: "AX",
    originalDroneModel: "DJI M300 RTK",

    origin: "Warehouse 03",
    hub: "Hub HCM-02",
    destination: "Customer Zone 12",

    status: "Replacement Requested",

    batteryLevelPct: 68,
    requiredDepartureBatteryPct: 80,
    batteryServiceRequired: false,

    arrivalConfirmedAt:
      "21 Sep 2026 · 16:10",

    cannotContinueReason:
      "Technical inspection required before the drone can safely continue.",

    replacementRequestedAt:
      "21 Sep 2026 · 16:18",
  },
];

/*
 * DEMO RUNTIME STORE
 * ---------------------------------------------------------
 * Keep demo changes while navigating inside the SPA so Hub Fleet
 * can see updates made from Transit Missions.
 *
 * A full browser refresh / dev-server restart reloads this module
 * and restores defaultTransitMissions automatically.
 */
let demoTransitMissions: TransitMission[] =
  defaultTransitMissions.map(
    (mission) => ({
      ...mission,
    }),
  );

export function loadTransitMissions(): TransitMission[] {
  return demoTransitMissions.map(
    (mission) => ({
      ...mission,
    }),
  );
}

export function saveTransitMissions(
  missions: TransitMission[],
) {
  demoTransitMissions =
    missions.map(
      (mission) => ({
        ...mission,
      }),
    );

  window.dispatchEvent(
    new Event(
      "technician-transit-missions-updated",
    ),
  );
}

export function formatTransitTime() {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  )
    .format(new Date())
    .replace(",", " ·");
}
