import {
  BatteryMedium,
  Plane,
  Wrench,
} from "lucide-react";

import {
  useMemo,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  Card,
  CardContent,
} from "@/components/shadcn/ui/card";

import {
  TechnicianPageShell,
} from "../components/TechnicianPageShell";

import {
  TechnicianStatCard,
} from "../components/TechnicianStatCard";

import {
  TECHNICIAN_HUB,
  type FleetDrone,
} from "../utils/fleetStorage";

import {
  useFleetQuery,
} from "../hooks/useFleetQueries";

import {
  useMaintenanceAlertsQuery,
  useWorkOrdersQuery,
} from "../hooks/useMaintenanceQueries";

import {
  useBatteriesQuery,
} from "../hooks/useBatteryQueries";

type AlertSource =
  | "Schedule"
  | "Incident"
  | "Hub inspection";

type DashboardAlert = {
  id: string;
  drone: string;
  title: string;
  source: AlertSource;
  createdAt: string;
};

type WorkOrderStatus =
  | "Pending"
  | "In Progress"
  | "Completed";

type DashboardWorkOrder = {
  id: string;
  droneId: string;
  title: string;
  status: WorkOrderStatus;
  assignedTo: string;
};

type AlertLog = {
  alertId: string;
  status: "Handled";
};

const ALERT_LOG_STORAGE_KEY =
  "droneoptai.technician.maintenance-alert-log.v1";

