import { OperatorTable, TableHeader, TableBody, TableRow, TableHead, TableCell } from './OperatorTable';
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
    <div className="table-wrap drone-availability-table-wrap">
      <OperatorTable className="drone-availability-table">
        <colgroup>
          <col />
          <col />
          <col />
          <col />
          <col />
          <col />
          <col />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>Drone</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Hub</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Battery</TableHead>
            <TableHead>Max payload</TableHead>
            <TableHead>Utilization</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drones.map((drone) => (
            <TableRow key={drone.id}>
              <TableCell data-label="Drone"><strong>{`${drone.name}-${drone.displayId}`}</strong></TableCell>
              <TableCell data-label="Model">{drone.model}</TableCell>
              <TableCell data-label="Hub">{drone.hubName || hubNameById.get(drone.hubId) || drone.hubId || '—'}</TableCell>
              <TableCell data-label="Status"><StatusBadge tone={statusTone(drone.technicalStatus)}>{drone.technicalStatus}</StatusBadge></TableCell>
              <TableCell data-label="Battery">{drone.batteryLevelPct === undefined ? '—' : `${drone.batteryLevelPct}%`}</TableCell>
              <TableCell data-label="Max payload">{drone.maxPayloadKg} kg</TableCell>
              <TableCell data-label="Utilization">{drone.utilizationPct === undefined ? '—' : `${drone.utilizationPct}%`}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </OperatorTable>
    </div>
  );
}
