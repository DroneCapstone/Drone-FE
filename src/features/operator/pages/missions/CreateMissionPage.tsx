import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ActionButton } from '../../../../components/ui/ActionButton';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';

import { EligibleDroneCard } from '../../components/EligibleDroneCard';
import { EnergyPredictionSummary } from '../../components/EnergyPredictionSummary';
import { HubCard } from '../../components/HubCard';
import { OperatorPanel } from '../../components/OperatorPanel';
import { RouteOptionCard } from '../../components/RouteOptionCard';
import { operatorHubs } from '../../data/hubMockData';
import { routeOptions } from '../../data/routeMockData';
import type { Mission, OperatorDrone } from '../../types/operator';
import { formatDeliveryWindow, getOrderPlanningBadge, isActionablePlanningState } from '../../utils/deliveryPlanning';
import { getBasicDroneEligibility, getEnergyFeasibility } from '../../utils/droneEligibility';
import { getDroneDisplayCode } from '../../utils/droneDisplay';
import { clearMissionDraft, loadMissionDraft, saveMissionDraft } from '../../utils/missionDraftStorage';
import { calculateRouteTiming, formatMissionTime } from '../../utils/missionTiming';
import { loadOperatorFleet } from '../../utils/operatorFleetStorage';
import { loadOperatorMissions, prependMission } from '../../utils/operatorMissionStorage';
import { loadOperatorOrders } from '../../utils/operatorOrderStorage';

import { MissionPageShell } from './MissionPageShell';

const STEPS = ['Order info', 'Origin Hub & drone', 'Route & Energy Planning', 'Review & assign'] as const;