function loadAlertLogs(): AlertLog[] {
  try {
    const stored = localStorage.getItem(
      ALERT_LOG_STORAGE_KEY,
    );

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(
      stored,
    ) as AlertLog[];

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}


export function TechnicianDashboardPage() {
  const navigate = useNavigate();

  const fleetQuery =
    useFleetQuery();

  const alertsQuery =
    useMaintenanceAlertsQuery();

  const workOrdersQuery =
    useWorkOrdersQuery();

  const batteriesQuery =
    useBatteriesQuery();

  const fleet: FleetDrone[] =
    fleetQuery.data ?? [];

  const alertLogs = useMemo(
    () => loadAlertLogs(),
    [],
  );

  const alerts: DashboardAlert[] =
    (alertsQuery.data ?? []).map(
      (alert) => ({
        id: alert.id,
        drone: alert.drone,
        title: alert.title,
        source: alert.source,
        createdAt: alert.createdAt,
      }),
    );

  const workOrders: DashboardWorkOrder[] =
    (workOrdersQuery.data ?? []).map(
      (order) => ({
        id: order.id,
        droneId: order.droneId,
        title: order.title,
        status: order.status,
        assignedTo: order.assignedTo,
      }),
    );


  /*
   * Same scope as FleetPage:
   * - drones already at technician hub
   * - drones currently heading to technician hub
   */
  const hubDrones = useMemo(
    () => fleet,
    [fleet],
  );

  /*
   * Available means EXACTLY status === "Available".
   * Do not count Operational / In Flight / other statuses.
   */
  const availableDrones = useMemo(
    () =>
      hubDrones.filter(
        (drone) =>
          drone.status ===
          "Available",
      ),
    [hubDrones],
  );

  /*
   * Fleet attention contains only statuses
   * that require technician action.
   *
   * No "In Flight" status is used here.
   */
  const attentionDrones = useMemo(
    () =>
      hubDrones.filter(
        (drone) =>
          drone.status ===
            "Maintenance",
      ),
    [hubDrones],
  );

  const chargingBatteries = useMemo(
    () =>
      (batteriesQuery.data ?? []).filter(
        (battery) => battery.status === "Charging",
      ),
    [batteriesQuery.data],
  );

  const activeAlerts = useMemo(
    () =>
      alerts.filter(
        (alert) =>
          !alertLogs.some(
            (log) =>
              log.alertId ===
                alert.id &&
              log.status ===
                "Handled",
          ),
      ),
    [alertLogs, alerts],
  );

  const activeWorkOrders = useMemo(
    () =>
      workOrders.filter(
        (order) =>
          order.status !==
          "Completed",
      ),
    [workOrders],
  );

  const inProgressCount =
    activeWorkOrders.filter(
      (order) =>
        order.status ===
        "In Progress",
    ).length;

  const hubLabel =
    hubDrones[0]?.location ||
    (batteriesQuery.data ?? [])[0]?.hub ||
    TECHNICIAN_HUB;

  const availablePercent =
    hubDrones.length > 0
      ? Math.round(
          (availableDrones.length /
            hubDrones.length) *
            100,
        )
      : 0;

  return (
    <TechnicianPageShell
      title="Technician dashboard"
      description=""
    >
      {/* SUMMARY */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TechnicianStatCard
          label="Fleet"
          value={String(
            hubDrones.length,
          )}
          description={``}
          icon={Plane}
        />

        <TechnicianStatCard
          label="Available drones"
          value={String(
            availableDrones.length,
          )}
          description={``}
          icon={Plane}
        />

        <TechnicianStatCard
          label="Charging batteries"
          value={String(
            chargingBatteries.length,
          )}
          description=""
          icon={BatteryMedium}
        />

        <TechnicianStatCard
          label="Active work orders"
          value={String(
            activeWorkOrders.length,
          )}
          description={``}
          icon={Wrench}
        />
      </div>

      {/* FLEET ATTENTION + ALERTS */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        {/* FLEET ATTENTION */}
        <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
          <div className="flex items-center justify-between border-b border-[var(--tech-border)] px-5 py-5">
            <div>
              <h2 className="text-[20px] font-semibold text-[var(--tech-text)]">
                Fleet attention
              </h2>

             
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/technician/fleet",
                )
              }
              className="text-[13px] font-medium text-[var(--tech-text-secondary)] transition-colors hover:text-orange-500"
            >
              View fleet
            </button>
          </div>

          <CardContent className="p-0">
            {attentionDrones
              .slice(0, 5)
              .map((drone) => (
                <button
                  key={drone.id}
                  type="button"
                  onClick={() =>
                    navigate(
                      `/technician/fleet/${drone.id}`,
                    )
                  }
                  className="
                    grid w-full
                    grid-cols-[1fr_220px_150px]
                    items-center gap-5
                    border-b
                    border-[var(--tech-border)]
                    px-5 py-4
                    text-left
                    transition-colors
                    last:border-b-0
                    hover:bg-[var(--tech-surface-2)]
                  "
                >
                  <div>
                    <p className="text-[15px] font-medium text-[var(--tech-text)]">
                      {drone.id}
                    </p>

                    <p className="mt-1 text-[13px] text-[var(--tech-muted)]">
                      {drone.model}
                    </p>
                  </div>

                  <div>
                    <p className="text-[12px] uppercase tracking-[0.06em] text-[var(--tech-subtle)]">
                      Hub
                    </p>
                    <p className="mt-1 text-[13px] text-[var(--tech-text-secondary)]">
                      {drone.location}
                    </p>
                  </div>

                  <div className="text-right">
                    <DroneStatusText status={drone.status} />
                  </div>
                </button>
              ))}

            {attentionDrones.length ===
              0 && (
              <div className="px-5 py-10 text-center text-[14px] text-[var(--tech-muted)]">
                No drones currently require technician attention.
              </div>
            )}
          </CardContent>
        </Card>

        {/* MAINTENANCE ALERTS */}
        <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
          <div className="flex items-center justify-between border-b border-[var(--tech-border)] px-5 py-5">
            <div className="flex items-center gap-2">
             

              <h2 className="text-[20px] font-semibold text-[var(--tech-text)]">
                Maintenance alerts
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/technician/maintenance/alerts",
                )
              }
              className="text-[13px] font-medium text-[var(--tech-text-secondary)] transition-colors hover:text-orange-500"
            >
              View all
            </button>
          </div>

          <CardContent className="p-0">
            {activeAlerts
              .slice(0, 4)
              .map((alert) => (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() =>
                    navigate(
                      "/technician/maintenance/alerts",
                    )
                  }
                  className="
                    w-full
                    border-b
                    border-[var(--tech-border)]
                    px-5 py-4
                    text-left
                    transition-colors
                    last:border-b-0
                    hover:bg-[var(--tech-surface-2)]
                  "
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-[var(--tech-text)]">
                          {alert.drone}
                        </span>

                        <SourceText
                          source={
                            alert.source
                          }
                        />
                      </div>

                      <p className="mt-1.5 text-[14px] leading-5 text-[var(--tech-text-secondary)]">
                        {alert.title}
                      </p>
                    </div>

                    <span className="shrink-0 text-[12px] font-semibold text-orange-500">
                      Pending
                    </span>
                  </div>

                  <p className="mt-2 text-[12px] text-[var(--tech-subtle)]">
                    {alert.createdAt}
                  </p>
                </button>
              ))}

            {activeAlerts.length ===
              0 && (
              <div className="px-5 py-10 text-center text-[14px] text-[var(--tech-muted)]">
                No active maintenance alerts.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ACTIVE WORK ORDERS */}
      <Card className="mt-5 overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
        <div className="flex items-center justify-between border-b border-[var(--tech-border)] px-5 py-5">
          <h2 className="text-[20px] font-semibold text-[var(--tech-text)]">
            Active work orders
          </h2>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/technician/maintenance/work-orders",
              )
            }
            className="text-[13px] font-medium text-[var(--tech-text-secondary)] transition-colors hover:text-orange-500"
          >
            View all
          </button>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[820px]">
              <div className="grid grid-cols-[130px_120px_1fr_160px_180px] items-center border-b border-[var(--tech-border)] px-5 py-3 text-center text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-muted)]">
                <span>Order</span>
                <span>Drone ID</span>
                <span>Task</span>
                <span>Status</span>
                <span>Assigned to</span>
              </div>

              {activeWorkOrders
                .slice(0, 5)
                .map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() =>
                      navigate(
                        `/technician/maintenance/work-orders/${order.id}`,
                      )
                    }
                    className="
                      grid w-full
                      grid-cols-[130px_120px_1fr_160px_180px]
                      items-center
                      border-b
                      border-[var(--tech-border)]
                      px-5 py-4
                      text-left
                      transition-colors
                      last:border-b-0
                      hover:bg-[var(--tech-surface-2)]
                    "
                  >
                    <span className="text-center text-[14px] text-[var(--tech-muted)]">
                      {order.id}
                    </span>

                    <span className="text-center text-[15px] font-medium text-[var(--tech-text)]">
                      {order.droneId}
                    </span>

                    <span className="px-4 text-[14px] text-[var(--tech-text-secondary)]">
                      {order.title}
                    </span>

                    <div className="flex justify-center">
                      <WorkOrderStatusText
                        status={
                          order.status
                        }
                      />
                    </div>

                    <span className="text-center text-[13px] text-[var(--tech-muted)]">
                      {order.assignedTo}
                    </span>
                  </button>
                ))}

              {activeWorkOrders.length ===
                0 && (
                <div className="px-5 py-10 text-center text-[14px] text-[var(--tech-muted)]">
                  No active work orders.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TechnicianPageShell>
  );
}

function SourceText({
  source,
}: {
  source: AlertSource;
}) {
  const style =
    source === "Schedule"
      ? "text-blue-500"
      : source === "Hub inspection"
        ? "text-orange-500"
        : "text-violet-500";

  return (
    <span
      className={`text-[12px] font-semibold ${style}`}
    >
      {source}
    </span>
  );
}

function DroneStatusText({
  status,
}: {
  status: string;
}) {
  const style =
    status === "Maintenance"
      ? "text-orange-500"
      : "text-[var(--tech-muted)]";

  return (
    <span
      className={`text-[13px] font-semibold ${style}`}
    >
      {status}
    </span>
  );
}

function WorkOrderStatusText({
  status,
}: {
  status: WorkOrderStatus;
}) {
  const style =
    status === "Completed"
      ? "text-emerald-500"
      : status ===
          "In Progress"
        ? "text-blue-500"
        : "text-orange-500";

  return (
    <span
      className={`text-[13px] font-semibold ${style}`}
    >
      {status}
    </span>
  );
}
