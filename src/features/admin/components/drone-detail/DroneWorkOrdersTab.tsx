import { useState } from 'react';
import { Search } from 'lucide-react';
import type { DroneWorkOrder } from './droneDetailData';
import { formatDroneDate } from './droneDetailData';
import { DetailBadge, DetailCard, DemoNote } from './DroneDetailUI';

export function WorkOrdersTable({ orders, onOpen, recent = false }: {
  orders: DroneWorkOrder[];
  recent?: boolean;
  onOpen: (order: DroneWorkOrder) => void;
}) {
  const entries = recent ? orders.slice(0, 2) : orders;
  return <div className="dd-table-scroll"><table className="dd-table">
    <thead><tr><th>Work order</th><th>Issue</th><th>Status</th><th>Technician</th><th>Updated at</th></tr></thead>
    <tbody>{entries.map((r) => <tr key={r.id}>
      <td><button type="button" className="dd-inline-link" onClick={() => onOpen(r)}>{r.id} ↗</button></td>
      <td>{r.issue}</td>
      <td><DetailBadge tone={r.status === 'COMPLETED' ? 'green' : 'blue'}>{r.status === 'COMPLETED' ? 'COMPLETED' : 'IN PROGRESS'}</DetailBadge></td>
      <td>{r.technician}</td><td>{formatDroneDate(r.updatedAt)}</td>
    </tr>)}
      {!entries.length && <tr><td colSpan={5} className="dd-empty">No demo work orders for this drone.</td></tr>}
    </tbody>
  </table></div>;
}
export function DroneWorkOrdersTab({ orders, onOpen }: { orders: DroneWorkOrder[]; onOpen: (order: DroneWorkOrder) => void }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const list = orders.filter((o) => (status === 'ALL' || o.status === status) &&
    `${o.id} ${o.issue} ${o.technician}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <DetailCard eyebrow="TECHNICIAN OWNED" title="Work orders" className="dd-tab-panel">
    <DemoNote category="work orders" />
    <div className="dd-toolbar">
      <label className="dd-search"><Search size={15} aria-hidden="true"/><span className="sr-only">Search work orders</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Work Order, issue or Technician…" /></label>
      <select aria-label="Filter work orders" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="ALL">All status</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option>
      </select>
    </div>
    <WorkOrdersTable orders={list} onOpen={onOpen}/>
  </DetailCard>;
}
