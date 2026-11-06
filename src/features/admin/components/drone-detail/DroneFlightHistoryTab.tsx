import { useState } from 'react';
import { Search } from 'lucide-react';
import type { DroneFlightRecord } from './droneDetailData';
import { formatDroneDate } from './droneDetailData';
import { DetailBadge, DetailCard, DemoNote } from './DroneDetailUI';

export function DroneFlightHistoryTab({ flights, lastRecordedFlight, onOpen }: {
  flights: DroneFlightRecord[];
  lastRecordedFlight?: string;
  onOpen: (record: DroneFlightRecord) => void;
}) {
  const [query, setQuery] = useState('');
  const visible = flights.filter((f) => `${f.id} ${f.missionId} ${f.route}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <DetailCard eyebrow="OPERATOR OWNED" title="Flight history" className="dd-tab-panel">
    <p className="dd-muted-line">Last recorded flight: {formatDroneDate(lastRecordedFlight)}</p>
    <DemoNote category="flight entries" />
    <div className="dd-toolbar"><label className="dd-search"><Search size={15} aria-hidden="true"/>
      <span className="sr-only">Search flights</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search flight, mission or route…"/></label></div>
    <div className="dd-table-scroll"><table className="dd-table"><thead><tr>
      <th>Flight</th><th>Mission</th><th>Route</th><th>Departure</th><th>Status</th><th>Action</th>
    </tr></thead><tbody>{visible.map((f) => <tr key={f.id}>
      <td><strong>{f.id}</strong></td><td>{f.missionId}</td><td>{f.route}</td><td>{formatDroneDate(f.departure)}</td>
      <td><DetailBadge tone="green">{f.status}</DetailBadge></td>
      <td><button className="dd-inline-link" type="button" onClick={() => onOpen(f)}>View details</button></td>
    </tr>)}{!visible.length && <tr><td colSpan={6} className="dd-empty">No demo flight records for this drone.</td></tr>}</tbody></table></div>
  </DetailCard>;
}
