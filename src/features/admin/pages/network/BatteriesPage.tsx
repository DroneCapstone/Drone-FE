import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Dialog, DialogContent, DialogTitle } from '../../../../components/ui/Dialog';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { MetricCard } from '../../../operator/components/MetricCard';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { AdminPageShell } from '../../components/AdminPageShell';
import { AdminToolbar } from '../../components/AdminToolbar';
import { getAdminBatteries, getAdminHubs } from '../../services/adminStore';
import { isBatteryReady } from '../../services/batteryLifecycle';
import { nextAdminBatteryId, registerStandaloneBattery } from '../../services/adminReplacementSupply';
import { batteryOperationalTone } from '../../utils/adminDisplay';

/** Administrative asset list; no battery-health scoring or BMS diagnostics. */
export function BatteriesPage() {
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState('');
  const [operational, setOperational] = useState('all');
  const [lifecycle, setLifecycle] = useState('all');
  const [creating, setCreating] = useState(false);
  const [model, setModel] = useState('');
  const [hubId, setHubId] = useState('');
  const [serial, setSerial] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const listener = () => setVersion((current) => current + 1);
    window.addEventListener('admin-data-updated', listener);
    return () => window.removeEventListener('admin-data-updated', listener);
  }, []);
  const batteries = useMemo(() => getAdminBatteries(), [version]);
  const hubs = getAdminHubs();
  const models = [...new Set(batteries.map((battery) => battery.model))].sort();
  const hubName = (id: string) => hubs.find((hub) => hub.id === id)?.name ?? '—';
  const visible = batteries.filter((battery) => {
    const matchesQuery = `${battery.id} ${battery.model} ${battery.serialNumber} ${hubName(battery.hubId)}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (operational === 'all' || operational === battery.operationalStatus)
      && (lifecycle === 'all' || lifecycle === battery.administrativeStatus);
  });
  const beginRegistration = () => {
    setModel(models[0] ?? ''); setHubId(hubs.find((hub) => hub.status === 'ACTIVE')?.id ?? '');
    setSerial(''); setError(''); setCreating(true);
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    try {
      const battery = registerStandaloneBattery(model, hubId, serial);
      setNotice(`${battery.id} registered for ${hubName(hubId)}. Technician verification is pending.`);
      setCreating(false); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to register battery.'); }
  };

  return <AdminPageShell title="Batteries"
    description="Manage individual Battery IDs, assigned Hubs, operational status and lifecycle."
    actions={<ActionButton icon="plus" onClick={beginRegistration}>Register battery</ActionButton>}>
    <div className="metric-grid">
      <MetricCard label="Total batteries" value={String(batteries.length)} delta="Registered" tone="info" note="Across the system" />
      <MetricCard label="Ready" value={String(batteries.filter(isBatteryReady).length)} delta="Available" tone="success" note="Ready for assignment" />
      <MetricCard label="Pending verification" value={String(batteries.filter((battery) => battery.administrativeStatus === 'ACTIVE' && battery.inspectionPending).length)} delta="New" tone="warning" note="Awaiting Technician confirmation" />
      <MetricCard label="Retired" value={String(batteries.filter((battery) => battery.administrativeStatus === 'RETIRED').length)} delta="Lifecycle" tone="neutral" note="Kept in asset history" />
    </div>
    {notice && <p role="status" className="mb-4 text-sm text-green-600">{notice}</p>}
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
    <Dialog open={creating} onOpenChange={(open) => !open && setCreating(false)}><DialogContent><form onSubmit={save}>
      <div className="border-b border-border p-5"><DialogTitle className="text-lg font-semibold">Register new battery</DialogTitle><p className="mt-1 text-sm text-muted-foreground">A new Battery ID belongs to one Hub, not a permanent Drone ID.</p></div>
      <div className="fields two p-5">
        <label><span>New Battery ID</span><input readOnly value={nextAdminBatteryId(batteries)} /></label>
        <label><span>Battery model</span><select required value={model} onChange={(event) => setModel(event.target.value)}>{models.map((name) => <option value={name} key={name}>{name}</option>)}</select></label>
        <label><span>Serial number</span><input required value={serial} placeholder="Serial printed on new battery" onChange={(event) => setSerial(event.target.value)} /></label>
        <label><span>Assigned Hub</span><select required value={hubId} onChange={(event) => setHubId(event.target.value)}>{hubs.filter((hub) => hub.status === 'ACTIVE').map((hub) => <option value={hub.id} key={hub.id}>{hub.name}</option>)}</select></label>
      </div>
      <p className="px-5 pb-3 text-xs text-muted-foreground">New batteries are registered as Active / Pending Verification, not Ready. Technician verification is required before use.</p>
      {error && <p role="alert" className="px-5 pb-2 text-sm text-red-500">{error}</p>}
      <div className="form-actions border-t border-border p-5"><ActionButton variant="secondary" onClick={() => setCreating(false)}>Cancel</ActionButton><ActionButton type="submit">Register battery</ActionButton></div>
    </form></DialogContent></Dialog>
  </AdminPageShell>;
}
