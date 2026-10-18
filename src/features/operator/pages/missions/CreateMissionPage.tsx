import { useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ActionButton } from '../../../../components/ui/ActionButton';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';

import { EligibleDroneCard } from '../../components/EligibleDroneCard';
import { useFleetBatteriesQuery, useFleetDronesQuery } from '../../hooks/useFleetQueries';
import { getBatteryCompatibility, getCompatibleBatteriesAtHub, getSpareBatteriesAtHub, isReadyBattery } from '../../utils/batteryPlanning';
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
  canCreateMissionForOrder,
} from '../../utils/deliveryPlanning';
import { DEFAULT_BATTERY_RESERVE_PCT, getEnergyFeasibility } from '../../utils/droneEligibility';
import { getDroneDisplayCode } from '../../utils/droneDisplay';
import { clearMissionDraft, loadMissionDraft, saveMissionDraft } from '../../utils/missionDraftStorage';
import { calculateRouteTiming, formatMissionTime } from '../../utils/missionTiming';

import { MissionPageShell } from './MissionPageShell';
import './create-mission-compact.css';

// const assignLockRef = useRef(false);

// const [isAssigning, setIsAssigning] = useState(false);
// const [needsMissionCheck, setNeedsMissionCheck] = useState(false);

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
  const assignLockRef = useRef(false);
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
  // Fleet records may provide batteryModel when eligible-drones omits it.
  // Only the battery MODEL is shown; Available already implies full batteries.
  const { data: fleetDrones } = useFleetDronesQuery();
  const {
    data: fleetBatteries,
    isLoading: batteriesLoading,
    isFetching: batteriesFetching,
    error: batteriesError,
    refetch: refetchBatteries,
  } = useFleetBatteriesQuery();
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
  const eligibleDronesAtOrigin = (eligibleDronesData?.drones ?? []).map((drone) => {
    const fleetDrone = fleetDrones?.find((item) => item.id === drone.id);
    const installedBatteryModels = (fleetBatteries ?? [])
      .filter((battery) => battery.droneId === drone.id && Boolean(battery.model))
      .map((battery) => battery.model!.trim());
    const distinctModels = [...new Set(installedBatteryModels.map((model) => model.toLowerCase()))];
    const installedModel = distinctModels.length === 1 ? installedBatteryModels[0] : undefined;
    return {
      ...drone,
      // Installed batteries prove their model is currently used by this drone.
      // Never infer compatibility with other battery models from drone_id.
      batteryModel: drone.batteryModel || fleetDrone?.batteryModel || installedModel,
    };
  });
  const selectedDrone = eligibleDronesAtOrigin.find((drone) => drone.id === selectedDroneId);
  const routeOptions = planningAnalysis?.routes ?? [];
  const selectedRoute = routeOptions.find((route) => route.id === selectedRouteId);
  const originHubLabel = originHub?.name || order.originHubName || eligibleDronesData?.hub.name || order.originHubId || 'Drop-off Point';
  const destinationHubLabel = destinationHub?.name || order.destinationHubName || order.destinationHubId || 'Pick-up Point';
  const hubName = (hubId: string) =>
    networkHubs.find((hub) => hub.id === hubId)?.name ?? hubId;
  const selectedRouteEnergy = selectedRoute
    ? getEnergyFeasibility(selectedRoute, DEFAULT_BATTERY_RESERVE_PCT)
    : undefined;
  const selectedTiming = selectedRoute ? calculateRouteTiming(order, selectedRoute) : undefined;
  const selectedRelayHubIds = selectedRoute
    ? getRouteRelayHubIds(selectedRoute, order.originHubId, order.destinationHubId)
    : [];
  // A Hub can only be selected if BE Analyze has returned a route through it.
  // Selecting a Hub here actually selects the matching AI route/routeId.
  const relayRouteOptions = routeOptions.filter((route) =>
    getRouteRelayHubIds(route, order.originHubId, order.destinationHubId).length > 0
  );

  const hasOrderHubs = Boolean(order.originHubId && order.destinationHubId);
  const canContinueStep1 = Boolean(
    canCreateMissionForOrder(order) &&
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
    console.count('[CreateMission] Assign clicked');
    if (assignLockRef.current || !canContinueStep3 || !selectedDrone || !selectedRoute) return;
    assignLockRef.current = true;

    // Re-check drone eligibility and planning. A previously available drone may
    // have been assigned elsewhere while the Operator was reviewing the route.
    try {
      // Re-fetch authoritative receipt/planning state just before assignment.
      const latestOrder = await refetchOrder();
      if (latestOrder.error || !latestOrder.data || !canCreateMissionForOrder(latestOrder.data)) {
        setStep(1);
        showToast('Package receipt or planning status is not valid. Refresh the Order before assigning.');
        return;
      }
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
    } finally {
      assignLockRef.current = false;
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
                  value={order.originPackageReceived || order.originHubReceivedAt ? `Received at Hub${order.originHubReceivedAt ? ` · ${formatMissionTime(order.originHubReceivedAt)}` : ''}` : 'Awaiting package'}
                  readOnly
                />
              </label>
              <label><span>Drop-off Point</span><input value={originHubLabel} readOnly /></label>
              <label><span>Pick-up Point</span><input value={destinationHubLabel} readOnly /></label>
              <label><span>Package</span><input value={`${order.packageLabel} · ${order.payloadKg} kg`} readOnly /></label>
              <label><span>Estimated delivery</span><input value={formatDeliveryWindow(order)} readOnly /></label>
            </div>
            <div className="mission-planning-note">
              <StatusBadge tone={planningState === 'Ready for Planning' ? 'warning' : planningState === 'Needs Replanning' ? 'danger' : 'info'}>
                {planningState ?? 'Closed'}
              </StatusBadge>
              <span>
                {planningState === 'Ready for Planning'
                  ? canContinueStep1 ? 'Package received. You can plan this Mission.' : 'Awaiting Technician confirmation of package receipt before planning this Mission.'
                  : planningState === 'Needs Replanning'
                    ? 'The previous Mission was cancelled. Wait for the customer/system to provide a new delivery window before creating another Mission.'
                    : `Planning opens ${formatMissionTime(order.planningAt)}.`}
              </span>
            </div>
            {!hasOrderHubs && (
              <div className="operator-empty-state">
                This Order does not contain a valid Drop-off Point and Pick-up Point.
              </div>
            )}
          </OperatorPanel>
        )}

        {step === 2 && (
          <div className="mission-step-stack">
            <OperatorPanel title="Delivery network">
              <div className="delivery-network-strip">
                <div className="delivery-network-node">
                  <small>Drop-off Point</small>
                  <strong>{originHubLabel}</strong>
                  {/* <span>Customer selected</span> */}
                </div>
                <div className="delivery-network-arrow">→</div>
                <div className="delivery-network-node">
                  <small>Pick-up Point</small>
                  <strong>{destinationHubLabel}</strong>
                  {/* <span>Customer selected</span> */}
                </div>
              </div>
              {/* <p className="section-note">Origin and Pick-up Points are fixed by the customer. Route planning may add an intermediate Relay Hub when a long-distance flight requires a technical stop.</p> */}
            </OperatorPanel>

            <OperatorPanel title="Available drones">
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
                  {/* Drop-off Point summary and API explanation hidden by design.
                      Keep the JSX below commented so it can be restored if needed.
                  <div className="hub-grid hub-grid-select">
                    <div className="hub-card">
                      <div className="hub-card-head">
                        <div>
                          <span className="eyebrow">Drop-off Point</span>
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
                  <p className="section-note">Only drones returned by the Backend eligibility check are shown. The API already filters by Drop-off Point, availability, assignment conflict, and payload capacity.</p>
                  */}

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
                    <div className="operator-empty-state">No eligible drones are currently available at the Drop-off Point.</div>
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
                <p className="section-note">Analyzing route, weather and energy…</p>
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
                <p className="section-note">
                  Select one of the Relay Hubs returned by AI route analysis, then inspect live Operator Battery Inventory.
                  The Technician chooses the actual battery at the relay stop; BE verifies the plan before Assign.
                </p>
                <div className="relay-hub-choice">
                  <label htmlFor="relay-ai-route-choice">Relay Hub · AI route options</label>
                  <select
                    id="relay-ai-route-choice"
                    value={selectedRoute.id}
                    onChange={(event) => setSelectedRouteId(event.target.value)}
                    disabled={isPlanningAnalysisFetching || relayRouteOptions.length < 2}
                  >
                    {relayRouteOptions.map((route) => (
                      <option value={route.id} key={route.id}>
                        {getRouteRelayHubIds(route, order.originHubId, order.destinationHubId)
                          .map(hubName).join(' → ')} · {route.id}
                      </option>
                    ))}
                  </select>
                  {relayRouteOptions.length < 2 && (
                    <small>Only one Relay route was returned by Analyze. Another Hub requires another route from Backend.</small>
                  )}
                </div>
                {selectedRelayHubIds.map((hubId) => {
                  const plan = selectedRoute.relayBatteryPlan?.find((item) => item.hubId === hubId);
                  const spare = getSpareBatteriesAtHub(fleetBatteries ?? [], hubId);
                  const compatibleReady = getCompatibleBatteriesAtHub(fleetBatteries ?? [], selectedDrone, hubId);
                  const requiredModel = selectedDrone.batteryModel?.trim() || '';
                  const preview = [...compatibleReady, ...spare.filter((battery) => !compatibleReady.some((item) => item.id === battery.id))].slice(0, 6);
                  const inventoryLoaded = fleetBatteries !== undefined && !batteriesError;
                  return (
                    <div key={hubId} className="relay-hub-inventory">
                      <div className="relay-hub-inventory-head">
                        <strong>{hubName(hubId)}</strong>
                        <a
                          className="text-button"
                          href={`/operator/fleet-hubs/batteries?hub=${encodeURIComponent(hubId)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Battery Inventory ↗
                        </a>
                      </div>
                      <div className="relay-hub-inventory-summary">
                        <span>Drone required battery: <strong>{requiredModel || 'Unknown from API'}</strong></span>
                        <span>Spare batteries at Hub: <strong>{inventoryLoaded ? spare.length : '—'}</strong></span>
                        <span>Ready 100% matching candidates: <strong>{inventoryLoaded && requiredModel ? compatibleReady.length : '—'}</strong></span>
                      </div>
                      {batteriesError ? (
                        <div className="relay-hub-inventory-message">
                          <strong>Battery API could not load.</strong>
                          <span>{batteriesError instanceof Error ? batteriesError.message : 'Please retry.'}</span>
                          <button type="button" className="row-action" onClick={() => void refetchBatteries()}>Retry inventory</button>
                        </div>
                      ) : batteriesLoading || !inventoryLoaded ? (
                        <p className="section-note">Loading real Battery Inventory from Backend…</p>
                      ) : (
                        <>
                          {batteriesFetching && <p className="section-note">Refreshing Battery Inventory…</p>}
                          {!requiredModel && (
                            <p className="section-note danger-note">Required battery model is missing for the selected drone. Cannot verify compatibility.</p>
                          )}
                          {spare.length === 0 ? (
                            <p className="section-note">No spare batteries are recorded at this Hub in the current Battery API response. Check Hub ID and inventory.</p>
                          ) : (
                            <div className="relay-hub-battery-list">
                              {preview.map((battery) => {
                                const isCandidate = compatibleReady.some((item) => item.id === battery.id);
                                const matchingModel = getBatteryCompatibility(battery, selectedDrone);
                                const reason = isCandidate
                                  ? '100% candidate · not yet reserved'
                                  : !isReadyBattery(battery)
                                    ? `Not ready · ${battery.availableStatus || 'Availability unknown'}`
                                    : battery.chargeLevelPct < 100
                                      ? 'Needs 100% charge'
                                      : matchingModel === 'incompatible'
                                        ? 'Different battery model'
                                        : 'Compatibility not confirmed';
                                return (
                                  <div key={battery.id} className="relay-hub-battery-row">
                                    <strong>{battery.serialNumber || battery.id}</strong>
                                    <span>{battery.model || 'Model unknown'}</span>
                                    <span>{battery.chargeLevelPct}% · {battery.availableStatus || 'Availability unknown'}</span>
                                    <small className={isCandidate ? 'relay-candidate' : ''}>{reason}</small>
                                  </div>
                                );
                              })}
                              {spare.length > preview.length && (
                                <small>Showing {preview.length} of {spare.length} spare batteries. View Inventory for more.</small>
                              )}
                            </div>
                          )}
                          {requiredModel && compatibleReady.length === 0 && spare.length > 0 && (
                            <p className="section-note danger-note">No compatible spare batteries at 100% charge were found in this Hub inventory.</p>
                          )}
                        </>
                      )}
                      <p className="section-note">
                        <strong>Backend relay validation: </strong>
                        {plan
                          ? `${plan.availableBatteryCount ?? '—'} / ${plan.requiredBatteryCount ?? '—'} required battery set · ${plan.ready === true ? 'Verified' : 'Not verified'}`
                          : 'Not provided by Analyze. Inventory candidates do not prove flight readiness.'}
                      </p>
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
                <div><dt>Drop-off Point</dt><dd>{originHubLabel}</dd></div><div><dt>Pick-up Point</dt><dd>{destinationHubLabel}</dd></div>
                <div>
                  <dt>Origin package</dt>
                  <dd>{order.originPackageReceived || order.originHubReceivedAt ? <>Received at Hub{order.originHubReceivedAt && <><br /><small>{formatMissionTime(order.originHubReceivedAt)}</small></>}</> : 'Awaiting package'}</dd>
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
                  <small>Package receipt has been confirmed. Assign Mission creates a Scheduled Mission; departure conditions are validated separately by Backend.</small>
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
