import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ActionButton } from '../../../../components/ui/ActionButton';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';

import { EligibleDroneCard } from '../../components/EligibleDroneCard';
import { EnergyPredictionSummary } from '../../components/EnergyPredictionSummary';
import { OperatorPanel } from '../../components/OperatorPanel';
import { RouteOptionCard } from '../../components/RouteOptionCard';
import { operatorHubs } from '../../data/hubMockData';
import { useOperatorEligibleDronesQuery, useOperatorOrderQuery } from '../../hooks/useOrderQueries';
import { routeOptions } from '../../data/routeMockData';
import type { Mission, MissionLeg, OperatorDrone } from '../../types/operator';
import {
  formatDeliveryWindow,
  getDeliveryMission,
  getOrderPlanningBadge,
  isActionablePlanningState,
} from '../../utils/deliveryPlanning';
import { getEnergyFeasibility } from '../../utils/droneEligibility';
import { getDroneDisplayCode } from '../../utils/droneDisplay';
import { clearMissionDraft, loadMissionDraft, saveMissionDraft } from '../../utils/missionDraftStorage';
import {
  calculatePackageReceiveDeadline,
  calculateRouteTiming,
  formatMissionTime,
} from '../../utils/missionTiming';
import { loadOperatorMissions, prependMission } from '../../utils/operatorMissionStorage';
import { clearOrderReplanning } from '../../utils/operatorOrderStorage';

import { MissionPageShell } from './MissionPageShell';

const STEPS = ['Order info', 'Hub route & drone', 'Route & Energy Planning', 'Review & assign'] as const;

function hubName(hubId: string) {
  return operatorHubs.find((hub) => hub.id === hubId)?.name ?? hubId;
}

function getRouteRelayHubIds(routeId: string, originHubId: string, destinationHubId: string) {
  const route = routeOptions.find((item) => item.id === routeId);
  return (route?.relayHubIds ?? []).filter(
    (hubId) => hubId !== originHubId && hubId !== destinationHubId,
  );
}

function buildMissionLegs(originHubId: string, relayHubIds: string[], destinationHubId: string): MissionLeg[] {
  const path = [originHubId, ...relayHubIds, destinationHubId];
  return path.slice(0, -1).map((fromHubId, index) => ({
    id: `LEG-${index + 1}`,
    fromHubId,
    toHubId: path[index + 1],
    status: 'Pending',
  }));
}

