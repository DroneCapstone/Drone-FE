import {
  type ReactNode,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  Battery,
  CalendarClock,
  CheckCircle2,
  Clock3,
  MapPin,
  Plane,
} from "lucide-react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  Button,
} from "@/components/shadcn/ui/button";

import {
  Card,
  CardContent,
} from "@/components/shadcn/ui/card";

import {
  type FleetDrone,
} from "../utils/fleetStorage";

import {
  useDroneDetailQuery,
} from "../hooks/useFleetQueries";

import {
  useMaintenanceRecordsQuery,
} from "../hooks/useMaintenanceQueries";

import {
  type CompletedMaintenanceRecord,
} from "../utils/maintenanceStorage";

type DetailTab =
  | "overview"
  | "flight"
  | "maintenance";

type MaintenanceScheduleMock = {
  lastMaintenanceAt: string;
};

function getDroneDisplayCode(
  drone: FleetDrone,
) {
  const prefix =
    drone.name
      .match(/[A-Za-z]+/)?.[0]
      ?.toUpperCase() ??
    "DR";

  const idMatch =
    drone.id.match(/(\d+)$/);

  if (!idMatch) {
    return drone.name;
  }

  const number =
    Number(idMatch[1]);

  if (Number.isNaN(number)) {
    return drone.name;
  }

  return `${prefix}-${String(
    number,
  ).padStart(2, "0")}`;
}

/*
 * DEMO ONLY
 * ---------------------------------------------------------
 * Mỗi drone được bảo trì định kỳ 1 tháng / lần.
 *
 * Khi backend có maintenance_schedules:
 * - lastMaintenanceAt lấy từ maintenance_records / maintenance_schedules
 * - nextMaintenanceAt do backend tính
 * - không cần giữ mock này nữa.
 */
const MONTHLY_MAINTENANCE_SCHEDULE:
  Record<string, MaintenanceScheduleMock> = {
  "DR-001": {
    lastMaintenanceAt:
      "2026-08-23T09:00:00",
  },
  "DR-002": {
    lastMaintenanceAt:
      "2026-08-28T14:30:00",
  },
  "DR-003": {
    lastMaintenanceAt:
      "2026-09-05T10:15:00",
  },
  "DR-004": {
    lastMaintenanceAt:
      "2026-09-12T08:45:00",
  },
  "DR-005": {
    lastMaintenanceAt:
      "2026-09-18T13:00:00",
  },
  "DR-006": {
    lastMaintenanceAt:
      "2026-09-20T15:30:00",
  },
};

function parseMaintenanceDate(
  value: string,
) {
  const normalized =
    value
      .replace("·", "")
      .replace(/\s+/g, " ")
      .trim();

  const timestamp =
    Date.parse(normalized);

  return Number.isNaN(timestamp)
    ? null
    : new Date(timestamp);
}

function addOneMonth(
  date: Date,
) {
  const next =
    new Date(date);

  next.setMonth(
    next.getMonth() + 1,
  );

  return next;
}

function formatDateTime(
  date: Date,
) {
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
    .format(date)
    .replace(",", " ·");
}

function getLatestCompletedMaintenance(
  records:
    CompletedMaintenanceRecord[],
) {
  return [...records]
    .map((record) => ({
      record,
      date:
        parseMaintenanceDate(
          record.completedAt,
        ),
    }))
    .filter(
      (
        item,
      ): item is {
        record:
          CompletedMaintenanceRecord;
        date: Date;
      } => Boolean(item.date),
    )
    .sort(
      (a, b) =>
        b.date.getTime() -
        a.date.getTime(),
    )[0] ?? null;
}

function getMockLastMaintenance(
  droneId: string,
) {
  const mock =
    MONTHLY_MAINTENANCE_SCHEDULE[
      droneId
    ];

  if (mock) {
    return new Date(
      mock.lastMaintenanceAt,
    );
  }

  /*
   * Fallback demo cho drone mới:
   * coi như lần bảo trì gần nhất là 1 tháng trước.
   */
  const fallback =
    new Date();

  fallback.setMonth(
    fallback.getMonth() - 1,
  );

  return fallback;
}

