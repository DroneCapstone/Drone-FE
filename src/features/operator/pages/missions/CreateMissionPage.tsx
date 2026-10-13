import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ActionButton } from '../../../../components/ui/ActionButton';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';

import { EligibleDroneCard } from '../../components/EligibleDroneCard';
import { EnergyPredictionSummary } from '../../components/EnergyPredictionSummary';
import { OperatorPanel } from '../../components/OperatorPanel';
import { RouteOptionCard } from '../../components/RouteOptionCard';
import { useOperatorEligibleDronesQuery, useOperatorOrderQuery } from '../../hooks/useOrderQueries';
import {
  useCreateMissionMutation,
  useMissionHubsQuery,
  useMissionPlanningAnalysisQuery,
} from '../../hooks/useMissionQueries';
import type { OperatorDrone, RouteOption } from '../../types/operator';
import {
  formatDeliveryWindow,
  getOrderPlanningBadge,
  isActionablePlanningState,
} from '../../utils/deliveryPlanning';
import { DEFAULT_BATTERY_RESERVE_PCT, getEnergyFeasibility } from '../../utils/droneEligibility';
import { getDroneDisplayCode } from '../../utils/droneDisplay';
import { clearMissionDraft, loadMissionDraft, saveMissionDraft } from '../../utils/missionDraftStorage';
import { calculateRouteTiming, formatMissionTime } from '../../utils/missionTiming';

import { MissionPageShell } from './MissionPageShell';

const STEPS = ['Order info', 'Select drone', 'Route, relay battery & energy', 'Review & assign'] as const;

function getRouteRelayHubIds(
  route: RouteOption,
  originHubId: string,
  destinationHubId: string,
) {
  return (route.relayHubIds ?? []).filter(
    (hubId) => hubId !== originHubId && hubId !== destinationHubId,
  );
}

