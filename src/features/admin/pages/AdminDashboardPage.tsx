import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UsersRound, Plane, BatteryCharging, Wallet, CircleCheck, Wrench, Activity, Bell } from 'lucide-react';
import { AdminSummaryCard } from '../components/AdminSummaryCard';
import { AdminPageShell } from '../components/AdminPageShell';
import { HubDroneMap } from '../components/HubDroneMap';
import { OperatorPanel } from '../../operator/components/OperatorPanel';
import { adminOperationsApi, apiError, type AdminDashboardApi, type HubApi, type DroneApi } from '../api/adminOperationsApi';
import type { AdminHub, AdminDrone } from '../types';

const money = (value: number) => `${Number(value).toLocaleString('vi-VN')} ₫`;
function StatusRows({ items }: { items: Record<string, number> }) {
  return <div className="divide-y divide-[var(--admin-border)]">{Object.entries(items).map(([key, count]) => <div key={key} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="capitalize text-[var(--admin-muted)]">{key.replace(/_/g, ' ')}</span><strong>{count}</strong></div>)}</div>;
}

/** All dashboard metrics come from GET /admin/dashboard; no localStorage KPI fallback. */
export function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardApi | null>(null);
  const [hubs, setHubs] = useState<AdminHub[]>([]);
  const [drones, setDrones] = useState<AdminDrone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function refresh() {
    setLoading(true);
    try {
      const [dashboard, hubRows, droneRows] = await Promise.all([adminOperationsApi.dashboard(), adminOperationsApi.hubs(), adminOperationsApi.drones()]);
      setData(dashboard);
      setHubs(hubRows.filter((h): h is HubApi & { latitude: number; longitude: number } => Number.isFinite(h.latitude) && Number.isFinite(h.longitude)).map((h) => ({
        id: String(h.id), name: h.name, code: h.code ?? String(h.id), area: h.area ?? '', address: h.address ?? '',
        latitude: h.latitude, longitude: h.longitude, status: (h.status?.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE') as AdminHub['status'],
        capacity: h.capacity, technicianIds: [], createdAt: h.created_at ?? '', updatedAt: h.updated_at ?? '',
      })));
      setDrones(droneRows.map((d: DroneApi) => ({
        id: d.id, name: d.name, displayId: d.id, model: d.model, serialNumber: d.serial_number,
        hubId: d.hub_id == null ? '' : String(d.hub_id),
        status: (d.status.toUpperCase() === 'AVAILABLE' ? 'AVAILABLE' : d.status.toUpperCase() === 'IN FLIGHT' ? 'IN_FLIGHT' : 'MAINTENANCE') as AdminDrone['status'],
        isActive: d.admin_state.toUpperCase() === 'ACTIVE', batteryPct: d.battery_level_pct ?? 0,
        maxPayloadKg: d.payload_capacity_kg, createdAt: '', updatedAt: '',
      })));
      setError('');
    } catch (cause) { setError(apiError(cause)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  return <AdminPageShell title="Dashboard" description="">
    {error && <p role="alert" className="mb-4 text-sm text-red-500">{error} <button className="text-button" type="button" onClick={() => void refresh()}>Retry</button></p>}
    {loading && <p className="mb-4 text-sm text-muted-foreground">Loading Admin Dashboard…</p>}
    {data && <>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminSummaryCard label="Revenue today" value={money(data.revenue.today)} note="Backend recorded revenue" icon={Wallet} />
        <AdminSummaryCard label="Revenue this month" value={money(data.revenue.this_month)} note="Backend recorded revenue" icon={Activity} />
        <AdminSummaryCard label="Paid orders" value={data.revenue.paid_orders} note="Payment confirmations" icon={CircleCheck} />
        <AdminSummaryCard label="Pending payments" value={money(data.revenue.pending_payments)} note="Unpaid amount" icon={Wallet} />
      </div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminSummaryCard label="Total users" value={data.users.total} note={`${data.users.active} active · ${data.users.inactive} inactive`} icon={UsersRound} />
        <AdminSummaryCard label="Total drones" value={data.fleet.total_drones} note="Registered fleet" icon={Plane} />
        <AdminSummaryCard label="Total batteries" value={data.batteries.total} note="Registered batteries" icon={BatteryCharging} />
        <AdminSummaryCard label="Open incidents" value={data.alerts.open_incidents} note="Operational incidents" icon={Bell} />
      </div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <OperatorPanel><div className="p-4"><h2 className="mb-3 font-semibold">Mission status</h2><StatusRows items={data.missions.by_status} /><p className="mt-3 text-xs text-[var(--admin-muted)]">Total missions: {data.missions.total} · Success rate: {data.missions.success_rate}%</p></div></OperatorPanel>
        <OperatorPanel><div className="p-4"><h2 className="mb-3 font-semibold">Fleet status</h2><StatusRows items={data.fleet.by_status} /><p className="mt-3 text-xs text-[var(--admin-muted)]">Average utilization: {data.fleet.avg_utilization_pct}%</p></div></OperatorPanel>
        <OperatorPanel><div className="p-4"><h2 className="mb-3 font-semibold">Battery status</h2><StatusRows items={data.batteries.by_status} /><p className="mt-3 text-xs text-[var(--admin-muted)]">Average charge: {data.batteries.avg_charge_pct}%</p></div></OperatorPanel>
      </div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AdminSummaryCard label="Maintenance alerts" value={data.alerts.pending_maintenance_alerts} note="Backend alert count" icon={Wrench} />
        <AdminSummaryCard label="AI predicted missions" value={data.ai.missions_with_prediction} note="Energy model coverage" icon={Activity} />
        <AdminSummaryCard label="Audit events" value={data.alerts.total_audit_logs} note="Recorded system events" icon={Bell} />
      </div>
      <div className="mb-3 flex justify-between"><h2 className="font-semibold">Hub network</h2><Link className="text-button" to="/admin/network/hubs">View Hubs</Link></div>
      <HubDroneMap hubs={hubs} drones={drones} />
    </>}
    {/* <p className="mt-4 text-xs text-muted-foreground">Revenue metrics are provided by the Backend Dashboard endpoint. Inventory acquisition costs are not subtracted here until the Financial Overview API is finalized.</p> */}
  </AdminPageShell>;
}
