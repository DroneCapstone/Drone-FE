import { AdminSelect } from '../AdminSelect';
import { useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import type { DroneWorkOrder } from './droneDetailData';
import { formatDroneDate } from './droneDetailData';
import { DetailBadge, DetailCard } from './DroneDetailUI';

export function WorkOrdersTable({ orders, onOpen, recent = false, showAction = false }: {
  orders: DroneWorkOrder[];
  recent?: boolean;
  showAction?: boolean;
  onOpen: (order: DroneWorkOrder) => void;
}) {
  const entries = recent ? orders.slice(0, 2) : orders;
  return <div className="dd-table-scroll"><table className="dd-table">
    <thead><tr><th>Work order</th><th>Issue</th><th>Status</th><th>Technician</th><th>Updated at</th>{showAction && <th>Action</th>}</tr></thead>
    <tbody>{entries.map((r) => <tr key={r.id}>
      <td>{showAction ? <strong>{r.id}</strong> : <button type="button" className="dd-inline-link" onClick={() => onOpen(r)}>{r.id} ↗</button>}</td>
      <td>{r.issue}</td>
      <td><DetailBadge tone={r.status === 'COMPLETED' ? 'green' : 'blue'}>{r.status === 'COMPLETED' ? 'COMPLETED' : 'IN PROGRESS'}</DetailBadge></td>
      <td>{r.technician}</td><td>{formatDroneDate(r.updatedAt)}</td>
      {showAction && <td><button type="button" className="dd-action-link" onClick={() => onOpen(r)}>View details <ArrowRight size={13} aria-hidden="true" /></button></td>}
    </tr>)}
      {!entries.length && <tr><td colSpan={showAction ? 6 : 5} className="dd-empty">No matching work orders.</td></tr>}
    </tbody>
  </table></div>;
}

export function DroneWorkOrdersTab({ orders, onOpen }: { orders: DroneWorkOrder[]; onOpen: (order: DroneWorkOrder) => void }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const list = orders.filter((o) => (status === 'ALL' || o.status === status) &&
    `${o.id} ${o.issue} ${o.technician}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <div className="dd-tab-stack">
    <DetailCard title="Work orders" className="dd-tab-panel">
      <div className="dd-toolbar">
        <label className="dd-search"><Search size={15} aria-hidden="true" /><span className="sr-only">Search work orders</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Work Order or issue…" /></label>
        <AdminSelect aria-label="Filter work orders" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">All status</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option>
        </AdminSelect>
        <span className="dd-toolbar-meta">{list.length} work order(s) · View only</span>
      </div>
      <WorkOrdersTable orders={list} onOpen={onOpen} showAction />
    </DetailCard>
    {/* <div className="dd-role-callout"><Wrench size={16} aria-hidden="true"/><span>The Technician handles diagnosis, replacement requests, inspections, and completion. Admin views progress across the fleet.</span></div> */}
  </div>;
}
