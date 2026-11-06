import { useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import type { DroneFlightRecord } from './droneDetailData';
import { formatDroneDate, getDemoFlightSummary } from './droneDetailData';
import { DetailBadge, DetailCard } from './DroneDetailUI';

export function DroneFlightHistoryTab({ droneId, flights, lastRecordedFlight, onOpen }: {
  droneId: string;
  flights: DroneFlightRecord[];
  lastRecordedFlight?: string;
  onOpen: (record: DroneFlightRecord) => void;
}) {
  const [query, setQuery] = useState('');
  const visible = flights.filter((f) => `${f.id} ${f.missionId} ${f.route}`.toLowerCase().includes(query.trim().toLowerCase()));
  const summary = getDemoFlightSummary(droneId, flights);
  const latest = summary.latest ?? lastRecordedFlight;
  return <div className="dd-tab-stack">
    <div className="dd-kpis dd-kpis--three">
      <div className="dd-kpi"><span>Total flights (mock)</span><strong>{summary.count}</strong><small>Historical mock aggregate</small></div>
      <div className="dd-kpi"><span>Flight hours (mock)</span><strong>{summary.hours == null ? '—' : `${summary.hours} h`}</strong><small>Cumulative mock data</small></div>
      <div className="dd-kpi"><span>Latest flight</span><strong className="dd-kpi-date">{formatDroneDate(latest).split(',')[0]}</strong><small>{formatDroneDate(latest).split(',')[1]?.trim() ?? '—'}</small></div>
    </div>
    <DetailCard eyebrow="FLIGHT SUMMARY" title="Flight history" className="dd-tab-panel">
      <div className="dd-toolbar"><label className="dd-search"><Search size={15} aria-hidden="true"/>
        <span className="sr-only">Search flights</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search flight, mission or route…"/></label>
        <span className="dd-toolbar-meta">{visible.length} sample records · Read only</span>
      </div>
      <div className="dd-table-scroll"><table className="dd-table"><thead><tr>
        <th>Flight ID</th><th>Mission</th><th>Route</th><th>Departure</th><th>Status</th><th>Action</th>
      </tr></thead><tbody>{visible.map((f) => <tr key={f.id}>
        <td><strong>{f.id}</strong></td><td>{f.missionId}</td><td>{f.route}</td><td>{formatDroneDate(f.departure)}</td>
        <td><DetailBadge tone="green">{f.status}</DetailBadge></td>
        <td><button className="dd-action-link" type="button" onClick={() => onOpen(f)}>View details <ArrowRight size={13} aria-hidden="true"/></button></td>
      </tr>)}{!visible.length && <tr><td colSpan={6} className="dd-empty">No matching flight records.</td></tr>}</tbody></table></div>
    </DetailCard>
  </div>;
}
