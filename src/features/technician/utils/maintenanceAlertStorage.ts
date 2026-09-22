export type AlertSource =
  | "Schedule"
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

  /*
   * Ai đã report / phát hiện alert này ở mức nghiệp vụ.
   * Với Incident demo hiện tại: Operator.
   */
  reportedBy?: string;

  /*
   * Có thể dùng sau này để trace về incidents.id.
   */
  incidentId?: string;
};

const defaultMaintenanceAlerts:
  MaintenanceAlert[] = [
  {
    id: "ALT-201",
    drone: "CX-09",
    droneId: "DR-001",
    title:
      "Scheduled inspection is due",
    source: "Schedule",
    createdAt: "20 Sep · 08:20",
  },

  /*
   * Demo cho INCIDENT_RETURN.
   *
   * Alert này giả lập việc Operator/System đã phát hiện Incident
   * trong lúc drone đang bay và gửi yêu cầu kiểm tra kỹ thuật
   * cho Technician trước khi drone tới Hub.
   */
  {
    id: "ALT-301",
    drone: "CX-06",
    droneId: "DR-006",
    title:
      "Operator reported in-flight incident — inspection required",
    source: "Incident",
    createdAt: "22 Sep · 14:20",

    missionId: "MS-1040",
    legId: "LEG-1040-INCIDENT",
    incidentId: "INC-1040",
    reportedBy: "Operator",

    reason:
      "Operator reported an in-flight technical incident. Drone must return to Hub HCM-02 for technical inspection.",
  },
];

/*
 * DEMO RUNTIME STORE
 *
 * - Giữ state khi điều hướng trong SPA.
 * - Refresh browser sẽ reset demo.
 * - Sau này thay bằng backend API.
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

/*
 * Dùng khi Technician phát hiện lỗi trong Hub Readiness Check.
 *
 * INCIDENT_RETURN không gọi hàm này.
 * Incident alert do Operator/System tạo trước.
 */
export function createMaintenanceAlert(
  input: Omit<
    MaintenanceAlert,
    "id" | "createdAt"
  >,
): MaintenanceAlert {
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
