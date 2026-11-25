import { OperatorLoadingState } from '../../operator/components/OperatorLoadingState';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  UsersRound,
  Plane,
  Wallet,
  CircleCheck,
  Activity,
  Bell,
  TrendingUp,
  ShieldAlert,
  BatteryCharging,
  Wrench,
} from 'lucide-react';
import { AdminSummaryCard } from '../components/AdminSummaryCard';
import { AdminPageShell } from '../components/AdminPageShell';
import { HubDroneMap } from '../components/HubDroneMap';
import { adminOperationsApi, apiError, type AdminDashboardApi, type HubApi, type DroneApi } from '../api/adminOperationsApi';
import type { AdminHub, AdminDrone } from '../types';

const money = (value: number) => `${Number(value).toLocaleString('vi-VN')} ₫`;
const chartPalette = ['#F97316', '#2563EB', '#10B981', '#A78BFA', '#F59E0B', '#64748B'];
const readable = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

function ChartPanel({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.04)] ${className}`}>
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-[#172033]">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-[#8791A2]">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function DonutChart({ items, centerValue, centerLabel }: { items: Record<string, number>; centerValue: string | number; centerLabel: string }) {
  const rows = Object.entries(items).filter(([, value]) => Number.isFinite(value) && value > 0);
  const total = rows.reduce((sum, [, value]) => sum + value, 0);
  let cursor = 0;
  const gradient = total > 0
    ? rows.map(([, value], index) => {
      const start = cursor;
      cursor += (value / total) * 100;
      return `${chartPalette[index % chartPalette.length]} ${start}% ${cursor}%`;
    }).join(', ')
    : '#E9EDF2 0% 100%';

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="relative h-36 w-36 shrink-0 rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
        <div className="absolute inset-[17px] flex flex-col items-center justify-center rounded-full bg-white">
          <strong className="text-2xl font-bold text-[#172033]">{centerValue}</strong>
          <span className="text-[10px] text-[#8791A2]">{centerLabel}</span>
        </div>
      </div>
      <div className="min-w-[130px] flex-1 space-y-3">
        {rows.length ? rows.map(([label, value], index) => (
          <div key={label} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-[#667085]"><i className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: chartPalette[index % chartPalette.length] }} />{readable(label)}</span>
            <strong className="text-[#263247]">{value.toLocaleString('vi-VN')}</strong>
          </div>
        )) : <p className="text-xs text-[#98A2B3]">No breakdown data available</p>}
      </div>
    </div>
  );
}

function HorizontalBars({ items, suffix = '' }: { items: Record<string, number>; suffix?: string }) {
  const rows = Object.entries(items).filter(([, value]) => Number.isFinite(value));
  const max = Math.max(1, ...rows.map(([, value]) => value));
  return (
    <div className="space-y-4">
      {rows.length ? rows.map(([label, value], index) => (
        <div key={label}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
            <span className="capitalize text-[#667085]">{readable(label)}</span>
            <strong className="text-[#263247]">{value.toLocaleString('vi-VN')}{suffix}</strong>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#F0F2F5]">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(value > 0 ? 2 : 0, (value / max) * 100)}%`, background: chartPalette[index % chartPalette.length] }} />
          </div>
        </div>
      )) : <p className="text-xs text-[#98A2B3]">No breakdown data available</p>}
    </div>
  );
}

function RevenueBars({ today, month }: { today: number; month: number }) {
  const max = Math.max(today, month, 1);
  return (
    <div className="space-y-5">
      {[{ label: 'Today', value: today }, { label: 'This month', value: month }].map((item, index) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="text-[#667085]">{item.label}</span><strong className="text-[#263247]">{money(item.value)}</strong></div>
          <div className="h-3 overflow-hidden rounded-full bg-[#F0F2F5]"><div className="h-full rounded-full" style={{ width: `${(item.value / max) * 100}%`, background: index === 0 ? '#FDBA74' : '#F97316' }} /></div>
        </div>
      ))}
      {/* <p className="border-t border-[#EEF0F3] pt-3 text-[11px] text-[#98A2B3]">Recorded revenue · Values shown by their respective periods</p> */}
    </div>
  );
}

