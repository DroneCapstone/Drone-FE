import { formatHubName, formatRouteName, formatBackendLabel } from '../../utils/displayEnglish';
import { useState } from 'react';
import { OperatorLoadingState } from '../../components/OperatorLoadingState';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ActionButton } from '../../../../components/ui/ActionButton';
// import { DropdownSelect } from '../../../../components/ui/DropdownSelect';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { EnergyPredictionSummary } from '../../components/EnergyPredictionSummary';
import { OperatorPanel } from '../../components/OperatorPanel';
import { useFleetDronesQuery } from '../../hooks/useFleetQueries';
import { useMissionListQuery, useMissionPlanningAnalysisQuery } from '../../hooks/useMissionQueries';
import { useOperatorOrderQuery } from '../../hooks/useOrderQueries';
import type { Tone } from '../../types/operator';
import { getEnergyFeasibility } from '../../utils/droneEligibility';
import { getDroneDisplayCode } from '../../utils/droneDisplay';
import { loadMissionDraft, updateMissionDraftRoute } from '../../utils/missionDraftStorage';
import { calculateRouteTiming, formatMissionTime } from '../../utils/missionTiming';
import { AiPageShell } from './AiPageShell';
import './mission-ai-explanation.css';

// Prediction and Recommendation remain in source for compatibility, but their
// panels are not rendered: Create Mission already displays those results.
const SHOW_LEGACY_ANALYSIS_TABS = false;

function riskTone(level: 'Low' | 'Medium' | 'High'): Tone {
  if (level === 'High') return 'danger';
  if (level === 'Medium') return 'warning';
  return 'success';
}

/** These list-item shapes are intentionally not assumed: the BE Swagger uses [] without item schemas. */
function asAiObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function displayAiValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return Number.isFinite(value) ? String(Number(value.toPrecision(6))) : '—';
  if (typeof value === 'string') return value.trim() || '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  try { return JSON.stringify(value); } catch { return '—'; }
}

function displayShapValue(value: number): string {
  const display = Number(value.toPrecision(6));
  return `${display > 0 ? '+' : ''}${display}`;
}

/** Use only the supplied explanation values; no locally generated AI conclusions. */
function readAiField(object: Record<string, unknown> | null, ...keys: string[]): unknown {
  for (const key of keys) {
    const result = object?.[key];
    if (result !== undefined && result !== null && result !== '') return result;
  }
  return undefined;
}

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function getRoutePath(route: NonNullable<ReturnType<typeof useMissionPlanningAnalysisQuery>['data']>['routes'][number]): string | undefined {
  const legs = route.legDetails ?? [];
  if (legs.length) {
    const names = [legs[0].from_hub_name || legs[0].from_hub_code, ...legs.map(leg => leg.to_hub_name || leg.to_hub_code)].filter(Boolean);
    if (names.length > 1) return names.map(formatHubName).join(' → ');
  }
  const fromRoute = route.routeString?.split('(')[0]?.trim();
  return fromRoute ? formatRouteName(fromRoute) : undefined;
}

function shortRouteName(name: string, profile?: string): string {
  // Speed profiles are supplied by Analyze. Only shorten their parenthesized detail.
  const selected = profile || name;
  const concise = selected.split('(')[0]?.trim();
  return concise || selected;
}

function FeatureInsights({ contributions }: { contributions: unknown[] }) {
  const entries = contributions.map(asAiObject).filter((item): item is Record<string, unknown> => item !== null);
  const rows = entries.map((item, index) => ({
    key: `${asText(readAiField(item, 'feature', 'feature_name', 'featureName')) ?? index}-${index}`,
    name: asText(readAiField(item, 'label', 'feature', 'feature_name', 'featureName', 'name')) || `Feature ${index + 1}`,
    value: readAiField(item, 'value'),
    impact: asText(readAiField(item, 'impact')),
  })).filter(row => row.value !== undefined || row.impact);
  if (!rows.length) return null;
  return <section className="mission-ai-insights">
    <h3>Feature insights</h3>
    <div className="mission-ai-insight-list">
      {rows.map(row => <div className="mission-ai-insight" key={row.key}>
        <div className="mission-ai-insight-header"><strong>{formatBackendLabel(row.name)}</strong>{row.value !== undefined && <span>{displayAiValue(row.value)}</span>}</div>
        {row.impact && <p>{formatBackendLabel(row.impact)}</p>}
      </div>)}
    </div>
  </section>;
}

