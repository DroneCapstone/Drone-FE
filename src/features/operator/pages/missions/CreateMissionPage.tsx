import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ActionButton } from '../../../../components/ui/ActionButton';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';

import { BatteryOptionCard } from '../../components/BatteryOptionCard';
import { EligibleDroneCard } from '../../components/EligibleDroneCard';
import { EnergyPredictionSummary } from '../../components/EnergyPredictionSummary';
import { OperatorPanel } from '../../components/OperatorPanel';
import { RouteOptionCard } from '../../components/RouteOptionCard';
import { useFleetBatteriesQuery } from '../../hooks/useFleetQueries';
import { useOperatorEligibleDronesQuery, useOperatorOrderQuery } from '../../hooks/useOrderQueries';
import {
  useCreateMissionMutation,
  useMissionHubsQuery,
  useMissionPlanningAnalysisQuery,
} from '../../hooks/useMissionQueries';
import type { OperatorDrone, RelayBatterySelection, RouteOption } from '../../types/operator';
import {
  formatDeliveryWindow,
  getOrderPlanningBadge,
  isActionablePlanningState,
} from '../../utils/deliveryPlanning';
import {
  getCompatibleBatteriesAtHub,
  getRelayBatteryReadiness,
  isRelayBatteryPlanReady,
} from '../../utils/batteryPlanning';
import { DEFAULT_BATTERY_RESERVE_PCT, getEnergyFeasibility } from '../../utils/droneEligibility';
import { getDroneDisplayCode } from '../../utils/droneDisplay';
import { clearMissionDraft, loadMissionDraft, saveMissionDraft } from '../../utils/missionDraftStorage';
import { calculateRouteTiming, formatMissionTime } from '../../utils/missionTiming';

import { MissionPageShell } from './MissionPageShell';

