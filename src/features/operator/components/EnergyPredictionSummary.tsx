import { Icon } from '../../../components/ui/Icon';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { RouteOption } from '../types/operator';
import { DEFAULT_BATTERY_RESERVE_PCT, getEnergyFeasibility } from '../utils/droneEligibility';
import { formatMissionTime } from '../utils/missionTiming';

export function EnergyPredictionSummary({
  route,
  plannedStartAt,
  estimatedArrivalAt,
}: {
  route: RouteOption;
  plannedStartAt?: Date;
  estimatedArrivalAt?: Date;
}) {
  const { remainingBattery, feasible } = getEnergyFeasibility(route);
  const hasRelay = Boolean(route.relayHubIds?.length);

  return (
    <div className="energy-summary">
      <div className="energy-summary-head">
        <span className="energy-summary-icon"><Icon name="battery" size={18} /></span>
        <div><small>Predicted energy</small><strong>{route.predictedEnergyWh.toFixed(1)} Wh</strong></div>
        <StatusBadge tone={feasible ? 'success' : 'danger'}>
          {feasible ? `${route.confidencePct}% confidence` : hasRelay ? 'Relay plan unverified' : 'Insufficient reserve'}
        </StatusBadge>
      </div>

      <div className="energy-summary-grid">
        <span><small>Predicted battery use</small><strong>{hasRelay ? 'Per leg' : `${route.batteryConsumptionPct}%`}</strong></span>
        <span><small>Expected remaining</small><strong>{Number.isFinite(remainingBattery) ? `${remainingBattery}%` : '—'}</strong></span>
        <span><small>Minimum reserve</small><strong>{DEFAULT_BATTERY_RESERVE_PCT}%</strong></span>
        {plannedStartAt && <span><small>Planned start</small><strong>{formatMissionTime(plannedStartAt)}</strong></span>}
        {estimatedArrivalAt && <span><small>Estimated arrival</small><strong>{formatMissionTime(estimatedArrivalAt)}</strong></span>}
      </div>
    </div>
  );
}
