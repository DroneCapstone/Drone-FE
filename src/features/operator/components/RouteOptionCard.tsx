import { formatHubName, formatRouteName, formatBackendLabel } from '../utils/displayEnglish';
import { Icon } from '../../../components/ui/Icon';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { RouteOption } from '../types/operator';
import { DEFAULT_BATTERY_RESERVE_PCT } from '../utils/droneEligibility';
import { getRouteLegBatteryUse } from '../utils/routeBatteryUse';
import { formatMissionTime } from '../utils/missionTiming';

/** Relay Hub labels only; allocation & availability come from BE Analyze. */
export interface RelayHubInventoryView {
  hubId: string;
  hubName: string;
}

interface RouteOptionCardProps {
  route: RouteOption;
  remainingBattery: number;
  selected?: boolean;
  expanded?: boolean;
  plannedStartAt: Date;
  estimatedArrivalAt: Date;
  relayHubs?: RelayHubInventoryView[];
  resolveHubName?: (hubId: string) => string;
  onSelect?: () => void;
  onViewDetails?: () => void;
}

const displayEnergy = (value?: number) =>
  typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)} Wh` : '—';

const displayPct = (value?: number) =>
  typeof value === 'number' && Number.isFinite(value) ? `${value}%` : '—';

function getRouteLabel(route: RouteOption) {
  // BE v8.5 supplies presentation titles for ECO, FAST, SAFE and other strategies.
  // Retain the old label as a fallback for earlier API responses.
  const backendTitle = route.displayTitle?.trim();
  if (backendTitle) return backendTitle;
  const relay = Boolean(route.relayHubIds?.length);
  return relay ? 'Relay route' : 'Direct route';
}

export function RouteOptionCard({
  route,
  selected = false,
  expanded = false,
  plannedStartAt,
  estimatedArrivalAt,
  relayHubs = [],
  resolveHubName,
  onSelect,
  onViewDetails,
}: RouteOptionCardProps) {
  const hasRelay = Boolean(route.relayHubIds?.length);
  const legBatteryUse = getRouteLegBatteryUse(route);
  const hasDispatch = route.legDetails?.some(leg => leg.is_dispatch || leg.leg_type?.toUpperCase() === 'DISPATCH') === true;
  const legs = (route.legDetails ?? []).map((leg, index) => ({
    from: leg.from_hub_name || (leg.from_hub_id != null ? resolveHubName?.(String(leg.from_hub_id)) : null) || leg.from_hub_code,
    to: leg.to_hub_name || (leg.to_hub_id != null ? resolveHubName?.(String(leg.to_hub_id)) : null) || leg.to_hub_code,
    distanceKm: leg.distance_km,
    energyWh: leg.energy_wh ?? route.legs?.[index]?.predictedEnergyWh,
    batteryId: leg.battery_id ?? route.legs?.[index]?.batteryId,
    energyConsumptionPct: legBatteryUse[index]?.batteryUsePct,
    batteryChargePct: leg.battery_charge_pct ?? route.legs?.[index]?.batteryChargePct,
    isDispatch: leg.is_dispatch === true || leg.leg_type?.toUpperCase() === 'DISPATCH',
  }));
  // Older API responses only provide leg IDs. Do not invent leg distances or energy.
  if (!legs.length && route.legs?.length) {
    route.legs.forEach((leg, index) => legs.push({
      from: resolveHubName?.(leg.fromHubId) ?? leg.fromHubId,
      to: resolveHubName?.(leg.toHubId) ?? leg.toHubId,
      distanceKm: Number.NaN,
      energyWh: leg.predictedEnergyWh,
      batteryId: leg.batteryId,
      energyConsumptionPct: legBatteryUse[index]?.batteryUsePct,
      batteryChargePct: leg.batteryChargePct,
      isDispatch: false,
    }));
  }

  // Prefer the leg geometry from BE for the visible hub-to-hub route.
  // Hide parenthetical metadata (speed, altitude, algorithm tags) only in this UI;
  // preserve route.routeString unchanged for BE and AI analysis.
  const routePath = legs.length
    ? [legs[0].from, ...legs.map((leg) => leg.to)].map((name) => formatHubName(name)).join(' → ')
    : formatRouteName((route.routeString || route.name).split('(')[0].trim());

  return (
    <article className={`mission-route-card${selected ? ' is-selected' : ''}${expanded ? ' is-expanded' : ''}`}>
      <div className="mission-route-overview">
      <button
        type="button"
        className="mission-route-select"
        onClick={onSelect}
        aria-pressed={selected}
        aria-expanded={expanded}
        aria-label={`Select and ${expanded ? 'collapse' : 'expand'} ${getRouteLabel(route)} ${route.id}`}
      >
        <span className="mission-route-head">
          <span className="mission-route-heading">
            <span className={`mission-route-radio${selected ? ' is-checked' : ''}`} aria-hidden="true">
              {selected && <Icon name="check" size={12} />}
            </span>
            <span className="mission-route-heading-text">
              <strong>{getRouteLabel(route)}</strong>
              <small>{route.id}</small>
            </span>
          </span>
          <span className="mission-route-tags">
            {route.recommended && <StatusBadge tone="success">AI Recommended</StatusBadge>}
            {route.isSelectable === false && <span title={formatBackendLabel(route.unselectableReason || route.infeasibleReason) || 'Route is not selectable'} className="mission-route-muted">Not selectable</span>}
            <span className={`mission-route-chevron${expanded ? ' is-open' : ''}`}><Icon name="chevron" size={17} /></span>
          </span>
        </span>
        <span className="mission-route-path">{routePath}</span>
        <span className="mission-route-key-metrics">
          <span><small>Distance</small><strong>{Number.isFinite(route.distanceKm) ? `${route.distanceKm.toFixed(2)} km` : '—'}</strong></span>
          <span><small>Duration</small><strong>{Number.isFinite(route.predictedDurationMin) ? `${route.predictedDurationMin} min` : '—'}</strong></span>
          <span><small>Total estimated energy</small><strong>{displayEnergy(route.predictedEnergyWh)}</strong></span>
        </span>
      </button>
      <button type="button" className="text-button mission-route-ai-details" onClick={onViewDetails}>
        View AI details
      </button>
      </div>

      {expanded && (
        <div className="mission-route-detail">
          <div className="mission-route-section-head">
            <strong>{hasRelay ? 'Relay Flight Plan' : hasDispatch ? 'Flight Plan' : 'Direct Flight Plan'}</strong>
            <small>{legs.length ? `${legs.length} ${legs.length === 1 ? 'leg' : 'legs'}` : ''}</small>
          </div>
          <div className="mission-route-legs">
            {legs.length ? legs.map((leg, index) => (
              <div className="mission-route-leg" key={`${route.id}-leg-${index}`}>
                <div className="mission-route-leg-heading">
                  <span className="mission-route-leg-number">Leg {index + 1}</span>
                  <div className="mission-route-leg-places">
                    <strong>{formatHubName(leg.from)} → {formatHubName(leg.to)}</strong>
                    {leg.isDispatch && <small>Dispatch flight · 0 kg (no package)</small>}
                  </div>
                  {Number.isFinite(leg.distanceKm) && (
                    <span className="mission-route-leg-distance">{leg.distanceKm.toFixed(2)} km</span>
                  )}
                </div>
                <div className="mission-route-leg-metrics">
                  <span><small>Starting charge</small><strong>{displayPct(leg.batteryChargePct)}</strong></span>
                  <span><small>Energy consumption</small><strong className="mission-route-leg-consumption">{displayPct(leg.energyConsumptionPct)}</strong></span>
                  <span><small>Estimated energy required</small><strong>{displayEnergy(leg.energyWh)}</strong></span>
                  <span>
                    <small>{index === 0 ? 'Departure battery' : hasRelay ? 'Relay battery' : 'Assigned battery'}</small>
                    <strong className="mission-route-leg-assigned-battery">{leg.batteryId || 'Not assigned'}</strong>
                  </span>
                </div>
              </div>
            )) : (
              <p className="mission-route-muted">Flight leg details are not available.</p>
            )}
          </div>

          {hasRelay && (
            <section className="mission-route-battery-section">
              <div className="mission-route-section-head">
                <strong>Relay battery details</strong>
              </div>
              {relayHubs.map((hub) => {
                const allocation = route.relayBatteryPlan?.find((item) => item.hubId === hub.hubId);
                const nextLegBattery = route.legs?.find((leg) => leg.fromHubId === hub.hubId);
                const batteryId = allocation?.swapBatteryId ?? nextLegBattery?.batteryId;
                const model = allocation?.selectedBatteryModel ?? nextLegBattery?.batteryModel ?? allocation?.batteryModel;
                const energy = allocation?.selectedBatteryEnergyWh ?? nextLegBattery?.batteryEnergyWh;
                const detailedLegIndex = route.legDetails?.findIndex((leg) => String(leg.from_hub_id) === hub.hubId) ?? -1;
                const mappedLegIndex = route.legs?.findIndex((leg) => leg.fromHubId === hub.hubId) ?? -1;
                const outgoingLegIndex = detailedLegIndex >= 0 ? detailedLegIndex : mappedLegIndex;
                return (
                  <div className="mission-route-battery-hub" key={hub.hubId}>
                    <div className="mission-route-battery-hub-head">
                      <strong>{formatHubName(hub.hubName)}</strong>
                      <a
                        href={`/operator/fleet-hubs/batteries?hub=${encodeURIComponent(hub.hubId)}`}
                        className="text-button"
                        onClick={(event) => event.stopPropagation()}
                        target="_blank"
                        rel="noopener noreferrer"
                      >View Battery</a>
                    </div>
                    <p className="mission-route-battery-context">
                      {batteryId
                        ? `Details of the battery automatically assigned to ${outgoingLegIndex >= 0 ? `Leg ${outgoingLegIndex + 1}` : 'the next flight leg'}`
                        : 'Relay battery assignment is not available'}
                    </p>
                    <div className="mission-route-battery-metrics">
                      <div><small>Battery model</small><strong>{model || '—'}</strong></div>
                      <div><small>Available energy</small><strong>{displayEnergy(energy)}</strong></div>
                    </div>
                    {!batteryId && <p className="mission-route-muted">No eligible relay battery has been assigned for this route.</p>}
                  </div>
                );
              })}
            </section>
          )}

          <section className="mission-route-energy-section">
            <div className="mission-route-section-head"><strong>Schedule & safety</strong></div>
            <div className="mission-route-detail-grid mission-route-safety-grid">
              <span><small>Planned start</small><strong>{formatMissionTime(plannedStartAt)}</strong></span>
              <span><small>Estimated arrival</small><strong>{formatMissionTime(estimatedArrivalAt)}</strong></span>
              <span><small>Minimum reserve</small><strong>{DEFAULT_BATTERY_RESERVE_PCT}%</strong></span>
              <span><small>Risk</small><strong className={`mission-route-risk-${route.risk.toLowerCase()}`}>{route.risk}</strong></span>
            </div>
          </section>
        </div>
      )}

    </article>
  );
}
