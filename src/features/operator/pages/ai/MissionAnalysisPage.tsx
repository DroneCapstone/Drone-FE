import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { OperatorLoadingState } from '../../components/OperatorLoadingState';
import { OperatorPanel } from '../../components/OperatorPanel';
import { useMissionListQuery, useMissionPlanningAnalysisQuery } from '../../hooks/useMissionQueries';
import { useOperatorOrderQuery } from '../../hooks/useOrderQueries';
import type { RouteLegSnapshot, RouteOption, RoutePlanningExplanation, RouteWeatherConditions } from '../../types/operator';
import { formatBackendLabel, formatHubName, formatRouteName } from '../../utils/displayEnglish';
import { getEnergyFeasibility } from '../../utils/droneEligibility';
import { loadMissionDraft, updateMissionDraftRoute } from '../../utils/missionDraftStorage';
import { AiPageShell } from './AiPageShell';
import './mission-ai-explanation.css';

/** The page explains the chosen route; Create Mission already covers detailed route selection. */
function formatAmount(value: number | undefined, digits = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return Number(value.toFixed(digits)).toLocaleString('en-US', { maximumFractionDigits: digits });
}

function formatRouteTitle(route: RouteOption): string {
  const title = route.displayTitle || route.speedProfileLabel || route.name;
  return formatBackendLabel(title.split('(')[0]?.trim() || title);
}

function routePath(route: RouteOption): string | undefined {
  const legs = route.legDetails ?? [];
  if (legs.length) {
    const hubs = [legs[0].from_hub_name || legs[0].from_hub_code, ...legs.map((leg) => leg.to_hub_name || leg.to_hub_code)];
    return hubs.filter(Boolean).map(formatHubName).join(' → ');
  }
  return route.routeString ? formatRouteName(route.routeString.split('(')[0].trim()) : undefined;
}

function readableAiText(value: string, route?: RouteOption): string {
  const text = formatBackendLabel(value).replace(/\b([vV])\s*\^\s*2\b/g, '$1²');
  if (!route?.flightSpeedMps) return text;
  return text.replace(/\bCruise speed\s+\d+(?:\.\d+)?\s*m\/s\b/i,
    `Cruise speed ${formatAmount(route.flightSpeedMps * 3.6, 1)} km/h`);
}

/** Never create a ranking explanation that the planning API did not provide. */
function conclusionForRoute(route: RouteOption, decision?: RoutePlanningExplanation): string | undefined {
  if (route.recommended) {
    const reasons = decision?.reasonsSelected ?? [];
    const selectedReason = reasons.find((reason) => /cruise|speed|aerodynamic|drag|efficien/i.test(reason)) || reasons[0];
    return selectedReason ? readableAiText(selectedReason, route) : undefined;
  }
  const compared = route.comparisonVsRecommended?.differenceSummary;
  if (compared) return readableAiText(compared, route);
  return undefined;
}

function shapFactorLabel(feature: string): string {
  if (feature.toLowerCase().replace(/[\s_-]/g, '') === 'relativewindangle') return 'Relative wind angle';
  return formatBackendLabel(feature.replace(/_/g, ' '));
}

function shapInputForFeature(route: RouteOption, feature: string): string | undefined {
  const normalized = feature.toLowerCase().replace(/[\s_-]/g, '');
  // Wind speed is not the relative wind angle input of the SHAP model.
  if (normalized.includes('wind')) return undefined;
  const records = route.aiExplanation?.featureContributions ?? [];
  const matched = records.find((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
    const record = raw as Record<string, unknown>;
    const name = String(record.feature ?? record.feature_name ?? record.featureName ?? '');
    return name.toLowerCase().replace(/[\s_-]/g, '') === normalized;
  });
  if (!matched || typeof matched !== 'object' || Array.isArray(matched)) return undefined;
  const input = (matched as Record<string, unknown>).value;
  if (typeof input !== 'string' && typeof input !== 'number') return undefined;
  const text = String(input);
  if (normalized.includes('speed')) {
    const kmh = text.match(/(-?\d+(?:\.\d+)?)\s*km\/h/i);
    if (kmh) return `${formatAmount(Number(kmh[1]), 1)} km/h`;
    const mps = text.match(/(-?\d+(?:\.\d+)?)\s*m\/s/i);
    if (mps) return `${formatAmount(Number(mps[1]) * 3.6, 1)} km/h`;
  }
  if (normalized.includes('distance')) return undefined; // Already on route cards.
  return text.trim() || undefined;
}

function legHub(leg: RouteLegSnapshot, side: 'from' | 'to'): string {
  return formatHubName(side === 'from' ? leg.from_hub_name || leg.from_hub_code : leg.to_hub_name || leg.to_hub_code);
}

