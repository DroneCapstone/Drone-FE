import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ActionButton } from '../../../../components/ui/ActionButton';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';

import { EligibleDroneCard } from '../../components/EligibleDroneCard';
import { useFleetBatteriesQuery, useFleetDronesQuery } from '../../hooks/useFleetQueries';
import { EnergyPredictionSummary } from '../../components/EnergyPredictionSummary';
import { OperatorPanel } from '../../components/OperatorPanel';
import { RouteOptionCard } from '../../components/RouteOptionCard';
import { useOperatorEligibleDronesQuery, useOperatorOrderQuery } from '../../hooks/useOrderQueries';
import {
  useCreateMissionMutation,
  useEligibleMissionBatteriesQuery,
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

const STEPS = ['Order info', 'Select drone & battery', 'Route, relay battery & energy', 'Review & assign'] as const;

// Keep current local-drone spare battery selection unchanged.
// A cross-hub drone instead takes a BE-eligible battery from its current Hub,
// including a battery installed on that SAME drone. Never take another drone's battery.
function isSelectableMissionBattery(
  battery: { availableStatus?: string; isSelectable?: boolean; droneId?: string; hubId?: string; isInstalledOnDrone?: boolean },
  drone: OperatorDrone,
  originHubId: string,
) {
  if (battery.isSelectable === false || battery.availableStatus?.trim().toLowerCase() !== 'ready') return false;
  if (!drone.isCrossHub) {
    return !battery.droneId && (!battery.hubId || battery.hubId === originHubId);
  }
  if (!drone.hubId || !battery.hubId || battery.hubId !== drone.hubId) return false;
  return !battery.droneId || battery.droneId === drone.id;
}

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
  // Existing drafts used a 5-step flow: Step 3 was Select battery, Step 4 was Route.
  // Never restore into Review directly; both flows return to Route for validation.
  const [step, setStep] = useState(() => {
    const savedStep = restoredDraft?.step ?? 1;
    if (savedStep >= 4) return 3;
    if (savedStep === 3) return restoredDraft?.selectedBatteryId ? 3 : 2;
    return Math.min(2, Math.max(1, savedStep));
  });
  const [toast, setToast] = useState('');
  const [selectedDroneId, setSelectedDroneId] = useState(restoredDraft?.selectedDroneId || '');
  const [selectedBatteryId, setSelectedBatteryId] = useState(restoredDraft?.selectedBatteryId || '');
  const [selectedRouteId, setSelectedRouteId] = useState(restoredDraft?.selectedRouteId || '');
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  const { data: apiHubs } = useMissionHubsQuery();
  // Fleet records may provide batteryModel when eligible-drones omits it.
  // Only the battery MODEL is shown; Available already implies full batteries.
  const { data: fleetDrones } = useFleetDronesQuery();
  const {
    data: fleetBatteries,
  } = useFleetBatteriesQuery();
  const crossHubDroneForQuery = eligibleDronesData?.drones.find((drone) => drone.id === selectedDroneId);
  const {
    data: eligibleBatteries,
    isLoading: eligibleBatteriesLoading,
    isFetching: eligibleBatteriesFetching,
    error: eligibleBatteriesError,
    refetch: refetchEligibleBatteries,
  } = useEligibleMissionBatteriesQuery(
    orderId, selectedDroneId,
    crossHubDroneForQuery?.isCrossHub ? crossHubDroneForQuery.hubId : undefined,
  );
  const {
    data: planningAnalysis,
    error: planningAnalysisError,
    isFetching: isPlanningAnalysisFetching,
    refetch: refetchPlanningAnalysis,
  } = useMissionPlanningAnalysisQuery(
    order?.id && selectedDroneId && selectedBatteryId
      ? { orderId: order.id, droneId: selectedDroneId, batteryId: selectedBatteryId }
      : null,
  );
  const createMissionMutation = useCreateMissionMutation();

  // AI recommends; the Operator remains free to select and review any proposed route.
  // Default to AI Recommended for convenience, not as an assignment/approval decision.
  // This effect must stay above early returns (React hooks rule).
  useEffect(() => {
    if (isPlanningAnalysisFetching || !planningAnalysis) return;
    if (planningAnalysis.routes.some((route) => route.id === selectedRouteId)) return;
    const recommended = planningAnalysis.routes.find((route) => route.recommended);
    const nextRouteId = (recommended ?? planningAnalysis.routes[0])?.id ?? '';
    if (nextRouteId === selectedRouteId) return;
    setSelectedRouteId(nextRouteId);
    setExpandedRouteId(null);
  }, [planningAnalysis, isPlanningAnalysisFetching, selectedRouteId]);

  useEffect(() => {
    if (!selectedBatteryId || !eligibleBatteries || !order) return;
    const drone = eligibleDronesData?.drones.find((item) => item.id === selectedDroneId);
    if (drone?.isSelectable !== false && drone && eligibleBatteries.some((battery) =>
      battery.id === selectedBatteryId && isSelectableMissionBattery(battery, drone, order.originHubId)
    )) return;
    setSelectedBatteryId('');
    setSelectedRouteId('');
    setExpandedRouteId(null);
  }, [selectedBatteryId, selectedDroneId, eligibleBatteries, eligibleDronesData, order]);

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
  }).sort((a, b) => a.maxPayloadKg - b.maxPayloadKg);
  const selectedDrone = eligibleDronesAtOrigin.find((drone) => drone.id === selectedDroneId);
  const availableOriginBatteries = (eligibleBatteries ?? []).filter((battery) =>
    selectedDrone && isSelectableMissionBattery(battery, selectedDrone, order.originHubId),
  );
  const selectedBattery = availableOriginBatteries.find((battery) => battery.id === selectedBatteryId);
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
  const hasOrderHubs = Boolean(order.originHubId && order.destinationHubId);
  const canContinueStep1 = Boolean(
    canCreateMissionForOrder(order) &&
    hasOrderHubs
  );
  // The combined selection is complete only when both a drone and its origin battery
  // have been explicitly chosen; a previously selected battery may be invalidated by BE.
  const canContinueStep2 = Boolean(
    canContinueStep1 && selectedDrone && selectedDrone.isSelectable !== false && selectedBattery &&
    !eligibleBatteriesLoading && !eligibleBatteriesFetching && !eligibleBatteriesError
  );
  // Step 3 -> Step 4 is a review/navigation action, not a flight safety approval.
  // Reviewing is allowed for any chosen route, including one with warnings.
  const canReviewMission = Boolean(
    canContinueStep1 && canContinueStep2 && selectedRoute && selectedDrone && selectedTiming &&
    !isPlanningAnalysisFetching && !planningAnalysisError
  );
  // Only final Assign is guarded by the authoritative Analyze feasibility result.
  const hasDispatchLeg = selectedRoute?.legDetails?.some((leg) =>
    leg.is_dispatch === true || leg.leg_type?.toUpperCase() === 'DISPATCH',
  ) === true;
  const canAssignMission = canReviewMission && selectedRouteEnergy?.feasible === true &&
    (!selectedDrone?.isCrossHub || hasDispatchLeg);

  const handleDroneSelect = (drone: OperatorDrone) => {
    if (drone.isSelectable === false || drone.id === selectedDroneId) return;
    setSelectedDroneId(drone.id);
    setSelectedBatteryId('');
    setSelectedRouteId('');
    setExpandedRouteId(null);
  };

  const handleChangeDrone = () => {
    setSelectedDroneId('');
    setSelectedBatteryId('');
    setSelectedRouteId('');
    setExpandedRouteId(null);
    // Discard old selection so it cannot return on refresh.
    saveMissionDraft({
      orderId: order.id,
      step: 2,
      selectedDroneId: '',
      selectedBatteryId: '',
      selectedRouteId: '',
      relayBatterySelections: [],
    });
  };

  const handleBatterySelect = (batteryId: string) => {
    if (batteryId === selectedBatteryId) return;
    setSelectedBatteryId(batteryId);
    setSelectedRouteId('');
    setExpandedRouteId(null);
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
      selectedBatteryId,
      selectedRouteId: routeId,
      relayBatterySelections: [],
    });
  };

  const handleViewAiDetails = (routeId: string) => {
    persistDraft(3, selectedRouteId);
    navigate(`/operator/ai/mission-analysis?${new URLSearchParams({ orderId: order.id, droneId: selectedDroneId, batteryId: selectedBatteryId, routeId, returnTo: 'mission-create' }).toString()}`);
  };



  const handleAssignMission = async () => {
    console.count('[CreateMission] Assign clicked');
    if (assignLockRef.current || !canAssignMission || !selectedDrone || !selectedBattery || !selectedRoute) return;
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
      if (eligibleNow.error || !eligibleNow.data?.drones.some((drone) => drone.id === selectedDrone.id && drone.isSelectable !== false)) {
        setStep(2);
        setSelectedDroneId('');
        setSelectedBatteryId('');
        setSelectedRouteId('');
        showToast('Drone is no longer eligible. Please select another available drone.');
        return;
      }

      const batteriesNow = await refetchEligibleBatteries();
      if (batteriesNow.error || !batteriesNow.data?.some((item) =>
        item.id === selectedBatteryId && isSelectableMissionBattery(item, selectedDrone, order.originHubId)
      )) {
        setStep(2);
        setSelectedBatteryId('');
        setSelectedRouteId('');
        showToast('Selected battery is no longer eligible. Choose another battery.');
        return;
      }

      const current = await refetchPlanningAnalysis();
      if (current.error || !current.data) {
        showToast('Unable to revalidate route. Please try again.');
        return;
      }
      const currentRoute = current.data.routes.find((route) => route.id === selectedRoute.id);
      if (!currentRoute || !getEnergyFeasibility(currentRoute).feasible ||
          (selectedDrone.isCrossHub && !currentRoute.legDetails?.some((leg) =>
            leg.is_dispatch || leg.leg_type?.toUpperCase() === 'DISPATCH'))) {
        setStep(3);
        setSelectedRouteId('');
        showToast('Route, dispatch leg, or relay battery availability changed. Please select a route again.');
        return;
      }

      if (!currentRoute.routeString || !currentRoute.legDetails?.length ||
        !Number.isFinite(currentRoute.distanceKm) || currentRoute.distanceKm <= 0 ||
        !Number.isFinite(currentRoute.predictedEnergyWh) || currentRoute.predictedEnergyWh <= 0 ||
        !Number.isFinite(currentRoute.predictedDurationMin) || currentRoute.predictedDurationMin <= 0) {
        setStep(3);
        showToast('BE did not return a complete route snapshot. Please re-analyze before Assign.');
        return;
      }

      const mission = await createMissionMutation.mutateAsync({
        orderId: order.id,
        droneId: selectedDrone.id,
        batteryId: selectedBattery.id,
        routeId: currentRoute.id,
        routeString: currentRoute.routeString || currentRoute.name,
        legDetails: currentRoute.legDetails ?? [],
        distanceKm: currentRoute.distanceKm,
        predictedEnergyWh: currentRoute.predictedEnergyWh,
        predictedDurationMin: currentRoute.predictedDurationMin,
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
          <OperatorPanel
            title="Order information"
            action={
              <StatusBadge tone={planningState === 'Ready for Planning' ? 'warning' : planningState === 'Needs Replanning' ? 'danger' : 'info'}>
                {planningState ?? 'Closed'}
              </StatusBadge>
            }
          >
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
                </div>
                <div className="delivery-network-arrow">→</div>
                <div className="delivery-network-node">
                  <small>Pick-up Point</small>
                  <strong>{destinationHubLabel}</strong>
                </div>
              </div>
            </OperatorPanel>

            <OperatorPanel
              title="Available drones"
              action={selectedDrone ? (
                <ActionButton variant="secondary" onClick={handleChangeDrone}>Change drone</ActionButton>
              ) : undefined}
            >
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
                  <div className="eligible-drone-grid" role="group" aria-label="Available drones">
                    {(selectedDrone ? [selectedDrone] : eligibleDronesAtOrigin).map((drone) => (
                      <EligibleDroneCard
                        key={drone.id}
                        drone={drone}
                        eligibility={{
                          eligible: drone.isSelectable !== false,
                          reasons: drone.unavailableReason ? [drone.unavailableReason] : [],
                        }}
                        selected={drone.id === selectedDroneId}
                        onSelect={() => handleDroneSelect(drone)}
                      />
                    ))}
                  </div>
                  {eligibleDronesAtOrigin.length === 0 && (
                    <div className="operator-empty-state">No eligible drones are currently available for this Order.</div>
                  )}

                  {selectedDrone && (
                    <div className="mission-combined-battery-section">
                      <div className="mission-combined-battery-heading">
                        <h3>Available batteries</h3>
                        {/* <StatusBadge tone="info">{originHubLabel}</StatusBadge> */}
                      </div>
                      {eligibleBatteriesLoading || eligibleBatteriesFetching ? (
                        <div className="operator-empty-state">Loading available batteries…</div>
                      ) : eligibleBatteriesError ? (
                        <div className="operator-empty-state mission-create-gate">
                          <strong>Unable to load available batteries</strong>
                          <span>{eligibleBatteriesError instanceof Error ? eligibleBatteriesError.message : 'Battery list unavailable.'}</span>
                          <ActionButton onClick={() => void refetchEligibleBatteries()}>Retry</ActionButton>
                        </div>
                      ) : availableOriginBatteries.length > 0 ? (
                        <div className="mission-origin-battery-grid" role="radiogroup" aria-label="Select available battery">
                          {availableOriginBatteries.map((battery) => (
                            <button
                              type="button"
                              role="radio"
                              aria-checked={selectedBatteryId === battery.id}
                              aria-label={`${battery.id} · ${battery.model || 'Battery'} · Available`}
                              key={battery.id}
                              className={`mission-origin-battery-card${selectedBatteryId === battery.id ? ' is-selected' : ''}`}
                              onClick={() => handleBatterySelect(battery.id)}
                            >
                              <span className="mission-origin-battery-head">
                                <span className="mission-origin-battery-id"><Icon name="battery" size={18} /><strong>{battery.id}</strong></span>
                                <StatusBadge tone={selectedBatteryId === battery.id ? 'warning' : 'success'}>{selectedBatteryId === battery.id ? 'Selected' : 'Available'}</StatusBadge>
                              </span>
                              <span className="mission-origin-battery-model">{battery.model || selectedDrone.batteryModel || 'Battery model not provided'}</span>
                              <span className="mission-origin-battery-metrics">
                                <span><small>Capacity</small><strong>{battery.capacityWh === undefined ? '—' : `${battery.capacityWh} Wh`}</strong></span>
                                <span><small>Charge</small><strong>{battery.chargeLevelPct === undefined ? '—' : `${battery.chargeLevelPct}%`}</strong></span>
                                <span><small>Energy</small><strong>{battery.availableEnergyWh === undefined ? '—' : `${battery.availableEnergyWh.toFixed(1)} Wh`}</strong></span>
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="operator-empty-state">No available batteries at this Hub for the selected drone.</div>
                      )}
                    </div>
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
            <OperatorPanel title="Choose flight route">
              {isPlanningAnalysisFetching && (
                <p className="section-note">Analyzing routes…</p>
              )}
              {planningAnalysisError && (
                <p className="section-note danger-note">
                  {planningAnalysisError instanceof Error ? planningAnalysisError.message : 'Could not load route options.'}
                </p>
              )}
              {!isPlanningAnalysisFetching && !planningAnalysisError && routeOptions.length === 0 && (
                <div className="operator-empty-state">No route options available.</div>
              )}
              <div className="mission-route-option-list">
                {routeOptions.map((route) => {
                  const energy = getEnergyFeasibility(route);
                  const timing = calculateRouteTiming(order, route);
                  // Relay Battery IDs are allocated by BE Analyze, not inferred
                  // from the separate Fleet inventory query.
                  const relayHubs = getRouteRelayHubIds(route, order.originHubId, order.destinationHubId).map((hubId) => ({
                    hubId,
                    hubName: hubName(hubId),
                  }));
                  return (
                    <RouteOptionCard
                      key={route.id}
                      route={route}
                      remainingBattery={energy.remainingBattery}
                      relayHubs={relayHubs}
                      resolveHubName={hubName}
                      plannedStartAt={timing.plannedStartAt}
                      estimatedArrivalAt={timing.estimatedArrivalAt}
                      selected={route.id === selectedRouteId}
                      expanded={route.id === expandedRouteId}
                      onSelect={() => {
                        // Selection and expansion are Operator choices, independent of AI feasibility.
                        setSelectedRouteId(route.id);
                        setExpandedRouteId((current) => current === route.id ? null : route.id);
                      }}
                      onViewDetails={() => handleViewAiDetails(route.id)}
                    />
                  );
                })}
              </div>
              {selectedRoute && !canAssignMission && !isPlanningAnalysisFetching && !planningAnalysisError && (
                <p className="mission-route-unavailable" role="status">
                  This route has flight planning warnings. You can review the plan, but Assign will require a valid route.
                </p>
              )}
            </OperatorPanel>
          </div>
        )}

        {step === 3 && !selectedDrone && (
          <OperatorPanel title="Route, energy & timing">
            <div className="operator-empty-state">Choose an eligible drone in Step 2 before AI compares route, relay battery, energy, and timing.</div>
          </OperatorPanel>
        )}

        {step === 4 && hasOrderHubs && selectedDrone && selectedRoute && selectedTiming && canReviewMission && (
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
                {selectedDrone.isCrossHub && (
                  <div><dt>Dispatch flight</dt><dd>{selectedDrone.hubName || `Hub ${selectedDrone.hubId}`} → {originHubLabel} · 0 kg (no package)</dd></div>
                )}
                <div><dt>{selectedDrone.isCrossHub ? 'Dispatch battery' : 'Origin battery'}</dt><dd>{selectedBattery?.serialNumber || selectedBatteryId}{selectedBattery?.model ? ` · ${selectedBattery.model}` : ''}</dd></div>
                <div><dt>Route</dt><dd>{selectedRoute.id} · {selectedRoute.name}</dd></div>
                {selectedRoute.legDetails?.some((leg) => leg.is_dispatch || leg.leg_type?.toUpperCase() === 'DISPATCH') && (
                  <div><dt>Flight legs</dt><dd>
                    {selectedRoute.legDetails.map((leg, index) => (
                      <span key={`${leg.sequence_no ?? index}-${leg.from_hub_code}`}>
                        {leg.is_dispatch || leg.leg_type?.toUpperCase() === 'DISPATCH' ? 'DISPATCH · 0 kg' : `DELIVERY${leg.payload_kg !== undefined ? ` · ${leg.payload_kg} kg` : ''}`} · {leg.from_hub_name || leg.from_hub_code} → {leg.to_hub_name || leg.to_hub_code}
                        {index < (selectedRoute.legDetails?.length ?? 0) - 1 ? '; ' : ''}
                      </span>
                    ))}
                  </dd></div>
                )}
                <div><dt>Relay Hub</dt><dd>{selectedRelayHubIds.length ? selectedRelayHubIds.map(hubName).join(' → ') : 'Not required'}</dd></div>
                {selectedRelayHubIds.length > 0 && (
                  <div>
                    <dt>Relay batteries (BE assigned)</dt>
                    <dd className="mission-relay-battery-review">
                      {selectedRelayHubIds.map((hubId) => {
                        const plan = selectedRoute.relayBatteryPlan?.find((item) => item.hubId === hubId);
                        const nextLeg = selectedRoute.legDetails?.find((leg) => String(leg.from_hub_id) === hubId);
                        const batteryId = plan?.swapBatteryId ?? nextLeg?.battery_id;
                        const model = plan?.selectedBatteryModel ?? nextLeg?.battery_model ?? plan?.batteryModel;
                        const charge = plan?.selectedBatteryChargePct ?? nextLeg?.battery_charge_pct;
                        const energy = plan?.selectedBatteryEnergyWh ?? nextLeg?.battery_energy_wh;
                        return (
                          <span key={hubId}>
                            <strong>{hubName(hubId)}</strong>: {batteryId || 'No battery allocated'}
                            {batteryId && model ? ` · ${model}` : ''}
                            {batteryId && charge !== undefined ? ` · ${charge}%` : ''}
                            {batteryId && energy !== undefined ? ` · ${energy.toFixed(1)} Wh` : ''}
                          </span>
                        );
                      })}
                    </dd>
                  </div>
                )}
                <div><dt>Planned start</dt><dd>{formatMissionTime(selectedTiming.plannedStartAt)}</dd></div><div><dt>Estimated arrival</dt><dd>{formatMissionTime(selectedTiming.estimatedArrivalAt)}</dd></div>
              </dl>
              <div className="mission-review-side">
                <div className="review-readiness">
                  <StatusBadge tone={canAssignMission ? 'info' : 'warning'}>
                    {canAssignMission ? 'Mission plan ready' : 'Route needs attention'}
                  </StatusBadge>
                  <small>
                    {canAssignMission
                      ? 'Review the selected route before assigning this Mission.'
                      : 'You can review this route, but assignment is unavailable until the route meets flight requirements.'}
                  </small>
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
          {step === 3 && <ActionButton disabled={!canReviewMission} onClick={() => { setStep(4); persistDraft(4); }}>Review mission</ActionButton>}
          {step === 4 && <ActionButton icon="check" disabled={createMissionMutation.isPending || isPlanningAnalysisFetching || !canAssignMission} onClick={() => void handleAssignMission()}>{createMissionMutation.isPending ? 'Assigning…' : 'Assign mission'}</ActionButton>}
        </div>
      </div>
      {toast && <div className="operator-toast">{toast}</div>}
    </MissionPageShell>
  );
}
