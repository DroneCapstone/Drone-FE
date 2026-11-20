import { formatRouteName } from '../utils/displayEnglish';
import { OperatorTable, TableHeader, TableBody, TableRow, TableHead, TableCell } from './OperatorTable';
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
      <OperatorTable className={showNumbers ? 'mission-table mission-table--numbered' : 'mission-table'}>
        <TableHeader>
          <TableRow>
            {showNumbers && <TableHead scope="col" className="mission-number-heading">No.</TableHead>}
            <TableHead>Mission</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Drone</TableHead>
            <TableHead>Route</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>ETA</TableHead>
            <TableHead>Energy</TableHead>
            <TableHead scope="col" className="mission-action-heading">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((mission, index) => (
            <TableRow key={mission.id} onClick={() => navigate(`/operator/missions/${mission.id}`)}>
              {/* Display-only index after current filters + pagination; no change to Mission ID/API. */}
              {showNumbers && <TableCell className="mission-number-cell">{startIndex + index + 1}</TableCell>}
              <TableCell><strong>{mission.id}</strong></TableCell>
              <TableCell>
                <button
                  type="button"
                  className="inline-link"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/operator/orders/${mission.orderId}`);
                  }}
                >
                  {mission.orderId}
                </button>
              </TableCell>
              <TableCell><span className="drone-id">{mission.drone}</span></TableCell>
              <TableCell>{formatRouteName(mission.route)}</TableCell>
              <TableCell>
                <StatusBadge tone={mission.tone}>{mission.status}</StatusBadge>
                {mission.scheduleState === 'Delayed' && <small className="table-substatus">Delayed</small>}
              </TableCell>
              <TableCell>{mission.eta}</TableCell>
              <TableCell>
                <strong>
                  {Number.isFinite(mission.estimatedEnergyWh)
                    ? `${mission.estimatedEnergyWh.toFixed(1)} Wh`
                    : '—'}
                </strong>
                <small>
                  {Number.isFinite(mission.battery)
                    ? `${mission.battery}% battery after`
                    : 'Battery not reported'}
                </small>
              </TableCell>
              <TableCell className="mission-action-cell">
                <button type="button" className="row-action" aria-label={`Open ${mission.id}`}>
                  Open
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </OperatorTable>
    </div>
  );
}
