import { TechnicianLoadingState } from "../components/TechnicianLoadingState";
import {
  ArrowRight,
  BatteryCharging,
  BatteryMedium,
  CircleAlert,
  ClipboardList,
  Package,
  PackageCheck,
  Plane,
  RefreshCw,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/shadcn/ui/card";

import { TechnicianPageShell } from "../components/TechnicianPageShell";
import { useFleetQuery } from "../hooks/useFleetQueries";
import { useBatteriesQuery } from "../hooks/useBatteryQueries";
import {
  useMaintenanceAlertsQuery,
  useWorkOrdersQuery,
} from "../hooks/useMaintenanceQueries";
import { useTransitMissionsQuery } from "../hooks/useTransitQueries";
import { useOutboundDeliveriesQuery } from "../hooks/useOutboundQueries";
import { useDeliveryConfirmationsQuery } from "../hooks/useDeliveryQueries";
import { useHubSuppliesQuery } from "../hooks/useHubSuppliesQueries";

// All eight list endpoints are Technician-scoped on the Backend. In particular,
// Fleet is the PHYSICAL inventory at this hub; en-route drones belong in Transit
// and must NOT be added to the fleet/available/maintenance totals.
// The dashboard never constructs mock rows or guesses counts on API failure.
function countWhenLoaded(data: unknown, count: number): string {
  return data === undefined ? "—" : String(count);
}

type OverviewPanelProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  to: string;
  children: ReactNode;
};

function OverviewPanel({
  title,
  description,
  icon: Icon,
  to,
  children,
}: OverviewPanelProps) {
  return (
    <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
      <div className="flex min-h-[84px] items-center justify-between gap-3 border-b border-[var(--tech-border)] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400">
            <Icon size={18} strokeWidth={1.7} />
          </span>
          <div>
            <h2 className="text-[16px] font-semibold leading-5 text-[var(--tech-text)]">{title}</h2>
            {description && <p className="mt-1 text-[12px] leading-5 text-[var(--tech-muted)]">{description}</p>}
          </div>
        </div>
        <Link
          to={to}
          className="shrink-0 text-[12px] font-medium text-[var(--tech-text-secondary)] transition-colors hover:text-orange-500"
        >
          View all
        </Link>
      </div>
      <CardContent className="px-5 py-3">{children}</CardContent>
    </Card>
  );
}

function OverviewRow({
  label,
  value,
  to,
  warning = false,
}: {
  label: string;
  value: string;
  to: string;
  warning?: boolean;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-[var(--tech-surface-2)]"
    >
      <span className="text-[13px] text-[var(--tech-text-secondary)] group-hover:text-[var(--tech-text)]">
        {label}
      </span>
      <span className="flex items-center gap-2">
        <strong
          className={`text-[15px] font-semibold tabular-nums ${
            warning && value !== "—" && Number(value) > 0
              ? "text-orange-400"
              : "text-[var(--tech-text)]"
          }`}
        >
          {value}
        </strong>
        <ArrowRight size={13} className="text-[var(--tech-subtle)] group-hover:text-orange-500" />
      </span>
    </Link>
  );
}

