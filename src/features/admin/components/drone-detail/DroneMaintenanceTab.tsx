import { ClipboardList, CalendarClock, CircleCheckBig } from 'lucide-react';
import { AdminSummaryCard } from '../AdminSummaryCard';
import type { AdminDrone } from '../../types';
import type { DroneWorkOrder } from './droneDetailData';
import { formatDroneDate, getDemoMaintenanceNote, getMaintenanceDue } from './droneDetailData';
import { DetailBadge, DetailCard, DetailRow } from './DroneDetailUI';

export function DroneMaintenanceTab({ drone, orders, onOpenOrder }: {
  drone: AdminDrone;
  orders: DroneWorkOrder[];
  onOpenOrder: (order: DroneWorkOrder) => void;
}) {
  const due = getMaintenanceDue(drone);
  const open = orders.filter((o) => o.status !== 'COMPLETED').length;
  const done = orders.filter((o) => o.status === 'COMPLETED').length;
  const note = getDemoMaintenanceNote(drone.id);
  return <div className="dd-tab-stack">
    {/* <div className="dd-owner-banner" role="note">
      <AlertTriangle size={19} aria-hidden="true"/>
      <div><strong>Maintenance is Technician-owned</strong><p>Admin can inspect records and alerts here, but cannot complete inspections or close Work Orders.</p></div>
    </div> */}
    <div className="dd-kpis dd-kpis--three">
      <AdminSummaryCard label="Open work orders" value={open} icon={ClipboardList} />
      <AdminSummaryCard label="Maintenance schedule" value={due.label} icon={CalendarClock} />
      <AdminSummaryCard label="Completed work orders" value={done} icon={CircleCheckBig} />
    </div>
    <div className="dd-grid-two">
      <DetailCard eyebrow="SCHEDULE" title="Maintenance overview">
        <div className="dd-rows">
          <DetailRow label="Last maintenance">{formatDroneDate(drone.lastMaintenanceAt)}</DetailRow>
          <DetailRow label="Next maintenance">{formatDroneDate(drone.nextMaintenanceAt)}</DetailRow>
          <DetailRow label="Status"><DetailBadge tone={due.tone}>{due.label}</DetailBadge></DetailRow>
          <DetailRow label="Open work orders">{open}</DetailRow>
        </div>
        {note && <div className="dd-warning-note">{note}</div>}
      </DetailCard>
      <DetailCard eyebrow="MAINTENANCE ACTIVITY" title="Recent technician records">
        <div className="dd-table-scroll"><table className="dd-table dd-maintenance-table"><thead><tr>
          <th>Work order</th><th>Issue</th><th>Status</th><th>Action</th>
        </tr></thead><tbody>{orders.map((r) => <tr key={r.id}>
          <td><strong>{r.id}</strong></td><td>{r.issue}</td>
          <td><DetailBadge tone={r.status === 'COMPLETED' ? 'green' : 'blue'}>{r.status === 'COMPLETED' ? 'COMPLETED' : 'IN PROGRESS'}</DetailBadge></td>
          <td><button type="button" className="dd-action-link" onClick={() => onOpenOrder(r)}>View</button></td>
        </tr>)}{!orders.length && <tr><td colSpan={4} className="dd-empty">No demo maintenance records.</td></tr>}</tbody></table></div>
      </DetailCard>
    </div>
  </div>;
}