/** Dashboard uses only metrics returned by GET /admin/dashboard. */
export function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardApi | null>(null);
  const [hubs, setHubs] = useState<AdminHub[]>([]);
  const [drones, setDrones] = useState<AdminDrone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true);
    try {
      const [dashboard, hubRows, droneRows] = await Promise.all([
        adminOperationsApi.dashboard(), adminOperationsApi.hubs(), adminOperationsApi.drones(),
      ]);
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

  return (
    <AdminPageShell title="Dashboard" description="">
      {error && <p role="alert" className="mb-4 text-sm text-red-500">{error} <button className="text-button" type="button" onClick={() => void refresh()}>Retry</button></p>}
      {loading && <OperatorLoadingState label="Loading dashboard…" />}
      {!loading && !error && data && <>
        {/* Four primary KPIs only; secondary figures are presented in charts below. */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminSummaryCard label="Revenue this month" value={money(data.revenue.this_month)} note="Recorded revenue" icon={Wallet} />
          <AdminSummaryCard label="Paid orders" value={data.revenue.paid_orders} note="Payment confirmations" icon={CircleCheck} />
          <AdminSummaryCard label="Total users" value={data.users.total} note={`${data.users.active} active · ${data.users.inactive} inactive`} icon={UsersRound} />
          <AdminSummaryCard label="Total drones" value={data.fleet.total_drones} note="Registered fleet" icon={Plane} />
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartPanel title="Revenue overview" subtitle="Recorded revenue for today and the current month">
            <RevenueBars today={data.revenue.today} month={data.revenue.this_month} />
          </ChartPanel>
          <ChartPanel title="Mission status" subtitle={`Total missions: ${data.missions.total} · Success rate: ${data.missions.success_rate}%`}>
            <HorizontalBars items={data.missions.by_status} />
          </ChartPanel>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <ChartPanel title="Fleet distribution" subtitle={`Average utilization: ${data.fleet.avg_utilization_pct}%`}>
            <DonutChart items={data.fleet.by_status} centerValue={data.fleet.total_drones} centerLabel="Drones" />
          </ChartPanel>
          <ChartPanel title="Battery distribution" subtitle={`Average charge: ${data.batteries.avg_charge_pct}%`}>
            <DonutChart items={data.batteries.by_status} centerValue={data.batteries.total} centerLabel="Batteries" />
          </ChartPanel>
          <ChartPanel title="Users by role" subtitle={`${data.users.active} active · ${data.users.inactive} inactive`}>
            <DonutChart items={data.users.by_role} centerValue={data.users.total} centerLabel="Users" />
          </ChartPanel>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* <ChartPanel title="AI energy risk breakdown" subtitle={`${data.ai.missions_with_prediction} missions with energy prediction`}>
            <HorizontalBars items={data.ai.risk_breakdown} />
            <p className="mt-4 border-t border-[#EEF0F3] pt-3 text-xs text-[#8791A2]">Average estimated energy: {Number(data.ai.avg_estimated_energy_wh ?? 0).toLocaleString('vi-VN')} Wh</p>
          </ChartPanel> */}
          <ChartPanel title="Operational alerts" subtitle="Items requiring administrative attention">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-[#FFF7ED] p-3"><Wrench size={17} className="mb-2 text-[#EA580C]" /><strong className="block text-2xl text-[#172033]">{data.alerts.pending_maintenance_alerts}</strong><span className="text-xs text-[#8A5A36]">Maintenance alerts</span></div>
              <div className="rounded-lg bg-[#FEF2F2] p-3"><ShieldAlert size={17} className="mb-2 text-[#DC2626]" /><strong className="block text-2xl text-[#172033]">{data.alerts.open_incidents}</strong><span className="text-xs text-[#8A4A4A]">Open incidents</span></div>
              <div className="rounded-lg bg-[#EFF6FF] p-3"><Bell size={17} className="mb-2 text-[#2563EB]" /><strong className="block text-2xl text-[#172033]">{data.alerts.total_audit_logs}</strong><span className="text-xs text-[#526B91]">Audit events</span></div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#EEF0F3] pt-3 text-xs text-[#8791A2]"><span className="inline-flex items-center gap-1.5"><TrendingUp size={14} /> Operational summary</span><span className="inline-flex items-center gap-1.5"><BatteryCharging size={14} /> {data.batteries.total} registered batteries</span><span className="inline-flex items-center gap-1.5"><Activity size={14} /> {data.revenue.pending_payments ? money(data.revenue.pending_payments) : '0 ₫'} pending payments</span></div>
          </ChartPanel>
        </div>

        <div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold text-[#172033]">Hub network</h2><p className="mt-1 text-xs text-[#8791A2]"></p></div><Link className="text-button" to="/admin/network/hubs">View Hubs</Link></div>
        <HubDroneMap hubs={hubs} drones={drones} />
        <RevenueChartPanel />
      </>}
    </AdminPageShell>
  );
}

// ── Revenue Trend Chart (last 30 days) ────────────────────────────────────────

function RevenueChartPanel() {
  const [chartData, setChartData] = useState<Array<{ date: string; revenue: number; mission_count: number }>>([]);
  const [chartError, setChartError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminOperationsApi.revenueChart(30)
      .then((res) => { setChartData(res.data ?? []); })
      .catch(() => setChartError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading || chartError || chartData.length === 0) {
    return (
      <ChartPanel title="Revenue trend — last 30 days" subtitle="Daily completed mission revenue" className="mt-4">
        {loading ? <OperatorLoadingState label="Loading revenue trend…" compact /> : <p className="text-xs text-[#8791A2]">{chartError ? "Unable to load revenue trend." : "No data available yet."}</p>}
      </ChartPanel>
    );
  }

  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1);

  return (
    <ChartPanel title="Revenue trend — last 30 days" subtitle="Daily completed mission revenue" className="mt-4">
      <div className="flex h-40 items-end gap-[3px] overflow-hidden">
        {chartData.map((d) => {
          const pct = (d.revenue / maxRevenue) * 100;
          return (
            <div key={d.date} className="group relative flex flex-1 flex-col items-center justify-end" title={`${d.date}: ${Number(d.revenue).toLocaleString('vi-VN')} ₫ (${d.mission_count} missions)`}>
              <div
                className="w-full rounded-t-sm bg-orange-400 transition-all group-hover:bg-orange-500"
                style={{ height: `${Math.max(pct, 2)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-[#8791A2]">
        <span>{chartData[0]?.date}</span>
        <span>Total: {Number(chartData.reduce((s, d) => s + d.revenue, 0)).toLocaleString('vi-VN')} ₫</span>
        <span>{chartData[chartData.length - 1]?.date}</span>
      </div>
    </ChartPanel>
  );
}
