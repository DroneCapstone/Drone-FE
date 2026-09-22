import {
  type ReactNode,
  useEffect,
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
  RotateCcw,
  Wrench,
  X,
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
  loadFleet,
  saveFleet,
  type FleetDrone,
} from "../utils/fleetStorage";

import {
  loadMaintenanceRecords,
  type CompletedMaintenanceRecord,
} from "../utils/maintenanceStorage";

type DetailTab =
  | "overview"
  | "flight"
  | "maintenance";

type MaintenanceScheduleMock = {
  lastMaintenanceAt: string;
};

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

  const [
    fleet,
    setFleet,
  ] = useState<
    FleetDrone[]
  >(loadFleet);

  const [
    maintenanceRecords,
  ] = useState<
    CompletedMaintenanceRecord[]
  >(loadMaintenanceRecords);

  const [
    activeTab,
    setActiveTab,
  ] = useState<DetailTab>(
    "overview",
  );

  const [
    replaceBatteryOpen,
    setReplaceBatteryOpen,
  ] = useState(false);

  const [
    newBattery,
    setNewBattery,
  ] = useState("100");

  const drone =
    fleet.find(
      (item) =>
        item.id === droneId,
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

  useEffect(() => {
    saveFleet(fleet);
  }, [fleet]);

  if (!drone) {
    return (
      <div className="px-6 py-6 md:px-8">
        <h1 className="text-[28px] font-semibold text-[var(--tech-text)]">
          Drone not found
        </h1>

        <p className="mt-2 text-[14px] text-[var(--tech-muted)]">
          The requested drone does not exist.
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

  const lowBattery =
    drone.battery < 40;

  /*
   * Nếu đã có Maintenance Record thật của drone thì dùng lần hoàn thành
   * gần nhất. Nếu chưa có record thì dùng lịch mock demo.
   */
  const lastMaintenanceAt =
    latestCompletedMaintenance
      ?.date ??
    getMockLastMaintenance(
      drone.id,
    );

  const nextMaintenanceAt =
    addOneMonth(
      lastMaintenanceAt,
    );

  const scheduleState =
    getScheduleState(
      nextMaintenanceAt,
    );

  const maintenanceLabel =
    drone.status ===
    "Maintenance"
      ? "Maintenance required"
      : scheduleState.label;

  const handleReplaceBattery =
    () => {
      const battery =
        Number(newBattery);

      if (
        Number.isNaN(battery) ||
        battery < 0 ||
        battery > 100
      ) {
        return;
      }

      setFleet(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              drone.id
                ? {
                    ...item,
                    battery,
                  }
                : item,
          ),
      );

      setReplaceBatteryOpen(
        false,
      );

      setNewBattery("100");
    };

  return (
    <div className="px-6 py-5 md:px-8">
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
            {drone.name}
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

        <Button
          type="button"
          onClick={() =>
            setReplaceBatteryOpen(
              true,
            )
          }
          className="h-11 rounded-md bg-orange-500 px-5 text-[13px] font-semibold text-black hover:bg-orange-600"
        >
          <RotateCcw
            size={16}
          />
          Replace battery
        </Button>
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
          label="Battery level"
          value={`${drone.battery}%`}
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
                    label="Utilization"
                    value={`${drone.utilization}%`}
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

                  {lowBattery && (
                    <span className="rounded-md border border-red-500/25 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-red-500">
                      Low battery
                    </span>
                  )}
                </div>

                <div className="mt-8 flex items-end justify-between gap-4">
                  <span className="text-[14px] text-[var(--tech-muted)]">
                    Remaining level
                  </span>

                  <strong
                    className={`text-[30px] font-semibold ${
                      lowBattery
                        ? "text-red-500"
                        : "text-[var(--tech-text)]"
                    }`}
                  >
                    {
                      drone.battery
                    }
                    %
                  </strong>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--tech-border)]">
                  <div
                    className={`h-full rounded-full transition-all ${
                      lowBattery
                        ? "bg-red-500"
                        : "bg-orange-500"
                    }`}
                    style={{
                      width: `${drone.battery}%`,
                    }}
                  />
                </div>

                <div className="mt-8">
                  <InfoItem
                    label="Battery condition"
                    value={
                      lowBattery
                        ? "Low"
                        : "Normal"
                    }
                    danger={
                      lowBattery
                    }
                  />
                </div>

                {lowBattery && (
                  <div className="mt-6 rounded-md border border-red-500/20 bg-red-500/5 px-4 py-3">
                    <p className="text-[13px] font-medium text-red-500">
                      Battery is below 40%.
                    </p>

                    <p className="mt-1 text-[12px] leading-5 text-[var(--tech-muted)]">
                      Inspect the
                      battery before the
                      drone is assigned
                      to another mission.
                    </p>
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

      {/* REPLACE BATTERY MODAL */}
      {replaceBatteryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4">
          <div className="w-full max-w-[420px] rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[var(--tech-border)] px-6 py-5">
              <div>
                <h2 className="text-[18px] font-semibold text-[var(--tech-text)]">
                  Replace battery
                </h2>

                <p className="mt-1 text-[13px] text-[var(--tech-muted)]">
                  Update the battery
                  level after replacement.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setReplaceBatteryOpen(
                    false,
                  )
                }
                className="rounded-md p-1.5 text-[var(--tech-muted)] transition-colors hover:text-orange-500"
              >
                <X
                  size={18}
                />
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="mb-5 rounded-md border border-[var(--tech-border)] bg-[var(--tech-surface-2)] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.07em] text-[var(--tech-subtle)]">
                  Current battery
                </p>

                <p
                  className={`mt-1 text-[20px] font-semibold ${
                    lowBattery
                      ? "text-red-500"
                      : "text-[var(--tech-text)]"
                  }`}
                >
                  {
                    drone.battery
                  }
                  %
                </p>
              </div>

              <label className="block">
                <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.07em] text-[var(--tech-muted)]">
                  New battery level
                </span>

                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={
                      newBattery
                    }
                    onChange={(
                      event,
                    ) =>
                      setNewBattery(
                        event.target
                          .value,
                      )
                    }
                    className="tech-control h-11 w-full px-3 pr-9 text-[14px]"
                  />

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[var(--tech-muted)]">
                    %
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-[var(--tech-border)] px-6 py-4">
              <Button
                type="button"
                onClick={() =>
                  setReplaceBatteryOpen(
                    false,
                  )
                }
                className="h-9 rounded-md border border-[var(--tech-border)] bg-transparent px-4 text-[13px] text-[var(--tech-text-secondary)] hover:bg-[var(--tech-surface-2)]"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={
                  handleReplaceBattery
                }
                className="h-9 rounded-md bg-orange-500 px-4 text-[13px] font-medium text-black hover:bg-orange-600"
              >
                Confirm replacement
              </Button>
            </div>
          </div>
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