export function CreateMissionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') ?? '';

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

  // Do not restore directly into Review: availability and planning may have changed.
  const [step, setStep] = useState(Math.min(3, Math.max(1, restoredDraft?.step ?? 1)));
  const [toast, setToast] = useState('');
  const [selectedDroneId, setSelectedDroneId] = useState(restoredDraft?.selectedDroneId || '');
  const [selectedRouteId, setSelectedRouteId] = useState(restoredDraft?.selectedRouteId || '');
  const { data: apiHubs } = useMissionHubsQuery();
  const {
    data: planningAnalysis,
    error: planningAnalysisError,
    isFetching: isPlanningAnalysisFetching,
    refetch: refetchPlanningAnalysis,
  } = useMissionPlanningAnalysisQuery(
    order?.id && selectedDroneId
      ? { orderId: order.id, droneId: selectedDroneId }
      : null,
  );
  const createMissionMutation = useCreateMissionMutation();

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

  const planningState = getOrderPlanningBadge(order, []);
  const networkHubs = apiHubs ?? [];
  const originHub = networkHubs.find((hub) => hub.id === order.originHubId);
  const destinationHub = networkHubs.find((hub) => hub.id === order.destinationHubId);
  const eligibleDronesAtOrigin = eligibleDronesData?.drones ?? [];
  const selectedDrone = eligibleDronesAtOrigin.find((drone) => drone.id === selectedDroneId);
  const routeOptions = planningAnalysis?.routes ?? [];
  const selectedRoute = routeOptions.find((route) => route.id === selectedRouteId);
  const originHubLabel = originHub?.name || order.originHubName || eligibleDronesData?.hub.name || order.originHubId || 'Origin Hub';
  const destinationHubLabel = destinationHub?.name || order.destinationHubName || order.destinationHubId || 'Destination Hub';
  const hubName = (hubId: string) =>
    networkHubs.find((hub) => hub.id === hubId)?.name ?? hubId;
  const selectedRouteEnergy = selectedRoute
    ? getEnergyFeasibility(selectedRoute, DEFAULT_BATTERY_RESERVE_PCT)
    : undefined;
  const selectedTiming = selectedRoute ? calculateRouteTiming(order, selectedRoute) : undefined;
  const selectedRelayHubIds = selectedRoute
    ? getRouteRelayHubIds(selectedRoute, order.originHubId, order.destinationHubId)
    : [];

  const hasOrderHubs = Boolean(order.originHubId && order.destinationHubId);
  const canContinueStep1 = Boolean(
    isActionablePlanningState(planningState) &&
    hasOrderHubs
  );
  // Backend guarantees that an eligible/available drone is equipped with its full battery set.
  const canContinueStep2 = Boolean(hasOrderHubs && selectedDrone);
  const canContinueStep3 = Boolean(
    canContinueStep1 && selectedRoute && selectedDrone && selectedTiming &&
    !isPlanningAnalysisFetching && !planningAnalysisError && selectedRouteEnergy?.feasible
  );

  const handleDroneSelect = (drone: OperatorDrone) => {
    if (drone.id === selectedDroneId) return;
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
      selectedBatteryId: '', // Legacy draft field, no Origin battery selection.
      selectedRouteId: routeId,
      relayBatterySelections: [],
    });
  };

  const handleViewAiDetails = (routeId: string) => {
    persistDraft(3, selectedRouteId);
    navigate(`/operator/ai/mission-analysis?orderId=${order.id}&droneId=${selectedDroneId}&routeId=${routeId}&returnTo=mission-create`);
  };

  const handleAssignMission = async () => {
    if (!canContinueStep3 || !selectedDrone || !selectedRoute) return;

    // Re-check drone eligibility and planning. A previously available drone may
    // have been assigned elsewhere while the Operator was reviewing the route.
    try {
      const eligibleNow = await refetchEligibleDrones();
      if (eligibleNow.error || !eligibleNow.data?.drones.some((drone) => drone.id === selectedDrone.id)) {
        setStep(2);
        setSelectedDroneId('');
        setSelectedRouteId('');
        showToast('Drone is no longer eligible. Please select another available drone.');
        return;
      }

      const current = await refetchPlanningAnalysis();
      if (current.error || !current.data) {
        showToast('Unable to revalidate route. Please try again.');
        return;
      }
      const currentRoute = current.data.routes.find((route) => route.id === selectedRoute.id);
      if (!currentRoute || !getEnergyFeasibility(currentRoute).feasible) {
        setStep(3);
        setSelectedRouteId('');
        showToast('Route or relay battery availability changed. Please select a route again.');
        return;
      }

      const mission = await createMissionMutation.mutateAsync({
        orderId: order.id,
        droneId: selectedDrone.id,
        routeId: currentRoute.id,
        ...(currentRoute.relayHubIds?.length && currentRoute.batteryPlanId
          ? { batteryPlanId: currentRoute.batteryPlanId }
          : {}),
      });

      clearMissionDraft(order.id);
      showToast('Mission assigned successfully');
      window.setTimeout(() => navigate(`/operator/missions/${mission.id}`), 500);
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Unable to create Mission.');
    }
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
              <label><span>Origin Hub</span><input value={originHubLabel} readOnly /></label>
              <label><span>Destination Hub</span><input value={destinationHubLabel} readOnly /></label>
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
            {!hasOrderHubs && (
              <div className="operator-empty-state">
                This Order does not contain a valid Origin Hub and Destination Hub.
              </div>
            )}
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
              {isPlanningAnalysisFetching && (
                <p className="section-note">Analyzing route, weather and energy with Backend…</p>
              )}
              {planningAnalysisError && (
                <p className="section-note danger-note">{planningAnalysisError instanceof Error ? planningAnalysisError.message : 'Unable to analyze mission planning.'}</p>
              )}
              {!isPlanningAnalysisFetching && !planningAnalysisError && routeOptions.length === 0 && (
                <div className="operator-empty-state">No route options were returned by the Backend.</div>
              )}
              <div className="route-option-list">
                {routeOptions.map((route) => {
                  const energy = getEnergyFeasibility(route);
                  const timing = calculateRouteTiming(order, route);
                  const relaySummary = (route.relayBatteryPlan ?? []).map((relay) =>
                    `${hubName(relay.hubId)}: ${relay.availableBatteryCount ?? '—'}/${relay.requiredBatteryCount ?? '—'} spare batteries`
                  ).join(' · ') || undefined;
                  return (
                    <RouteOptionCard
                      key={route.id}
                      route={route}
                      remainingBattery={energy.remainingBattery}
                      feasible={energy.feasible}
                      relayBatterySummary={relaySummary}
                      resolveHubName={hubName}
                      plannedStartAt={timing.plannedStartAt}
                      estimatedArrivalAt={timing.estimatedArrivalAt}
                      selected={route.id === selectedRouteId}
                      onSelect={() => setSelectedRouteId(route.id)}
                      onViewDetails={() => handleViewAiDetails(route.id)}
                    />
                  );
                })}
              </div>
              {selectedRoute && !canContinueStep3 && (
                <p className="section-note" role="status">
                  {isPlanningAnalysisFetching
                    ? 'Updating route analysis…'
                    : selectedRelayHubIds.length > 0
                      ? 'Relay route is not yet verified by Backend. Every flight leg must meet the energy reserve, and each relay must have a compatible available battery set with a confirmed battery plan.'
                      : 'This route does not meet the required energy reserve or is not verified. Choose another route.'}
                </p>
              )}
            </OperatorPanel>

            {selectedRoute && selectedRelayHubIds.length > 0 && (
              <OperatorPanel title="Relay Hub battery plan">
                <p className="section-note">The Backend checks compatible spare batteries and predicted energy for each leg. Battery swaps are performed by the Technician at each Relay Hub.</p>
                {selectedRelayHubIds.map((hubId) => {
                  const plan = selectedRoute.relayBatteryPlan?.find((item) => item.hubId === hubId);
                  return (
                    <div key={hubId} className="relay-route-note">
                      <strong>{hubName(hubId)}</strong>
                      <span>
                        {plan
                          ? `${plan.availableBatteryCount ?? '—'} / ${plan.requiredBatteryCount ?? '—'} compatible spares · ${plan.ready === true ? 'Verified by Backend' : 'Not verified'}`
                          : 'Awaiting Backend battery availability verification'}
                      </span>
                    </div>
                  );
                })}
                {selectedRoute.legs?.length ? (
                  <div className="mission-step-stack">
                    {selectedRoute.legs.map((leg, index) => (
                      <div key={`${leg.fromHubId}-${leg.toHubId}-${index}`} className="relay-route-note">
                        <strong>Leg {index + 1}: {hubName(leg.fromHubId)} → {hubName(leg.toHubId)}</strong>
                        <span>{leg.predictedEnergyWh ?? '—'} Wh · Battery after {leg.endingSocPct ?? '—'}% · {leg.feasible === true ? 'Feasible' : 'Not verified'}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                {!selectedRouteEnergy?.feasible && (
                  <p className="section-note danger-note">Review mission stays disabled until Backend verifies the full relay energy and battery plan.</p>
                )}
              </OperatorPanel>
            )}

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
            <div className="operator-empty-state">Choose an eligible drone in Step 2 before AI compares route, relay battery, energy, and timing.</div>
          </OperatorPanel>
        )}

        {step === 4 && hasOrderHubs && selectedDrone && selectedRoute && selectedTiming && canContinueStep3 && (
          <OperatorPanel title="Review & assign">
            <div className="mission-review-grid">
              <dl className="review-values">
                <div><dt>Order</dt><dd>{order.id}</dd></div><div><dt>Delivery mode</dt><dd>{order.deliveryMode}</dd></div>
                <div><dt>Origin Hub</dt><dd>{originHubLabel}</dd></div><div><dt>Destination Hub</dt><dd>{destinationHubLabel}</dd></div>
                <div>
                  <dt>Origin package</dt>
                  <dd>{order.originHubReceivedAt ? <>Received at Hub<br /><small>{formatMissionTime(order.originHubReceivedAt)}</small></> : 'Awaiting package'}</dd>
                </div>
                <div><dt>Drone</dt><dd>{getDroneDisplayCode(selectedDrone)}</dd></div>
                <div><dt>Route</dt><dd>{selectedRoute.id} · {selectedRoute.name}</dd></div>
                <div><dt>Relay Hub</dt><dd>{selectedRelayHubIds.length ? selectedRelayHubIds.map(hubName).join(' → ') : 'Not required'}</dd></div>
                {selectedRelayHubIds.length > 0 && <div><dt>Relay battery plan</dt><dd>{selectedRelayHubIds.map((hubId) => {
                  const plan = selectedRoute.relayBatteryPlan?.find((item) => item.hubId === hubId);
                  return `${hubName(hubId)}: ${plan?.requiredBatteryCount ?? '—'} batteries`;
                }).join(' · ')}</dd></div>}
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
          {step === 4 && <ActionButton icon="check" disabled={createMissionMutation.isPending || isPlanningAnalysisFetching || !canContinueStep3} onClick={() => void handleAssignMission()}>{createMissionMutation.isPending ? 'Assigning…' : 'Assign mission'}</ActionButton>}
        </div>
      </div>
      {toast && <div className="operator-toast">{toast}</div>}
    </MissionPageShell>
  );
}