export function TechnicianDashboardPage() {
  const navigate = useNavigate();
  const fleetQuery = useFleetQuery();
  const batteriesQuery = useBatteriesQuery();
  const alertsQuery = useMaintenanceAlertsQuery();
  const workOrdersQuery = useWorkOrdersQuery();
  const transitQuery = useTransitMissionsQuery();
  const outboundQuery = useOutboundDeliveriesQuery();
  const confirmationsQuery = useDeliveryConfirmationsQuery();
  const suppliesQuery = useHubSuppliesQuery();

  const fleet = fleetQuery.data ?? [];
  const batteries = batteriesQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];
  const workOrders = workOrdersQuery.data ?? [];
  const transit = transitQuery.data ?? [];
  const outbound = outboundQuery.data ?? [];
  const confirmations = confirmationsQuery.data ?? [];
  const supplies = suppliesQuery.data ?? [];

  // Match the status definitions already used by Hub Fleet and Battery pages.
  const availableDrones = fleet.filter((drone) => drone.status === "Available");
  const maintenanceDrones = fleet.filter((drone) => drone.status === "Maintenance");
  const readyBatteries = batteries.filter((battery) => battery.status === "Ready");
  const chargingBatteries = batteries.filter((battery) => battery.status === "Charging");
  const inUseBatteries = batteries.filter((battery) => battery.status === "In Use");

  // Backend alert status is authoritative; no localStorage-derived suppression.
  const activeAlerts = alerts.filter((alert) => alert.status !== "Handled");
  const activeWorkOrders = workOrders.filter((order) => order.status !== "Completed");
  const pendingWorkOrders = activeWorkOrders.filter((order) => order.status === "Pending");
  const inProgressWorkOrders = activeWorkOrders.filter((order) => order.status === "In Progress");

  // Transit endpoint already filters completed/preflight missions. Do not count
  // the same drone as physically present until Fleet API reports it at the hub.
  const incomingFlights = transit.filter((mission) => mission.status === "Incoming");
  const transitAtHub = transit.filter((mission) => mission.status !== "Incoming");

  // Only orders requiring a Technician action at the origin hub.
  const outboundToHandle = outbound.filter((delivery) =>
    ["At Hub", "Mission Assigned", "Ready", "Needs Review"].includes(delivery.status),
  );
  const awaitingDropoff = outbound.filter((delivery) => delivery.status === "Awaiting Drop-off");
  // "Delivered" means at destination hub, waiting for customer pickup;
  // "Completed" means pickup already confirmed by Backend.
  const awaitingPickup = confirmations.filter((delivery) => delivery.status === "Delivered");
  const lowStockSupplies = supplies.filter((supply) => supply.isLowStock);

  const availablePercent = fleet.length > 0
    ? Math.round((availableDrones.length / fleet.length) * 100)
    : 0;

  // A hard-coded TECHNICIAN_HUB value can label the wrong account's hub.
  // Prefer a real label present in the hub-scoped API payloads instead.
  const hubLabel =
    fleet.find((drone) => drone.location && drone.location !== "—")?.location ||
    batteries.find((battery) => battery.hub && battery.hub !== "—")?.hub ||
    outbound.find((delivery) => delivery.hub && delivery.hub !== "—")?.hub ||
    transit.find((mission) => mission.hub && mission.hub !== "—")?.hub ||
    "Assigned hub";

  const failedSections = [
    fleetQuery.isError ? "Fleet" : null,
    batteriesQuery.isError ? "Batteries" : null,
    alertsQuery.isError ? "Maintenance alerts" : null,
    workOrdersQuery.isError ? "Work orders" : null,
    transitQuery.isError ? "Transit missions" : null,
    outboundQuery.isError ? "Outbound deliveries" : null,
    confirmationsQuery.isError ? "Delivery confirmations" : null,
    suppliesQuery.isError ? "Hub supplies" : null,
  ].filter((value): value is string => value !== null);

  const isRefreshing = [
    fleetQuery, batteriesQuery, alertsQuery, workOrdersQuery,
    transitQuery, outboundQuery, confirmationsQuery, suppliesQuery,
  ].some((query) => query.isFetching);

  function refreshDashboard() {
    // Refetch each existing React Query cache. Don't invoke action endpoints.
    void Promise.allSettled([
      fleetQuery.refetch(),
      batteriesQuery.refetch(),
      alertsQuery.refetch(),
      workOrdersQuery.refetch(),
      transitQuery.refetch(),
      outboundQuery.refetch(),
      confirmationsQuery.refetch(),
      suppliesQuery.refetch(),
    ]);
  }

  // Only show the four live hub-readiness metrics requested by Technician.
  const topStats: Array<{
    label: string;
    value: string;
    icon: LucideIcon;
    to: string;
  }> = [
    {
      label: "Available drones",
      value: countWhenLoaded(fleetQuery.data, availableDrones.length),
      icon: Plane,
      to: "/technician/fleet",
    },
    {
      label: "Drones in maintenance",
      value: countWhenLoaded(fleetQuery.data, maintenanceDrones.length),
      icon: Wrench,
      to: "/technician/fleet",
    },
    {
      label: "Available batteries",
      value: countWhenLoaded(batteriesQuery.data, readyBatteries.length),
      icon: BatteryMedium,
      to: "/technician/fleet/batteries",
    },
    {
      label: "Charging batteries",
      value: countWhenLoaded(batteriesQuery.data, chargingBatteries.length),
      icon: BatteryCharging,
      to: "/technician/fleet/batteries",
    },
  ];

  const dashboardQueries = [fleetQuery, batteriesQuery, alertsQuery, workOrdersQuery,
    transitQuery, outboundQuery, confirmationsQuery, suppliesQuery];
  const initialDashboardLoading = dashboardQueries.every((query) => query.data === undefined) &&
    dashboardQueries.some((query) => query.isPending) && !dashboardQueries.some((query) => query.isError);
  if (initialDashboardLoading) {
    return (
      <TechnicianPageShell title="Technician dashboard" description="">
        <TechnicianLoadingState label="Loading dashboard..." panel />
      </TechnicianPageShell>
    );
  }

  return (
    <TechnicianPageShell
      title="Technician dashboard"
      description={`Current operational overview · ${hubLabel}`}
      action={
        <button
          type="button"
          onClick={refreshDashboard}
          disabled={isRefreshing}
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-[var(--tech-border)] px-3 py-2 text-[12px] font-medium text-[var(--tech-text-secondary)] transition-colors hover:text-orange-500 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      }
    >
      {failedSections.length > 0 && (
        <div role="alert" className="mb-4 rounded-md border border-red-500/30 bg-red-500/5 px-4 py-3 text-[13px] text-red-400">
          Could not load: {failedSections.join(", ")}. Unavailable counts are shown as “—”; previous cached values may remain visible.
          <button type="button" onClick={refreshDashboard} className="ml-3 font-semibold underline hover:text-red-300">
            Retry
          </button>
        </div>
      )}

      {/* Four high-level hub metrics: no small descriptions under the values. */}
      <section aria-label="Hub key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {topStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              to={stat.to}
              className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
            >
              <Card className="h-full rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none transition-colors hover:border-orange-500/40">
                <CardContent className="flex min-h-[132px] flex-col justify-between p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[15px] font-medium leading-5 text-[var(--tech-text-secondary)] sm:text-[16px]">
                      {stat.label}
                    </span>
                    <Icon size={22} strokeWidth={1.7} className="shrink-0 text-[var(--tech-muted)]" />
                  </div>
                  <p className="mt-5 text-[36px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-[var(--tech-text)] sm:text-[40px]">
                    {stat.value}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      {/* Comprehensive hub overview, using the same API data as detail pages. */}
      <section aria-labelledby="hub-overview-title" className="mt-6">
        <h2 id="hub-overview-title" className="mb-4 text-[19px] font-semibold text-[var(--tech-text)]">
          Hub operations overview
        </h2>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          <OverviewPanel
            title="Fleet readiness"
            description=""
            icon={Plane}
            to="/technician/fleet"
          >
            <div className="mb-2 flex items-end justify-between px-2 pt-1">
              <span className="text-[12px] text-[var(--tech-muted)]">Availability rate</span>
              <strong className="text-[20px] font-semibold text-[var(--tech-text)]">
                {fleetQuery.data === undefined ? "—" : `${availablePercent}%`}
              </strong>
            </div>
            <div className="mx-2 mb-2 h-2 overflow-hidden rounded-full bg-zinc-700/50">
              {fleetQuery.data !== undefined && (
                <div className="h-full rounded-full bg-orange-500 transition-[width]" style={{ width: `${availablePercent}%` }} />
              )}
            </div>
            <OverviewRow label="Total drones" value={countWhenLoaded(fleetQuery.data, fleet.length)} to="/technician/fleet" />
            <OverviewRow label="Available" value={countWhenLoaded(fleetQuery.data, availableDrones.length)} to="/technician/fleet" />
            <OverviewRow label="In maintenance" value={countWhenLoaded(fleetQuery.data, maintenanceDrones.length)} to="/technician/fleet" warning />
          </OverviewPanel>

          <OverviewPanel
            title="Battery inventory"
            description=""
            icon={BatteryMedium}
            to="/technician/fleet/batteries"
          >
            <OverviewRow label="Total batteries" value={countWhenLoaded(batteriesQuery.data, batteries.length)} to="/technician/fleet/batteries" />
            <OverviewRow label="Ready" value={countWhenLoaded(batteriesQuery.data, readyBatteries.length)} to="/technician/fleet/batteries" />
            <OverviewRow label="Charging" value={countWhenLoaded(batteriesQuery.data, chargingBatteries.length)} to="/technician/fleet/batteries" />
            <OverviewRow label="In use" value={countWhenLoaded(batteriesQuery.data, inUseBatteries.length)} to="/technician/fleet/batteries" />
          </OverviewPanel>

          <OverviewPanel
            title="Flight & delivery"
            description=""
            icon={Package}
            to="/technician/fleet/transit"
          >
            <OverviewRow label="Incoming flights" value={countWhenLoaded(transitQuery.data, incomingFlights.length)} to="/technician/fleet/transit" />
            <OverviewRow label="Transit needing action" value={countWhenLoaded(transitQuery.data, transitAtHub.length)} to="/technician/fleet/transit" warning />
            <OverviewRow label="Outbound to process" value={countWhenLoaded(outboundQuery.data, outboundToHandle.length)} to="/technician/deliveries/outbound" warning />
            <OverviewRow label="Awaiting drop-off" value={countWhenLoaded(outboundQuery.data, awaitingDropoff.length)} to="/technician/deliveries/outbound" />
            <OverviewRow label="Awaiting customer pickup" value={countWhenLoaded(confirmationsQuery.data, awaitingPickup.length)} to="/technician/deliveries/confirmations" warning />
          </OverviewPanel>

          <OverviewPanel
            title="Maintenance & supplies"
            description=""
            icon={Wrench}
            to="/technician/maintenance/work-orders"
          >
            <OverviewRow label="Pending alerts" value={countWhenLoaded(alertsQuery.data, activeAlerts.length)} to="/technician/maintenance/alerts" warning />
            <OverviewRow label="Pending work orders" value={countWhenLoaded(workOrdersQuery.data, pendingWorkOrders.length)} to="/technician/maintenance/work-orders" />
            <OverviewRow label="Work orders in progress" value={countWhenLoaded(workOrdersQuery.data, inProgressWorkOrders.length)} to="/technician/maintenance/work-orders" />
            <OverviewRow label="Low-stock part types" value={countWhenLoaded(suppliesQuery.data, lowStockSupplies.length)} to="/technician/maintenance/supplies" warning />
          </OverviewPanel>
        </div>
      </section>

      {/* Lists retain the existing Technician dashboard's drill-down actions. */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--tech-border)] px-5 py-5">
            <div className="flex items-center gap-2">
              <Wrench size={17} className="text-orange-500" />
              <h2 className="text-[20px] font-semibold text-[var(--tech-text)]">Fleet attention</h2>
            </div>
            <button type="button" onClick={() => navigate("/technician/fleet")} className="text-[13px] font-medium text-[var(--tech-text-secondary)] hover:text-orange-500">
              View fleet
            </button>
          </div>
          <CardContent className="p-0">
            {fleetQuery.data === undefined && !fleetQuery.isError ? (
              <TechnicianLoadingState label="Loading hub fleet..." />
            ) : maintenanceDrones.length === 0 ? (
              <EmptyMessage message={fleetQuery.data === undefined ? "Fleet data unavailable." : "No drones currently require technician attention."} />
            ) : (
              maintenanceDrones.slice(0, 5).map((drone) => (
                <button
                  key={drone.id}
                  type="button"
                  onClick={() => navigate(`/technician/fleet/${encodeURIComponent(drone.id)}`)}
                  className="grid w-full grid-cols-1 gap-2 border-b border-[var(--tech-border)] px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-[var(--tech-surface-2)] sm:grid-cols-[minmax(0,1fr)_minmax(100px,180px)_105px] sm:items-center sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="break-all text-[15px] font-medium text-[var(--tech-text)]">{drone.id}</p>
                    <p className="mt-1 text-[13px] text-[var(--tech-muted)]">{drone.model}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.06em] text-[var(--tech-subtle)]">Hub</p>
                    <p className="mt-1 truncate text-[13px] text-[var(--tech-text-secondary)]">{drone.location}</p>
                  </div>
                  <span className="text-[13px] font-semibold text-orange-500 sm:text-right">{drone.status}</span>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--tech-border)] px-5 py-5">
            <div className="flex items-center gap-2">
              <CircleAlert size={17} className="text-orange-500" />
              <h2 className="text-[20px] font-semibold text-[var(--tech-text)]">Maintenance alerts</h2>
            </div>
            <button type="button" onClick={() => navigate("/technician/maintenance/alerts")} className="text-[13px] font-medium text-[var(--tech-text-secondary)] hover:text-orange-500">
              View all
            </button>
          </div>
          <CardContent className="p-0">
            {alertsQuery.data === undefined && !alertsQuery.isError ? (
              <TechnicianLoadingState label="Loading maintenance alerts..." />
            ) : activeAlerts.length === 0 ? (
              <EmptyMessage message={alertsQuery.data === undefined ? "Maintenance alerts unavailable." : "No active maintenance alerts."} />
            ) : (
              activeAlerts.slice(0, 4).map((alert) => (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => navigate("/technician/maintenance/alerts")}
                  className="w-full border-b border-[var(--tech-border)] px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-[var(--tech-surface-2)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-medium text-[var(--tech-text)]">{alert.drone}</span>
                        <SourceText source={alert.source} />
                      </div>
                      <p className="mt-1.5 text-[14px] leading-5 text-[var(--tech-text-secondary)]">{alert.title}</p>
                    </div>
                    <span className="shrink-0 text-[12px] font-semibold text-orange-500">Pending</span>
                  </div>
                  <p className="mt-2 text-[12px] text-[var(--tech-subtle)]">{alert.createdAt}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5 overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--tech-border)] px-5 py-5">
          <div className="flex items-center gap-2">
            <PackageCheck size={17} className="text-orange-500" />
            <h2 className="text-[20px] font-semibold text-[var(--tech-text)]">Active work orders</h2>
          </div>
          <button type="button" onClick={() => navigate("/technician/maintenance/work-orders")} className="text-[13px] font-medium text-[var(--tech-text-secondary)] hover:text-orange-500">
            View all
          </button>
        </div>
        <CardContent className="p-0">
          {workOrdersQuery.data === undefined && !workOrdersQuery.isError ? (
            <TechnicianLoadingState label="Loading work orders..." />
          ) : activeWorkOrders.length === 0 ? (
            <EmptyMessage message={workOrdersQuery.data === undefined ? "Work orders unavailable." : "No active work orders."} />
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[780px]">
                <div className="grid grid-cols-[130px_130px_minmax(0,1fr)_145px_160px] items-center border-b border-[var(--tech-border)] px-5 py-3 text-center text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--tech-muted)]">
                  <span>Order</span><span>Drone ID</span><span>Task</span><span>Status</span><span>Assigned to</span>
                </div>
                {activeWorkOrders.slice(0, 5).map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => navigate(`/technician/maintenance/work-orders/${encodeURIComponent(order.id)}`)}
                    className="grid w-full grid-cols-[130px_130px_minmax(0,1fr)_145px_160px] items-center border-b border-[var(--tech-border)] px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-[var(--tech-surface-2)]"
                  >
                    <span className="text-center text-[14px] text-[var(--tech-muted)]">{order.id}</span>
                    <span className="text-center text-[15px] font-medium text-[var(--tech-text)]">{order.droneId}</span>
                    <span className="px-4 text-[14px] text-[var(--tech-text-secondary)]">{order.title}</span>
                    <span className="text-center"><WorkOrderStatusText status={order.status} /></span>
                    <span className="text-center text-[13px] text-[var(--tech-muted)]">{order.assignedTo}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TechnicianPageShell>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="px-5 py-10 text-center text-[14px] text-[var(--tech-muted)]">
      {message}
    </div>
  );
}

function SourceText({ source }: { source: "Schedule" | "Incident" | "Hub inspection" }) {
  const style = source === "Schedule"
    ? "text-blue-500"
    : source === "Hub inspection"
      ? "text-orange-500"
      : "text-violet-500";
  return <span className={`text-[12px] font-semibold ${style}`}>{source}</span>;
}

function WorkOrderStatusText({ status }: { status: "Pending" | "In Progress" | "Completed" }) {
  const style = status === "Completed"
    ? "text-emerald-500"
    : status === "In Progress"
      ? "text-blue-500"
      : "text-orange-500";
  return <span className={`text-[13px] font-semibold ${style}`}>{status}</span>;
}
