import { StatusBadge } from '../../../components/ui/StatusBadge';
import { operatorHubs } from '../data/hubMockData';
import type { RouteOption } from '../types/operator';
import { formatMissionTime } from '../utils/missionTiming';

interface RouteOptionCardProps {
  route: RouteOption;
  remainingBattery: number;
  feasible: boolean;
  selected?: boolean;
  plannedStartAt: Date;
  estimatedArrivalAt: Date;
  relayBatteryReady?: boolean;
  relayBatterySummary?: string;
  onSelect?: () => void;
  onViewDetails?: () => void;
}

function relayLabel(route: RouteOption) {
  if (!route.relayHubIds?.length) return 'Direct';
  return route.relayHubIds
    .map((hubId) => operatorHubs.find((hub) => hub.id === hubId)?.name ?? hubId)
    .join(' → ');
}

export function RouteOptionCard({
  route,
  remainingBattery,
  feasible,
  selected = false,
  plannedStartAt,
  estimatedArrivalAt,
  relayBatteryReady = true,
  relayBatterySummary,
  onSelect,
  onViewDetails,
}: RouteOptionCardProps) {
  return (
    <article className={`route-option-card selectable-card ${selected ? 'active' : ''} ${!feasible || !relayBatteryReady ? 'disabled-card' : ''}`}>
      <button
        type="button"
        className="route-option-main"
        disabled={!feasible || !relayBatteryReady}
        onClick={onSelect}
        aria-pressed={selected}
      >
        <div className="route-option-head">
          <div>
            <span className="eyebrow">{route.id}</span>
            <strong>{route.name}</strong>
          </div>
          <div className="route-option-badges">
            {route.recommended && <StatusBadge tone="success">AI Recommended</StatusBadge>}
            {route.relayHubIds?.length ? <StatusBadge tone="info">Relay route</StatusBadge> : null}
            {!feasible && <StatusBadge tone="danger">Low reserve</StatusBadge>}
            {route.relayHubIds?.length ? (
              <StatusBadge tone={relayBatteryReady ? 'success' : 'danger'}>
                {relayBatteryReady ? 'Relay battery ready' : 'No compatible relay battery'}
              </StatusBadge>
            ) : null}
          </div>
        </div>

        <div className="route-option-grid route-option-grid-extended">
          <span><small>Flight path</small><strong>{route.relayHubIds?.length ? `Via ${relayLabel(route)}` : 'Direct'}</strong></span>
          <span><small>Distance</small><strong>{route.distanceKm} km</strong></span>
          <span><small>Predicted duration</small><strong>{route.predictedDurationMin} min</strong></span>
          <span><small>Predicted energy</small><strong>{route.predictedEnergyWh.toFixed(1)} Wh</strong></span>
          <span><small>Battery use</small><strong>{route.batteryConsumptionPct}%</strong></span>
          <span><small>Battery after</small><strong>{remainingBattery}%</strong></span>
          <span><small>Risk</small><strong>{route.risk}</strong></span>
          <span><small>Planned start</small><strong>{formatMissionTime(plannedStartAt)}</strong></span>
          <span><small>Estimated arrival</small><strong>{formatMissionTime(estimatedArrivalAt)}</strong></span>
        </div>
      </button>

      <div className="route-option-footer">
        <span>
          <strong>{route.confidencePct}% confidence</strong>
          <small>
            {route.relayHubIds?.length && route.relayStopMinutes
              ? `${route.weatherImpact} Relay stop ~${route.relayStopMinutes} min.${relayBatterySummary ? ` ${relayBatterySummary}` : ''}`
              : route.weatherImpact}
          </small>
        </span>
        <button type="button" className="text-button" onClick={onViewDetails}>View AI details</button>
      </div>
    </article>
  );
}
