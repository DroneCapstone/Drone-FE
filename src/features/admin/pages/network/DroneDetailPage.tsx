import { OperatorLoadingState } from '../../../operator/components/OperatorLoadingState';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Dialog, DialogTitle } from '../../../../components/ui/Dialog';
import { AdminDialogContent as DialogContent } from '../../components/AdminDialogContent';
import { AdminPageShell } from '../../components/AdminPageShell';
import { DetailBadge, DetailCard, DetailRow, detailTabs } from '../../components/drone-detail/DroneDetailUI';
import { adminOperationsApi, apiError, type DroneOverviewApi, type DroneMaintenanceApi, type WorkOrderApi, type FlightHistoryApi, type HubApi } from '../../api/adminOperationsApi';
import type { DetailTab } from '../../components/drone-detail/droneDetailData';
import '../../components/drone-detail/DroneDetail.css';

const dateText = (value?: string | null) => value ? new Date(value).toLocaleString('en-GB') : '—';
const adminActive = (value: string) => value.toUpperCase() === 'ACTIVE';
const flying = (value: string) => value.toUpperCase().replace(/[_ ]/g, '') === 'INFLIGHT';
const maintenanceTone = (value: string): 'red' | 'green' => value.toUpperCase() === 'OVERDUE' ? 'red' : 'green';

