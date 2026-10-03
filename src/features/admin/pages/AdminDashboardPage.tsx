import {
  Activity,
  AlertTriangle,
  BatteryCharging,
  Bot,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Plane,
  ReceiptText,
  RefreshCcw,
  Route,
  Server,
  Users,
  Warehouse,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminMetricCard } from "../components/AdminMetricCard";
import { AdminPageShell } from "../components/AdminPageShell";
import { AdminStatusBadge } from "../components/AdminStatusBadge";
import { HubDroneMap } from "../components/HubDroneMap";
import {
  adminAlerts,
  defaultAdminBatteries,
  missionSeries,
  revenueSeries,
} from "../data/adminData";
import {
  getAdminDrones,
  getAdminHubs,
  getAdminUsers,
} from "../services/adminStore";

function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-24 items-end gap-1.5">
      {values.map((value, index) => (
        <div
          key={index}
          className="flex-1 rounded-t bg-orange-500/80"
          style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
          title={String(value)}
        />
      ))}
    </div>
  );
}

function Breakdown({ title, items }: { title: string; items: Array<[string, string | number, string?]> }) {
  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
      <h3 className="text-[13px] font-semibold text-[var(--admin-text)]">{title}</h3>
      <div className="mt-3 space-y-2.5">
        {items.map(([label, value, tone]) => (
          <div key={label} className="flex items-center justify-between gap-4 text-[11px]">
            <span className="text-[var(--admin-muted)]">{label}</span>
            <strong className={tone === "good" ? "text-emerald-500" : tone === "warn" ? "text-amber-500" : tone === "bad" ? "text-red-500" : "text-[var(--admin-text)]"}>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const listener = () => setVersion((v) => v + 1);
    window.addEventListener("admin-data-updated", listener);
    return () => window.removeEventListener("admin-data-updated", listener);
  }, []);

  const hubs = useMemo(() => getAdminHubs(), [version]);
  const drones = useMemo(() => getAdminDrones(), [version]);
  const users = useMemo(() => getAdminUsers(), [version]);
  const batteries = defaultAdminBatteries;

  const activeDrones = drones.filter((drone) => drone.operationalStatus !== "Idle").length;
  const maintenance = drones.filter((drone) => drone.technicalStatus === "Maintenance").length;
  const readyBatteries = batteries.filter((battery) => battery.status === "Ready").length;
  const chargingBatteries = batteries.filter((battery) => battery.status === "Charging").length;

  return (
    <AdminPageShell
      title="System dashboard"
      description="Global operational, commercial, fleet, AI and platform health overview. Admin sees the system across Operator, Technician and Customer scopes without taking over their operational workflows."
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--admin-muted)]">System KPI</h2>
        <span className="text-[10px] text-[var(--admin-muted)]">Updated from current admin snapshot</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Platform uptime" value="99.98%" helper="Last 30 days" icon={Server} accent />
        <AdminMetricCard label="Active sessions" value="128" helper="Across all roles" icon={Activity} />
        <AdminMetricCard label="API health" value="24 / 25" helper="1 degraded service" icon={RefreshCcw} />
        <AdminMetricCard label="Critical alerts" value={adminAlerts.filter((a) => a.severity === "Critical").length} helper="Requires admin attention" icon={AlertTriangle} />
      </div>

      <div className="mb-2 mt-6"><h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--admin-muted)]">Revenue</h2></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <AdminMetricCard label="Total Revenue" value="₫684.2M" helper="All captured revenue" icon={CircleDollarSign} accent />
        <AdminMetricCard label="Revenue Today" value="₫18.6M" helper="+8.4% vs yesterday" icon={CircleDollarSign} />
        <AdminMetricCard label="Revenue This Month" value="₫128.4M" helper="October 2026" icon={ReceiptText} />
        <AdminMetricCard label="Paid Orders" value="1,426" helper="Successfully captured" icon={CreditCard} />
        <AdminMetricCard label="Pending Payments" value="31" helper="Awaiting / reconciling" icon={Clock3} />
        <AdminMetricCard label="Refunds" value="9" helper="This month" icon={RefreshCcw} />
      </div>

      <div className="mb-2 mt-6"><h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--admin-muted)]">Operational statistics</h2></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <AdminMetricCard label="Users" value={users.length} helper={`${users.filter((u) => u.role === "customer").length} customers`} icon={Users} />
        <AdminMetricCard label="Missions today" value="41" helper="3 in progress" icon={Route} />
        <AdminMetricCard label="Drones" value={drones.length} helper={`${activeDrones} non-idle now`} icon={Plane} />
        <AdminMetricCard label="Hubs" value={hubs.length} helper={`${hubs.filter((h) => h.status === "Active").length} active`} icon={Warehouse} />
        <AdminMetricCard label="Ready batteries" value={readyBatteries} helper={`${chargingBatteries} charging`} icon={BatteryCharging} />
        <AdminMetricCard label="AI predictions" value="178" helper="96.4% feasible" icon={Bot} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Breakdown title="User Statistics" items={[["Customers", users.filter((u) => u.role === "customer").length], ["Operators", users.filter((u) => u.role === "operator").length], ["Technicians", users.filter((u) => u.role === "technician").length], ["Suspended", users.filter((u) => u.status === "Suspended").length, "warn"]]} />
        <Breakdown title="Mission Statistics" items={[["Scheduled", 12], ["In progress", 3, "warn"], ["Completed today", 38, "good"], ["Failed today", 1, "bad"]]} />
        <Breakdown title="Fleet Statistics" items={[["Serviceable", drones.length - maintenance, "good"], ["Maintenance", maintenance, "bad"], ["In flight", drones.filter((d) => d.operationalStatus === "In Flight").length], ["Idle", drones.filter((d) => d.operationalStatus === "Idle").length]]} />
        <Breakdown title="Battery Statistics" items={[["Ready", readyBatteries, "good"], ["Charging", chargingBatteries, "warn"], ["In use", batteries.filter((b) => b.status === "In Use").length], ["Maintenance", batteries.filter((b) => b.status === "Maintenance").length, "bad"]]} />
        <Breakdown title="AI Statistics" items={[["Predictions today", 178], ["Feasible", "96.4%", "good"], ["Avg confidence", "93.7%"], ["High-risk routes", 4, "warn"]]} />
      </div>

      <div className="mt-5"><HubDroneMap hubs={hubs} drones={drones} /></div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr_0.95fr]">
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
          <div className="mb-4 flex items-center justify-between"><div><h3 className="text-[14px] font-semibold">Revenue trend</h3><p className="text-[11px] text-[var(--admin-muted)]">Last 12 periods · VND millions</p></div><AdminStatusBadge tone="success">+12.8%</AdminStatusBadge></div>
          <MiniBars values={revenueSeries} />
        </div>
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
          <div className="mb-4 flex items-center justify-between"><div><h3 className="text-[14px] font-semibold">Mission statistics</h3><p className="text-[11px] text-[var(--admin-muted)]">Completed mission volume</p></div><AdminStatusBadge tone="info">97.2% success</AdminStatusBadge></div>
          <MiniBars values={missionSeries} />
        </div>
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
          <div className="border-b border-[var(--admin-border)] px-4 py-3"><h3 className="text-[14px] font-semibold">System Alerts</h3></div>
          <div className="divide-y divide-[var(--admin-border)]">
            {adminAlerts.map((alert) => <div key={alert.id} className="p-4"><div className="flex items-start justify-between gap-3"><strong className="text-[12px]">{alert.title}</strong><AdminStatusBadge tone={alert.severity === "Critical" ? "danger" : alert.severity === "Warning" ? "warning" : "info"}>{alert.severity}</AdminStatusBadge></div><p className="mt-1 text-[11px] leading-5 text-[var(--admin-muted)]">{alert.detail}</p></div>)}
          </div>
        </div>
      </div>
    </AdminPageShell>
  );
}
