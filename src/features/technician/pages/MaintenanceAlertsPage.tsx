import {
  History,
  Plus,
  Search,
  X,
} from "lucide-react";

import {
  useMemo,
  useState,
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
  type AlertSource,
  type AlertStatus,
  type MaintenanceAlert,
} from "../utils/maintenanceAlertStorage";

import {
  useMaintenanceAlertsQuery,
} from "../hooks/useMaintenanceQueries";

type AlertLog = {
  id: string;
  alertId: string;
  drone: string;
  title: string;
  source: AlertSource;
  status: "Pending" | "Handled";
  workOrderId: string;
  handledAt: string;
};

const ALERT_LOG_STORAGE_KEY =
  "droneoptai.technician.maintenance-alert-log.v1";

// Stable empty list while the first API request is pending.
const EMPTY_MAINTENANCE_ALERTS: MaintenanceAlert[] = [];

/*
 * Active alerts come from the shared maintenance alert store.
 *
 * - Incident:
 *   Operator/System detects an in-flight incident and creates the alert.
 *
 * - Hub inspection:
 *   Technician discovers a technical issue during a battery-stop
 *   readiness check and the system creates the alert.
 */

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

export function MaintenanceAlertsPage() {
  const navigate = useNavigate();

  const alertsQuery =
    useMaintenanceAlertsQuery();

  const maintenanceAlerts: MaintenanceAlert[] =
    alertsQuery.data ?? EMPTY_MAINTENANCE_ALERTS;

  // Never display a 'no alerts' state before the first API result is known.
  const alertsLoading = alertsQuery.isPending;
  const alertsFailed = alertsQuery.isError && !alertsQuery.data;

  const [query, setQuery] =
    useState("");

  const [
    historyOpen,
    setHistoryOpen,
  ] = useState(false);

  const [
    sourceFilter,
    setSourceFilter,
  ] = useState<
    "all" | AlertSource
  >("all");

  const [alertLogs] =
    useState<AlertLog[]>(
      loadAlertLogs,
    );



  const normalizedQuery = query
    .trim()
    .toLowerCase();

  // BE filters by Technician hub and is authoritative for alert status.
  // Never suppress a pending Backend alert because localStorage says a WO was created.
  const activeAlerts = useMemo(
    () => maintenanceAlerts.filter((alert) => alert.status !== "Handled"),
    [maintenanceAlerts],
  );

  const filteredAlerts = useMemo(
    () =>
      activeAlerts.filter(
        (alert) => {
          const matchesSearch =
            !normalizedQuery ||
            alert.id
              .toLowerCase()
              .includes(
                normalizedQuery,
              ) ||
            alert.drone
              .toLowerCase()
              .includes(
                normalizedQuery,
              ) ||
            alert.title
              .toLowerCase()
              .includes(
                normalizedQuery,
              ) ||
            alert.source
              .toLowerCase()
              .includes(
                normalizedQuery,
              );

          const matchesSource =
            sourceFilter === "all" ||
            alert.source ===
              sourceFilter;

          return (
            matchesSearch &&
            matchesSource
          );
        },
      ),
    [
      activeAlerts,
      normalizedQuery,
      sourceFilter,
    ],
  );

  const createWorkOrder = (
    alert: MaintenanceAlert,
  ) => {
    const params =
      new URLSearchParams({
        alertId: alert.id,
        drone: alert.drone,
        droneId: alert.droneId,
        title: alert.title,
        source: alert.source,
      });

    if (alert.missionId) {
      params.set(
        "missionId",
        alert.missionId,
      );
    }

    if (alert.legId) {
      params.set(
        "legId",
        alert.legId,
      );
    }

    navigate(
      `/technician/maintenance/work-orders?${params.toString()}`,
    );
  };

  return (
    <TechnicianPageShell
      title="Maintenance alerts"
      description=""
    >
      {/* ACTIVE ALERTS */}
      <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
        {/* FILTERS */}
        <CardContent className="flex flex-wrap gap-3 border-b border-[var(--tech-border)] p-4">
          <div className="relative min-w-[280px] flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tech-subtle)]"
            />

            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
              placeholder="Search alert, drone or issue..."
              className="tech-control h-10 w-full pl-9 pr-3 !text-[14px]"
            />
          </div>

          <select
            value={sourceFilter}
            onChange={(event) =>
              setSourceFilter(
                event.target
                  .value as
                  | "all"
                  | AlertSource,
              )
            }
            className="tech-control h-10 min-w-[175px] px-3 !text-[14px]"
          >
            <option value="all">
              All sources
            </option>
            <option value="Schedule">
              Schedule
            </option>
            <option value="Incident">
              Incident
            </option>
            <option value="Hub inspection">
              Hub inspection
            </option>
          </select>
        </CardContent>

        {/* TABLE TITLE */}
        <div className="flex items-center justify-between border-b border-[var(--tech-border)] px-5 py-5">
          <h2 className="text-[20px] font-semibold text-[var(--tech-text)]">
            Active alerts
          </h2>

          <div className="flex items-center gap-4">
            <span className="text-[13px] text-[var(--tech-subtle)]">
              {alertsLoading
                ? "Loading..."
                : alertsFailed
                  ? "—"
                  : `${filteredAlerts.length} alerts`}
            </span>

            <button
              type="button"
              onClick={() =>
                setHistoryOpen(true)
              }
              className="
  inline-flex items-center gap-2
  text-[13px] font-medium
  text-[var(--tech-text-secondary)]
  transition-colors duration-150
  hover:text-orange-500
"
            >
              <History size={15} />
              View history
            </button>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[110px_110px_1fr_140px_130px_150px_130px] items-center border-b border-[var(--tech-border)] px-5 py-3 text-center text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-muted)]">
                <span>Alert</span>
                <span>Drone</span>
                <span>Issue</span>
                <span>Source</span>
                <span>Status</span>
                <span>Created</span>
                <span>Action</span>
              </div>

              {filteredAlerts.map(
                (alert) => (
                  <div
                    key={alert.id}
                    className="grid grid-cols-[110px_110px_1fr_140px_130px_150px_130px] items-center border-b border-[var(--tech-border)] px-5 py-4 last:border-b-0"
                  >
                    <span className="text-center text-[14px] text-[var(--tech-muted)]">
                      {alert.id}
                    </span>

                    <span className="text-center text-[15px] font-medium text-[var(--tech-text)]">
                      {alert.drone}
                    </span>

                    <div className="px-4">
                      <p className="text-[14px] text-[var(--tech-text-secondary)]">
                        {alert.title}
                      </p>

                      {alert.missionId && (
                        <p className="mt-1 text-[12px] text-[var(--tech-muted)]">
                          Mission{" "}
                          <span className="font-medium text-orange-500">
                            {alert.missionId}
                          </span>
                          {alert.legId
                            ? ` · ${alert.legId}`
                            : ""}
                        </p>
                      )}

                      {alert.reportedBy && (
                        <p className="mt-1 text-[12px] text-[var(--tech-muted)]">
                          Reported by{" "}
                          <span className="font-medium text-[var(--tech-text-secondary)]">
                            {alert.reportedBy}
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="flex justify-center">
                      <SourceText
                        source={
                          alert.source
                        }
                      />
                    </div>

                    <div className="flex justify-center">
                      <AlertStatusText
                        status="Pending"
                      />
                    </div>

                    <span className="text-center text-[13px] text-[var(--tech-muted)]">
                      {alert.createdAt}
                    </span>

                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() =>
                          createWorkOrder(
                            alert,
                          )
                        }
                        className="
                          group relative inline-flex items-center gap-1.5
                          pb-1 text-[13px] font-medium
                          text-[var(--tech-text-secondary)]
                          transition-colors duration-150
                          after:absolute after:bottom-0 after:left-0
                          after:h-[2px] after:w-full
                          after:origin-left after:scale-x-0
                          after:bg-gradient-to-r
                          after:from-orange-500
                          after:via-orange-400
                          after:to-orange-300
                          after:transition-transform
                          after:duration-200
                          hover:text-orange-500
                          hover:after:scale-x-100
                        "
                      >
                        <Plus
                          size={14}
                        />
                        Create WO
                      </button>
                    </div>
                  </div>
                ),
              )}

              {alertsLoading ? (
                <div role="status" aria-live="polite" className="px-5 py-10 text-center text-[14px] text-[var(--tech-muted)]">
                  Loading maintenance alerts...
                </div>
              ) : alertsFailed ? (
                <div role="alert" className="px-5 py-10 text-center text-[14px] text-red-400">
                  <p>Unable to load maintenance alerts. Please try again.</p>
                  <button
                    type="button"
                    onClick={() => void alertsQuery.refetch()}
                    className="mt-3 font-semibold text-orange-500 underline"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="px-5 py-10 text-center text-[14px] text-[var(--tech-muted)]">
                  {maintenanceAlerts.length === 0
                    ? "No active maintenance alerts."
                    : "No active maintenance alerts match the current filters."}
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>


      {historyOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4">
          <div className="flex max-h-[80vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--tech-border)] px-5 py-4">
              <div>
                <h2 className="text-[20px] font-semibold text-[var(--tech-text)]">
                  Alert history
                </h2>

               
              </div>

              <button
                type="button"
                onClick={() =>
                  setHistoryOpen(false)
                }
                className="text-[var(--tech-muted)] transition-colors hover:text-orange-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <div className="min-w-[980px]">
                <div className="sticky top-0 z-10 grid grid-cols-[110px_110px_1fr_140px_130px_130px_170px] items-center border-b border-[var(--tech-border)] bg-[var(--tech-surface)] px-5 py-3 text-center text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-muted)]">
                  <span>Alert</span>
                  <span>Drone</span>
                  <span>Issue</span>
                  <span>Source</span>
                  <span>Status</span>
                  <span>Work order</span>
                  <span>Handled at</span>
                </div>

                {alertLogs.map(
                  (log) => (
                    <div
                      key={log.id}
                      className="grid grid-cols-[110px_110px_1fr_140px_130px_130px_170px] items-center border-b border-[var(--tech-border)] px-5 py-4 last:border-b-0"
                    >
                      <span className="text-center text-[14px] text-[var(--tech-muted)]">
                        {log.alertId}
                      </span>

                      <span className="text-center text-[15px] font-medium text-[var(--tech-text)]">
                        {log.drone}
                      </span>

                      <span className="px-4 text-[14px] text-[var(--tech-text-secondary)]">
                        {log.title}
                      </span>

                      <div className="flex justify-center">
                        <SourceText
                          source={
                            log.source
                          }
                        />
                      </div>

                      <div className="flex justify-center">
                        <AlertStatusText
                          status={
                            log.status
                          }
                        />
                      </div>

                      <span className="text-center text-[13px] font-medium text-orange-500">
                        {log.workOrderId}
                      </span>

                      <span className="text-center text-[13px] text-[var(--tech-muted)]">
                        {log.handledAt}
                      </span>
                    </div>
                  ),
                )}

                {alertLogs.length === 0 && (
                  <div className="px-5 py-12 text-center text-[14px] text-[var(--tech-muted)]">
                    No handled alert history yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </TechnicianPageShell>
  );
}

function SourceText({
  source,
}: {
  source: AlertSource;
}) {
  const style =
    source === "Hub inspection"
      ? "text-orange-500"
      : source === "Incident"
        ? "text-[var(--tech-text-secondary)]"
        : "text-[var(--tech-muted)]";

  return (
    <span
      className={`text-[13px] font-semibold ${style}`}
    >
      {source}
    </span>
  );
}

function AlertStatusText({
  status,
}: {
  status: AlertStatus;
}) {
  return (
    <span
      className={`text-[13px] font-semibold ${
        status === "Handled"
          ? "text-emerald-500"
          : "text-orange-500"
      }`}
    >
      {status}
    </span>
  );
}
