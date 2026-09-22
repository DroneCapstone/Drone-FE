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

  purpose: TransitMissionPurpose;

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
   * Chỉ có ý nghĩa với BATTERY_STOP.
   * RETURN_TO_HUB và INCIDENT_RETURN không có chặng tiếp theo
   * do Technician dispatch.
   */
  requiredDepartureBatteryPct: number;
  batteryServiceRequired: boolean;

  arrivalConfirmedAt?: string;

  cannotContinueReason?: string;

  replacementRequestedAt?: string;
  replacementDroneId?: string;
  replacementReason?: string;
  replacementAssignedAt?: string;

  /*
   * INCIDENT_RETURN:
   * Alert này được Operator/System tạo trước.
   * Technician chỉ nhận và xử lý ở Maintenance Alerts.
   */
  incidentAlertId?: string;
};

export type TransitHistoryOutcome =
  | "Continued"
  | "Returned to hub"
  | "Sent to maintenance";

export type TransitMissionHistory = {
  id: string;
  missionId: string;
  legId: string;

  purpose: TransitMissionPurpose;

  droneId: string;
  droneType: string;
  droneModel: string;

  origin: string;
  hub: string;
  destination: string;

  batteryLevelPct: number;

  handledAt: string;
  outcome: TransitHistoryOutcome;
};

/*
 * DEMO DATA
 * ---------------------------------------------------------
 * 3 lý do drone tới Hub:
 *
 * 1. BATTERY_STOP
 *    Mission vẫn đang chạy, drone ghé Hub để thay pin rồi đi tiếp.
 *
 * 2. RETURN_TO_HUB
 *    Mission giao hàng đã hoàn thành, drone quay về Hub gần nhất.
 *    Confirm Arrival xong -> vào Hub Fleet và biến khỏi Transit Missions.
 *
 * 3. INCIDENT_RETURN
 *    Operator/System đã phát hiện Incident và tạo Maintenance Alert.
 *    Confirm Arrival xong -> drone vào Hub Fleet với Maintenance
 *    và biến khỏi Transit Missions.
 */

export const defaultTransitMissions:
  TransitMission[] = [
  {
    id: "TR-001",
    missionId: "MS-1024",
    legId: "LEG-1024-01",

    purpose: "BATTERY_STOP",

    currentDroneId: "DR-002",
    originalDroneId: "DR-002",

    droneType: "CX",
    droneModel: "DJI Matrice 350",

    originalDroneType: "CX",
    originalDroneModel:
      "DJI Matrice 350",

    origin: "Hub HCM-01",
    hub: "Hub HCM-02",
    destination:
      "Harbor Station 04",

    status: "Incoming",

    batteryLevelPct: 61,
    requiredDepartureBatteryPct: 80,
    batteryServiceRequired: false,
  },

  {
    id: "TR-002",
    missionId: "MS-1034",
    legId: "LEG-1034-RETURN",

    purpose: "RETURN_TO_HUB",

    currentDroneId: "DR-005",
    originalDroneId: "DR-005",

    droneType: "AX",
    droneModel: "DJI M300 RTK",

    originalDroneType: "AX",
    originalDroneModel:
      "DJI M300 RTK",

    origin: "Customer Zone 07",
    hub: "Hub HCM-02",
    destination: "Hub HCM-02",

    status: "Incoming",

    batteryLevelPct: 84,

    requiredDepartureBatteryPct: 0,
    batteryServiceRequired: false,
  },

  {
    id: "TR-003",
    missionId: "MS-1040",
    legId: "LEG-1040-INCIDENT",

    purpose: "INCIDENT_RETURN",

    currentDroneId: "DR-006",
    originalDroneId: "DR-006",

    droneType: "CX",
    droneModel: "DJI Matrice 350",

    originalDroneType: "CX",
    originalDroneModel:
      "DJI Matrice 350",

    origin: "Delivery Zone 11",
    hub: "Hub HCM-02",
    destination: "Hub HCM-02",

    status: "Incoming",

    batteryLevelPct: 68,

    requiredDepartureBatteryPct: 0,
    batteryServiceRequired: false,

    incidentAlertId: "ALT-301",
  },
];

const defaultTransitMissionHistory:
  TransitMissionHistory[] = [];

let demoTransitMissions:
  TransitMission[] =
  defaultTransitMissions.map(
    (mission) => ({
      ...mission,
    }),
  );

let demoTransitMissionHistory:
  TransitMissionHistory[] =
  defaultTransitMissionHistory.map(
    (item) => ({
      ...item,
    }),
  );

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
  return demoTransitMissionHistory.map(
    (item) => ({
      ...item,
    }),
  );
}

export function saveTransitMissionHistory(
  history: TransitMissionHistory[],
) {
  demoTransitMissionHistory =
    history.map(
      (item) => ({
        ...item,
      }),
    );

  window.dispatchEvent(
    new Event(
      "technician-transit-history-updated",
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
