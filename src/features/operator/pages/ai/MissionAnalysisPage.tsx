import { useState } from 'react';
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
import { updateMissionDraftRoute } from '../../utils/missionDraftStorage';
import { calculateRouteTiming, formatMissionTime } from '../../utils/missionTiming';
import { AiPageShell } from './AiPageShell';

const tabs = ['Prediction', 'Recommendation', 'Explainability', 'Weather / Risk'] as const;
type AnalysisTab = typeof tabs[number];

function riskTone(level: 'Low' | 'Medium' | 'High'): Tone {
  if (level === 'High') return 'danger';
  if (level === 'Medium') return 'warning';
  return 'success';
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
  const hasQueryContext = Boolean(queryOrderId && queryDroneId);

  const missionOptions = missions
    .filter((mission) => mission.type === 'Delivery')
    .map((mission) => `${mission.id} · ${mission.orderId}`);
  const queryMission = missions.find((mission) => mission.orderId === queryOrderId && mission.droneId === queryDroneId && (!queryRouteId || mission.routeId === queryRouteId));
  const selectedMissionLabel = queryMission ? `${queryMission.id} · ${queryMission.orderId}` : missionOptions[0] ?? 'No mission';
  const [tab, setTab] = useState<AnalysisTab>('Prediction');

  const selectedMissionId = selectedMissionLabel.split(' · ')[0];
  const selectedMission = missions.find((mission) => mission.id === selectedMissionId);
  const contextOrderId = hasQueryContext ? queryOrderId : selectedMission?.orderId ?? '';
  const contextDroneId = hasQueryContext ? queryDroneId : selectedMission?.droneId ?? '';
  const { data: order } = useOperatorOrderQuery(contextOrderId);
  const drone = fleet.find((item) => item.id === contextDroneId);
  const {
    data: planningAnalysis,
    error: planningAnalysisError,
    isFetching: isPlanningAnalysisFetching,
  } = useMissionPlanningAnalysisQuery(
    contextOrderId && contextDroneId
      ? { orderId: contextOrderId, droneId: contextDroneId }
      : null,
  );
  const routeOptions = planningAnalysis?.routes ?? [];

  const [selectedRouteId, setSelectedRouteId] = useState(queryRouteId || selectedMission?.routeId || '');
  const analysisRouteId = selectedRouteId || routeOptions.find((route) => route.recommended)?.id || routeOptions[0]?.id || '';
  const route = routeOptions.find((item) => item.id === analysisRouteId) ?? routeOptions[0];
  const timing = order && route ? calculateRouteTiming(order, route) : undefined;
  const energy = drone && route ? getEnergyFeasibility(route) : undefined;

  const changeRoute = (routeId: string) => {
    setSelectedRouteId(routeId);
    const next = new URLSearchParams(searchParams);
    next.set('routeId', routeId);
    setSearchParams(next, { replace: true });
  };

  const useThisRoute = () => {
    if (!returnToMission || !order || !route) return;
    updateMissionDraftRoute(order.id, route.id);
    navigate(`/operator/missions/create?orderId=${order.id}&resume=1`);
  };

  if (isPlanningAnalysisFetching && routeOptions.length === 0) {
    return (
      <AiPageShell active="/operator/ai/mission-analysis">
        <OperatorPanel title="Mission analysis">
          <div className="operator-empty-state">Loading route analysis from Backend…</div>
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
                : 'The Backend did not return any route options for this Order and Drone.'}
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

      <div className="inner-tabs">
        {tabs.map((item) => <button type="button" className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>)}
      </div>

      <div className="ai-route-switcher">
        {routeOptions.map((item) => (
          <button type="button" key={item.id} className={`selectable-card ${analysisRouteId === item.id ? 'active' : ''}`} aria-pressed={analysisRouteId === item.id} onClick={() => changeRoute(item.id)}>
            <span>{item.id}</span><strong>{item.name}</strong>{item.recommended && <small>Recommended</small>}
          </button>
        ))}
      </div>

      {tab === 'Prediction' && (
        <div className="ai-grid">
          {/* eyebrow="PREDICTED OUTCOME" hidden by request. */}
          <OperatorPanel title={`${route.id} ${route.name}`}>
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
            </div>
          </OperatorPanel>
          {/* Order eyebrow hidden by request. */}
          <OperatorPanel title="Prediction context">
            <dl className="key-values">
              <div><dt>Mission</dt><dd>{queryMission?.id ?? selectedMission?.id ?? '—'}</dd></div>
              <div><dt>Order</dt><dd>{order?.id ?? '—'}</dd></div>
              <div><dt>Drone</dt><dd>{drone ? getDroneDisplayCode(drone) : '—'}</dd></div>
              <div><dt>Payload</dt><dd>{order ? `${order.payloadKg} kg` : '—'}</dd></div>
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

      {tab === 'Recommendation' && (
        <div className="recommendation-layout">
          <OperatorPanel title="Route comparison" eyebrow="3 CANDIDATES">
            <div className="route-ranking">
              {routeOptions.map((candidate, index) => {
                const candidateEnergy = drone ? getEnergyFeasibility(candidate) : undefined;
                return (
                  <button className={candidate.recommended ? 'best' : ''} key={candidate.id} type="button" onClick={() => changeRoute(candidate.id)}>
                    <b>{String(index + 1).padStart(2, '0')}</b>
                    <span><strong>{candidate.id} {candidate.name}</strong><small>{candidate.recommended ? 'AI recommended' : candidate.tradeOff}</small></span>
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
              <h3>{route.id} {route.name}</h3>
              {route.recommendationReasons.map((reason) => <p key={reason}>✓ {reason}</p>)}
              <p><strong>Trade-off:</strong> {route.tradeOff}</p>
            </div>
            {returnToMission && <ActionButton onClick={useThisRoute}>Use {route.id} in mission draft</ActionButton>}
          </OperatorPanel>
        </div>
      )}

      {tab === 'Explainability' && (
        <div className="ai-grid">
          <OperatorPanel title="Why this prediction?" eyebrow="LOCAL SHAP · THIS ROUTE">
            <div className="operator-empty-state">The current Mission Planning API does not return SHAP factors. No mock explanation is displayed.</div>
          </OperatorPanel>
          <OperatorPanel title="Interpretation" eyebrow="DECISION SUPPORT">
            <div className="reasoning-block"><p><strong>{route.id}</strong> is predicted at <strong>{route.predictedEnergyWh.toFixed(1)} Wh</strong>. The explanation is specific to this route and should not be treated as a universal cause across all flights.</p></div>
            <div className="explanation-callout"><strong>Operator takeaway</strong><p>{route.weatherImpact}</p></div>
          </OperatorPanel>
        </div>
      )}

      {tab === 'Weather / Risk' && (
        <div className="ai-grid">
          <OperatorPanel title="Weather snapshot" eyebrow="PLANNED FLIGHT WINDOW">
            <div className="operator-empty-state">The current Mission Planning API does not return a weather snapshot. No mock weather is displayed.</div>
          </OperatorPanel>
          <OperatorPanel title="Operational risk" eyebrow="EXPLAINABLE RULE CHECKS">
            <div className="risk-list">
              <div><span><strong>Route risk</strong><small>{route.weatherImpact}</small></span><StatusBadge tone={riskTone(route.risk)}>{route.risk}</StatusBadge></div>
            </div>
          </OperatorPanel>
        </div>
      )}

      {returnToMission && tab !== 'Recommendation' && (
        <div className="ai-context-actions">
          <ActionButton variant="secondary" onClick={() => navigate(`/operator/missions/create?orderId=${queryOrderId}&resume=1`)}>Back to mission</ActionButton>
          <ActionButton onClick={useThisRoute}>Use {route.id}</ActionButton>
        </div>
      )}
    </AiPageShell>
  );
}