function getScheduleState(
  nextMaintenanceAt: Date,
) {
  const now =
    new Date();

  const diffMs =
    nextMaintenanceAt.getTime() -
    now.getTime();

  const diffDays =
    Math.ceil(
      diffMs /
        (1000 * 60 * 60 * 24),
    );

  if (diffDays < 0) {
    return {
      label: "Overdue",
      danger: true,
      helper: `${Math.abs(
        diffDays,
      )} day${
        Math.abs(diffDays) === 1
          ? ""
          : "s"
      } overdue`,
    };
  }

  if (diffDays <= 7) {
    return {
      label: "Due soon",
      danger: false,
      helper:
        diffDays === 0
          ? "Due today"
          : `Due in ${diffDays} day${
              diffDays === 1
                ? ""
                : "s"
            }`,
    };
  }

  return {
    label: "On schedule",
    danger: false,
    helper: `Due in ${diffDays} days`,
  };
}

export function DroneDetailPage() {
  const navigate =
    useNavigate();

  const { droneId } =
    useParams();

  const droneQuery =
    useDroneDetailQuery(
      droneId,
    );

  const maintenanceQuery =
    useMaintenanceRecordsQuery(
      droneId,
    );

  const drone =
    droneQuery.data;

  const maintenanceRecords:
    CompletedMaintenanceRecord[] =
    maintenanceQuery.data ?? [];

  const loading =
    droneQuery.isPending &&
    !drone;

  const apiError =
    droneQuery.error instanceof Error
      ? droneQuery.error.message
      : maintenanceQuery.error instanceof Error
        ? maintenanceQuery.error.message
        : "";

  const [
    activeTab,
    setActiveTab,
  ] = useState<DetailTab>(
    "overview",
  );


  const droneMaintenanceRecords =
    useMemo(
      () =>
        drone
          ? maintenanceRecords.filter(
              (record) =>
                record.droneId ===
                drone.id,
            )
          : [],
      [
        drone,
        maintenanceRecords,
      ],
    );

  const latestCompletedMaintenance =
    useMemo(
      () =>
        getLatestCompletedMaintenance(
          droneMaintenanceRecords,
        ),
      [
        droneMaintenanceRecords,
      ],
    );




  if (loading) {
    return (
      <div className="px-6 py-8 text-[14px] text-[var(--tech-muted)]">
        Loading drone details...
      </div>
    );
  }

  if (!drone) {
    return (
      <div className="px-6 py-6 md:px-8">
        <h1 className="text-[28px] font-semibold text-[var(--tech-text)]">
          Drone not found
        </h1>

        <p className="mt-2 text-[14px] text-[var(--tech-muted)]">
          {apiError || "The requested drone does not exist."}
        </p>

        <Button
          type="button"
          onClick={() =>
            navigate(
              "/technician/fleet",
            )
          }
          className="mt-5 h-10 rounded-md bg-orange-500 px-4 text-[13px] font-medium text-black hover:bg-orange-600"
        >
          <ArrowLeft
            size={16}
          />
          Back to fleet
        </Button>
      </div>
    );
  }

  const installedBattery =
    drone.installedBatteryId
      ? {
          id: drone.installedBatteryId,
          chargeLevelPct:
            drone.installedBatteryPct ?? 100,
        }
      : undefined;

  const lowBattery =
    Boolean(
      installedBattery &&
        installedBattery.chargeLevelPct < 40,
    );

  /*
   * Nếu đã có Maintenance Record thật của drone thì dùng lần hoàn thành
   * gần nhất. Nếu chưa có record thì dùng lịch mock demo.
   */
  const apiLastMaintenanceAt =
    drone.lastMaintenanceAt
      ? new Date(drone.lastMaintenanceAt)
      : null;

  const lastMaintenanceAt =
    apiLastMaintenanceAt &&
    !Number.isNaN(apiLastMaintenanceAt.getTime())
      ? apiLastMaintenanceAt
      : latestCompletedMaintenance?.date ??
        getMockLastMaintenance(drone.id);

  const apiNextMaintenanceAt =
    drone.nextMaintenanceAt
      ? new Date(drone.nextMaintenanceAt)
      : null;

  const nextMaintenanceAt =
    apiNextMaintenanceAt &&
    !Number.isNaN(apiNextMaintenanceAt.getTime())
      ? apiNextMaintenanceAt
      : addOneMonth(lastMaintenanceAt);

  const scheduleState =
    getScheduleState(
      nextMaintenanceAt,
    );

  const maintenanceLabel =
    drone.status ===
    "Maintenance"
      ? "Maintenance required"
      : scheduleState.label;

  return (
    <div className="px-6 py-5 md:px-8">
      {apiError && (
        <div className="mb-4 rounded-md border border-red-500/25 px-4 py-3 text-[13px] text-red-500">
          {apiError}
        </div>
      )}
      {/* BACK */}
      <button
        type="button"
        onClick={() =>
          navigate(
            "/technician/fleet",
          )
        }
        className="mb-4 inline-flex items-center gap-2 text-[13px] font-medium text-[var(--tech-muted)] transition-colors hover:text-orange-500"
      >
        <ArrowLeft size={16} />
        Back to fleet
      </button>

      {/* PAGE HEADING */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight text-[var(--tech-text)]">
            {getDroneDisplayCode(
              drone,
            )}
          </h1>

          <p className="mt-1 text-[14px] text-[var(--tech-muted)]">
            {drone.id}
            {" · "}
            {drone.model}
          </p>

          <div className="mt-2 flex items-center gap-2 text-[13px] text-[var(--tech-muted)]">
            <MapPin
              size={15}
            />
            {
              drone.location
            }
          </div>
        </div>

      </div>

      {/* KEY SUMMARY */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={
            <Plane size={20} />
          }
          label="Operational status"
          value={drone.status}
          danger={
            drone.status ===
            "Maintenance"
          }
        />

        <SummaryCard
          icon={
            <Battery
              size={20}
            />
          }
          label="Installed battery"
          value={
            installedBattery
              ? `${installedBattery.id} · ${installedBattery.chargeLevelPct}%`
              : "Not installed"
          }
          danger={lowBattery}
        />

        <SummaryCard
          icon={
            <Clock3
              size={20}
            />
          }
          label="Last maintenance"
          value={formatDateTime(
            lastMaintenanceAt,
          )}
        />

        <SummaryCard
          icon={
            <CalendarClock
              size={20}
            />
          }
          label="Next maintenance"
          value={formatDateTime(
            nextMaintenanceAt,
          )}
          danger={
            scheduleState.danger
          }
        />
      </div>

      {/* TABS */}
      <div className="mb-6 flex items-center gap-7 border-b border-[var(--tech-border)]">
        <TabButton
          active={
            activeTab ===
            "overview"
          }
          onClick={() =>
            setActiveTab(
              "overview",
            )
          }
        >
          Overview
        </TabButton>

        <TabButton
          active={
            activeTab ===
            "flight"
          }
          onClick={() =>
            setActiveTab(
              "flight",
            )
          }
        >
          Flight history
        </TabButton>

        <TabButton
          active={
            activeTab ===
            "maintenance"
          }
          onClick={() =>
            setActiveTab(
              "maintenance",
            )
          }
        >
          Maintenance history
        </TabButton>
      </div>

      {/* OVERVIEW */}
      {activeTab ===
        "overview" && (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            {/* DRONE INFORMATION */}
            <Card className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
              <CardContent className="p-6">
                <h2 className="text-[18px] font-semibold text-[var(--tech-text)]">
                  Drone information
                </h2>

                <div className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2">
                  <InfoItem
                    label="Drone ID"
                    value={
                      drone.id
                    }
                  />

                  <InfoItem
                    label="Model"
                    value={
                      drone.model
                    }
                  />

                  <InfoItem
                    label="Status"
                    value={
                      drone.status
                    }
                    danger={
                      drone.status ===
                      "Maintenance"
                    }
                  />

                  <InfoItem
                    label="Current location"
                    value={
                      drone.location
                    }
                  />

                  <InfoItem
                    label="Last flight"
                    value={
                      drone.lastFlight
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* BATTERY */}
            <Card className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-[18px] font-semibold text-[var(--tech-text)]">
                    Battery status
                  </h2>

                  {installedBattery ? (
                    <span className="rounded-md border border-orange-500/25 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-orange-500">
                      Installed
                    </span>
                  ) : (
                    <span className="rounded-md border border-[var(--tech-border)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--tech-muted)]">
                      Not installed
                    </span>
                  )}
                </div>

                {installedBattery ? (
                  <>
                    <div className="mt-7 grid gap-5 sm:grid-cols-2">
                      <InfoItem
                        label="Battery ID"
                        value={
                          installedBattery.id
                        }
                      />

                      <InfoItem
                        label="Charge level"
                        value={`${installedBattery.chargeLevelPct}%`}
                        danger={
                          lowBattery
                        }
                      />
                    </div>

                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--tech-border)]">
                      <div
                        className={`h-full rounded-full transition-all ${
                          lowBattery
                            ? "bg-red-500"
                            : "bg-orange-500"
                        }`}
                        style={{
                          width: `${installedBattery.chargeLevelPct}%`,
                        }}
                      />
                    </div>

                    <p className="mt-5 text-[12px] leading-5 text-[var(--tech-muted)]">
                      This battery is temporarily assigned to the current prepared or active mission. Batteries do not permanently belong to a drone.
                    </p>
                  </>
                ) : (
                  <div className="mt-7 rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface-2)] px-4 py-5">
                    <p className="text-[14px] font-medium text-[var(--tech-text-secondary)]">
                      No battery installed
                    </p>

                    <p className="mt-1 text-[12px] leading-5 text-[var(--tech-muted)]">
                      Hub-stored drones normally have no battery installed. Use Battery Management when an Operator-assigned mission needs a ready battery.
                    </p>

                    <Button
                      type="button"
                      onClick={() =>
                        navigate(
                          "/technician/fleet/batteries",
                        )
                      }
                      className="mt-4 h-9 rounded-md border border-[var(--tech-border)] !bg-transparent px-4 text-[12px] font-medium text-[var(--tech-text-secondary)] hover:!border-orange-500/50 hover:!bg-transparent hover:!text-orange-500"
                    >
                      Open Battery Management
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* MONTHLY MAINTENANCE SCHEDULE */}
          <Card className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-[18px] font-semibold text-[var(--tech-text)]">
                    Maintenance schedule
                  </h2>

                  <p className="mt-1 text-[13px] text-[var(--tech-muted)]">
                    Every drone is
                    scheduled for
                    periodic maintenance
                    once every month.
                  </p>
                </div>

                <span
                  className={`rounded-md border px-3 py-1.5 text-[12px] font-semibold ${
                    scheduleState.danger
                      ? "border-red-500/25 text-red-500"
                      : scheduleState.label ===
                          "Due soon"
                        ? "border-orange-500/30 text-orange-500"
                        : "border-[var(--tech-border)] text-[var(--tech-text-secondary)]"
                  }`}
                >
                  {
                    maintenanceLabel
                  }
                </span>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-3">
                <ScheduleItem
                  label="Maintenance interval"
                  value="Every 1 month"
                  helper="Periodic inspection cycle"
                />

                <ScheduleItem
                  label="Last maintenance"
                  value={formatDateTime(
                    lastMaintenanceAt,
                  )}
                  helper={
                    latestCompletedMaintenance
                      ? `Completed via ${latestCompletedMaintenance.record.workOrderId}`
                      : "Demo schedule record"
                  }
                />

                <ScheduleItem
                  label="Next maintenance"
                  value={formatDateTime(
                    nextMaintenanceAt,
                  )}
                  helper={
                    scheduleState.helper
                  }
                  danger={
                    scheduleState.danger
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* FLIGHT HISTORY */}
      {activeTab ===
        "flight" && (
        <Card className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
          <CardContent className="p-6">
            <h2 className="text-[18px] font-semibold text-[var(--tech-text)]">
              Flight history
            </h2>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--tech-border)] pb-4">
              <div>
                <p className="text-[12px] uppercase tracking-[0.06em] text-[var(--tech-subtle)]">
                  Latest flight
                </p>

                <p className="mt-1 text-[15px] font-medium text-[var(--tech-text-secondary)]">
                  {
                    drone.lastFlight
                  }
                </p>
              </div>

              <span className="text-[12px] text-[var(--tech-muted)]">
                Historical flight data
                will be connected from
                the backend.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MAINTENANCE HISTORY */}
      {activeTab ===
        "maintenance" && (
        <div className="space-y-5">
          <Card className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
            <CardContent className="p-6">
              <h2 className="text-[18px] font-semibold text-[var(--tech-text)]">
                Maintenance overview
              </h2>

              <div className="mt-6 grid gap-5 md:grid-cols-3">
                <InfoItem
                  label="Current maintenance status"
                  value={
                    maintenanceLabel
                  }
                  danger={
                    drone.status ===
                      "Maintenance" ||
                    scheduleState.danger
                  }
                />

                <InfoItem
                  label="Last maintenance"
                  value={formatDateTime(
                    lastMaintenanceAt,
                  )}
                />

                <InfoItem
                  label="Next maintenance"
                  value={formatDateTime(
                    nextMaintenanceAt,
                  )}
                  danger={
                    scheduleState.danger
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={19}
                  className="text-emerald-500"
                />

                <h2 className="text-[18px] font-semibold text-[var(--tech-text)]">
                  Work complete
                </h2>
              </div>

              <p className="mt-1 text-[13px] text-[var(--tech-muted)]">
                Completed maintenance
                work and diagnosis
                records for this drone.
              </p>

              <div className="mt-5 space-y-3">
                {droneMaintenanceRecords.length >
                0 ? (
                  droneMaintenanceRecords.map(
                    (record) => (
                      <details
                        key={
                          record.id
                        }
                        className="group overflow-hidden rounded-md border border-[var(--tech-border)] bg-[var(--tech-surface-2)]"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[15px] font-semibold text-[var(--tech-text)]">
                                {
                                  record.workOrderId
                                }
                              </span>

                              <span className="text-[12px] font-medium text-emerald-500">
                                Completed
                              </span>
                            </div>

                            <p className="mt-1 text-[14px] text-[var(--tech-text-secondary)]">
                              {
                                record.title
                              }
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-[12px] text-[var(--tech-muted)]">
                              {
                                record.completedAt
                              }
                            </p>

                            <p className="mt-1 text-[12px] text-[var(--tech-subtle)]">
                              {
                                record.assignedTo
                              }
                            </p>
                          </div>
                        </summary>

                        <div className="border-t border-[var(--tech-border)] px-4 py-4">
                          <div className="grid gap-5 md:grid-cols-2">
                            <MaintenanceText
                              label="Diagnosis"
                              value={
                                record.diagnosis
                              }
                            />

                            <MaintenanceText
                              label="Corrective action"
                              value={
                                record.correctiveAction
                              }
                            />
                          </div>

                          <div className="mt-5 grid gap-5 border-t border-[var(--tech-border)] pt-4 md:grid-cols-3">
                            <InfoItem
                              label="Resulting status"
                              value={
                                record.resultingStatus
                              }
                            />

                            <InfoItem
                              label="Priority"
                              value={
                                record.priority
                              }
                            />

                            <InfoItem
                              label="Inspection"
                              value={`${record.inspectionItems.length} items completed`}
                            />
                          </div>
                        </div>
                      </details>
                    ),
                  )
                ) : (
                  <div className="rounded-md border border-dashed border-[var(--tech-border)] px-4 py-9 text-center">
                    <p className="text-[14px] text-[var(--tech-muted)]">
                      No completed maintenance work for this drone yet.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  danger = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <Card className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
      <CardContent className="flex min-h-[118px] items-center gap-4 p-5">
        <div
          className={
            danger
              ? "text-red-500"
              : "text-orange-500"
          }
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-[12px] font-medium text-[var(--tech-muted)]">
            {label}
          </p>

          <p
            className={`mt-1.5 truncate text-[17px] font-semibold ${
              danger
                ? "text-red-500"
                : "text-[var(--tech-text)]"
            }`}
            title={value}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoItem({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-[var(--tech-subtle)]">
        {label}
      </p>

      <p
        className={`mt-2 text-[15px] font-medium ${
          danger
            ? "text-red-500"
            : "text-[var(--tech-text-secondary)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ScheduleItem({
  label,
  value,
  helper,
  danger = false,
}: {
  label: string;
  value: string;
  helper: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface-2)] px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-[var(--tech-subtle)]">
        {label}
      </p>

      <p
        className={`mt-2 text-[16px] font-semibold ${
          danger
            ? "text-red-500"
            : "text-[var(--tech-text)]"
        }`}
      >
        {value}
      </p>

      <p className="mt-1 text-[12px] text-[var(--tech-muted)]">
        {helper}
      </p>
    </div>
  );
}

function MaintenanceText({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <span className="text-[11px] font-medium uppercase tracking-[0.07em] text-[var(--tech-subtle)]">
        {label}
      </span>

      <p className="mt-2 whitespace-pre-wrap text-[14px] leading-6 text-[var(--tech-text-secondary)]">
        {value}
      </p>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative pb-3 text-[14px] font-medium transition-colors ${
        active
          ? "text-[var(--tech-text)]"
          : "text-[var(--tech-muted)] hover:text-[var(--tech-text-secondary)]"
      }`}
    >
      {children}

      {active && (
        <span className="absolute bottom-0 left-0 h-[2px] w-full bg-orange-500" />
      )}
    </button>
  );
}
