import { AdminSelect } from '../../components/AdminSelect';
import { OperatorLoadingState } from '../../../operator/components/OperatorLoadingState';
import { useEffect, useMemo, useState } from 'react';
import { Archive, BatteryCharging, CircleCheck, ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { AdminSummaryCard } from '../../components/AdminSummaryCard';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { AdminPageShell } from '../../components/AdminPageShell';
import { AdminToolbar } from '../../components/AdminToolbar';
import { adminOperationsApi, apiError, type BatteryApi, type HubApi } from '../../api/adminOperationsApi';

/** BE-provided battery status is displayed as-is; no invented verification or retirement state. */
export function BatteriesPage() {
  const [batteries, setBatteries] = useState<BatteryApi[]>([]);
  const [hubs, setHubs] = useState<HubApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [operational, setOperational] = useState('all');
  const [lifecycle, setLifecycle] = useState('all');
  async function refresh() {
    setLoading(true);
    try {
      const [bs, hs] = await Promise.all([adminOperationsApi.batteries(), adminOperationsApi.hubs()]);
      setBatteries(bs.filter((b) => b.current_hub_id != null)); setHubs(hs); setError('');
    } catch (cause) { setError(apiError(cause)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  const hubName = (id: number | null | undefined) => hubs.find((h) => h.id === id)?.name ?? '—';
  const operationalOf = (battery: BatteryApi) => battery.available_status ?? (battery.drone_id != null ? 'Installed' : battery.status);
  const lifecycleOf = (battery: BatteryApi) => battery.lifecycle_status ?? battery.status;
  const visible = useMemo(() => batteries.filter((b) =>
    `${b.id} ${b.battery_model ?? ''} ${hubName(b.current_hub_id)}`.toLowerCase().includes(query.toLowerCase())
    && (operational === 'all' || operationalOf(b) === operational)
    && (lifecycle === 'all' || lifecycleOf(b) === lifecycle)
  ), [batteries, hubs, query, operational, lifecycle]);
  const operationalValues = [...new Set(batteries.map(operationalOf))].sort();
  const lifecycleValues = [...new Set(batteries.map(lifecycleOf))].sort();

  return <AdminPageShell title="Batteries" description="Monitor batteries assigned to Hubs and their operational status." actions={<Link className="button button-secondary" to="/admin/replacement/new-batteries">New batteries</Link>}>
    {error && <p role="alert" className="mb-3 text-sm text-red-500">{error} <button className="text-button" type="button" onClick={() => void refresh()}>Retry</button></p>}
    {loading && <OperatorLoadingState label="Loading batteries…" />}
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AdminSummaryCard label="Assigned batteries" value={batteries.length} note="Assigned to Hubs" icon={BatteryCharging} />
      <AdminSummaryCard label="Ready" value={batteries.filter((b) => operationalOf(b).toUpperCase() === 'READY').length} note="Ready for use" icon={CircleCheck} />
      <AdminSummaryCard label="Maintenance / charging" value={batteries.filter((b) => ['MAINTENANCE', 'CHARGING'].includes(operationalOf(b).toUpperCase())).length} note="Operational status" icon={ClipboardCheck} />
      <AdminSummaryCard label="Replaced" value={batteries.filter((b) => lifecycleOf(b).toUpperCase() === 'REPLACED').length} note="Retained in system history" icon={Archive} />
    </div>
    <OperatorPanel className="flush-panel">
      <AdminToolbar searchValue={query} onSearchChange={setQuery} placeholder="Search battery ID, model or Hub…" filters={<>
        <AdminSelect value={operational} onChange={(event) => setOperational(event.target.value)}><option value="all">All operational</option>{operationalValues.map((v) => <option key={v}>{v}</option>)}</AdminSelect>
        <AdminSelect value={lifecycle} onChange={(event) => setLifecycle(event.target.value)}><option value="all">All lifecycle</option>{lifecycleValues.map((v) => <option key={v}>{v}</option>)}</AdminSelect>
      </>} meta={`${visible.length} of ${batteries.length} batteries`} />
      <div className="table-wrap"><table><thead><tr><th>Battery</th><th>Hub</th><th>Operational status</th><th>Lifecycle</th><th>Action</th></tr></thead><tbody>
        {visible.map((b) => <tr key={b.id}><td><strong>{b.id}</strong><small>{b.battery_model ?? 'Model unavailable'}</small></td><td>{hubName(b.current_hub_id)}</td>
          <td><StatusBadge tone={['READY', 'AVAILABLE'].includes(operationalOf(b).toUpperCase()) ? 'success' : 'warning'}>{operationalOf(b)}</StatusBadge></td>
          <td><StatusBadge tone={lifecycleOf(b).toUpperCase() === 'ACTIVE' ? 'success' : 'neutral'}>{lifecycleOf(b)}</StatusBadge></td>
          <td><Link className="text-button" to={`/admin/network/batteries/${encodeURIComponent(b.id)}`}>View details</Link></td></tr>)}
        {!loading && !error && visible.length === 0 && <tr><td colSpan={5}>No batteries found.</td></tr>}
      </tbody></table></div>
    </OperatorPanel>
  </AdminPageShell>;
}
