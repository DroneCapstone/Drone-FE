import { formatHubName } from '../utils/displayEnglish';
import { OperatorTable, TableHeader, TableBody, TableRow, TableHead, TableCell } from './OperatorTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { Hub, OperatorDrone } from '../types/operator';

function statusTone(status: OperatorDrone['technicalStatus']) {
  if (status === 'Available') return 'success' as const;
  if (status === 'In Flight') return 'info' as const;
  return 'warning' as const;
}

export function DroneAvailabilityTable({ drones, hubs, startIndex = 0 }: { drones: OperatorDrone[]; hubs: Hub[]; startIndex?: number }) {
  const hubNameById = new Map(hubs.map((hub) => [hub.id, hub.name]));

  return (
    <div className="table-wrap drone-availability-table-wrap">
      <OperatorTable className="drone-availability-table">
        <colgroup>
          <col /> {/* No. */}
          <col />
          <col />
          <col />
          <col />
          <col />
          <col />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead className="operator-number-heading" scope="col">No.</TableHead>
            <TableHead>Drone</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Hub</TableHead>
            <TableHead>Battery</TableHead>
            <TableHead>Max payload</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drones.map((drone, index) => (
            <TableRow key={drone.id}>
              <TableCell className="operator-number-cell" data-label="No.">{startIndex + index + 1}</TableCell>
              <TableCell data-label="Drone"><strong>{drone.id}</strong></TableCell>
              <TableCell data-label="Model">{drone.model}</TableCell>
              <TableCell data-label="Hub">{formatHubName(drone.hubName || hubNameById.get(drone.hubId)) || drone.hubId || '—'}</TableCell>
              <TableCell data-label="Battery">{drone.batteryLevelPct === undefined ? '—' : `${drone.batteryLevelPct}%`}</TableCell>
              <TableCell data-label="Max payload">{drone.maxPayloadKg} kg</TableCell>
              <TableCell data-label="Status"><StatusBadge tone={statusTone(drone.technicalStatus)}>{drone.technicalStatus}</StatusBadge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </OperatorTable>
    </div>
  );
}
