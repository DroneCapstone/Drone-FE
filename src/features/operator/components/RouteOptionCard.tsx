import { Icon } from '../../../components/ui/Icon';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { RouteOption } from '../types/operator';
import { DEFAULT_BATTERY_RESERVE_PCT } from '../utils/droneEligibility';
import { formatMissionTime } from '../utils/missionTiming';

/** This is presentation data from Operator Battery Inventory, not an allocation. */
export interface RelayHubInventoryView {
  hubId: string;
  hubName: string;
  requiredModel?: string;
  readyCount: number | null;
  inventoryState: 'loading' | 'error' | 'ready';
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
  const relay = Boolean(route.relayHubIds?.length);
  return relay ? 'Relay route' : 'Direct route';
}

export function RouteOptionCard({
  route,
  remainingBattery,
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
  const legs = (route.legDetails ?? []).map((leg, index) => ({
    from: leg.from_hub_name || (leg.from_hub_id != null ? resolveHubName?.(String(leg.from_hub_id)) : null) || leg.from_hub_code,
    to: leg.to_hub_name || (leg.to_hub_id != null ? resolveHubName?.(String(leg.to_hub_id)) : null) || leg.to_hub_code,
    distanceKm: leg.distance_km,
    energyWh: route.legs?.[index]?.predictedEnergyWh,
    batteryAfter: route.legs?.[index]?.endingSocPct,
  }));
  // Older API responses only provide leg IDs. Do not invent leg distances or energy.
  if (!legs.length && route.legs?.length) {
    route.legs.forEach((leg) => legs.push({
      from: resolveHubName?.(leg.fromHubId) ?? leg.fromHubId,
      to: resolveHubName?.(leg.toHubId) ?? leg.toHubId,
      distanceKm: Number.NaN,
      energyWh: leg.predictedEnergyWh,
      batteryAfter: leg.endingSocPct,
    }));
  }

  const routePath = route.routeString ||
    (legs.length ? [legs[0].from, ...legs.map((leg) => leg.to)].join(' → ') : route.name);

  return (
    <article className={`mission-route-card${selected ? ' is-selected' : ''}${expanded ? ' is-expanded' : ''}`}>
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
            <span className={`mission-route-chevron${expanded ? ' is-open' : ''}`}><Icon name="chevron" size={17} /></span>
          </span>
        </span>
        <span className="mission-route-path">{routePath}</span>
        <span className="mission-route-key-metrics">
          <span><small>Distance</small><strong>{Number.isFinite(route.distanceKm) ? `${route.distanceKm.toFixed(2)} km` : '—'}</strong></span>
          <span><small>Duration</small><strong>{Number.isFinite(route.predictedDurationMin) ? `${route.predictedDurationMin} min` : '—'}</strong></span>
          <span><small>Energy</small><strong>{displayEnergy(route.predictedEnergyWh)}</strong></span>
        </span>
      </button>

      {expanded && (
        <div className="mission-route-detail">
          <div className="mission-route-section-head">
            <strong>{hasRelay ? 'Relay Flight Plan' : 'Direct Flight Plan'}</strong>
            <small>{legs.length ? `${legs.length} ${legs.length === 1 ? 'leg' : 'legs'}` : ''}</small>
          </div>
          <div className="mission-route-legs">
            {legs.length ? legs.map((leg, index) => (
              <div className="mission-route-leg" key={`${route.id}-leg-${index}`}>
                <span className="mission-route-leg-number">{index + 1}</span>
                <div className="mission-route-leg-places">
                  <strong>{leg.from}</strong>
                  <span><Icon name="arrow" size={13} />{leg.to}</span>
                  {(leg.energyWh !== undefined || leg.batteryAfter !== undefined) && (
                    <small>{leg.energyWh !== undefined ? displayEnergy(leg.energyWh) : ''}{leg.energyWh !== undefined && leg.batteryAfter !== undefined ? ' · ' : ''}{leg.batteryAfter !== undefined ? `Battery after ${displayPct(leg.batteryAfter)}` : ''}</small>
                  )}
                </div>
                {Number.isFinite(leg.distanceKm) && <span className="mission-route-leg-distance">{leg.distanceKm.toFixed(2)} km</span>}
              </div>
            )) : (
              <p className="mission-route-muted">Flight leg details are not available.</p>
            )}
          </div>

          {hasRelay && (
            <section className="mission-route-battery-section">
              <div className="mission-route-section-head">
                <strong>Matching Ready batteries</strong>
              </div>
              {relayHubs.map((hub) => (
                <div className="mission-route-battery-hub" key={hub.hubId}>
                  <div className="mission-route-battery-hub-head">
                    <strong>{hub.hubName}</strong>
                    <a
                      href={`/operator/fleet-hubs/batteries?hub=${encodeURIComponent(hub.hubId)}`}
                      className="text-button"
                      onClick={(event) => event.stopPropagation()}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Battery Inventory ↗
                    </a>
                  </div>
                  <div className="mission-route-battery-metrics">
                    <div>
                      <small>Match Found</small>
                      <strong>{hub.inventoryState !== 'ready' || !hub.requiredModel ? '—' : (hub.readyCount ?? 0) > 0 ? hub.requiredModel : 'No match'}</strong>
                      {hub.requiredModel && (hub.readyCount === 0 || hub.inventoryState !== 'ready') && <span className="mission-route-muted">{hub.requiredModel}</span>}
                    </div>
                    <div>
                      <small>Batteries Available</small>
                      <strong>{hub.inventoryState === 'ready' && hub.requiredModel ? hub.readyCount ?? 0 : '—'}</strong>
                    </div>
                  </div>
                  {hub.inventoryState === 'error' && <p className="mission-route-muted">Could not load battery availability.</p>}
                  {hub.inventoryState === 'loading' && <p className="mission-route-muted">Loading batteries…</p>}
                  {hub.inventoryState === 'ready' && !hub.requiredModel && <p className="mission-route-muted">Battery model unavailable.</p>}
                  {hub.inventoryState === 'ready' && hub.requiredModel && hub.readyCount === 0 && <p className="mission-route-muted">No matching Ready batteries at this Hub.</p>}
                </div>
              ))}
            </section>
          )}

          <section className="mission-route-energy-section">
            <div className="mission-route-section-head"><strong>Energy & timing</strong></div>
            <div className="mission-route-detail-grid">
              <span><small>Battery use</small><strong>{hasRelay ? 'Per leg' : displayPct(route.batteryConsumptionPct)}</strong></span>
              <span><small>Battery after</small><strong>{displayPct(remainingBattery)}</strong></span>
              <span><small>Minimum reserve</small><strong>{DEFAULT_BATTERY_RESERVE_PCT}%</strong></span>
              <span><small>Risk</small><strong>{route.risk}</strong></span>
              <span><small>Planned start</small><strong>{formatMissionTime(plannedStartAt)}</strong></span>
              <span><small>Estimated arrival</small><strong>{formatMissionTime(estimatedArrivalAt)}</strong></span>
            </div>
          </section>
        </div>
      )}

      <div className="mission-route-footer">
        <strong>{route.confidencePct}% confidence</strong>
        <button type="button" className="text-button" onClick={onViewDetails}>View AI details</button>
      </div>
    </article>
  );
}