function LegEnergySummary({ breakdown }: { breakdown: unknown[] }) {
  // Single-leg energy is already visible in the route card; avoid duplicate tables.
  if (breakdown.length < 2) return null;
  const rows = breakdown.map((raw, index) => {
    const item = asAiObject(raw);
    if (!item) return null;
    const from = asText(readAiField(item, 'from_hub_name', 'fromHubName', 'from_hub_code', 'fromHubCode'));
    const to = asText(readAiField(item, 'to_hub_name', 'toHubName', 'to_hub_code', 'toHubCode'));
    const energy = readAiField(item, 'energy_wh', 'energyWh');
    const distance = readAiField(item, 'distance_km', 'distanceKm');
    const action = asText(readAiField(item, 'action'));
    if (!from && !to && energy === undefined && distance === undefined && !action) return null;
    const sequence = readAiField(item, 'leg', 'sequence_no', 'sequenceNo');
    return <div className="mission-ai-leg" key={`leg-${index}`}>
      <div className="mission-ai-leg-header"><strong>Leg {sequence === undefined ? index + 1 : displayAiValue(sequence)}</strong>{energy !== undefined && <span>{displayAiValue(energy)} Wh</span>}</div>
      {(from || to) && <p className="mission-ai-leg-route">{[from, to].filter(Boolean).map(formatHubName).join(' → ')}</p>}
      {distance !== undefined && <small>{displayAiValue(distance)} km</small>}
      {action && <p className="mission-ai-leg-note">{formatBackendLabel(action)}</p>}
    </div>;
  }).filter(Boolean);
  if (!rows.length) return null;
  return <section className="mission-ai-leg-summary"><h3>Energy by leg</h3>{rows}</section>;
}