function recordValue(record: Record<string, unknown> | undefined, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function relaySwapAfter(route: RouteOption, leg: RouteLegSnapshot, next: RouteLegSnapshot): {
  hubName: string;
  batteryId?: string;
  batteryModel?: string;
} | null {
  const relay = (route.rawRelayBatteryStatus ?? []).find((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
    const item = raw as Record<string, unknown>;
    const hubId = recordValue(item, 'hub_id', 'hubId');
    const hubCode = recordValue(item, 'hub_code', 'hubCode');
    return (hubId !== undefined && leg.to_hub_id !== undefined && String(hubId) === String(leg.to_hub_id)) ||
      (hubCode !== undefined && String(hubCode) === leg.to_hub_code);
  });
  const record = relay && typeof relay === 'object' && !Array.isArray(relay)
    ? relay as Record<string, unknown> : undefined;
  const changedBattery = Boolean(leg.battery_id && next.battery_id && leg.battery_id !== next.battery_id);
  if (!changedBattery && !record) return null;
  const selectedId = recordValue(record, 'selected_battery_id', 'selectedBatteryId', 'swap_battery_id', 'swapBatteryId');
  const selectedModel = recordValue(record, 'selected_battery_model', 'selectedBatteryModel');
  return {
    hubName: legHub(leg, 'to'),
    batteryId: next.battery_id || (selectedId ? String(selectedId) : undefined),
    batteryModel: next.battery_model || (selectedModel ? String(selectedModel) : undefined),
  };
}

function weatherLabel(value?: number, unit = '', precision = 1): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(precision)}${unit}` : '—';
}

function routeFeasibility(route: RouteOption): string {
  if (route.feasible === false || route.isSelectable === false) return 'Unavailable';
  if (route.feasible === true) return 'Feasible';
  return 'Not confirmed';
}

export function MissionAnalysisPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: missions = [] } = useMissionListQuery();
  const returnToMission = searchParams.get('returnTo') === 'mission-create';
  const queryOrderId = searchParams.get('orderId') ?? '';
  const queryDroneId = searchParams.get('droneId') ?? '';
  const queryRouteId = searchParams.get('routeId') ?? '';
  const queryBatteryId = searchParams.get('batteryId') ?? '';
  const hasQueryContext = Boolean(queryOrderId && queryDroneId);
  const queryMission = missions.find((mission) => mission.orderId === queryOrderId && mission.droneId === queryDroneId && (!queryRouteId || mission.routeId === queryRouteId));
  const fallbackMission = missions.find((mission) => mission.type === 'Delivery');
  const selectedMission = queryMission || fallbackMission;
  const contextOrderId = hasQueryContext ? queryOrderId : selectedMission?.orderId ?? '';
  const contextDroneId = hasQueryContext ? queryDroneId : selectedMission?.droneId ?? '';
  const draft = returnToMission ? loadMissionDraft(queryOrderId) : undefined;
  const contextBatteryId = queryBatteryId || draft?.selectedBatteryId || selectedMission?.batteryId || '';
  const queryBundleIds = (searchParams.get('bundledOrderIds') ?? '').split(',').map((id) => id.trim()).filter(Boolean);
  const bundleIds = returnToMission ? draft?.bundledOrderIds ?? [] : queryBundleIds;
  const { data: order } = useOperatorOrderQuery(contextOrderId);
  const {
    data: planningAnalysis,
    error: planningAnalysisError,
    isFetching: isPlanningAnalysisFetching,
  } = useMissionPlanningAnalysisQuery(
    contextOrderId && contextDroneId && contextBatteryId
      ? { orderId: contextOrderId, droneId: contextDroneId, batteryId: contextBatteryId, ...(bundleIds.length ? { bundledOrderIds: bundleIds } : {}) }
      : null,
  );

  const routeOptions = planningAnalysis?.routes ?? [];
  const [selectedRouteId, setSelectedRouteId] = useState(queryRouteId || selectedMission?.routeId || '');
  const [weatherLegIndex, setWeatherLegIndex] = useState(0);
  const routeId = selectedRouteId || routeOptions.find((item) => item.recommended)?.id || routeOptions[0]?.id || '';
  const route = routeOptions.find((item) => item.id === routeId) ?? routeOptions[0];

  const changeRoute = (nextId: string) => {
    setSelectedRouteId(nextId);
    setWeatherLegIndex(0);
    const next = new URLSearchParams(searchParams);
    next.set('routeId', nextId);
    setSearchParams(next, { replace: true });
  };

  const useThisRoute = () => {
    if (!returnToMission || !order || !route || !getEnergyFeasibility(route).feasible) return;
    updateMissionDraftRoute(order.id, route.id);
    navigate(`/operator/missions/create?orderId=${order.id}&resume=1`);
  };

  if (isPlanningAnalysisFetching && !routeOptions.length) {
    return <AiPageShell active="/operator/ai/mission-analysis">
      <OperatorPanel title="Mission analysis"><OperatorLoadingState label="Analyzing flight routes…" /></OperatorPanel>
    </AiPageShell>;
  }
  if (planningAnalysisError || !route) {
    return <AiPageShell active="/operator/ai/mission-analysis">
      <OperatorPanel title="Mission analysis">
        <div className="operator-empty-state">
          <strong>Unable to load Mission analysis</strong>
          <span>{planningAnalysisError instanceof Error ? planningAnalysisError.message : !contextBatteryId
            ? 'A selected battery is required for route analysis.' : 'No route options are available.'}</span>
        </div>
      </OperatorPanel>
    </AiPageShell>;
  }

  const shapValues = route.shapValues
    ? Object.entries(route.shapValues).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]))
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    : [];
  const maxShap = Math.max(0.000001, ...shapValues.map(([, value]) => Math.abs(value)));
  const legs = route.legDetails ?? [];
  const allLegWeather = legs.map((leg) => leg.weather ?? route.weather).filter((value): value is RouteWeatherConditions => Boolean(value));
  const weatherDiffersByLeg = allLegWeather.length > 1 && allLegWeather.some((item) => JSON.stringify(item) !== JSON.stringify(allLegWeather[0]));
  const weather = (weatherDiffersByLeg ? legs[Math.min(weatherLegIndex, legs.length - 1)]?.weather : legs[0]?.weather) ?? route.weather;
  const conclusion = conclusionForRoute(route, planningAnalysis?.routeExplanation);
  const feasible = routeFeasibility(route);

  return <AiPageShell active="/operator/ai/mission-analysis">
    {!returnToMission && hasQueryContext && queryMission && <div className="ai-context-banner">
      <div><span className="eyebrow">MISSION ANALYSIS</span><strong>{queryMission.id} · {queryMission.orderId} · {queryMission.drone}</strong></div>
      <ActionButton variant="secondary" onClick={() => navigate(`/operator/missions/${queryMission.id}`)}>Back to mission</ActionButton>
    </div>}

    <div className="mission-ai-section-head"><h2>Route insights</h2></div>
    <div className="ai-route-switcher mission-ai-route-switcher" aria-label="Route options">
      {routeOptions.map((item) => {
        const active = route.id === item.id;
        const path = routePath(item);
        return <button type="button" key={item.id} title={item.id}
          className={`selectable-card mission-ai-route-option ${active ? 'active' : ''}`}
          aria-pressed={active} onClick={() => changeRoute(item.id)}>
          <span className="mission-ai-route-top"><strong>{formatRouteTitle(item)}</strong>
            {item.recommended && <span className="mission-ai-route-recommended">AI Recommended</span>}
          </span>
          {path && <span className="mission-ai-route-path" title={path}>{path}</span>}
          <span className="mission-ai-route-metrics">
            <span><small>Energy</small><b>{formatAmount(item.predictedEnergyWh)} Wh</b></span>
            <span><small>Duration</small><b>{formatAmount(item.predictedDurationMin, 0)} min</b></span>
            <span><small>Distance</small><b>{formatAmount(item.distanceKm)} km</b></span>
          </span>
        </button>;
      })}
    </div>

    <div className="mission-ai-evidence">
      <div className="mission-ai-evidence-top">
        <section className="mission-ai-evidence-shap" aria-label="SHAP Energy Analysis">
          <h2>SHAP Energy Analysis</h2>
          {shapValues.length ? <div className="mission-ai-evidence-shap-list">
            {shapValues.map(([feature, value]) => {
              const input = shapInputForFeature(route, feature);
              return <div className="mission-ai-evidence-factor" key={feature}>
                <div className="mission-ai-evidence-factor-label">
                  <span>{shapFactorLabel(feature)}{input && <small> · {input}</small>}</span>
                  <strong className={value > 0 ? 'positive' : value < 0 ? 'negative' : ''}>{value > 0 ? '+' : ''}{formatAmount(value)} Wh</strong>
                </div>
                <div className="mission-ai-evidence-track" aria-hidden="true"><span className={value < 0 ? 'negative' : ''} style={{ width: `${Math.abs(value) / maxShap * 100}%` }} /></div>
              </div>;
            })}
          </div> : <p className="mission-ai-evidence-muted">No SHAP contributions are available for this route.</p>}
        </section>

        <section className="mission-ai-evidence-weather" aria-label="Weather Conditions">
          <div className="mission-ai-evidence-heading">
            <h2>Weather Conditions</h2>
            {weatherDiffersByLeg && <select aria-label="Weather for flight leg" value={Math.min(weatherLegIndex, legs.length - 1)} onChange={(event) => setWeatherLegIndex(Number(event.target.value))}>
              {legs.map((leg, index) => <option key={index} value={index}>Leg {leg.sequence_no ?? index + 1}</option>)}
            </select>}
          </div>
          {weather ? <>
            <div className="mission-ai-weather-primary">
              <strong>{weatherLabel(weather.temperatureC, '°C')}</strong>
              <span>{weather.conditionLabel ? formatBackendLabel(weather.conditionLabel) : '—'}</span>
            </div>
            <div className="mission-ai-weather-table">
              <div><small>Wind speed</small><strong>{weatherLabel(weather.windSpeedMs, ' m/s')}</strong></div>
              <div><small>Wind gust</small><strong>{weatherLabel(weather.windGustMs, ' m/s')}</strong></div>
              <div><small>Humidity</small><strong>{weatherLabel(weather.humidityPct, '%', 0)}</strong></div>
              <div><small>Precipitation</small><strong>{weatherLabel(weather.precipitationMm, ' mm')}</strong></div>
            </div>
            {weather.warningMessage && <p className="mission-ai-weather-warning">{formatBackendLabel(weather.warningMessage)}</p>}
          </> : <p className="mission-ai-evidence-muted">Weather data is not available for this route.</p>}
        </section>
      </div>

      <section className="mission-ai-evidence-battery" aria-label="Route Feasibility and Battery Plan">
        <div className="mission-ai-evidence-heading mission-ai-battery-header">
          <h2>Route Feasibility &amp; Battery Plan</h2>
          <div className="mission-ai-battery-summary">
            <span>Route <strong className={feasible === 'Feasible' ? 'positive' : feasible === 'Unavailable' ? 'negative' : ''}>{feasible}</strong></span>
            <span>Risk <strong className={route.risk === 'Low' ? 'positive' : route.risk === 'High' ? 'negative' : ''}>{route.risk}</strong></span>
          </div>
        </div>
        <h3>Energy consumption by leg</h3>
        {legs.length ? <div className="mission-ai-leg-timeline">
          {legs.map((leg, index) => {
            const nextLeg = legs[index + 1];
            const swap = nextLeg ? relaySwapAfter(route, leg, nextLeg) : null;
            const consumption = leg.battery_consumption_pct;
            return <div className="mission-ai-timeline-group" key={`${leg.sequence_no ?? index}-${leg.from_hub_code}-${leg.to_hub_code}`}>
              <div className="mission-ai-timeline-line"><span>{leg.sequence_no ?? index + 1}</span></div>
              <div className="mission-ai-timeline-card">
                <div className="mission-ai-timeline-head">
                  <strong>Leg {leg.sequence_no ?? index + 1}</strong>
                  <div><span>{formatAmount(leg.distance_km)} km</span><b>{formatAmount(leg.energy_wh)} Wh</b></div>
                </div>
                <p>{legHub(leg, 'from')} → {legHub(leg, 'to')}</p>
                {typeof consumption === 'number' && Number.isFinite(consumption) && <div className="mission-ai-timeline-consumption">
                  <div className="mission-ai-evidence-track"><span style={{ width: `${Math.max(0, Math.min(100, consumption))}%` }} /></div>
                  <strong>{formatAmount(consumption, 0)}% used</strong>
                </div>}
              </div>
              {swap && <>
                <div className="mission-ai-timeline-line mission-ai-timeline-swap-symbol"><span>↻</span></div>
                <div className="mission-ai-timeline-swap"><strong>Battery swap · {swap.hubName}</strong>
                  <span>{[swap.batteryId, swap.batteryModel].filter(Boolean).join(' · ')}</span>
                </div>
              </>}
            </div>;
          })}
        </div> : <p className="mission-ai-evidence-muted">Leg-level energy consumption is not available for this route.</p>}
      </section>

      {conclusion && <div className="mission-ai-final-conclusion" key={route.id}>
        <strong>Analysis Conclusion</strong>
        <span>{conclusion}</span>
      </div>}
    </div>

    {returnToMission && <div className="ai-context-actions mission-ai-footer-actions">
      <ActionButton variant="secondary" onClick={() => navigate(`/operator/missions/create?orderId=${queryOrderId}&resume=1`)}>Back to mission</ActionButton>
      <ActionButton onClick={useThisRoute} disabled={!getEnergyFeasibility(route).feasible}>Use {formatRouteTitle(route)}</ActionButton>
    </div>}
  </AiPageShell>;
}
