import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { missions as allMissions } from '../data/mockOperatorData';
import type { Mission } from '../types/operator';

export function MissionTable({ compact = false, items = allMissions }: { compact?: boolean; items?: Mission[] }) {
  const navigate = useNavigate();
  const rows = compact ? items.slice(0, 3) : items;

  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Mission</th><th>Order</th><th>Drone</th><th>Route</th><th>Status</th><th>ETA</th><th>Energy</th><th /></tr></thead>
        <tbody>{rows.map((mission) => (
          <tr key={mission.id} onClick={() => navigate(`/operator/missions/${mission.id}`)}>
            <td><strong>{mission.id}</strong><small>{mission.type} · {mission.name}</small></td>
            <td><button type="button" className="inline-link" onClick={(event) => { event.stopPropagation(); navigate(`/operator/orders/${mission.orderId}`); }}>{mission.orderId}</button></td>
            <td><span className="drone-id">{mission.drone}</span></td>
            <td>{mission.route}</td>
            <td><StatusBadge tone={mission.tone}>{mission.status}</StatusBadge>{mission.scheduleState === 'Delayed' && <small className="table-substatus">Delayed</small>}</td>
            <td>{mission.eta}</td>
            <td><strong>{mission.estimatedEnergyWh.toFixed(1)} Wh</strong><small>{mission.battery}% battery after</small></td>
            <td><button className="row-action" aria-label={`Open ${mission.id}`}>Open</button></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
