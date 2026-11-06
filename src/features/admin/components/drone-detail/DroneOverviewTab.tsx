import { ArrowRight, ExternalLink, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { AdminDrone } from '../../types';
import type { DroneFlightRecord, DroneWorkOrder } from './droneDetailData';
import { formatDroneDate, getDemoFlightSummary, getDemoMaintenanceNote, getMaintenanceDue } from './droneDetailData';
import { DemoNote, DetailBadge, DetailCard, DetailRow } from './DroneDetailUI';
import { WorkOrdersTable } from './DroneWorkOrdersTab';

/** Looks like the text fields in the original demo, but remains read-only.
 * Admin edits exclusively through the Edit modal to preserve validation. */
function ReadonlyField({ label, children }: { label: string; children: ReactNode }) {
  return <div className="dd-readonly-field">
    <span className="dd-readonly-label">{label}</span>
    <div className="dd-readonly-control">{children}</div>
  </div>;
}

export function DroneOverviewTab({ drone, hubName, batteryLevel, orders, flights, onEdit, onTabChange, onOpenOrder }: {
  drone: AdminDrone;
  hubName: string;
  batteryLevel: number | null;
  orders: DroneWorkOrder[];
  flights: DroneFlightRecord[];
  onEdit: () => void;
  onTabChange: (tab: 'orders' | 'flights' | 'maintenance') => void;
  onOpenOrder: (order: DroneWorkOrder) => void;
}) {
  const due = getMaintenanceDue(drone);
  const flightSummary = getDemoFlightSummary(drone.id, flights);
  return <div className="dd-overview">
    <DetailCard eyebrow="DRONE MASTER DATA" title="Drone information"
      action={<button type="button" className="dd-edit-btn" onClick={onEdit}><Pencil size={16} aria-hidden="true" /> Edit</button>}>
      <div className="dd-master-fields-grid">
        <ReadonlyField label="Drone name">{drone.name}</ReadonlyField>
        <ReadonlyField label="Model">{drone.model}</ReadonlyField>
        <ReadonlyField label="Serial number">{drone.serialNumber}</ReadonlyField>
        <ReadonlyField label="Maximum payload (kg)">{drone.maxPayloadKg}</ReadonlyField>
        <ReadonlyField label="Assigned Hub"><Link className="dd-inline-link" to={`/admin/network/hubs/${encodeURIComponent(drone.hubId)}`}>{hubName}<ExternalLink size={12} aria-hidden="true" /></Link></ReadonlyField>
      </div>
    </DetailCard>

    <div className="dd-grid-two">
      <DetailCard eyebrow="CURRENT STATE" title="Operational information">
        <div className="dd-rows">
          <DetailRow label="Operational status"><DetailBadge tone={drone.status === 'AVAILABLE' ? 'green' : drone.status === 'IN_FLIGHT' ? 'blue' : 'orange'}>{drone.status.replace(/_/g, ' ')}</DetailBadge></DetailRow>
          <DetailRow label="Admin state"><DetailBadge tone={drone.isActive ? 'green' : 'gray'}>{drone.isActive ? 'ACTIVE' : 'INACTIVE'}</DetailBadge></DetailRow>
          <DetailRow label="Current Hub (prototype)">{hubName}</DetailRow>
          <DetailRow label="Battery level">{batteryLevel == null ? '—' : <span className="dd-progress-value">{batteryLevel}%<span className="dd-progress" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, batteryLevel))}%` }} /></span></span>}</DetailRow>
          <DetailRow label="Installed battery">{drone.installedBatteryId ? <Link className="dd-inline-link" to={`/admin/network/batteries/${encodeURIComponent(drone.installedBatteryId)}`}>{drone.installedBatteryId}<ExternalLink size={12} aria-hidden="true" /></Link> : '—'}</DetailRow>
        </div>
      </DetailCard>
      <DetailCard eyebrow="MAINTENANCE OVERVIEW" title="Maintenance status" action={<DetailBadge tone={due.tone}>{due.label}</DetailBadge>}>
        <div className="dd-rows">
          <DetailRow label="Open work orders (demo)"><button type="button" className="dd-action-link" onClick={() => onTabChange('orders')}>{orders.filter((o) => o.status !== 'COMPLETED').length} <ArrowRight size={14} aria-hidden="true" /></button></DetailRow>
          <DetailRow label="Last maintenance">{formatDroneDate(drone.lastMaintenanceAt)}</DetailRow>
          <DetailRow label="Next maintenance">{formatDroneDate(drone.nextMaintenanceAt)}</DetailRow>
          <DetailRow label="Maintenance note">{getDemoMaintenanceNote(drone.id) || '—'}</DetailRow>
        </div>
      </DetailCard>
    </div>

    <div className="dd-grid-bottom">
      <DetailCard eyebrow="RECENT MAINTENANCE RECORDS" title="Work orders"
        action={<button type="button" className="dd-action-link" onClick={() => onTabChange('orders')}>View all <ArrowRight size={14} aria-hidden="true" /></button>}>
        <DemoNote category="work orders" />
        <WorkOrdersTable orders={orders} recent onOpen={onOpenOrder} />
      </DetailCard>
      <DetailCard eyebrow="FLIGHT SUMMARY" title="Flight activity">
        <div className="dd-rows dd-flight-summary">
          <DetailRow label="Last flight">{formatDroneDate(flightSummary.latest ?? drone.lastFlightAt)}</DetailRow>
          <DetailRow label="Total flights (demo)">{flightSummary.count}</DetailRow>
          <DetailRow label="Total flight hours (demo)">{flightSummary.hours == null ? '—' : `${flightSummary.hours} h`}</DetailRow>
        </div>
        <button type="button" className="dd-action-link dd-view-flights" onClick={() => onTabChange('flights')}>View flight history <ArrowRight size={14} aria-hidden="true" /></button>
      </DetailCard>
    </div>
  </div>;
}
