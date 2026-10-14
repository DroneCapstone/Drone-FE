import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { RouteOption } from '../types/operator';
import { formatMissionTime } from '../utils/missionTiming';

interface RouteOptionCardProps {
  route: RouteOption;
  remainingBattery: number;
  feasible: boolean;
  selected?: boolean;
  plannedStartAt: Date;
  estimatedArrivalAt: Date;
  relayBatterySummary?: string;
  resolveHubName?: (hubId: string) => string;
  onSelect?: () => void;
  onViewDetails?: () => void;
}

function relayLabel(route: RouteOption, resolveHubName?: (hubId: string) => string) {
  if (!route.relayHubIds?.length) return 'Direct';
  return route.relayHubIds
    .map((hubId) => resolveHubName?.(hubId) ?? hubId)
    .join(' → ');
}

export function RouteOptionCard({
  route,
  remainingBattery,
  feasible,
  selected = false,
  plannedStartAt,
  estimatedArrivalAt,
  relayBatterySummary,
  resolveHubName,
  onSelect,
  onViewDetails,
}: RouteOptionCardProps) {
  return (
    <article
      className={`route-option-card selectable-card ${selected ? 'active' : ''}`}
      style={{ position: 'relative' }}
    >
      {/* Full-card click target, including the footer. View AI details stays a separate button. */}
      <button
        type="button"
        className="route-option-main"
        style={{ position: 'absolute', inset: 0, height: '100%', zIndex: 1, borderRadius: 'inherit' }}
        onClick={onSelect}
        aria-label={`Select route ${route.name} (${route.id})`}
        aria-pressed={selected}
      />

      <div className="route-option-head">
        <div>
          <span className="eyebrow">{route.id}</span>
          <strong>{route.name}</strong>
        </div>
        <div className="route-option-badges">
          {route.recommended && <StatusBadge tone="success">AI Recommended</StatusBadge>}
          {route.relayHubIds?.length ? <StatusBadge tone="info">Relay route</StatusBadge> : null}
          {!feasible && (
            <StatusBadge tone={route.relayHubIds?.length ? 'warning' : 'danger'}>
              {route.relayHubIds?.length ? 'Relay unverified' : 'Low reserve'}
            </StatusBadge>
          )}
        </div>
      </div>

      <div className="route-option-grid route-option-grid-extended">
        <span><small>Flight path</small><strong>{route.relayHubIds?.length ? `Via ${relayLabel(route, resolveHubName)}` : 'Direct'}</strong></span>
        <span><small>Distance</small><strong>{route.distanceKm} km</strong></span>
        <span><small>Predicted duration</small><strong>{route.predictedDurationMin} min</strong></span>
        <span><small>Predicted energy</small><strong>{route.predictedEnergyWh.toFixed(1)} Wh</strong></span>
        <span><small>Battery use</small><strong>{route.relayHubIds?.length ? 'Per leg' : `${route.batteryConsumptionPct}%`}</strong></span>
        <span><small>Battery after</small><strong>{Number.isFinite(remainingBattery) ? `${remainingBattery}%` : '—'}</strong></span>
        <span><small>Risk</small><strong>{route.risk}</strong></span>
        <span><small>Planned start</small><strong>{formatMissionTime(plannedStartAt)}</strong></span>
        <span><small>Estimated arrival</small><strong>{formatMissionTime(estimatedArrivalAt)}</strong></span>
      </div>

      <div className="route-option-footer">
        <span>
          <strong>{route.confidencePct}% confidence</strong>
          <small>
            {route.relayHubIds?.length && route.relayStopMinutes
              ? `${route.weatherImpact} Relay stop ~${route.relayStopMinutes} min.${relayBatterySummary ? ` ${relayBatterySummary}` : ''}`
              : route.weatherImpact}
          </small>
        </span>
        <button
          type="button"
          className="text-button"
          style={{ position: 'relative', zIndex: 2 }}
          onClick={onViewDetails}
        >
          View AI details
        </button>
      </div>
    </article>
  );
}
