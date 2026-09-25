import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { Hub, OperatorDrone } from '../types/operator';

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
            <th>Technical</th>
            <th>Max payload</th>
          </tr>
        </thead>
        <tbody>
          {drones.map((drone) => (
            <tr key={drone.id}>
              <td>
                <strong>{`${drone.name}-${drone.displayId}`}</strong>
              </td>
              <td>{drone.model}</td>
              <td>{hubNameById.get(drone.hubId) ?? drone.hubId}</td>
              <td>
                <StatusBadge tone={drone.technicalStatus === 'Available' ? 'success' : 'warning'}>
                  {drone.technicalStatus}
                </StatusBadge>
              </td>
              <td>{drone.maxPayloadKg} kg</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