export function CreateMissionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') ?? '';

  const orders = useMemo(() => loadOperatorOrders(), []);
  const missions = useMemo(() => loadOperatorMissions(), []);
  const fleet = useMemo(() => loadOperatorFleet(), []);
  const order = orders.find((item) => item.id === orderId);
  const restoredDraft = useMemo(() => (orderId ? loadMissionDraft(orderId) : undefined), [orderId]);
  const existingMission = order ? missions.find((mission) => mission.orderId === order.id) : undefined;

  const [step, setStep] = useState(restoredDraft?.step ?? 1);
  const [toast, setToast] = useState('');
  const [selectedDroneId, setSelectedDroneId] = useState(restoredDraft?.selectedDroneId || '');
  const [selectedRouteId, setSelectedRouteId] = useState(restoredDraft?.selectedRouteId || '');

  if (!order) {
    return (
      <MissionPageShell active="/operator/missions/all">
        <OperatorPanel title="Create a mission from an order" eyebrow="DELIVERY OPERATIONS">
          <div className="operator-empty-state mission-create-gate">
            Flight Missions cannot be created as standalone records. Open an Order when its planning window is ready, then choose <strong>Create mission</strong>.
            <ActionButton onClick={() => navigate('/operator/orders/ready')}>View ready orders</ActionButton>
          </div>
        </OperatorPanel>
      </MissionPageShell>
    );
  }

  if (existingMission) {
    return (
      <MissionPageShell active="/operator/missions/all">
        <OperatorPanel title="Delivery Mission already exists" eyebrow={order.id}>
          <div className="linked-record">
            <div><strong>{existingMission.id}</strong><small>{existingMission.drone} · {existingMission.route}</small></div>
            <StatusBadge tone={existingMission.tone}>{existingMission.status}</StatusBadge>
            <button type="button" className="row-action" onClick={() => navigate(`/operator/missions/${existingMission.id}`)}>View mission</button>
          </div>
        </OperatorPanel>
      </MissionPageShell>
    );
  }

  const planningState = getOrderPlanningBadge(order, missions);
  const originHub = operatorHubs.find((hub) => hub.id === order.originHubId);
  const destinationHub = operatorHubs.find((hub) => hub.id === order.destinationHubId);
  const selectedDrone = fleet.find((drone) => drone.id === selectedDroneId);
  const selectedRoute = routeOptions.find((route) => route.id === selectedRouteId);
  const dronesAtOriginHub = fleet.filter((drone) => drone.hubId === order.originHubId);
  const readyAtOrigin = dronesAtOriginHub.filter(
    (drone) => getBasicDroneEligibility(drone, order.originHubId, order.payloadKg, missions).eligible,
  ).length;
  const selectedTiming = selectedRoute ? calculateRouteTiming(order, selectedRoute) : undefined;

  const canContinueStep1 = isActionablePlanningState(planningState);
  const canContinueStep2 = Boolean(originHub && destinationHub && selectedDrone);
  const canContinueStep3 = Boolean(selectedRoute && selectedDrone && selectedTiming);

  const handleDroneSelect = (drone: OperatorDrone) => {
    setSelectedDroneId(drone.id);
    setSelectedRouteId('');
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const persistDraft = (nextStep = step, routeId = selectedRouteId) => {
    saveMissionDraft({
      orderId: order.id,
      step: nextStep,
      selectedDroneId,
      selectedRouteId: routeId,
    });
  };

  const handleViewAiDetails = (routeId: string) => {
    persistDraft(3, selectedRouteId);
    navigate(`/operator/ai/mission-analysis?orderId=${order.id}&droneId=${selectedDroneId}&routeId=${routeId}&returnTo=mission-create`);
  };

  const handleAssignMission = () => {
    if (!originHub || !destinationHub || !selectedDrone || !selectedRoute || !selectedTiming) return;

    if (!order.originHubReceivedAt) {
      showToast('Package handoff at the Origin Hub has not been confirmed yet');
      return;
    }

    const energy = getEnergyFeasibility(selectedRoute);
    if (!energy.feasible) {
      showToast('Selected route does not keep the minimum battery reserve');
      return;
    }

    const missionId = `MSN-${String(Date.now()).slice(-6)}`;
    const mission: Mission = {
      id: missionId,
      orderId: order.id,
      type: 'Delivery',
      name: `Delivery ${order.id}`,
      droneId: selectedDrone.id,
      drone: getDroneDisplayCode(selectedDrone),
      originHubId: originHub.id,
      destinationHubId: destinationHub.id,
      routeId: selectedRoute.id,
      route: `${selectedRoute.id} ${selectedRoute.name}`,
      status: 'Scheduled',
      tone: 'info',
      eta: selectedTiming.estimatedArrivalAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      battery: energy.remainingBattery,
      plannedStartAt: selectedTiming.plannedStartAt.toISOString(),
      estimatedArrivalAt: selectedTiming.estimatedArrivalAt.toISOString(),
      predictedDurationMin: selectedRoute.predictedDurationMin,
      estimatedEnergyWh: selectedRoute.predictedEnergyWh,
      batteryConsumptionPct: selectedRoute.batteryConsumptionPct,
      confidencePct: selectedRoute.confidencePct,
      risk: selectedRoute.risk,
      createdAt: new Date().toISOString(),
    };

    prependMission(mission);
    clearMissionDraft(order.id);
    showToast('Mission assigned successfully');
    window.setTimeout(() => navigate(`/operator/missions/${missionId}`), 500);
  };

  return (
    <MissionPageShell active="/operator/missions/all">
      <div className="mission-builder">
        <div className="mission-builder-steps" aria-label="Mission creation steps">
          {STEPS.map((label, index) => {
            const number = index + 1;
            const active = number === step;
            const done = number < step;
            return (
              <button
                key={label}
                type="button"
                className={`${active ? 'active' : ''} ${done ? 'done' : ''}`}
                onClick={() => done && setStep(number)}
                disabled={!done && !active}
              >
                <i>{done ? <Icon name="check" size={12} /> : number}</i><span>{label}</span>
              </button>
            );
          })}
        </div>

        {step === 1 && (
          <OperatorPanel title="Order information">
            <div className="fields two">
              <label><span>Order</span><input value={order.id} readOnly /></label>
              <label><span>Customer</span><input value={order.customerName} readOnly /></label>
              <label><span>Delivery mode</span><input value={order.deliveryMode} readOnly /></label>
              <label><span>Package handoff</span><input value={order.originHubReceivedAt ? 'Received at Origin Hub' : 'Awaiting customer drop-off'} readOnly /></label>
              <label><span>Origin Hub</span><input value={originHub?.name ?? order.originHubId} readOnly /></label>
              <label><span>Destination Hub</span><input value={destinationHub?.name ?? order.destinationHubId} readOnly /></label>
              <label><span>Package</span><input value={`${order.packageLabel} · ${order.payloadKg} kg`} readOnly /></label>
              <label><span>Estimated delivery</span><input value={formatDeliveryWindow(order)} readOnly /></label>
            </div>
            <div className="mission-planning-note">
              <StatusBadge tone={canContinueStep1 ? 'warning' : planningState === 'Awaiting Package' ? 'neutral' : 'info'}>
                {planningState ?? 'Mission already planned'}
              </StatusBadge>
              <span>
                {planningState === 'Awaiting Package'
                  ? 'Planning time has opened, but the package must be physically received at the Origin Hub first.'
                  : canContinueStep1
                    ? `${order.deliveryMode === 'Express' ? 'Express planning is active.' : 'Planning is open.'} No drone was reserved when the Order was placed.`
                    : `Planning opens ${formatMissionTime(order.planningAt)}.`}
              </span>
            </div>
          </OperatorPanel>
        )}

        {step === 2 && (
          <div className="mission-step-stack">
            <OperatorPanel title="Origin Hub">
              {originHub ? (
                <div className="hub-grid hub-grid-select">
                  <HubCard
                    hub={originHub}
                    totalDrones={dronesAtOriginHub.length}
                    readyDrones={readyAtOrigin}
                  />
                </div>
              ) : (
                <div className="operator-empty-state">Origin Hub is unavailable.</div>
              )}
              <p className="section-note">The customer selected the Origin Hub when creating the Order. Operator does not change the handoff Hub during Mission planning.</p>
            </OperatorPanel>

            <OperatorPanel title="Choose drone">
              <p className="section-note">Technical status comes from Technician. A technically Available drone is still blocked if it already has a Scheduled or In Progress Mission.</p>
              <div className="eligible-drone-grid">
                {dronesAtOriginHub.map((drone) => {
                  const eligibility = getBasicDroneEligibility(drone, order.originHubId, order.payloadKg, missions);
                  return <EligibleDroneCard key={drone.id} drone={drone} eligibility={eligibility} selected={drone.id === selectedDroneId} onSelect={() => handleDroneSelect(drone)} />;
                })}
              </div>
              {dronesAtOriginHub.length === 0 && <div className="operator-empty-state">No drones are registered at this Origin Hub.</div>}
            </OperatorPanel>
          </div>
        )}

        {step === 3 && selectedDrone && (
          <div className="mission-step-stack">
            <OperatorPanel title="Route, energy & timing">
              {/* <div className="ai-inline-note">
                <Icon name="spark" size={17} />
                <span><strong>AI calculates route outcome and timing automatically.</strong> Express Orders are planned from now; Scheduled Orders target the customer delivery window.</span>
              </div> */}
              <div className="route-option-list">
                {routeOptions.map((route) => {
                  const energy = getEnergyFeasibility(route);
                  const timing = calculateRouteTiming(order, route);
                  return (
                    <RouteOptionCard
                      key={route.id}
                      route={route}
                      remainingBattery={energy.remainingBattery}
                      feasible={energy.feasible}
                      plannedStartAt={timing.plannedStartAt}
                      estimatedArrivalAt={timing.estimatedArrivalAt}
                      selected={route.id === selectedRouteId}
                      onSelect={() => setSelectedRouteId(route.id)}
                      onViewDetails={() => handleViewAiDetails(route.id)}
                    />
                  );
                })}
              </div>
            </OperatorPanel>

            {selectedRoute && selectedTiming && (
              <OperatorPanel title="Selected route summary" eyebrow="AI PREDICTED OUTCOME">
                <EnergyPredictionSummary
                  route={selectedRoute}
                  plannedStartAt={selectedTiming.plannedStartAt}
                  estimatedArrivalAt={selectedTiming.estimatedArrivalAt}
                />
              </OperatorPanel>
            )}
          </div>
        )}

        {step === 3 && !selectedDrone && (
          <OperatorPanel title="Route, energy & timing">
            <div className="operator-empty-state">Choose an eligible drone in Step 2 before AI compares route, energy, and timing.</div>
          </OperatorPanel>
        )}

        {step === 4 && originHub && destinationHub && selectedDrone && selectedRoute && selectedTiming && (
          <OperatorPanel title="Review & assign">
            <div className="mission-review-grid">
              <dl className="review-values">
                <div><dt>Order</dt><dd>{order.id}</dd></div><div><dt>Delivery mode</dt><dd>{order.deliveryMode}</dd></div>
                <div><dt>Origin Hub</dt><dd>{originHub.name}</dd></div><div><dt>Destination Hub</dt><dd>{destinationHub.name}</dd></div>
                <div><dt>Package handoff</dt><dd>{order.originHubReceivedAt ? 'Confirmed' : 'Not confirmed'}</dd></div><div><dt>Drone</dt><dd>{getDroneDisplayCode(selectedDrone)}</dd></div>
                <div><dt>Route</dt><dd>{selectedRoute.id} · {selectedRoute.name}</dd></div><div><dt>Predicted duration</dt><dd>{selectedRoute.predictedDurationMin} min</dd></div>
                <div><dt>Planned start</dt><dd>{formatMissionTime(selectedTiming.plannedStartAt)}</dd></div><div><dt>Estimated arrival</dt><dd>{formatMissionTime(selectedTiming.estimatedArrivalAt)}</dd></div>
              </dl>
              <div className="mission-review-side">
                <div className="review-readiness">
                  <StatusBadge tone="success">Hub-to-Hub handoff ready</StatusBadge>
                  <small>Assign Mission creates a Scheduled Mission. The drone does not start automatically; a final pre-flight recheck is required near planned start.</small>
                </div>
                <EnergyPredictionSummary route={selectedRoute} plannedStartAt={selectedTiming.plannedStartAt} estimatedArrivalAt={selectedTiming.estimatedArrivalAt} />
              </div>
            </div>
          </OperatorPanel>
        )}

        <div className="form-actions mission-builder-actions">
          {step > 1 && <ActionButton variant="secondary" onClick={() => { const next = Math.max(1, step - 1); setStep(next); persistDraft(next); }}>Back</ActionButton>}
          {step === 1 && <ActionButton disabled={!canContinueStep1} onClick={() => { setStep(2); persistDraft(2); }}>Continue</ActionButton>}
          {step === 2 && <ActionButton disabled={!canContinueStep2} onClick={() => { setStep(3); persistDraft(3); }}>Continue</ActionButton>}
          {step === 3 && <ActionButton disabled={!canContinueStep3} onClick={() => { setStep(4); persistDraft(4); }}>Review mission</ActionButton>}
          {step === 4 && <ActionButton icon="check" onClick={handleAssignMission}>Assign mission</ActionButton>}
        </div>
      </div>
      {toast && <div className="operator-toast">{toast}</div>}
    </MissionPageShell>
  );
}
