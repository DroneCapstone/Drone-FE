import { ArrowRight, ExternalLink, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AdminDrone } from '../../types';
import type { DroneFlightRecord, DroneWorkOrder } from './droneDetailData';
import { formatDroneDate, getMaintenanceDue } from './droneDetailData';
import { DemoNote, DetailBadge, DetailCard, DetailRow, MasterFact } from './DroneDetailUI';
import { WorkOrdersTable } from './DroneWorkOrdersTab';

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
  return <div className="dd-overview">
    <DetailCard eyebrow="DRONE MASTER DATA" title="Drone information"
      action={<button type="button" className="dd-edit-btn" onClick={onEdit}><Pencil size={16} aria-hidden="true"/> Edit</button>}>
      <div className="dd-master-grid">
        <MasterFact label="Drone name">{drone.name}</MasterFact>
        <MasterFact label="Model">{drone.model}</MasterFact>
        <MasterFact label="Serial number">{drone.serialNumber}</MasterFact>
        <MasterFact label="Maximum payload">{drone.maxPayloadKg} kg</MasterFact>
        <MasterFact label="Assigned Hub"><Link className="dd-inline-link" to={`/admin/network/hubs/${encodeURIComponent(drone.hubId)}`}>{hubName}<ExternalLink size={12} aria-hidden="true"/></Link></MasterFact>
      </div>
    </DetailCard>

    <div className="dd-grid-two">
      <DetailCard eyebrow="CURRENT STATE" title="Operational information">
        <div className="dd-rows">
          <DetailRow label="Operational status"><DetailBadge tone={drone.status === 'AVAILABLE' ? 'green' : drone.status === 'IN_FLIGHT' ? 'blue' : 'orange'}>{drone.status.replace(/_/g, ' ')}</DetailBadge></DetailRow>
          <DetailRow label="Admin state"><DetailBadge tone={drone.isActive ? 'green' : 'gray'}>{drone.isActive ? 'ACTIVE' : 'INACTIVE'}</DetailBadge></DetailRow>
          <DetailRow label="Current Hub (prototype)">{hubName}</DetailRow>
          <DetailRow label="Battery level">{batteryLevel == null ? '—' : <span className="dd-progress-value">{batteryLevel}%<span className="dd-progress" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, batteryLevel))}%` }}/></span></span>}</DetailRow>
          <DetailRow label="Installed battery">{drone.installedBatteryId ? <Link className="dd-inline-link" to={`/admin/network/batteries/${encodeURIComponent(drone.installedBatteryId)}`}>{drone.installedBatteryId}<ExternalLink size={12} aria-hidden="true"/></Link> : '—'}</DetailRow>
        </div>
      </DetailCard>
      <DetailCard eyebrow="MAINTENANCE OVERVIEW" title="Maintenance status" action={<DetailBadge tone={due.tone}>{due.label}</DetailBadge>}>
        <div className="dd-rows">
          <DetailRow label="Open work orders (demo)"><button type="button" className="dd-action-link" onClick={() => onTabChange('orders')}>{orders.filter((o) => o.status !== 'COMPLETED').length} <ArrowRight size={14} aria-hidden="true"/></button></DetailRow>
          <DetailRow label="Last maintenance">{formatDroneDate(drone.lastMaintenanceAt)}</DetailRow>
          <DetailRow label="Next maintenance">{formatDroneDate(drone.nextMaintenanceAt)}</DetailRow>
          <DetailRow label="Maintenance note">—</DetailRow>
        </div>
      </DetailCard>
    </div>

    <div className="dd-grid-bottom">
      <DetailCard eyebrow="RECENT MAINTENANCE RECORDS" title="Work orders"
        action={<button type="button" className="dd-action-link" onClick={() => onTabChange('orders')}>View all <ArrowRight size={14} aria-hidden="true"/></button>}>
        <DemoNote category="work orders" />
        <WorkOrdersTable orders={orders} recent onOpen={onOpenOrder}/>
      </DetailCard>
      <DetailCard eyebrow="FLIGHT SUMMARY" title="Flight activity">
        <div className="dd-rows dd-flight-summary">
          <DetailRow label="Last recorded flight">{formatDroneDate(drone.lastFlightAt)}</DetailRow>
          <DetailRow label="Demo flights">{flights.length}</DetailRow>
          <DetailRow label="Demo flight hours">{flights.length ? '1.2 h' : '—'}</DetailRow>
        </div>
        <button type="button" className="dd-action-link dd-view-flights" onClick={() => onTabChange('flights')}>View flight history <ArrowRight size={14} aria-hidden="true"/></button>
      </DetailCard>
    </div>
  </div>;
}
