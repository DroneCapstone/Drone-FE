import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AreaChart } from "../../operator/components/AreaChart";
import { MetricCard } from "../../operator/components/MetricCard";
import { OperatorPanel } from "../../operator/components/OperatorPanel";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { AdminPageShell } from "../components/AdminPageShell";
import { HubDroneMap } from "../components/HubDroneMap";
import {
  adminAlerts,
  adminDashboardMissionSummary,
  adminDashboardRevenue,
  adminRevenueTrend,
} from "../data/adminData";
import {
  getAdminBatteries,
  getAdminDrones,
  getAdminHubs,
  getAdminUsers,
} from "../services/adminStore";
import { getReplacementRequests } from "../services/prototypeWorkflow";
import { batteryHealthTone } from "../utils/adminDisplay";

type RevenuePeriod = "Today" | "7 Days" | "Month";

function formatVndCompact(value: number) {
  if (value >= 1_000_000_000) return `₫${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `₫${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₫${(value / 1_000).toFixed(0)}K`;
  return `₫${value.toLocaleString("vi-VN")}`;
}

function DistributionRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const width = total > 0 ? Math.max(4, Math.round((value / total) * 100)) : 0;

  return (
    <div className="admin-distribution-row">
      <div className="admin-distribution-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="admin-distribution-track" aria-hidden="true">
        <span style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>("7 Days");

  const hubs = getAdminHubs();
  const drones = getAdminDrones();
  const batteries = getAdminBatteries();
  const users = getAdminUsers();

  const activeHubs = hubs.filter((hub) => hub.status === "ACTIVE").length;
  const activeDrones = drones.filter((drone) => drone.isActive).length;
  const availableDrones = drones.filter(
    (drone) => drone.isActive && drone.status === "AVAILABLE",
  ).length;
  const maintenanceDrones = drones.filter((drone) => drone.status === "MAINTENANCE").length;
  const inFlightDrones = drones.filter((drone) => drone.status === "IN_FLIGHT").length;

  const healthyBatteries = batteries.filter(
    (battery) => battery.administrativeStatus === "ACTIVE" && battery.sohPct >= 90,
  ).length;
  const degradedBatteries = batteries.filter(
    (battery) =>
      battery.administrativeStatus === "ACTIVE" &&
      battery.sohPct >= 80 &&
      battery.sohPct < 90,
  ).length;
  const retirementReview = batteries.filter(
    (battery) =>
      battery.retirementRecommended && battery.administrativeStatus !== "RETIRED",
  ).length;

  const activeUsers = users.filter((user) => user.status === "ACTIVE").length;
  const customerCount = users.filter((user) => user.role === "customer").length;
  const operatorCount = users.filter((user) => user.role === "operator").length;
  const technicianCount = users.filter((user) => user.role === "technician").length;
  const adminCount = users.filter((user) => user.role === "admin").length;

  const revenueTrend = adminRevenueTrend[revenuePeriod];
  const revenueChartMax = Math.max(...revenueTrend.values, 1);
  const revenueYAxis = useMemo(() => {
    const top = Math.ceil(revenueChartMax / 5) * 5;
    return [top, Math.round(top * 0.75), Math.round(top * 0.5), Math.round(top * 0.25)].map(String);
  }, [revenueChartMax]);

  const mission = adminDashboardMissionSummary;
  const totalMissions =
    mission.scheduled + mission.inProgress + mission.completed + mission.failed + mission.cancelled;
  const completedEnd = totalMissions ? (mission.completed / totalMissions) * 100 : 0;
  const inProgressEnd = totalMissions
    ? completedEnd + (mission.inProgress / totalMissions) * 100
    : 0;
  const scheduledEnd = totalMissions
    ? inProgressEnd + (mission.scheduled / totalMissions) * 100
    : 0;
  const failedEnd = totalMissions
    ? scheduledEnd + ((mission.failed + mission.cancelled) / totalMissions) * 100
    : 100;

  const missionDonutStyle = {
    background: `conic-gradient(
      var(--green) 0 ${completedEnd}%,
      var(--orange) ${completedEnd}% ${inProgressEnd}%,
      var(--blue) ${inProgressEnd}% ${scheduledEnd}%,
      var(--red) ${scheduledEnd}% ${failedEnd}%
    )`,
  };

  return (
    <AdminPageShell
      title="Dashboard"
      description="System-wide overview of revenue, missions, users, hubs, fleet and battery lifecycle."
    >
      <div className="mb-4 flex items-center justify-between rounded-lg border border-[var(--admin-border)] p-3 text-sm"><span><strong>{getReplacementRequests().filter(r=>r.status==='PENDING').length}</strong> replacement requests waiting for approval</span><Link className="text-button" to="/admin/approvals">Review approvals</Link></div>
      <div className="metric-grid">
        <MetricCard
          label="Revenue today"
          value={formatVndCompact(adminDashboardRevenue.todayVnd)}
          delta={adminDashboardRevenue.todayDelta}
          tone="success"
          note={`${adminDashboardRevenue.paidOrdersToday} paid orders today`}
        />
        <MetricCard
          label="Revenue this month"
          value={formatVndCompact(adminDashboardRevenue.monthVnd)}
          delta="Month"
          tone="info"
          note={`Total revenue ${formatVndCompact(adminDashboardRevenue.totalVnd)}`}
        />
        <MetricCard
          label="Active missions"
          value={String(mission.inProgress)}
          delta={`${inFlightDrones} in flight`}
          tone="info"
          note={`${mission.scheduled} scheduled missions`}
        />
        <MetricCard
          label="Completed today"
          value={String(mission.completedToday)}
          delta="Delivered"
          tone="success"
          note={`${mission.failed + mission.cancelled} failed / cancelled overall`}
        />
      </div>

      <div className="dashboard-grid admin-dashboard-primary">
        <OperatorPanel
          title="Revenue overview"
          eyebrow="PAYMENTS"
          className="chart-panel"
          action={
            <div className="segmented">
              {(["Today", "7 Days", "Month"] as RevenuePeriod[]).map((period) => (
                <button
                  key={period}
                  type="button"
                  className={revenuePeriod === period ? "active" : ""}
                  onClick={() => setRevenuePeriod(period)}
                >
                  {period}
                </button>
              ))}
            </div>
          }
        >
          <div className="chart-summary">
            <strong>{formatVndCompact(revenueTrend.totalVnd)}</strong>
            <span>{revenueTrend.caption}</span>
            <span className="summary-delta">{revenueTrend.delta}</span>
          </div>
          <AreaChart
            orange
            values={revenueTrend.values}
            unit="VND millions"
            yLabels={revenueYAxis}
            pointLabel={`${revenuePeriod} revenue`}
          />
          <div className="chart-labels">
            {revenueTrend.labels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="admin-revenue-footer">
            <span>
              <small>Paid orders</small>
              <strong>{adminDashboardRevenue.paidOrdersMonth.toLocaleString("vi-VN")}</strong>
            </span>
            <span>
              <small>Pending payments</small>
              <strong>{adminDashboardRevenue.pendingPayments}</strong>
            </span>
            <span>
              <small>Refunds</small>
              <strong>{adminDashboardRevenue.refundsMonth}</strong>
            </span>
          </div>
        </OperatorPanel>

        <OperatorPanel
          title="Mission status"
          eyebrow="OPERATIONS"
          action={
            <span className="counter">
              {totalMissions} total
            </span>
          }
        >
          <div className="donut-wrap admin-mission-donut">
            <div className="donut" style={missionDonutStyle}>
              <div>
                <strong>{totalMissions}</strong>
                <span>Total</span>
              </div>
            </div>
            <div className="donut-legend">
              <span><i className="green" />Completed <b>{mission.completed}</b></span>
              <span><i className="orange" />In progress <b>{mission.inProgress}</b></span>
              <span><i className="blue" />Scheduled <b>{mission.scheduled}</b></span>
              <span><i className="red" />Failed / Cancelled <b>{mission.failed + mission.cancelled}</b></span>
            </div>
          </div>
          <div className="admin-mission-footer">
            <span>
              <small>Completed today</small>
              <strong>{mission.completedToday}</strong>
            </span>
            <span>
              <small>Success rate</small>
              <strong>{mission.successRatePct}%</strong>
            </span>
          </div>
        </OperatorPanel>
      </div>

      <div className="metric-grid">
        <MetricCard
          label="Users"
          value={String(users.length)}
          delta={`${activeUsers} active`}
          tone="success"
          note="Across all roles"
        />
        <MetricCard
          label="Active hubs"
          value={`${activeHubs}/${hubs.length}`}
          delta="Network"
          tone="info"
          note="Available for new planning"
        />
        <MetricCard
          label="Active drones"
          value={`${activeDrones}/${drones.length}`}
          delta={`${availableDrones} available`}
          tone="success"
          note={`${maintenanceDrones} maintenance · ${inFlightDrones} in flight`}
        />
        <MetricCard
          label="Battery review"
          value={String(retirementReview)}
          delta={retirementReview ? "Attention" : "Healthy"}
          tone={retirementReview ? "warning" : "success"}
          note={`${healthyBatteries} healthy · ${degradedBatteries} degraded`}
        />
      </div>

      <HubDroneMap hubs={hubs} drones={drones} />

      <div className="admin-dashboard-three">
        <OperatorPanel
          title="User distribution"
          eyebrow="ACCESS"
          action={<Link className="text-button" to="/admin/users">View users</Link>}
        >
          <div className="admin-distribution-list">
            <DistributionRow label="Customers" value={customerCount} total={users.length} />
            <DistributionRow label="Operators" value={operatorCount} total={users.length} />
            <DistributionRow label="Technicians" value={technicianCount} total={users.length} />
            <DistributionRow label="Admins" value={adminCount} total={users.length} />
          </div>
        </OperatorPanel>

        <OperatorPanel
          title="Fleet & battery health"
          eyebrow="ASSET HEALTH"
          action={<Link className="text-button" to="/admin/network/batteries">View batteries</Link>}
        >
          <div className="admin-health-list">
            <div className="admin-health-row">
              <span><small>Available drones</small><strong>{availableDrones}</strong></span>
              <StatusBadge tone="success">Ready</StatusBadge>
            </div>
            <div className="admin-health-row">
              <span><small>Maintenance drones</small><strong>{maintenanceDrones}</strong></span>
              <StatusBadge tone={maintenanceDrones ? "warning" : "success"}>Maintenance</StatusBadge>
            </div>
            <div className="admin-health-row">
              <span><small>Healthy batteries</small><strong>{healthyBatteries}</strong></span>
              <StatusBadge tone="success">SOH ≥ 90%</StatusBadge>
            </div>
            <div className="admin-health-row">
              <span><small>Retirement review</small><strong>{retirementReview}</strong></span>
              <StatusBadge tone={retirementReview ? "warning" : "success"}>Review</StatusBadge>
            </div>
          </div>
        </OperatorPanel>

        <OperatorPanel title="Attention" eyebrow="ADMIN REVIEW">
          <div className="alert-list admin-dashboard-alerts">
            {adminAlerts.map((alert) => (
              <div className="alert-row" key={alert.id}>
                <div>
                  <strong>{alert.title}</strong>
                  <small>{alert.detail}</small>
                </div>
                <StatusBadge
                  tone={
                    alert.severity === "Warning"
                      ? "warning"
                      : alert.severity === "Critical"
                        ? "danger"
                        : "info"
                  }
                >
                  {alert.severity}
                </StatusBadge>
              </div>
            ))}
          </div>
        </OperatorPanel>
      </div>

      <OperatorPanel
        title="Battery health watchlist"
        eyebrow="LIFECYCLE"
        action={<Link className="text-button" to="/admin/network/batteries">Open battery management</Link>}
      >
        <div className="rank-list">
          {batteries
            .slice()
            .sort((a, b) => a.sohPct - b.sohPct)
            .slice(0, 5)
            .map((battery, index) => (
              <span key={battery.id}>
                <b>{index + 1}</b>
                <span>
                  <strong>{battery.id}</strong>
                  <i><em style={{ width: `${battery.sohPct}%` }} /></i>
                </span>
                <StatusBadge tone={batteryHealthTone(battery.sohPct)}>
                  {battery.sohPct}% SOH
                </StatusBadge>
              </span>
            ))}
        </div>
      </OperatorPanel>
    </AdminPageShell>
  );
}