const STEPS = ['Order info', 'Drone & battery', 'Route, relay battery & energy', 'Review & assign'] as const;

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

  const [step, setStep] = useState(restoredDraft?.step ?? 1);
  const [toast, setToast] = useState('');
  const [selectedDroneId, setSelectedDroneId] = useState(restoredDraft?.selectedDroneId || '');
  const [selectedBatteryId, setSelectedBatteryId] = useState(restoredDraft?.selectedBatteryId || '');
  const [selectedRouteId, setSelectedRouteId] = useState(restoredDraft?.selectedRouteId || '');
  const [relayBatterySelections, setRelayBatterySelections] = useState<Record<string, string>>(() =>
    Object.fromEntries((restoredDraft?.relayBatterySelections ?? []).map((item) => [item.hubId, item.batteryId])),
  );

  const {
    data: fleetBatteries = [],
    error: fleetBatteriesError,
    isLoading: fleetBatteriesLoading,
    refetch: refetchFleetBatteries,
  } = useFleetBatteriesQuery();
  const { data: apiHubs } = useMissionHubsQuery();
  const {
    data: planningAnalysis,
    error: planningAnalysisError,
    isFetching: isPlanningAnalysisFetching,
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
  const originCompatibleBatteries = selectedDrone
    ? getCompatibleBatteriesAtHub(fleetBatteries, selectedDrone, order.originHubId)
    : [];
  const selectedBattery = originCompatibleBatteries.find((battery) => battery.id === selectedBatteryId);
  const routeOptions = planningAnalysis?.routes ?? [];
  const selectedRoute = routeOptions.find((route) => route.id === selectedRouteId);
  const originHubLabel = originHub?.name || eligibleDronesData?.hub.name || order.originHubId || 'Origin Hub';
  const destinationHubLabel = destinationHub?.name || order.destinationHubId || 'Destination Hub';
  const hubName = (hubId: string) =>
    networkHubs.find((hub) => hub.id === hubId)?.name ?? hubId;
  const selectedTiming = selectedRoute ? calculateRouteTiming(order, selectedRoute) : undefined;
  const selectedRelayHubIds = selectedRoute
    ? getRouteRelayHubIds(selectedRoute, order.originHubId, order.destinationHubId)
    : [];
  const selectedRelayReadiness = selectedRoute && selectedDrone
    ? getRelayBatteryReadiness(
        selectedRoute,
        fleetBatteries,
        selectedDrone,
        order.originHubId,
        order.destinationHubId,
      )
    : [];
  const relaySelectionsComplete = selectedRelayReadiness.every(
    (item) => item.ready && Boolean(relayBatterySelections[item.hubId]),
  );

  const canContinueStep1 = isActionablePlanningState(planningState);
  const canContinueStep2 = Boolean(originHub && destinationHub && selectedDrone && selectedBattery);
  const canContinueStep3 = Boolean(
    selectedRoute &&
    selectedDrone &&
    selectedBattery &&
    selectedTiming &&
    isRelayBatteryPlanReady(selectedRelayReadiness) &&
    relaySelectionsComplete
  );

  const handleDroneSelect = (drone: OperatorDrone) => {
    setSelectedDroneId(drone.id);
    setSelectedBatteryId('');
    setSelectedRouteId('');
    setRelayBatterySelections({});
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const persistDraft = (nextStep = step, routeId = selectedRouteId) => {
    const relaySelections: RelayBatterySelection[] = Object.entries(relayBatterySelections).map(
      ([hubId, batteryId]) => ({ hubId, batteryId }),
    );
    saveMissionDraft({
      orderId: order.id,
      step: nextStep,
      selectedDroneId,
      selectedBatteryId,
      selectedRouteId: routeId,
      relayBatterySelections: relaySelections,
    });
  };

  const handleViewAiDetails = (routeId: string) => {
    persistDraft(3, selectedRouteId);
    navigate(`/operator/ai/mission-analysis?orderId=${order.id}&droneId=${selectedDroneId}&routeId=${routeId}&returnTo=mission-create`);
  };

  const handleAssignMission = async () => {
    if (!originHub || !destinationHub || !selectedDrone || !selectedBattery || !selectedRoute || !selectedTiming) return;

    const energy = getEnergyFeasibility(selectedRoute, DEFAULT_BATTERY_RESERVE_PCT, selectedBattery.chargeLevelPct);
    if (!energy.feasible) {
      showToast('Selected route does not keep the minimum battery reserve');
      return;
    }

    try {
      const mission = await createMissionMutation.mutateAsync({
        orderId: order.id,
        droneId: selectedDrone.id,
        routeId: selectedRoute.id,
      });

      clearMissionDraft(order.id);
      showToast('Mission assigned successfully');
      window.setTimeout(() => navigate(`/operator/missions/${mission.id}`), 500);
    } catch (reason) {
      showToast(
        reason instanceof Error
          ? reason.message
          : 'Unable to create Mission.',
      );
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

            {selectedDrone && (
              <OperatorPanel title="Origin Hub battery">
                {fleetBatteriesLoading ? (
                  <div className="operator-empty-state">Loading batteries…</div>
                ) : fleetBatteriesError ? (
                  <div className="operator-empty-state mission-create-gate">
                    <strong>Unable to load batteries</strong>
                    <span>{fleetBatteriesError instanceof Error ? fleetBatteriesError.message : 'Could not load battery inventory.'}</span>
                    <ActionButton onClick={() => void refetchFleetBatteries()}>Retry</ActionButton>
                  </div>
                ) : originCompatibleBatteries.length > 0 ? (
                  <>
                    <p className="section-note">Choose an Active battery linked to the selected drone at the Origin Hub.</p>
                    <div className="eligible-drone-grid">
                      {originCompatibleBatteries.map((battery) => (
                        <BatteryOptionCard
                          key={battery.id}
                          battery={battery}
                          selected={battery.id === selectedBatteryId}
                          onSelect={() => { setSelectedBatteryId(battery.id); setSelectedRouteId(''); setRelayBatterySelections({}); }}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="operator-empty-state">No Active compatible battery is available for this drone at the Origin Hub.</div>
                )}
              </OperatorPanel>
            )}
          </div>
        )}

        {step === 3 && selectedDrone && selectedBattery && (
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
                  const energy = getEnergyFeasibility(route, DEFAULT_BATTERY_RESERVE_PCT, selectedBattery.chargeLevelPct);
                  const timing = calculateRouteTiming(order, route);
                  const relayReadiness = getRelayBatteryReadiness(
                    route,
                    fleetBatteries,
                    selectedDrone,
                    order.originHubId,
                    order.destinationHubId,
                  );
                  const relayBatteryReady = isRelayBatteryPlanReady(relayReadiness);
                  const relayBatterySummary = relayReadiness.length
                    ? relayReadiness.map((item) => `${hubName(item.hubId)}: ${item.compatibleBatteries.length} battery`).join(' · ')
                    : undefined;
                  return (
                    <RouteOptionCard
                      key={route.id}
                      route={route}
                      remainingBattery={energy.remainingBattery}
                      feasible={energy.feasible}
                      relayBatteryReady={relayBatteryReady}
                      relayBatterySummary={relayBatterySummary}
                      plannedStartAt={timing.plannedStartAt}
                      estimatedArrivalAt={timing.estimatedArrivalAt}
                      selected={route.id === selectedRouteId}
                      onSelect={() => { setSelectedRouteId(route.id); setRelayBatterySelections({}); }}
                      onViewDetails={() => handleViewAiDetails(route.id)}
                    />
                  );
                })}
              </div>
            </OperatorPanel>

            {selectedRoute && selectedRelayReadiness.length > 0 && (
              <OperatorPanel title="Relay Hub battery plan">
                <p className="section-note">Each Relay Hub must have an Active compatible battery for the selected drone before the route can be assigned.</p>
                {selectedRelayReadiness.map((relay) => (
                  <div key={relay.hubId} className="mission-step-stack">
                    <div className="relay-route-note">
                      <strong>{hubName(relay.hubId)}</strong>
                      <span>{relay.compatibleBatteries.length} compatible Active battery available</span>
                    </div>
                    {relay.compatibleBatteries.length > 0 ? (
                      <div className="eligible-drone-grid">
                        {relay.compatibleBatteries.map((battery) => (
                          <BatteryOptionCard
                            key={battery.id}
                            battery={battery}
                            selected={relayBatterySelections[relay.hubId] === battery.id}
                            onSelect={() => setRelayBatterySelections((current) => ({ ...current, [relay.hubId]: battery.id }))}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="operator-empty-state">No compatible Active battery is available at this Relay Hub.</div>
                    )}
                  </div>
                ))}
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

        {step === 3 && (!selectedDrone || !selectedBattery) && (
          <OperatorPanel title="Route, energy & timing">
            <div className="operator-empty-state">Choose an available drone and an Active compatible battery in Step 2 before AI compares route, relay battery, energy, and timing.</div>
          </OperatorPanel>
        )}

        {step === 4 && originHub && destinationHub && selectedDrone && selectedBattery && selectedRoute && selectedTiming && (
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
                <div><dt>Origin battery</dt><dd>{selectedBattery.serialNumber} · {selectedBattery.chargeLevelPct}%</dd></div>
                <div><dt>Route</dt><dd>{selectedRoute.id} · {selectedRoute.name}</dd></div>
                <div><dt>Relay Hub</dt><dd>{selectedRelayHubIds.length ? selectedRelayHubIds.map(hubName).join(' → ') : 'Not required'}</dd></div>
                <div><dt>Relay batteries</dt><dd>{selectedRelayHubIds.length ? selectedRelayHubIds.map((hubId) => { const batteryId = relayBatterySelections[hubId]; const battery = fleetBatteries.find((item) => item.id === batteryId); return `${hubName(hubId)}: ${battery?.serialNumber ?? 'Not selected'}`; }).join(' · ') : 'Not required'}</dd></div>
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
          {step === 4 && <ActionButton icon="check" disabled={createMissionMutation.isPending} onClick={() => void handleAssignMission()}>{createMissionMutation.isPending ? 'Assigning…' : 'Assign mission'}</ActionButton>}
        </div>
      </div>
      {toast && <div className="operator-toast">{toast}</div>}
    </MissionPageShell>
  );
}
