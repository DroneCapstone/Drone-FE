import type { AdminDrone } from '../../types';
import type { DroneWorkOrder } from './droneDetailData';
import { formatDroneDate, getMaintenanceDue } from './droneDetailData';
import { DetailBadge, DetailCard, DemoNote, MasterFact } from './DroneDetailUI';
import { WorkOrdersTable } from './DroneWorkOrdersTab';

export function DroneMaintenanceTab({ drone, orders, onOpenOrder }: {
  drone: AdminDrone;
  orders: DroneWorkOrder[];
  onOpenOrder: (order: DroneWorkOrder) => void;
}) {
  const due = getMaintenanceDue(drone);
  return <div className="dd-tab-stack">
    <DetailCard eyebrow="TECHNICIAN OWNED" title="Maintenance overview">
      <div className="dd-master-grid dd-master-grid--three">
        <MasterFact label="Maintenance schedule"><DetailBadge tone={due.tone}>{due.label}</DetailBadge></MasterFact>
        <MasterFact label="Last maintenance">{formatDroneDate(drone.lastMaintenanceAt)}</MasterFact>
        <MasterFact label="Next maintenance">{formatDroneDate(drone.nextMaintenanceAt)}</MasterFact>
      </div>
      <p className="dd-muted-line dd-note-spaced">Technician owns inspections and Work Order updates. Admin access here is read-only.</p>
    </DetailCard>
    <DetailCard eyebrow="MAINTENANCE HISTORY" title="Maintenance records">
      <DemoNote category="maintenance records"/>
      <WorkOrdersTable orders={orders} onOpen={onOpenOrder}/>
    </DetailCard>
  </div>;
}
