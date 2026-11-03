import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { MetricCard } from '../../../operator/components/MetricCard';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { AdminPageShell } from '../../components/AdminPageShell';
import { AdminToolbar } from '../../components/AdminToolbar';
import { getAdminBatteries, getAdminHubs } from '../../services/adminStore';
import { isBatteryReady } from '../../services/batteryLifecycle';
import { batteryOperationalTone } from '../../utils/adminDisplay';

/** Administrative asset list; no battery-health scoring or BMS diagnostics. */
export function BatteriesPage() {
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState('');
  const [operational, setOperational] = useState('all');
  const [lifecycle, setLifecycle] = useState('all');
  useEffect(() => {
    const listener = () => setVersion((current) => current + 1);
    window.addEventListener('admin-data-updated', listener);
    return () => window.removeEventListener('admin-data-updated', listener);
  }, []);
  // Only Hub-assigned batteries appear in operational Battery Management.
  // Admin-held new batteries have no Hub yet; they are managed in Replacement Supplies.
  const batteries = useMemo(() => getAdminBatteries().filter((battery) => Boolean(battery.hubId)), [version]);
  const hubs = getAdminHubs();
  const hubName = (id: string) => hubs.find((hub) => hub.id === id)?.name ?? '—';
  const visible = batteries.filter((battery) => {
    const matchesQuery = `${battery.id} ${battery.model} ${battery.serialNumber} ${hubName(battery.hubId)}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (operational === 'all' || operational === battery.operationalStatus)
      && (lifecycle === 'all' || lifecycle === battery.administrativeStatus);
  });

  return <AdminPageShell title="Batteries"
    description="Manage Battery IDs already assigned to Hubs, operational status and lifecycle."
    actions={<Link className="button button-secondary" to="/admin/replacement/new-batteries">New batteries</Link>}>
    <div className="metric-grid">
      <MetricCard label="Total batteries" value={String(batteries.length)} delta="Registered" tone="info" note="Across the system" />
      <MetricCard label="Ready" value={String(batteries.filter(isBatteryReady).length)} delta="Available" tone="success" note="Ready for assignment" />
      <MetricCard label="Pending verification" value={String(batteries.filter((battery) => battery.administrativeStatus === 'ACTIVE' && battery.inspectionPending).length)} delta="New" tone="warning" note="Awaiting Technician confirmation" />
      <MetricCard label="Retired" value={String(batteries.filter((battery) => battery.administrativeStatus === 'RETIRED').length)} delta="Lifecycle" tone="neutral" note="Kept in asset history" />
    </div>
    <OperatorPanel className="flush-panel">
      <AdminToolbar searchValue={query} onSearchChange={setQuery} placeholder="Search Battery ID, model, serial or Hub…" meta={`${visible.length} of ${batteries.length} batteries`} filters={<>
        <select value={operational} onChange={(event) => setOperational(event.target.value)}><option value="all">All operational</option><option value="READY">Ready</option><option value="CHARGING">Charging</option><option value="INSTALLED">Installed</option><option value="MAINTENANCE">Maintenance</option></select>
        <select value={lifecycle} onChange={(event) => setLifecycle(event.target.value)}><option value="all">All lifecycle</option><option value="ACTIVE">Active</option><option value="RETIRED">Retired</option></select>
      </>} />
      <div className="table-wrap"><table>
        <thead><tr><th>Battery</th><th>Serial number</th><th>Hub</th><th>Operational status</th><th>Lifecycle</th><th>Action</th></tr></thead>
        <tbody>{visible.map((battery) => <tr key={battery.id}>
          <td><strong>{battery.id}</strong><small>{battery.model}</small></td>
          <td>{battery.serialNumber}</td>
          <td><strong>{hubName(battery.hubId)}</strong></td>
          <td><StatusBadge tone={batteryOperationalTone(battery.operationalStatus)}>{battery.inspectionPending ? 'PENDING VERIFICATION' : battery.operationalStatus}</StatusBadge></td>
          <td><StatusBadge tone={battery.administrativeStatus === 'RETIRED' ? 'neutral' : 'success'}>{battery.administrativeStatus}</StatusBadge></td>
          <td><Link className="text-button" to={`/admin/network/batteries/${battery.id}`}>View details</Link></td>
        </tr>)}</tbody>
      </table></div>
    </OperatorPanel>

  </AdminPageShell>;
}
