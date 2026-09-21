export type AlertSource =
  | "Schedule"
  | "Flight event"
  | "Incident"
  | "Hub inspection";

export type AlertStatus =
  | "Pending"
  | "Handled";

export type MaintenanceAlert = {
  id: string;
  drone: string;
  droneId: string;
  title: string;
  source: AlertSource;
  createdAt: string;

  missionId?: string;
  legId?: string;
  reason?: string;
};

const defaultMaintenanceAlerts: MaintenanceAlert[] = [
  {
    id: "ALT-201",
    drone: "CX-09",
    droneId: "DR-001",
    title: "Scheduled inspection is due",
    source: "Schedule",
    createdAt: "20 Sep · 08:20",
  },
  {
    id: "ALT-202",
    drone: "AX-08",
    droneId: "DR-004",
    title:
      "Abnormal landing detected — inspection required",
    source: "Flight event",
    createdAt: "20 Sep · 07:45",
  },
  {
    id: "ALT-203",
    drone: "CX-12",
    droneId: "DR-002",
    title:
      "Inspection required after reported incident",
    source: "Incident",
    createdAt: "19 Sep · 16:10",
  },
];

/*
 * DEMO RUNTIME STORE
 * ---------------------------------------------------------
 * Alerts created from Transit Missions remain available while
 * navigating inside the SPA.
 *
 * Full browser refresh resets the demo data.
 * Later this module should be replaced by backend APIs.
 */
let demoMaintenanceAlerts:
  MaintenanceAlert[] =
  defaultMaintenanceAlerts.map(
    (alert) => ({
      ...alert,
    }),
  );

export function loadMaintenanceAlerts():
  MaintenanceAlert[] {
  return demoMaintenanceAlerts.map(
    (alert) => ({
      ...alert,
    }),
  );
}

function formatAlertTime() {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  )
    .format(new Date())
    .replace(",", " ·");
}

function getNextAlertId() {
  const maxId =
    demoMaintenanceAlerts.reduce(
      (max, alert) => {
        const match =
          alert.id.match(/(\d+)$/);

        if (!match) {
          return max;
        }

        return Math.max(
          max,
          Number(match[1]),
        );
      },
      200,
    );

  return `ALT-${maxId + 1}`;
}

export function createMaintenanceAlert(
  input: Omit<
    MaintenanceAlert,
    "id" | "createdAt"
  >,
): MaintenanceAlert {
  /*
   * Prevent duplicate pending hub-inspection alerts for the
   * same drone + mission.
   */
  const existing =
    demoMaintenanceAlerts.find(
      (alert) =>
        alert.source ===
          input.source &&
        alert.droneId ===
          input.droneId &&
        alert.missionId ===
          input.missionId &&
        alert.title ===
          input.title,
    );

  if (existing) {
    return {
      ...existing,
    };
  }

  const created:
    MaintenanceAlert = {
    ...input,
    id: getNextAlertId(),
    createdAt:
      formatAlertTime(),
  };

  demoMaintenanceAlerts = [
    created,
    ...demoMaintenanceAlerts,
  ];

  window.dispatchEvent(
    new Event(
      "technician-maintenance-alerts-updated",
    ),
  );

  return {
    ...created,
  };
}

export function resetDemoMaintenanceAlerts() {
  demoMaintenanceAlerts =
    defaultMaintenanceAlerts.map(
      (alert) => ({
        ...alert,
      }),
    );

  window.dispatchEvent(
    new Event(
      "technician-maintenance-alerts-updated",
    ),
  );
}