export function MissionAnalysisPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: missions = [] } = useMissionListQuery();
  const { data: fleet = [] } = useFleetDronesQuery();
  const returnToMission = searchParams.get('returnTo') === 'mission-create';
  const queryOrderId = searchParams.get('orderId') ?? '';
  const queryDroneId = searchParams.get('droneId') ?? '';
  const queryRouteId = searchParams.get('routeId') ?? '';
  const queryBatteryId = searchParams.get('batteryId') ?? '';
  const hasQueryContext = Boolean(queryOrderId && queryDroneId);

  const missionOptions = missions
    .filter((mission) => mission.type === 'Delivery')
    .map((mission) => `${mission.id} · ${mission.orderId}`);
  const queryMission = missions.find((mission) => mission.orderId === queryOrderId && mission.droneId === queryDroneId && (!queryRouteId || mission.routeId === queryRouteId));
  const selectedMissionLabel = queryMission ? `${queryMission.id} · ${queryMission.orderId}` : missionOptions[0] ?? 'No mission';

  const selectedMissionId = selectedMissionLabel.split(' · ')[0];
  const selectedMission = missions.find((mission) => mission.id === selectedMissionId);
  const contextOrderId = hasQueryContext ? queryOrderId : selectedMission?.orderId ?? '';
  const contextDroneId = hasQueryContext ? queryDroneId : selectedMission?.droneId ?? '';
  const missionDraft = returnToMission ? loadMissionDraft(queryOrderId) : undefined;
  const draftBundleIds = missionDraft?.bundledOrderIds ?? [];
  const queryBundleIds = (searchParams.get('bundledOrderIds') ?? '').split(',').map((id) => id.trim()).filter(Boolean);
  const analysisBundleIds = returnToMission ? draftBundleIds : queryBundleIds;
  const contextBatteryId = queryBatteryId || missionDraft?.selectedBatteryId || selectedMission?.batteryId || queryMission?.batteryId || '';
  const { data: order } = useOperatorOrderQuery(contextOrderId);
  const drone = fleet.find((item) => item.id === contextDroneId);
  const {
    data: planningAnalysis,
    error: planningAnalysisError,
    isFetching: isPlanningAnalysisFetching,
  } = useMissionPlanningAnalysisQuery(
    contextOrderId && contextDroneId && contextBatteryId
      ? { orderId: contextOrderId, droneId: contextDroneId, batteryId: contextBatteryId, ...(analysisBundleIds.length ? { bundledOrderIds: analysisBundleIds } : {}) }
      : null,
  );
  const routeOptions = planningAnalysis?.routes ?? [];

  const [selectedRouteId, setSelectedRouteId] = useState(queryRouteId || selectedMission?.routeId || '');
  const analysisRouteId = selectedRouteId || routeOptions.find((route) => route.recommended)?.id || routeOptions[0]?.id || '';
  const route = routeOptions.find((item) => item.id === analysisRouteId) ?? routeOptions[0];
  const timing = order && route ? calculateRouteTiming(order, route) : undefined;
  const energy = drone && route ? getEnergyFeasibility(route) : undefined;
  const routeAssignable = route ? getEnergyFeasibility(route).feasible : false;
  const explanation = route?.aiExplanation;
  const analysisExplanation = planningAnalysis?.routeExplanation;
  const whyThisRouteWasNotRecommended = analysisExplanation?.whyNotOthers.find(
    (candidate) => candidate.id === route?.id,
  );
  // Only show the recommended-route rationale in the recommended card.
  // For alternatives, use the matching BE rationale instead of generating FE claims.
  const rationale = route?.recommended
    ? analysisExplanation?.summary
    : whyThisRouteWasNotRecommended?.reason;
  const comparisonNarrative = !route?.recommended
    ? route?.comparisonVsRecommended?.differenceSummary
    : undefined;
  const shapValues: Array<[string, number]> = route?.shapValues
    ? (Object.entries(route.shapValues) as Array<[string, number]>).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    : [];

  const changeRoute = (routeId: string) => {
    setSelectedRouteId(routeId);
    const next = new URLSearchParams(searchParams);
    next.set('routeId', routeId);
    setSearchParams(next, { replace: true });
  };

  const useThisRoute = () => {
    if (!returnToMission || !order || !route || !routeAssignable) return;
    updateMissionDraftRoute(order.id, route.id);
    navigate(`/operator/missions/create?orderId=${order.id}&resume=1`);
  };

  if (isPlanningAnalysisFetching && routeOptions.length === 0) {
    return (
      <AiPageShell active="/operator/ai/mission-analysis">
        <OperatorPanel title="Mission analysis">
          <OperatorLoadingState label="Analyzing flight routes…" />
        </OperatorPanel>
      </AiPageShell>
    );
  }

  if (planningAnalysisError || !route) {
    return (
      <AiPageShell active="/operator/ai/mission-analysis">
        <OperatorPanel title="Mission analysis">
          <div className="operator-empty-state">
            <strong>Unable to load Mission analysis</strong>
            <span>
              {planningAnalysisError instanceof Error
                ? planningAnalysisError.message
                : !contextBatteryId ? 'Battery ID is required for the updated AI analysis. Open a Mission with a selected battery.' : 'No route options are available for the selected Order, Drone, and Battery.'}
            </span>
          </div>
        </OperatorPanel>
      </AiPageShell>
    );
  }

  return (
    <AiPageShell active="/operator/ai/mission-analysis">
      {returnToMission ? (
        <div className="ai-context-banner">
          <div>
            <span className="eyebrow">MISSION DRAFT ANALYSIS</span>
            <strong>{order?.id ?? queryOrderId} · {drone ? getDroneDisplayCode(drone) : queryDroneId} · {route.id}</strong>
            <small>Opened from Create Mission. This page analyzes the draft only; no Mission is created or changed until Assign Mission.</small>
          </div>
          <ActionButton variant="secondary" onClick={() => navigate(`/operator/missions/create?orderId=${queryOrderId}&resume=1`)}>Back to mission</ActionButton>
        </div>
      ) : hasQueryContext && queryMission ? (
        <div className="ai-context-banner">
          <div>
            <span className="eyebrow">MISSION ANALYSIS</span>
            <strong>{queryMission.id} · {queryMission.orderId} · {queryMission.drone} · {route.id}</strong>
            <small>Opened from Flight Mission. Analysis can compare alternatives, but it does not change the active Mission automatically.</small>
          </div>
          <ActionButton variant="secondary" onClick={() => navigate(`/operator/missions/${queryMission.id}`)}>Back to mission</ActionButton>
        </div>
      ) : (
        <>
          {/* Mission context selector hidden by request.
          <OperatorPanel title="Mission context" eyebrow="OPERATIONAL ANALYSIS" className="ai-mission-context-panel">
            <div className="ai-context-controls">
              <label className="select-field"><span>Flight Mission</span><DropdownSelect value={selectedMissionLabel} options={missionOptions} onChange={(value) => { setSelectedMissionLabel(value); const id = value.split(' · ')[0]; const mission = missions.find((item) => item.id === id); if (mission) setAnalysisRouteId(mission.routeId); }} ariaLabel="Flight Mission" className="w-full" /></label>
              <div><small>Purpose</small><strong>Inspect prediction, recommendation, explainability, and risk for a real Mission.</strong></div>
            </div>
          </OperatorPanel>
          */}
        </>
      )}

      <div className="mission-ai-section-head">
        <div><span className="eyebrow">AI EXPLAINABILITY</span><h2>Route insights</h2></div>
        <small>Select a route to review its explanation</small>
      </div>

      <div className="ai-route-switcher mission-ai-route-switcher" aria-label="Route options">
        {routeOptions.map((item) => {
          const active = analysisRouteId === item.id;
          const path = getRoutePath(item);
          return <button type="button" key={item.id} title={item.id}
            className={`selectable-card mission-ai-route-option ${active ? 'active' : ''}`}
            aria-pressed={active} onClick={() => changeRoute(item.id)}>
            <span className="mission-ai-route-top">
              <strong>{formatBackendLabel(item.displayTitle) || formatRouteName(shortRouteName(item.name, item.speedProfileLabel))}</strong>
              <span className="mission-ai-route-flags">
                {item.recommended && <span className="mission-ai-route-recommended">AI Recommended</span>}
                {active && <span className="mission-ai-route-selected">Selected</span>}
              </span>
            </span>
            {path && <span className="mission-ai-route-path" title={formatRouteName(path)}>{formatRouteName(path)}</span>}
            <span className="mission-ai-route-metrics">
              <span><small>Energy</small><b>{displayAiValue(item.predictedEnergyWh)} Wh</b></span>
              <span><small>Duration</small><b>{displayAiValue(item.predictedDurationMin)} min</b></span>
              <span><small>Distance</small><b>{displayAiValue(item.distanceKm)} km</b></span>
            </span>
          </button>;
        })}
      </div>

      {SHOW_LEGACY_ANALYSIS_TABS && (
        <div className="ai-grid">
          {/* eyebrow="PREDICTED OUTCOME" hidden by request. */}
          <OperatorPanel title={`${route.id} ${formatRouteName(route.name)}`}>
            {drone && timing ? (
              <EnergyPredictionSummary route={route} plannedStartAt={timing.plannedStartAt} estimatedArrivalAt={timing.estimatedArrivalAt} />
            ) : (
              <div className="operator-empty-state">Select a Mission with valid Order and Drone context to calculate the complete prediction.</div>
            )}
            <div className="ai-prediction-cards">
              <span><small>Predicted duration</small><strong>{route.predictedDurationMin} min</strong></span>
              <span><small>Confidence</small><strong>{route.confidencePct}%</strong></span>
              <span><small>Risk</small><strong>{route.risk}</strong></span>
              <span><small>Battery after</small><strong>{energy && Number.isFinite(energy.remainingBattery) ? `${energy.remainingBattery}%` : '—'}</strong></span>
              <span><small>Flight speed</small><strong>{route.flightSpeedMps !== undefined ? `${displayAiValue(route.flightSpeedMps)} m/s` : '—'}</strong></span>
              <span><small>Speed profile</small><strong>{route.speedProfileLabel ?? '—'}</strong></span>
            </div>
          </OperatorPanel>
          {/* Order eyebrow hidden by request. */}
          <OperatorPanel title="Prediction context">
            <dl className="key-values">
              <div><dt>Mission</dt><dd>{queryMission?.id ?? selectedMission?.id ?? '—'}</dd></div>
              <div><dt>Order</dt><dd>{order?.id ?? '—'}</dd></div>
              <div><dt>Drone</dt><dd>{drone ? getDroneDisplayCode(drone) : '—'}</dd></div>
              <div><dt>Payload</dt><dd>{planningAnalysis?.totalPayloadKg !== undefined ? `${planningAnalysis.totalPayloadKg} kg (analyzed)` : analysisBundleIds.length ? 'Bundle payload not returned' : order ? `${order.payloadKg} kg` : '—'}</dd></div>
              <div><dt>Route distance</dt><dd>{route.distanceKm} km</dd></div>
              <div><dt>Planned start</dt><dd>{timing ? formatMissionTime(timing.plannedStartAt) : selectedMission ? formatMissionTime(selectedMission.plannedStartAt) : '—'}</dd></div>
              <div><dt>Estimated arrival</dt><dd>{timing ? formatMissionTime(timing.estimatedArrivalAt) : selectedMission ? formatMissionTime(selectedMission.estimatedArrivalAt) : '—'}</dd></div>
            </dl>
            {/*
            <div className="confidence-note"><span>Prediction is advisory. Operator/System rules still control assignment and dispatch.</span></div>
            */}
          </OperatorPanel>
        </div>
      )}

      {SHOW_LEGACY_ANALYSIS_TABS && (
        <div className="recommendation-layout">
          <OperatorPanel title="Route comparison" eyebrow="3 CANDIDATES">
            <div className="route-ranking">
              {routeOptions.map((candidate, index) => {
                const candidateEnergy = drone ? getEnergyFeasibility(candidate) : undefined;
                return (
                  <button className={candidate.recommended ? 'best' : ''} key={candidate.id} type="button" onClick={() => changeRoute(candidate.id)}>
                    <b>{String(index + 1).padStart(2, '0')}</b>
                    <span><strong>{candidate.id} {formatRouteName(candidate.name)}</strong><small>{candidate.recommended ? 'AI recommended' : formatBackendLabel(candidate.tradeOff)}</small></span>
                    <span><small>Duration</small><strong>{candidate.predictedDurationMin} min</strong></span>
                    <span><small>Energy</small><strong>{candidate.predictedEnergyWh.toFixed(1)} Wh</strong></span>
                    <span><small>Battery after</small><strong>{candidateEnergy && Number.isFinite(candidateEnergy.remainingBattery) ? `${candidateEnergy.remainingBattery}%` : '—'}</strong></span>
                    <StatusBadge tone={riskTone(candidate.risk)}>{candidate.risk} risk</StatusBadge>
                  </button>
                );
              })}
            </div>
          </OperatorPanel>
          <OperatorPanel title={`Why ${route.id}?`} eyebrow={route.recommended ? 'AI RECOMMENDED' : 'TRADE-OFF REVIEW'}>
            <div className="recommendation-copy">
              <StatusBadge tone={route.recommended ? 'success' : riskTone(route.risk)}>{route.recommended ? 'Recommended' : `${route.risk} risk`}</StatusBadge>
              <h3>{route.id} {formatRouteName(route.name)}</h3>
              {route.recommendationReasons.map((reason) => <p key={reason}>✓ {formatBackendLabel(reason)}</p>)}
              <p><strong>Trade-off:</strong> {formatBackendLabel(route.tradeOff)}</p>
            </div>
            {route.isSelectable === false && <p className="mission-ai-unavailable" role="status">Route unavailable: {formatBackendLabel(route.unselectableReason || route.infeasibleReason) || 'This route is not available.'}</p>}
            {returnToMission && <ActionButton onClick={useThisRoute} disabled={!routeAssignable}>Use {route.id} in mission draft</ActionButton>}
          </OperatorPanel>
        </div>
      )}

      <div className="mission-ai-explanation-layout">
        <OperatorPanel title="Why this prediction?" eyebrow="SHAP ANALYSIS" className="mission-ai-shap-panel">
          {shapValues.length > 0 && <div className="mission-ai-shap-chart" aria-label="SHAP feature contributions">
            {shapValues.map(([feature, value]) => {
              const maximum = Math.max(...shapValues.map(([, amount]) => Math.abs(amount)), 0.000001);
              return <div className="mission-ai-shap-item" key={feature}>
                <div className="mission-ai-shap-text">
                  <span>{feature.replace(/_/g, ' ')}</span>
                  <strong className={value < 0 ? 'is-negative' : value > 0 ? 'is-positive' : ''}>{displayShapValue(value)}</strong>
                </div>
                <div className="mission-ai-shap-track" aria-hidden="true"><span className={value < 0 ? 'is-negative' : ''} style={{ width: `${Math.abs(value) / maximum * 100}%` }} /></div>
              </div>;
            })}
          </div>}
          {explanation?.featureContributions?.length ? <FeatureInsights contributions={explanation.featureContributions} /> : null}
          {!shapValues.length && !explanation?.featureContributions?.length && <p className="mission-ai-no-explanation">No feature explanation is available for this route.</p>}
        </OperatorPanel>
        <OperatorPanel title="Interpretation" eyebrow="AI EXPLANATION" className="mission-ai-interpretation-panel">
          {(explanation?.summary || rationale || comparisonNarrative) && (
            <div className="mission-ai-summary">
              {explanation?.summary && <p>{formatBackendLabel(explanation.summary)}</p>}
              {rationale && rationale !== explanation?.summary && <p>{formatBackendLabel(rationale)}</p>}
              {comparisonNarrative && comparisonNarrative !== rationale && <p>{formatBackendLabel(comparisonNarrative)}</p>}
            </div>
          )}
          {explanation?.legsBreakdown?.length ? <LegEnergySummary breakdown={explanation.legsBreakdown} /> : null}
          {route.recommended && Boolean(analysisExplanation?.whyNotOthers.length) && (
            <section className="mission-ai-insights">
              <h3>Why not the alternatives?</h3>
              <div className="mission-ai-insight-list">
                {analysisExplanation?.whyNotOthers.map((candidate) => (
                  <div className="mission-ai-insight" key={candidate.id}>
                    <div className="mission-ai-insight-header">
                      <strong>{routeOptions.find((item) => item.id === candidate.id)?.displayTitle || candidate.label || candidate.id}</strong>
                    </div>
                    {candidate.reason && <p>{formatBackendLabel(candidate.reason)}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
          {!explanation?.summary && !rationale && !comparisonNarrative && (explanation?.legsBreakdown?.length ?? 0) < 2 && <p className="mission-ai-no-explanation">No additional explanation is available for this route.</p>}
        </OperatorPanel>
      </div>

      {SHOW_LEGACY_ANALYSIS_TABS && (
        <div className="ai-grid">
          <OperatorPanel title="Weather snapshot" eyebrow="PLANNED FLIGHT WINDOW">
            <div className="operator-empty-state">The current Mission Planning API does not return a weather snapshot. No mock weather is displayed.</div>
          </OperatorPanel>
          <OperatorPanel title="Operational risk" eyebrow="EXPLAINABLE RULE CHECKS">
            <div className="risk-list">
              <div><span><strong>Route risk</strong><small>{formatBackendLabel(route.weatherImpact)}</small></span><StatusBadge tone={riskTone(route.risk)}>{route.risk}</StatusBadge></div>
            </div>
          </OperatorPanel>
        </div>
      )}

      {returnToMission && (
        <div className="ai-context-actions">
          <ActionButton variant="secondary" onClick={() => navigate(`/operator/missions/create?orderId=${queryOrderId}&resume=1`)}>Back to mission</ActionButton>
          <ActionButton onClick={useThisRoute} disabled={!routeAssignable}>Use {route.id}</ActionButton>
        </div>
      )}
    </AiPageShell>
  );
}
