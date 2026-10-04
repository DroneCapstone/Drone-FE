import { Link } from "react-router-dom";
import { MetricCard } from "../../operator/components/MetricCard";
import { OperatorPanel } from "../../operator/components/OperatorPanel";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { AdminPageShell } from "../components/AdminPageShell";
import { HubDroneMap } from "../components/HubDroneMap";
import { adminAlerts, adminPayments } from "../data/adminData";
import { getAdminBatteries, getAdminDrones, getAdminHubs, getAdminUsers } from "../services/adminStore";
import { batteryHealthTone } from "../utils/adminDisplay";

export function AdminDashboardPage() {
  const hubs = getAdminHubs();
  const drones = getAdminDrones();
  const batteries = getAdminBatteries();
  const users = getAdminUsers();
  const revenue = adminPayments.filter((p) => p.status === "PAID" || p.status === "REFUNDED").reduce((sum, p) => sum + p.amountVnd, 0);
  const activeDrones = drones.filter((d) => d.isActive).length;
  const retirementReview = batteries.filter((b) => b.retirementRecommended && b.administrativeStatus !== "RETIRED").length;

  return (
    <AdminPageShell title="Dashboard" description="System-wide overview for users, network assets, payments and administrative attention items.">
      <div className="metric-grid">
        <MetricCard label="Users" value={String(users.length)} delta={`${users.filter((u) => u.status === "ACTIVE").length} active`} tone="success" note="Across all roles" />
        <MetricCard label="Active hubs" value={`${hubs.filter((h) => h.status === "ACTIVE").length}/${hubs.length}`} delta="Network" tone="info" note="Available for new planning" />
        <MetricCard label="Active drones" value={`${activeDrones}/${drones.length}`} delta={`${drones.filter((d) => d.status === "IN_FLIGHT").length} in flight`} tone="success" note="Administrative availability" />
        <MetricCard label="Battery review" value={String(retirementReview)} delta="Attention" tone={retirementReview ? "warning" : "success"} note="Retirement recommendations" />
      </div>

      <div className="dashboard-grid">
        <OperatorPanel title="Operational summary" eyebrow="READ-ONLY CROSS-ROLE VIEW">
          <div className="metric-grid three">
            <MetricCard label="Active missions" value="7" delta="3 in flight" tone="info" note="Read-only Operator data" />
            <MetricCard label="Available drones" value={String(drones.filter((d) => d.status === "AVAILABLE" && d.isActive).length)} delta="Ready" tone="success" note="Before mission eligibility checks" />
            <MetricCard label="Maintenance drones" value={String(drones.filter((d) => d.status === "MAINTENANCE").length)} delta="Tech-owned" tone="warning" note="Unavailable for new missions" />
            <MetricCard label="Healthy batteries" value={String(batteries.filter((b) => b.sohPct >= 90 && b.administrativeStatus === "ACTIVE").length)} delta="SOH ≥ 90%" tone="success" note="Normal operation" />
            <MetricCard label="Paid orders" value={String(adminPayments.filter((p) => p.status === "PAID").length)} delta="Captured" tone="success" note="Payment monitoring" />
            <MetricCard label="Revenue snapshot" value={`${(revenue / 1_000_000).toFixed(1)}M`} delta="VND" tone="info" note="Captured payment sample" />
          </div>
        </OperatorPanel>

        <OperatorPanel title="Attention" eyebrow="ADMIN REVIEW">
          <div className="alert-list">
            {adminAlerts.map((alert) => (
              <div className="alert-row" key={alert.id}>
                <div>
                  <strong>{alert.title}</strong>
                  <small>{alert.detail}</small>
                </div>
                <StatusBadge tone={alert.severity === "Warning" ? "warning" : alert.severity === "Critical" ? "danger" : "info"}>{alert.severity}</StatusBadge>
              </div>
            ))}
          </div>
        </OperatorPanel>
      </div>

      <HubDroneMap hubs={hubs} drones={drones} />

      <div className="dashboard-grid lower">
        <OperatorPanel title="Battery health" eyebrow="FLEET LIFECYCLE" action={<Link className="text-button" to="/admin/network/batteries">View batteries</Link>}>
          <div className="rank-list">
            {batteries.slice().sort((a, b) => a.sohPct - b.sohPct).slice(0, 5).map((battery, index) => (
              <span key={battery.id}>
                <b>{index + 1}</b>
                <span><strong>{battery.id}</strong><i><em style={{ width: `${battery.sohPct}%` }} /></i></span>
                <StatusBadge tone={batteryHealthTone(battery.sohPct)}>{battery.sohPct}% SOH</StatusBadge>
              </span>
            ))}
          </div>
        </OperatorPanel>

        <OperatorPanel title="Quick access" eyebrow="ADMINISTRATION">
          <div className="admin-quick-links">
            <Link to="/admin/users">Manage users</Link>
            <Link to="/admin/network/hubs">Manage hubs</Link>
            <Link to="/admin/payments/transactions">Review payments</Link>
            <Link to="/admin/audit">View audit logs</Link>
          </div>
        </OperatorPanel>
      </div>
    </AdminPageShell>
  );
}
