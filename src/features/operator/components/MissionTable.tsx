import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import './mission-table.css';
import type { Mission } from '../types/operator';

export function MissionTable({
  compact = false,
  items,
  showNumbers = false,
  startIndex = 0,
}: {
  compact?: boolean;
  items: Mission[];
  showNumbers?: boolean;
  startIndex?: number;
}) {
  const navigate = useNavigate();
  const rows = compact ? items.slice(0, 3) : items;

  return (
    <div className="table-wrap">
      <table className={showNumbers ? 'mission-table mission-table--numbered' : 'mission-table'}>
        <thead><tr>{showNumbers && <th scope="col" className="mission-number-heading">No.</th>}<th>Mission</th><th>Order</th><th>Drone</th><th>Route</th><th>Status</th><th>ETA</th><th>Energy</th><th /></tr></thead>
        <tbody>{rows.map((mission, index) => (
          <tr key={mission.id} onClick={() => navigate(`/operator/missions/${mission.id}`)}>
            {/* Display-only index after current filters + pagination; no change to Mission ID/API. */}
            {showNumbers && <td className="mission-number-cell">{startIndex + index + 1}</td>}
            <td><strong>{mission.id}</strong></td>
            <td><button type="button" className="inline-link" onClick={(event) => { event.stopPropagation(); navigate(`/operator/orders/${mission.orderId}`); }}>{mission.orderId}</button></td>
            <td><span className="drone-id">{mission.drone}</span></td>
            <td>{mission.route}</td>
            <td><StatusBadge tone={mission.tone}>{mission.status}</StatusBadge>{mission.scheduleState === 'Delayed' && <small className="table-substatus">Delayed</small>}</td>
            <td>{mission.eta}</td>
            <td><strong>{Number.isFinite(mission.estimatedEnergyWh) ? `${mission.estimatedEnergyWh.toFixed(1)} Wh` : '—'}</strong><small>{Number.isFinite(mission.battery) ? `${mission.battery}% battery after` : 'Battery not reported'}</small></td>
            <td><button className="row-action" aria-label={`Open ${mission.id}`}>Open</button></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
