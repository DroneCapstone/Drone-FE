import { useEffect, useMemo, useState } from 'react';
import { CircleCheck, Plane, RadioTower, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { AdminSummaryCard } from '../../components/AdminSummaryCard';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { AdminPageShell } from '../../components/AdminPageShell';
import { AdminToolbar } from '../../components/AdminToolbar';
import { adminOperationsApi, apiError, type DroneApi, type DroneSummaryApi, type HubApi } from '../../api/adminOperationsApi';

const statusTone = (status: string): 'success' | 'info' | 'warning' | 'neutral' => {
  const key = status.toUpperCase();
  return key === 'AVAILABLE' ? 'success' : key === 'IN FLIGHT' || key === 'IN_FLIGHT' ? 'info' : key === 'MAINTENANCE' ? 'warning' : 'neutral';
};

export function DronesPage() {
  const [drones, setDrones] = useState<DroneApi[]>([]);
  const [hubs, setHubs] = useState<HubApi[]>([]);
  const [summary, setSummary] = useState<DroneSummaryApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [active, setActive] = useState('all');
  const [hub, setHub] = useState('all');

  async function refresh() {
    setLoading(true);
    try {
      const [items, hs, kpis] = await Promise.all([adminOperationsApi.drones(), adminOperationsApi.hubs(), adminOperationsApi.droneSummary()]);
      setDrones(items); setHubs(hs); setSummary(kpis); setError('');
    } catch (cause) { setError(apiError(cause)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  const visible = useMemo(() => drones.filter((d) => {
    const matches = `${d.id} ${d.name} ${d.model} ${d.serial_number}`.toLowerCase().includes(query.toLowerCase());
    return matches && (status === 'all' || d.status.toUpperCase().replace(/ /g, '_') === status)
      && (active === 'all' || d.admin_state.toUpperCase() === active)
      && (hub === 'all' || String(d.hub_id ?? '') === hub);
  }), [drones, query, status, active, hub]);
  const hubName = (drone: DroneApi) => drone.hub_name ?? hubs.find((item) => item.id === drone.hub_id)?.name ?? 'Not assigned';

  return <AdminPageShell title="Drones" description="Registered physical drones and their administrative availability.">
    {error && <p role="alert" className="mb-3 text-sm text-red-500">{error} <button className="text-button" type="button" onClick={() => void refresh()}>Retry</button></p>}
    {loading && <p className="mb-3 text-sm text-muted-foreground">Loading Drones from Backend…</p>}
    <p className="mb-4 text-xs text-muted-foreground">Drone registration is not enabled: the current BE create request does not accept a physical serial number. Existing drones can be viewed and managed via their detail page.</p>
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AdminSummaryCard label="Total drones" value={summary?.total_drones ?? drones.length} note="Registered drones" icon={Plane} />
      <AdminSummaryCard label="Available" value={summary?.available_drones ?? drones.filter((d) => d.status.toLowerCase() === 'available').length} note="Before mission eligibility" icon={CircleCheck} />
      <AdminSummaryCard label="Maintenance" value={summary?.maintenance_drones ?? drones.filter((d) => d.status.toLowerCase() === 'maintenance').length} note="Unavailable for missions" icon={Wrench} />
      <AdminSummaryCard label="In flight" value={summary?.in_flight_drones ?? drones.filter((d) => d.status.toLowerCase() === 'in flight').length} note="Cannot be deactivated" icon={RadioTower} />
    </div>
    <OperatorPanel className="flush-panel">
      <AdminToolbar searchValue={query} onSearchChange={setQuery} placeholder="Search drone, model or serial…" filters={<>
        <select value={hub} onChange={(event) => setHub(event.target.value)}><option value="all">All hubs</option>{hubs.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All status</option><option value="AVAILABLE">Available</option><option value="MAINTENANCE">Maintenance</option><option value="IN_FLIGHT">In flight</option><option value="RETIRED">Retired</option></select>
        <select value={active} onChange={(event) => setActive(event.target.value)}><option value="all">All admin states</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>
      </>} meta={`${visible.length} of ${drones.length} drones`} />
      <div className="table-wrap"><table><thead><tr><th>Drone</th><th>Model</th><th>Hub</th><th>Battery</th><th>Status</th><th>Admin state</th><th>Payload</th><th>Action</th></tr></thead><tbody>
        {visible.map((d) => <tr key={d.id}>
          <td><strong>{d.id}</strong><small>{d.name}</small></td>
          <td><strong>{d.model}</strong><small>{d.serial_number || '—'}</small></td>
          <td>{hubName(d)}</td>
          <td>{d.battery_level_pct == null ? '—' : <div className="battery-cell"><span><i style={{ width: `${Math.max(0, Math.min(100, d.battery_level_pct))}%` }} /></span>{d.battery_level_pct}%</div>}</td>
          <td><StatusBadge tone={statusTone(d.status)}>{d.status}</StatusBadge></td>
          <td><StatusBadge tone={d.admin_state.toUpperCase() === 'ACTIVE' ? 'success' : 'neutral'}>{d.admin_state}</StatusBadge></td>
          <td>{d.payload_capacity_kg} kg</td>
          <td><Link className="text-button" to={`/admin/network/drones/${encodeURIComponent(d.id)}`}>View</Link></td>
        </tr>)}
        {!loading && visible.length === 0 && <tr><td colSpan={8}>No drones found.</td></tr>}
      </tbody></table></div>
    </OperatorPanel>
  </AdminPageShell>;
}