export function DroneDetailPage() {
  const { droneId } = useParams();
  const [drone, setDrone] = useState<DroneOverviewApi | null>(null);
  const [hubs, setHubs] = useState<HubApi[]>([]);
  const [tab, setTab] = useState<DetailTab>('overview');
  const [maintenance, setMaintenance] = useState<DroneMaintenanceApi | null>(null);
  const [orders, setOrders] = useState<WorkOrderApi[]>([]);
  const [flights, setFlights] = useState<FlightHistoryApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [tabResult, setTabResult] = useState<{ key: string; ok: boolean } | null>(null);
  const tabKey = `${droneId}:${tab}`;
  const tabPending = tab !== 'overview' && (tabLoading || tabResult?.key !== tabKey);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: '', payload: 0, speed: 0, hub: '' });

  async function refresh() {
    if (!droneId) return;
    setLoading(true);
    try {
      const [d, hs] = await Promise.all([adminOperationsApi.drone(droneId), adminOperationsApi.hubs()]);
      setDrone(d); setHubs(hs);
      setDraft({ name: d.name, payload: d.payload_capacity_kg, speed: d.max_speed, hub: String(d.assigned_hub_id ?? d.current_hub_id ?? d.hub_id ?? '') });
      setError('');
    } catch (cause) { setError(apiError(cause)); }
    finally { setLoading(false); }
  }
  useEffect(() => { setDrone(null); setTab('overview'); void refresh(); }, [droneId]);
  useEffect(() => {
    if (!droneId || tab === 'overview') { setTabLoading(false); setTabResult(null); return; }
    let live = true;
    setTabLoading(true); setTabResult(null);
    const req = tab === 'maintenance' ? adminOperationsApi.droneMaintenance(droneId) : tab === 'orders' ? adminOperationsApi.droneWorkOrders(droneId) : adminOperationsApi.droneFlights(droneId);
    void req.then((result) => {
      if (!live) return;
      if (tab === 'maintenance') setMaintenance(result as DroneMaintenanceApi);
      else if (tab === 'orders') setOrders(result as WorkOrderApi[]);
      else setFlights(result as FlightHistoryApi);
      setError(''); setTabResult({ key: tabKey, ok: true });
    }).catch((cause: unknown) => { if (live) { setError(apiError(cause)); setTabResult({ key: tabKey, ok: false }); } }).finally(() => { if (live) setTabLoading(false); });
    return () => { live = false; };
  }, [droneId, tab]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!drone || saving) return;
    const hub = hubs.find((h) => String(h.id) === draft.hub);
    if (!draft.name.trim() || !Number.isFinite(draft.payload) || draft.payload <= 0 || !Number.isFinite(draft.speed) || draft.speed <= 0 || !hub) {
      setError('Enter a valid name, payload, max speed and Hub.'); return;
    }
    setSaving(true); setError('');
    try {
      await adminOperationsApi.updateDrone(drone.id, { name: draft.name.trim(), payload_capacity_kg: draft.payload, max_speed: draft.speed, current_hub_id: hub.id });
      setEditing(false); setNotice('Drone updated successfully.'); await refresh();
    } catch (cause) { setError(apiError(cause)); }
    finally { setSaving(false); }
  }
  async function toggleActive() {
    if (!drone || saving) return;
    if (adminActive(drone.admin_state) && flying(drone.status)) { setError('Cannot deactivate a Drone in flight.'); return; }
    if (!window.confirm(`Confirm ${adminActive(drone.admin_state) ? 'deactivation' : 'activation'} of ${drone.id}?`)) return;
    setSaving(true); setError('');
    try {
      await adminOperationsApi.setDroneActive(drone.id, !adminActive(drone.admin_state));
      setNotice('Drone availability updated successfully.'); await refresh();
    } catch (cause) { setError(apiError(cause)); }
    finally { setSaving(false); }
  }

  const hubName = drone?.assigned_hub_name ?? drone?.current_hub_name ?? hubs.find((h) => h.id === (drone?.assigned_hub_id ?? drone?.current_hub_id ?? drone?.hub_id))?.name ?? 'Unassigned';
  const ms = drone?.maintenance_status;
  const flight = drone?.flight_activity;
  const readonlyFact = (label: string, content: ReactNode) => <div className="dd-readonly-field"><span className="dd-readonly-label">{label}</span><div className="dd-readonly-control">{content}</div></div>;
  const renderOrders = (items: WorkOrderApi[]) => <div className="dd-table-scroll"><table className="dd-table"><thead><tr><th>Work order</th><th>Issue</th><th>Status</th><th>Technician</th><th>Updated</th></tr></thead><tbody>
    {items.map((w) => <tr key={w.id}><td><strong>{w.work_order_code}</strong></td><td>{w.issue}</td><td><DetailBadge tone={w.status.toUpperCase() === 'COMPLETED' ? 'green' : 'blue'}>{w.status}</DetailBadge></td><td>{w.technician_name ?? '—'}</td><td>{dateText(w.updated_at)}</td></tr>)}
    {items.length === 0 && <tr><td colSpan={5}>No work orders found.</td></tr>}
  </tbody></table></div>;

  return <AdminPageShell title={drone?.id ?? droneId ?? 'Drone'} description={drone ? `${drone.model} · ${hubName}` : ''}
    actions={drone ? <ActionButton variant={adminActive(drone.admin_state) ? 'danger' : 'secondary'} disabled={saving || (adminActive(drone.admin_state) && flying(drone.status))} onClick={() => void toggleActive()}>{adminActive(drone.admin_state) ? 'Deactivate' : 'Activate'}</ActionButton> : undefined}>
    <Link className="mb-4 inline-flex items-center gap-2 text-sm text-orange-600" to="/admin/network/drones"><ArrowLeft size={15}/>Back to Drones</Link>
    <div className="admin-drone-detail">
      {loading && <OperatorLoadingState label="Loading drone details…" compact />}
      {error && <p role="alert" className="dd-error">{error}</p>}
      {notice && <p role="status" className="dd-notice">{notice}</p>}
      {!loading && drone && <>
        <div className="dd-tabs" role="tablist" aria-label="Drone detail tabs">{detailTabs.map(({ id, label }) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'dd-tab is-active' : 'dd-tab'} onClick={() => setTab(id)}>{label}</button>)}</div>
        {tabPending && <OperatorLoadingState label="Loading details…" compact />}
        {(tab === 'overview' || (!tabPending && tabResult?.ok)) && <div role="tabpanel">
        {tab === 'overview' && <div className="dd-overview">
          <DetailCard title="Drone information" action={<button type="button" className="dd-edit-btn" onClick={() => setEditing(true)}><Pencil size={15}/> Edit</button>}>
            <div className="dd-master-fields-grid">
              {readonlyFact('Drone name', drone.name)}{readonlyFact('Model', drone.model)}
              {readonlyFact('Serial number', drone.serial_number)}{readonlyFact('Maximum payload (kg)', drone.payload_capacity_kg)}
              {readonlyFact('Assigned Hub', hubName)}
            </div>
          </DetailCard>
          <div className="dd-grid-two"><DetailCard title="Operational information"><div className="dd-rows">
            <DetailRow label="Operational status">{drone.status}</DetailRow>
            <DetailRow label="Admin state"><DetailBadge tone={adminActive(drone.admin_state) ? 'green' : 'gray'}>{drone.admin_state}</DetailBadge></DetailRow>
            <DetailRow label="Current Hub">{drone.current_hub_name ?? hubName}</DetailRow>
            <DetailRow label="Battery level">{drone.battery_level_pct == null ? '—' : `${drone.battery_level_pct}%`}</DetailRow>
            <DetailRow label="Installed battery">{drone.installed_battery_id ? <Link className="dd-inline-link" to={`/admin/network/batteries/${encodeURIComponent(drone.installed_battery_id)}`}>{drone.installed_battery_id}</Link> : '—'}</DetailRow>
          </div></DetailCard><DetailCard title="Maintenance status"><div className="dd-rows">
            <DetailRow label="Schedule">{ms?.schedule_status ?? '—'}</DetailRow><DetailRow label="Open work orders">{ms?.open_work_orders ?? 0}</DetailRow>
            <DetailRow label="Last maintenance">{dateText(ms?.last_maintenance)}</DetailRow><DetailRow label="Next maintenance">{dateText(ms?.next_maintenance)}</DetailRow>
          </div></DetailCard></div>
          <div className="dd-grid-bottom"><DetailCard title="Work orders"><div className="dd-rows"><DetailRow label="Open work orders">{ms?.open_work_orders ?? 0}</DetailRow><DetailRow label="Completed work orders">{ms?.completed_work_orders ?? 0}</DetailRow></div><button className="dd-action-link" type="button" onClick={() => setTab('orders')}>View all</button></DetailCard>
            <DetailCard title="Flight activity"><div className="dd-rows"><DetailRow label="Last flight">{dateText(flight?.last_flight)}</DetailRow><DetailRow label="Total flights">{flight?.total_flights ?? 0}</DetailRow><DetailRow label="Total flight hours">{flight?.total_flight_hours ?? 0} h</DetailRow></div><button className="dd-action-link" type="button" onClick={() => setTab('flights')}>View history</button></DetailCard></div>
        </div>}
        {tab === 'maintenance' && maintenance && <div className="dd-tab-stack"><div className="dd-grid-two">
          <DetailCard title="Maintenance overview"><div className="dd-rows"><DetailRow label="Schedule"><DetailBadge tone={maintenanceTone(maintenance.maintenance_schedule)}>{maintenance.maintenance_schedule}</DetailBadge></DetailRow><DetailRow label="Open work orders">{maintenance.open_work_orders}</DetailRow><DetailRow label="Completed work orders">{maintenance.completed_work_orders}</DetailRow>
          {Object.entries(maintenance.maintenance_overview ?? {}).filter(([, v]) => typeof v === 'string' || typeof v === 'number').map(([key, value]) => <DetailRow key={key} label={key.replace(/_/g, ' ')}>{String(value ?? '—')}</DetailRow>)}</div></DetailCard>
          <DetailCard title="Recent technician records">{renderOrders(maintenance.recent_technician_records ?? [])}</DetailCard>
        </div></div>}
        {tab === 'orders' && <DetailCard title="Work orders">{renderOrders(orders)}</DetailCard>}
        {tab === 'flights' && flights && <DetailCard title="Flight history"><div className="dd-rows"><DetailRow label="Total flights">{flights.total_flights}</DetailRow><DetailRow label="Flight hours">{flights.flight_hours} h</DetailRow></div><div className="dd-table-scroll"><table className="dd-table"><thead><tr><th>Flight</th><th>Mission</th><th>Route</th><th>Departure</th><th>Status</th></tr></thead><tbody>
          {flights.flights.map((f, i) => <tr key={f.flight_code ?? f.flight_id ?? f.id ?? i}><td>{f.flight_code ?? f.flight_id ?? f.id ?? '—'}</td><td>{f.mission_id ?? '—'}</td><td>{f.route ?? '—'}</td><td>{dateText(f.departure ?? f.departed_at)}</td><td>{f.status ?? '—'}</td></tr>)}
          {flights.flights.length === 0 && <tr><td colSpan={5}>No flight history.</td></tr>}
        </tbody></table></div></DetailCard>}
        </div>}
      </>}
    </div>
    <Dialog open={editing} onOpenChange={(open) => !open && setEditing(false)}>{drone && editing && <DialogContent><form onSubmit={(event) => void save(event)}>
      <div className="border-b border-border p-5"><DialogTitle className="text-lg font-semibold">Edit Drone</DialogTitle></div>
      <div className="fields two p-5">
        <label><span>Drone name</span><input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}/></label>
        <label><span>Serial number</span><input readOnly value={drone.serial_number}/></label>
        <label><span>Maximum payload (kg)</span><input type="number" min={0.01} step="any" required value={draft.payload} onChange={(e) => setDraft({ ...draft, payload: Number(e.target.value) })}/></label>
        <label><span>Maximum speed</span><input type="number" min={0.01} step="any" required value={draft.speed} onChange={(e) => setDraft({ ...draft, speed: Number(e.target.value) })}/></label>
        <label><span>Assigned Hub</span><select required value={draft.hub} onChange={(e) => setDraft({ ...draft, hub: e.target.value })}><option value="">Select Hub</option>{hubs.filter((h) => h.status?.toUpperCase() === 'ACTIVE' || String(h.id) === draft.hub).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
      </div>
      {error && <p className="px-5 text-xs text-red-500" role="alert">{error}</p>}
      <div className="form-actions border-t border-border p-5"><ActionButton variant="secondary" onClick={() => setEditing(false)}>Cancel</ActionButton><ActionButton type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</ActionButton></div>
    </form></DialogContent>}</Dialog>
  </AdminPageShell>;
}
