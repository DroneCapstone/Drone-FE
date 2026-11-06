import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { AdminPageShell } from '../../components/AdminPageShell';
import { getAdminBatteries, getAdminDrones, getAdminHubs, upsertAdminDrone } from '../../services/adminStore';
import type { AdminDrone } from '../../types';
import { DroneOverviewTab } from '../../components/drone-detail/DroneOverviewTab';
import { DroneMaintenanceTab } from '../../components/drone-detail/DroneMaintenanceTab';
import { DroneWorkOrdersTab } from '../../components/drone-detail/DroneWorkOrdersTab';
import { DroneFlightHistoryTab } from '../../components/drone-detail/DroneFlightHistoryTab';
import { DroneEditDialog } from '../../components/drone-detail/DroneEditDialog';
import { DroneDetailDialogs } from '../../components/drone-detail/DroneDetailDialogs';
import { detailTabs } from '../../components/drone-detail/DroneDetailUI';
import { getDemoOrders, getDemoFlights, type DetailTab, type DroneWorkOrder, type DroneFlightRecord } from '../../components/drone-detail/droneDetailData';
import '../../components/drone-detail/DroneDetail.css';

/** Admin-only drone overview. Technician owns maintenance; Operator owns missions. */
export function DroneDetailPage() {
  const { droneId } = useParams();
  const [drone, setDrone] = useState<AdminDrone | undefined>(() => getAdminDrones().find((item) => item.id === droneId));
  const [tab, setTab] = useState<DetailTab>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [confirmActive, setConfirmActive] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DroneWorkOrder | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<DroneFlightRecord | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const refresh = () => setDrone(getAdminDrones().find((item) => item.id === droneId));
    refresh(); setTab('overview'); setIsEditing(false); setConfirmActive(false);
    setSelectedOrder(null); setSelectedFlight(null); setNotice(''); setError('');
    window.addEventListener('admin-data-updated', refresh);
    return () => window.removeEventListener('admin-data-updated', refresh);
  }, [droneId]);

  if (!drone) return <Navigate replace to="/admin/network/drones"/>;
  const hubs = getAdminHubs();
  const hubName = hubs.find((hub) => hub.id === drone.hubId)?.name ?? '—';
  const installedBattery = getAdminBatteries().find((battery) => battery.id === drone.installedBatteryId);
  const batteryLevel = installedBattery ? installedBattery.chargeLevelPct : drone.installedBatteryId ? drone.batteryPct : null;
  const orders = getDemoOrders(drone.id);
  const flights = getDemoFlights(drone.id);

  function saveDrone(draft: AdminDrone): string | null {
    // Read current store state at save time to avoid overwriting Technician-owned
    // fields that may have been updated since the Edit modal was opened.
    const stored = getAdminDrones().find((item) => item.id === drone.id);
    if (!stored) return 'This drone no longer exists.';
    const name = draft.name.trim();
    const serialNumber = draft.serialNumber.trim();
    const payload = Number(draft.maxPayloadKg);
    const targetHub = getAdminHubs().find((hub) => hub.id === draft.hubId);
    if (!name || !serialNumber || !Number.isFinite(payload) || payload <= 0) return 'Enter a valid name, serial number, and maximum payload.';
    if (getAdminDrones().some((item) => item.id !== stored.id && item.serialNumber.trim().toLowerCase() === serialNumber.toLowerCase())) return 'Serial number already belongs to another drone.';
    if (!targetHub || (draft.hubId !== stored.hubId && targetHub.status !== 'ACTIVE')) return 'Choose an active Hub for reassignment.';
    if (stored.status === 'IN_FLIGHT' && (serialNumber !== stored.serialNumber || payload !== stored.maxPayloadKg || draft.hubId !== stored.hubId)) return 'Cannot change serial, payload or Hub during a flight.';
    if (draft.hubId !== stored.hubId) {
      if (stored.status === 'MAINTENANCE') return 'Cannot reassign a drone under maintenance.';
      if (getAdminDrones().filter((item) => item.id !== stored.id && item.hubId === draft.hubId).length >= targetHub.capacity) return 'Selected Hub is at drone capacity.';
    }
    // Backend mission reservations and active Technician work orders are not
    // available to this mock store. Do not present these as checked.
    const updated: AdminDrone = { ...stored, name, serialNumber, maxPayloadKg: payload, hubId: draft.hubId, updatedAt: new Date().toISOString() };
    try {
      upsertAdminDrone(updated);
      setDrone(updated);
      setNotice('Drone information saved.');
      setError('');
      return null;
    } catch (cause) { return cause instanceof Error ? cause.message : 'Could not save Drone.'; }
  }

  function toggleActive() {
    const stored = getAdminDrones().find((item) => item.id === drone.id);
    if (!stored) { setError('Drone no longer exists.'); return; }
    if (stored.isActive && stored.status === 'IN_FLIGHT') { setError('Cannot deactivate a drone in flight.'); setConfirmActive(false); return; }
    const updated = { ...stored, isActive: !stored.isActive, updatedAt: new Date().toISOString() };
    try {
      upsertAdminDrone(updated);
      setDrone(updated);
      setError('');
      setConfirmActive(false);
      setNotice(`Drone ${updated.isActive ? 'activated' : 'deactivated'} administratively.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Cannot update administrative state.'); }
  }

  return <AdminPageShell
    title={drone.id}
    description={`${drone.model} · ${hubName}`}
    actions={<ActionButton variant={drone.isActive ? 'danger' : 'secondary'} disabled={drone.isActive && drone.status === 'IN_FLIGHT'} onClick={() => { setNotice(''); setError(''); setConfirmActive(true); }}>{drone.isActive ? 'Deactivate' : 'Activate'}</ActionButton>}
  >
    <div className="admin-drone-detail">
      <div className="dd-tabs" role="tablist" aria-label="Drone Detail tabs">
        {detailTabs.map(({ id, label }) => <button key={id} type="button" role="tab" id={`dd-tab-${id}`}
          aria-selected={tab === id} aria-controls="dd-panel" tabIndex={tab === id ? 0 : -1}
          className={tab === id ? 'dd-tab is-active' : 'dd-tab'}
          onClick={() => { setTab(id); setError(''); }}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            const index = detailTabs.findIndex((item) => item.id === tab);
            const next = detailTabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + detailTabs.length) % detailTabs.length].id;
            setTab(next); document.getElementById(`dd-tab-${next}`)?.focus();
          }}>
          {label}
        </button>)}
      </div>
      {notice && <p className="dd-notice" role="status">{notice}</p>}
      {error && <p className="dd-error" role="alert">{error}</p>}
      <div id="dd-panel" role="tabpanel" aria-labelledby={`dd-tab-${tab}`}>
        {tab === 'overview' && <DroneOverviewTab drone={drone} hubName={hubName} batteryLevel={batteryLevel} orders={orders} flights={flights} onEdit={() => { setIsEditing(true); setError(''); setNotice(''); }} onTabChange={setTab} onOpenOrder={setSelectedOrder}/>}
        {tab === 'maintenance' && <DroneMaintenanceTab drone={drone} orders={orders} onOpenOrder={setSelectedOrder}/>}
        {tab === 'orders' && <DroneWorkOrdersTab orders={orders} onOpen={setSelectedOrder}/>}
        {tab === 'flights' && <DroneFlightHistoryTab droneId={drone.id} flights={flights} lastRecordedFlight={drone.lastFlightAt} onOpen={setSelectedFlight}/>}
      </div>
    </div>
    {isEditing && <DroneEditDialog drone={drone} hubs={hubs} onSave={saveDrone} onClose={() => setIsEditing(false)}/>}
    <DroneDetailDialogs drone={drone} confirmActive={confirmActive} onConfirmClose={() => setConfirmActive(false)} onConfirmActive={toggleActive}
      order={selectedOrder} onOrderClose={() => setSelectedOrder(null)} flight={selectedFlight} onFlightClose={() => setSelectedFlight(null)}/>
  </AdminPageShell>;
}
