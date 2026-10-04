import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { Hub, OperatorDrone } from '../types/operator';

function statusTone(status: OperatorDrone['technicalStatus']) {
  if (status === 'Available') return 'success' as const;
  if (status === 'In Flight') return 'info' as const;
  return 'warning' as const;
}

export function DroneAvailabilityTable({ drones, hubs }: { drones: OperatorDrone[]; hubs: Hub[] }) {
  const hubNameById = new Map(hubs.map((hub) => [hub.id, hub.name]));

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Drone</th>
            <th>Model</th>
            <th>Hub</th>
            <th>Status</th>
            <th>Battery</th>
            <th>Max payload</th>
            <th>Utilization</th>
          </tr>
        </thead>
        <tbody>
          {drones.map((drone) => (
            <tr key={drone.id}>
              <td><strong>{`${drone.name}-${drone.displayId}`}</strong></td>
              <td>{drone.model}</td>
              <td>{drone.hubName || hubNameById.get(drone.hubId) || drone.hubId || '—'}</td>
              <td><StatusBadge tone={statusTone(drone.technicalStatus)}>{drone.technicalStatus}</StatusBadge></td>
              <td>{drone.batteryLevelPct === undefined ? '—' : `${drone.batteryLevelPct}%`}</td>
              <td>{drone.maxPayloadKg} kg</td>
              <td>{drone.utilizationPct === undefined ? '—' : `${drone.utilizationPct}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
