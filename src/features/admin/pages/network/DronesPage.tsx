import { OperatorLoadingState } from '../../../operator/components/OperatorLoadingState';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CircleCheck, Plane, RadioTower, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Dialog, DialogTitle } from '../../../../components/ui/Dialog';
import { AdminDialogContent as DialogContent } from '../../components/AdminDialogContent';
import { AdminSummaryCard } from '../../components/AdminSummaryCard';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { AdminPageShell } from '../../components/AdminPageShell';
import { AdminToolbar } from '../../components/AdminToolbar';
import { adminOperationsApi, apiError, type DroneApi, type DroneSummaryApi, type HubApi, type DroneCreateApi } from '../../api/adminOperationsApi';

const statusTone = (status: string): 'success' | 'info' | 'warning' | 'neutral' => {
  const key = status.toUpperCase();
  return key === 'AVAILABLE' ? 'success' : key === 'IN FLIGHT' || key === 'IN_FLIGHT' ? 'info' : key === 'MAINTENANCE' ? 'warning' : 'neutral';
};

type AddDroneDraft = {
  name: string; model: string; serialNumber: string; payloadKg: string;
  maxSpeed: string; hubId: string; status: 'Available' | 'Maintenance' | 'Retired';
};
const emptyAddDroneDraft: AddDroneDraft = {
  name: '', model: '', serialNumber: '', payloadKg: '', maxSpeed: '',
  hubId: '', status: 'Available',
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
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<AddDroneDraft>({ ...emptyAddDroneDraft });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const [notice, setNotice] = useState('');

  function openAddDrone() {
    setAddDraft({ ...emptyAddDroneDraft });
    setAddError('');
    setAdding(true);
  }

  async function addDrone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (addSaving) return;
    const model = addDraft.model.trim();
    const serial = addDraft.serialNumber.trim();
    const payload = Number(addDraft.payloadKg);
    const speed = Number(addDraft.maxSpeed);
    const hubId = addDraft.hubId === '' ? null : Number(addDraft.hubId);
    if (!model || !serial || !addDraft.payloadKg.trim() || !Number.isFinite(payload) || payload <= 0 ||
      !addDraft.maxSpeed.trim() || !Number.isFinite(speed) || speed <= 0) {
      setAddError('Model, serial number, payload and max speed are required. Payload and speed must be positive.');
      return;
    }
    if (drones.some((item) => (item.serial_number ?? '').trim().toLowerCase() === serial.toLowerCase())) {
      setAddError('This serial number already exists in the loaded Drone list.');
      return;
    }
    if (hubId !== null && !hubs.some((item) => item.id === hubId)) {
      setAddError('Select a valid Hub or leave it unassigned.');
      return;
    }
    setAddSaving(true);
    setAddError('');
    try {
      const body: DroneCreateApi = {
        model, serial_number: serial, payload_capacity_kg: payload,
        max_speed: speed, status: addDraft.status,
        ...(addDraft.name.trim() ? { name: addDraft.name.trim() } : {}),
        ...(hubId !== null ? { current_hub_id: hubId } : {}),
      };
      await adminOperationsApi.createDrone(body);
      setAdding(false);
      setNotice(`Drone ${serial} added successfully.`);
      await refresh();
    } catch (cause) {
      setAddError(apiError(cause));
    } finally {
      setAddSaving(false);
    }
  }

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

  return <AdminPageShell title="Drones" description="Registered physical drones and their administrative availability."
    actions={<ActionButton icon="plus" onClick={openAddDrone}>Add Drone</ActionButton>}>
    {error && <p role="alert" className="mb-3 text-sm text-red-500">{error} <button className="text-button" type="button" onClick={() => void refresh()}>Retry</button></p>}
    {loading && <OperatorLoadingState label="Loading drones…" />}
    {notice && <p role="status" className="mb-4 text-sm text-green-600">{notice}</p>}
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
        {!loading && !error && visible.length === 0 && <tr><td colSpan={8}>No drones found.</td></tr>}
      </tbody></table></div>
    </OperatorPanel>
    <Dialog open={adding} onOpenChange={(open) => { if (!open && !addSaving) setAdding(false); }}>
      {adding && <DialogContent>
        <form onSubmit={(event) => void addDrone(event)}>
          <div className="border-b border-border p-5">
            <DialogTitle className="text-lg font-semibold">Add Drone</DialogTitle>
            <p className="mt-1 text-xs text-muted-foreground">Register one physical Drone using its unique serial number.</p>
          </div>
          <div className="fields two max-h-[65vh] overflow-y-auto p-5">
            <label><span>Drone name (optional)</span><input value={addDraft.name} onChange={(e) => setAddDraft({ ...addDraft, name: e.target.value })} /></label>
            <label><span>Model *</span><input required value={addDraft.model} onChange={(e) => setAddDraft({ ...addDraft, model: e.target.value })} /></label>
            <label className="sm:col-span-2"><span>Serial number *</span><input required value={addDraft.serialNumber} onChange={(e) => setAddDraft({ ...addDraft, serialNumber: e.target.value })} /></label>
            <label><span>Payload capacity (kg) *</span><input required type="number" min="0.001" step="any" value={addDraft.payloadKg} onChange={(e) => setAddDraft({ ...addDraft, payloadKg: e.target.value })} /></label>
            <label><span>Max speed *</span><input required type="number" min="0.001" step="any" value={addDraft.maxSpeed} onChange={(e) => setAddDraft({ ...addDraft, maxSpeed: e.target.value })} /></label>
            <label><span>Hub (optional)</span><select value={addDraft.hubId} onChange={(e) => setAddDraft({ ...addDraft, hubId: e.target.value })}>
              <option value="">Unassigned</option>
              {hubs.filter((item) => String(item.status ?? '').toUpperCase() === 'ACTIVE').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select></label>
            <label><span>Status</span><select value={addDraft.status} onChange={(e) => setAddDraft({ ...addDraft, status: e.target.value as AddDroneDraft['status'] })}>
              <option value="Available">Available</option><option value="Maintenance">Maintenance</option><option value="Retired">Retired</option>
            </select></label>
            {addError && <p className="sm:col-span-2 text-sm text-red-500" role="alert">{addError}</p>}
          </div>
          <div className="form-actions border-t border-border p-5">
            <ActionButton variant="secondary" disabled={addSaving} onClick={() => setAdding(false)}>Cancel</ActionButton>
            <ActionButton type="submit" disabled={addSaving}>{addSaving ? 'Adding…' : 'Add Drone'}</ActionButton>
          </div>
        </form>
      </DialogContent>}
    </Dialog>
  </AdminPageShell>;
}