export function CreateMissionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') ?? '';

  const missions = useMemo(() => loadOperatorMissions(), []);
  const {
    data: order,
    error: orderError,
    isLoading: isOrderLoading,
    refetch: refetchOrder,
  } = useOperatorOrderQuery(orderId);
  const {
    data: eligibleDronesData,
    error: eligibleDronesError,
    isLoading: isEligibleDronesLoading,
    refetch: refetchEligibleDrones,
  } = useOperatorEligibleDronesQuery(orderId);
  const restoredDraft = useMemo(() => (orderId ? loadMissionDraft(orderId) : undefined), [orderId]);
  const existingMission = order ? getDeliveryMission(order.id, missions) : undefined;

  const [step, setStep] = useState(restoredDraft?.step ?? 1);
  const [toast, setToast] = useState('');
  const [selectedDroneId, setSelectedDroneId] = useState(restoredDraft?.selectedDroneId || '');
  const [selectedRouteId, setSelectedRouteId] = useState(restoredDraft?.selectedRouteId || '');

  if (isOrderLoading) {
    return (
      <MissionPageShell active="/operator/missions/all">
        <OperatorPanel title="Create a mission from an order" eyebrow="DELIVERY OPERATIONS">
          <div className="operator-empty-state mission-create-gate">Loading Order…</div>
        </OperatorPanel>
      </MissionPageShell>
    );
  }

  if (orderError) {
    return (
      <MissionPageShell active="/operator/missions/all">
        <OperatorPanel title="Create a mission from an order" eyebrow="DELIVERY OPERATIONS">
          <div className="operator-empty-state mission-create-gate">
            <strong>Unable to load Order</strong>
            <span>{orderError instanceof Error ? orderError.message : 'Could not load order.'}</span>
            <ActionButton onClick={() => void refetchOrder()}>Retry</ActionButton>
          </div>
        </OperatorPanel>
      </MissionPageShell>
    );
  }

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
  const eligibleDronesAtOrigin = eligibleDronesData?.drones ?? [];
  const selectedDrone = eligibleDronesAtOrigin.find((drone) => drone.id === selectedDroneId);
  const selectedRoute = routeOptions.find((route) => route.id === selectedRouteId);
  const originHubLabel = originHub?.name || eligibleDronesData?.hub.name || order.originHubId || 'Origin Hub';
  const destinationHubLabel = destinationHub?.name || order.destinationHubId || 'Destination Hub';
  const selectedTiming = selectedRoute ? calculateRouteTiming(order, selectedRoute) : undefined;
  const selectedRelayHubIds = selectedRoute
    ? getRouteRelayHubIds(selectedRoute.id, order.originHubId, order.destinationHubId)
    : [];

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

    const energy = getEnergyFeasibility(selectedRoute);
    if (!energy.feasible) {
      showToast('Selected route does not keep the minimum battery reserve');
      return;
    }

    const createdAt = new Date();
    const relayHubIds = getRouteRelayHubIds(selectedRoute.id, originHub.id, destinationHub.id);
    const routePath = [originHub.name, ...relayHubIds.map(hubName), destinationHub.name].join(' → ');
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
      relayHubIds,
      legs: buildMissionLegs(originHub.id, relayHubIds, destinationHub.id),
      routeId: selectedRoute.id,
      route: `${selectedRoute.id} ${selectedRoute.name} · ${routePath}`,
      status: 'Scheduled',
      tone: 'info',
      eta: selectedTiming.estimatedArrivalAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      battery: energy.remainingBattery,
      plannedStartAt: selectedTiming.plannedStartAt.toISOString(),
      packageReceiveDeadlineAt: calculatePackageReceiveDeadline(createdAt).toISOString(),
      estimatedArrivalAt: selectedTiming.estimatedArrivalAt.toISOString(),
      predictedDurationMin: selectedRoute.predictedDurationMin,
      estimatedEnergyWh: selectedRoute.predictedEnergyWh,
      batteryConsumptionPct: selectedRoute.batteryConsumptionPct,
      confidencePct: selectedRoute.confidencePct,
      risk: selectedRoute.risk,
      createdAt: createdAt.toISOString(),
    };

    clearOrderReplanning(order.id);
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
              <label>
                <span>Origin package</span>
                <input
                  value={order.originHubReceivedAt ? `Received at Hub · ${formatMissionTime(order.originHubReceivedAt)}` : 'Awaiting package'}
                  readOnly
                />
              </label>
              <label><span>Origin Hub</span><input value={originHub?.name ?? order.originHubId} readOnly /></label>
              <label><span>Destination Hub</span><input value={destinationHub?.name ?? order.destinationHubId} readOnly /></label>
              <label><span>Package</span><input value={`${order.packageLabel} · ${order.payloadKg} kg`} readOnly /></label>
              <label><span>Estimated delivery</span><input value={formatDeliveryWindow(order)} readOnly /></label>
            </div>
            <div className="mission-planning-note">
              <StatusBadge tone={planningState === 'Ready for Planning' ? 'warning' : planningState === 'Needs Replanning' ? 'danger' : 'info'}>
                {planningState ?? 'Closed'}
              </StatusBadge>
              <span>
                {planningState === 'Ready for Planning'
                  ? `${order.deliveryMode === 'Express' ? 'Express planning is active.' : 'Planning is open.'} The Mission can be assigned before the package reaches the Origin Hub.`
                  : planningState === 'Needs Replanning'
                    ? 'The previous Mission was cancelled. Wait for the customer/system to provide a new delivery window before creating another Mission.'
                    : `Planning opens ${formatMissionTime(order.planningAt)}.`}
              </span>
            </div>
          </OperatorPanel>
        )}

        {step === 2 && (
          <div className="mission-step-stack">
            <OperatorPanel title="Delivery network">
              <div className="delivery-network-strip">
                <div className="delivery-network-node">
                  <small>Origin Hub</small>
                  <strong>{originHubLabel}</strong>
                  <span>Customer selected</span>
                </div>
                <div className="delivery-network-arrow">→</div>
                <div className="delivery-network-node">
                  <small>Destination Hub</small>
                  <strong>{destinationHubLabel}</strong>
                  <span>Customer selected</span>
                </div>
              </div>
              <p className="section-note">Origin and Destination Hubs are fixed by the customer. Route planning may add an intermediate Relay Hub when a long-distance flight requires a technical stop.</p>
            </OperatorPanel>

            <OperatorPanel title="Origin Hub & available drones">
              {isEligibleDronesLoading ? (
                <div className="operator-empty-state">Loading available drones…</div>
              ) : eligibleDronesError ? (
                <div className="operator-empty-state mission-create-gate">
                  <strong>Unable to load eligible drones</strong>
                  <span>{eligibleDronesError instanceof Error ? eligibleDronesError.message : 'Could not load eligible drones.'}</span>
                  <ActionButton onClick={() => void refetchEligibleDrones()}>Retry</ActionButton>
                </div>
              ) : eligibleDronesData ? (
                <>
                  <div className="hub-grid hub-grid-select">
                    <div className="hub-card">
                      <div className="hub-card-head">
                        <div>
                          <span className="eyebrow">Origin Hub</span>
                          <h3>{eligibleDronesData.hub.name}</h3>
                        </div>
                        <StatusBadge tone="success">Active</StatusBadge>
                      </div>
                      <div className="hub-card-stats">
                        <span><small>Total drones</small><strong>{eligibleDronesData.hub.totalDrones}</strong></span>
                        <span><small>Available now</small><strong>{eligibleDronesData.hub.availableDrones}</strong></span>
                      </div>
                    </div>
                  </div>

                  <p className="section-note">Only drones returned by the Backend eligibility check are shown. The API already filters by Origin Hub, availability, assignment conflict, and payload capacity.</p>

                  <div className="eligible-drone-grid">
                    {eligibleDronesAtOrigin.map((drone) => (
                      <EligibleDroneCard
                        key={drone.id}
                        drone={drone}
                        eligibility={{ eligible: true, reasons: [] }}
                        selected={drone.id === selectedDroneId}
                        onSelect={() => handleDroneSelect(drone)}
                      />
                    ))}
                  </div>

                  {eligibleDronesAtOrigin.length === 0 && (
                    <div className="operator-empty-state">No eligible drones are currently available at the Origin Hub.</div>
                  )}
                </>
              ) : (
                <div className="operator-empty-state">No eligible drone data is available.</div>
              )}
            </OperatorPanel>
          </div>
        )}

        {step === 3 && selectedDrone && (
          <div className="mission-step-stack">
            <OperatorPanel title="Route, energy & timing">
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
                {selectedRelayHubIds.length > 0 && (
                  <div className="relay-route-note">
                    <strong>Relay Hub</strong>
                    <span>{selectedRelayHubIds.map(hubName).join(' → ')} · technical stop handled by Technician.</span>
                  </div>
                )}
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
            <div className="operator-empty-state">Choose an available drone in Step 2 before AI compares route, energy, and timing.</div>
          </OperatorPanel>
        )}

        {step === 4 && originHub && destinationHub && selectedDrone && selectedRoute && selectedTiming && (
          <OperatorPanel title="Review & assign">
            <div className="mission-review-grid">
              <dl className="review-values">
                <div><dt>Order</dt><dd>{order.id}</dd></div><div><dt>Delivery mode</dt><dd>{order.deliveryMode}</dd></div>
                <div><dt>Origin Hub</dt><dd>{originHub.name}</dd></div><div><dt>Destination Hub</dt><dd>{destinationHub.name}</dd></div>
                <div>
                  <dt>Origin package</dt>
                  <dd>{order.originHubReceivedAt ? <>Received at Hub<br /><small>{formatMissionTime(order.originHubReceivedAt)}</small></> : 'Awaiting package'}</dd>
                </div>
                <div><dt>Drone</dt><dd>{getDroneDisplayCode(selectedDrone)}</dd></div>
                <div><dt>Route</dt><dd>{selectedRoute.id} · {selectedRoute.name}</dd></div>
                <div><dt>Relay Hub</dt><dd>{selectedRelayHubIds.length ? selectedRelayHubIds.map(hubName).join(' → ') : 'Not required'}</dd></div>
                <div><dt>Planned start</dt><dd>{formatMissionTime(selectedTiming.plannedStartAt)}</dd></div><div><dt>Estimated arrival</dt><dd>{formatMissionTime(selectedTiming.estimatedArrivalAt)}</dd></div>
              </dl>
              <div className="mission-review-side">
                <div className="review-readiness">
                  <StatusBadge tone="info">Mission plan ready</StatusBadge>
                  <small>Assign Mission creates a Scheduled Mission. Package receipt is checked later in Final Validation before the Mission can start.</small>
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
