export type TransitMissionStatus =
  | "Incoming"
  | "At Hub"
  | "Ready"
  | "Cannot Continue"
  | "Replacement Requested";

export type TransitMissionPurpose =
  | "BATTERY_STOP"
  | "RETURN_TO_HUB"
  | "INCIDENT_RETURN";

export type TransitMission = {
  id: string;

  missionId: string;
  legId: string;

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
    | "Sent to maintenance";
};

let demoTransitMissions:
  TransitMission[] = [
  {
    id: "TM-1024",

    missionId: "MS-1024",
    legId: "LEG-1024-02",

    purpose:
      "BATTERY_STOP",

    currentDroneId:
      "DR-002",
    droneType: "CX",
    droneModel:
      "DJI Matrice 300 RTK",

    batteryId:
      "BAT-006",
    batteryLevelPct: 61,

    requiredDepartureBatteryPct:
      80,

    batteryServiceRequired:
      false,

    origin:
      "Hub HCM-01",
    hub:
      "Hub HCM-02",
    destination:
      "Customer Zone 08",

    status: "Incoming",
  },

  {
    id: "TM-1034",

    missionId: "MS-1034",
    legId: "LEG-1034-RETURN",

    purpose:
      "RETURN_TO_HUB",

    currentDroneId:
      "DR-005",
    droneType: "AX",
    droneModel:
      "Autel EVO Max 4T",

    batteryId:
      "BAT-007",
    batteryLevelPct: 84,

    requiredDepartureBatteryPct:
      0,

    batteryServiceRequired:
      false,

    origin:
      "Customer Zone 07",
    hub:
      "Hub HCM-02",
    destination:
      "Hub HCM-02",

    status: "Incoming",
  },

  {
    id: "TM-1040",

    missionId: "MS-1040",
    legId: "LEG-1040-INCIDENT",

    purpose:
      "INCIDENT_RETURN",

    currentDroneId:
      "DR-006",
    droneType: "CX",
    droneModel:
      "DJI Matrice 30",

    batteryId:
      "BAT-008",
    batteryLevelPct: 68,

    requiredDepartureBatteryPct:
      0,

    batteryServiceRequired:
      false,

    origin:
      "In-flight route segment",
    hub:
      "Hub HCM-02",
    destination:
      "Hub HCM-02",

    status: "Incoming",

    incidentAlertId:
      "ALT-301",
  },
];

let demoTransitHistory:
  TransitMissionHistory[] = [];

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

export function loadTransitMissions():
  TransitMission[] {
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

export function loadTransitMissionHistory():
  TransitMissionHistory[] {
  return demoTransitHistory.map(
    (item) => ({
      ...item,
    }),
  );
}

export function saveTransitMissionHistory(
  history:
    TransitMissionHistory[],
) {
  demoTransitHistory =
    history.map(
      (item) => ({
        ...item,
      }),
    );
}
