import { formatRouteName } from '../../utils/displayEnglish';
import { formatHubName } from '../../utils/displayEnglish';
import { useEffect, useMemo, useState, useRef } from 'react';
import { OperatorLoadingState } from '../../components/OperatorLoadingState';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart3, Loader2, Zap } from 'lucide-react';

import { ActionButton } from '../../../../components/ui/ActionButton';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';

import { EligibleDroneCard } from '../../components/EligibleDroneCard';
import { useFleetBatteriesQuery, useFleetDronesQuery } from '../../hooks/useFleetQueries';
import { OperatorPanel } from '../../components/OperatorPanel';
import { RouteOptionCard } from '../../components/RouteOptionCard';
import { useOperatorEligibleDronesQuery, useOperatorOrderQuery } from '../../hooks/useOrderQueries';
import {
  useCreateMissionMutation,
  useEligibleMissionBatteriesQuery,
  useMissionHubsQuery,
  useMissionPlanningAnalysisQuery,
  usePostAnalyzeBundleCandidatesQuery,
} from '../../hooks/useMissionQueries';
import type { OperatorDrone, RouteOption } from '../../types/operator';

import {
  formatDeliveryWindow,
  getOrderPlanningBadge,
  canCreateMissionForOrder,
} from '../../utils/deliveryPlanning';
import { DEFAULT_BATTERY_RESERVE_PCT, getEnergyFeasibility } from '../../utils/droneEligibility';
import { getDroneDisplayCode } from '../../utils/droneDisplay';
import { getRouteLegBatteryUse } from '../../utils/routeBatteryUse';
import { clearMissionDraft, loadMissionDraft, saveMissionDraft } from '../../utils/missionDraftStorage';
import { calculateRouteTiming, formatMissionTime } from '../../utils/missionTiming';

import { MissionPageShell } from './MissionPageShell';
import './create-mission-compact.css';

const STEPS = ['Order info', 'Select drone & battery', 'Route & energy', 'Review & assign'] as const;

// TEMPORARILY DISABLED: Post-Analyze Order Consolidation is not production-ready.
// Keep the original UI, state and API wiring below (DO NOT DELETE) for later integration.
// Re-enable only after BE supports route-aware validation of per-leg pickup/drop-off,
// payload and energy; until then Create Mission handles the primary Order only.
const ENABLE_POST_ANALYZE_ORDER_CONSOLIDATION = false;


// Capture the Review data at the moment Assign is clicked. React Query is free
// to update its cache during final checks, but the reviewed card must not blink
// or disappear until validation finishes and the Operator is redirected.
type AssignReviewSnapshot = {
  order: NonNullable<ReturnType<typeof useOperatorOrderQuery>['data']>;
  eligibleDronesData: NonNullable<ReturnType<typeof useOperatorEligibleDronesQuery>['data']>;
  eligibleBatteries: NonNullable<ReturnType<typeof useEligibleMissionBatteriesQuery>['data']>;
  planningAnalysis: NonNullable<ReturnType<typeof useMissionPlanningAnalysisQuery>['data']>;
};

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

/** A stop alone is not a swap. Require evidence from BE's route battery plan
 * or a confirmed change of battery on the outbound delivery leg. */
function getBatterySwapRelayHubIds(route: RouteOption, originHubId: string, destinationHubId: string): string[] {
  const relayIds = getRouteRelayHubIds(route, originHubId, destinationHubId);
  return relayIds.filter((hubId) => {
    const plan = route.relayBatteryPlan?.find((item) => item.hubId === hubId);
    if (plan?.swapBatteryId || (plan?.requiredBatteryCount ?? 0) > 0) return true;
    const deliveryLegs = (route.legs ?? []).filter((leg) => leg.fromHubId && leg.toHubId);
    const arrivingLeg = deliveryLegs.find((leg) => leg.toHubId === hubId);
    const departingLeg = deliveryLegs.find((leg) => leg.fromHubId === hubId);
    return Boolean(arrivingLeg?.batteryId && departingLeg?.batteryId &&
      arrivingLeg.batteryId !== departingLeg.batteryId);
  });
}

export function CreateMissionPage() {
  const navigate = useNavigate();
  const assignLockRef = useRef(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const assignReviewSnapshotRef = useRef<AssignReviewSnapshot | null>(null);
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') ?? '';

  const {
    data: queriedOrder,
    error: orderError,
    isLoading: isOrderLoading,
    refetch: refetchOrder,
  } = useOperatorOrderQuery(orderId);
  const {
    data: queriedEligibleDronesData,
    error: eligibleDronesError,
    isLoading: isEligibleDronesLoading,
    refetch: refetchEligibleDrones,
  } = useOperatorEligibleDronesQuery(orderId);
  const order = (isAssigning && assignReviewSnapshotRef.current?.order) || queriedOrder;
  const eligibleDronesData = (isAssigning && assignReviewSnapshotRef.current?.eligibleDronesData) || queriedEligibleDronesData;
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
  const [routeSelectionConfirmed, setRouteSelectionConfirmed] = useState(false);
  // Legacy Step-1 bundles in saved drafts are never restored into the new post-analyze flow.
  // These choices are previews until Backend supports route-aware leg validation.
  const [bundledOrderIds, setBundledOrderIds] = useState<string[]>([]);
  const [bundleEnabled, setBundleEnabled] = useState(false);
  const currentOrderRef = useRef(orderId);
  // A new order in the URL must not inherit another order's consolidation or route.
  useEffect(() => {
    if (currentOrderRef.current === orderId) return;
    currentOrderRef.current = orderId;
    setBundledOrderIds([]);
    setBundleEnabled(false);
    setStep(1);
    setSelectedDroneId('');
    setSelectedBatteryId('');
    setSelectedRouteId('');
    setExpandedRouteId(null);
    setRouteSelectionConfirmed(false);
  }, [orderId]);

  const { data: apiHubs } = useMissionHubsQuery();
  // Fleet records may provide batteryModel when eligible-drones omits it.
  // Only the battery MODEL is shown; Available already implies full batteries.
  const { data: fleetDrones } = useFleetDronesQuery();
  const {
    data: fleetBatteries,
  } = useFleetBatteriesQuery();
  const crossHubDroneForQuery = eligibleDronesData?.drones.find((drone) => drone.id === selectedDroneId);
  const {
    data: queriedEligibleBatteries,
    isLoading: eligibleBatteriesLoading,
    isFetching: eligibleBatteriesFetching,
    error: eligibleBatteriesError,
    refetch: refetchEligibleBatteries,
  } = useEligibleMissionBatteriesQuery(
    orderId, selectedDroneId,
    crossHubDroneForQuery?.isCrossHub ? crossHubDroneForQuery.hubId : undefined,
  );
  const eligibleBatteries = (isAssigning && assignReviewSnapshotRef.current?.eligibleBatteries) || queriedEligibleBatteries;
  const {
    data: queriedPlanningAnalysis,
    error: planningAnalysisError,
    isFetching: isPlanningAnalysisFetching,
    refetch: refetchPlanningAnalysis,
  } = useMissionPlanningAnalysisQuery(
    order?.id && selectedDroneId && selectedBatteryId
      ? { orderId: order.id, droneId: selectedDroneId, batteryId: selectedBatteryId }
      : null,
  );
  const planningAnalysis = (isAssigning && assignReviewSnapshotRef.current?.planningAnalysis) || queriedPlanningAnalysis;
  // Discover candidates only AFTER selecting a BE-analyzed route with a confirmed
  // relay battery swap. The order/drone/route tuple isolates each query cache entry.
  const postAnalyzeRoute = planningAnalysis?.routes.find((route) => route.id === selectedRouteId);
  const swapRelayHubIds = postAnalyzeRoute && order
    ? getBatterySwapRelayHubIds(postAnalyzeRoute, order.originHubId, order.destinationHubId)
    : [];
  const selectedRouteIsFeasible = Boolean(postAnalyzeRoute && getEnergyFeasibility(postAnalyzeRoute).feasible);
  const canLookForPostAnalyzeCandidates = Boolean(
    // Feature disabled -> do not call candidates-post-analyze in the background.
    ENABLE_POST_ANALYZE_ORDER_CONSOLIDATION &&
    step === 3 && routeSelectionConfirmed && order?.id && selectedDroneId && selectedRouteIsFeasible && swapRelayHubIds.length > 0 &&
    !isPlanningAnalysisFetching && !planningAnalysisError,
  );
  const {
    data: bundleCandidates,
    error: bundleCandidatesError,
    isLoading: isBundleCandidatesLoading,
    isFetching: isBundleCandidatesFetching,
    refetch: refetchBundleCandidates,
  } = usePostAnalyzeBundleCandidatesQuery(
    order?.id ?? '', selectedDroneId, postAnalyzeRoute?.id ?? '', canLookForPostAnalyzeCandidates,
  );
  const createMissionMutation = useCreateMissionMutation();

  // AI recommends; the Operator remains free to select and review any proposed route.
  // Default to AI Recommended for convenience, not as an assignment/approval decision.
  // This effect must stay above early returns (React hooks rule).
  useEffect(() => {
    // Do not let a background revalidation replace the route during submission.
    if (isAssigning || isPlanningAnalysisFetching || !planningAnalysis) return;
    if (planningAnalysis.routes.some((route) => route.id === selectedRouteId)) return;
    const recommended = planningAnalysis.routes.find((route) => route.recommended);
    const nextRouteId = (recommended ?? planningAnalysis.routes[0])?.id ?? '';
    if (nextRouteId === selectedRouteId) return;
    setSelectedRouteId(nextRouteId);
    setExpandedRouteId(null);
    setRouteSelectionConfirmed(false);
    setBundledOrderIds([]);
    setBundleEnabled(false);
  }, [planningAnalysis, isPlanningAnalysisFetching, selectedRouteId, isAssigning]);

  useEffect(() => {
    // The Assign handler owns final validation while submitting; avoid clearing
    // the selected battery (and hiding Review) mid-request.
    if (isAssigning || !selectedBatteryId || !eligibleBatteries || !order) return;
    const drone = eligibleDronesData?.drones.find((item) => item.id === selectedDroneId);
    if (drone?.isSelectable !== false && drone && eligibleBatteries.some((battery) =>
      battery.id === selectedBatteryId && isSelectableMissionBattery(battery, drone, order.originHubId)
    )) return;
    setSelectedBatteryId('');
    setSelectedRouteId('');
    setExpandedRouteId(null);
    setRouteSelectionConfirmed(false);
    setBundledOrderIds([]);
    setBundleEnabled(false);
  }, [selectedBatteryId, selectedDroneId, eligibleBatteries, eligibleDronesData, order, isAssigning]);

  if (isOrderLoading) {
    return (
      <MissionPageShell active="/operator/missions/all">
        <OperatorPanel title="Create a mission from an order" eyebrow="DELIVERY OPERATIONS">
          <OperatorLoadingState label="Loading order…" />
        </OperatorPanel>
      </MissionPageShell>
    );
  }

  if (orderError && !isAssigning) {
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
  const isPlanningAllowedByBE = canCreateMissionForOrder(order);
  // If BE omitted the state, avoid the misleading legacy "Closed" badge.
  // An explicit permission flag can confirm eligibility but cannot identify
  // READY_FOR_PLANNING vs NEEDS_REPLANNING; do not guess either state.
  const planningBadgeLabel = planningState ?? (isPlanningAllowedByBE ? 'Eligible to Plan' : 'Status Unavailable');
  const planningMessage = planningState === 'Ready for Planning'
    ? (isPlanningAllowedByBE
      ? 'Package received. You can plan this Mission.'
      : 'Waiting for BE confirmation that Mission planning is allowed.')
    : planningState === 'Needs Replanning'
      ? (isPlanningAllowedByBE
        ? 'This Order needs replanning. You can plan the next Mission.'
        : 'This Order needs replanning. Waiting for BE planning eligibility.')
      : planningState === 'Waiting for package'
        ? 'Waiting for Technician confirmation of package receipt.'
        : planningState === 'Future'
          ? (order.planningAt ? `Planning opens ${formatMissionTime(order.planningAt)}.` : 'Planning window has not opened yet.')
          : planningState === 'Planned'
            ? 'A Mission has already been planned for this Order.'
            : isPlanningAllowedByBE
              ? 'BE confirms this Order is eligible for Mission planning.'
              : 'Planning status is unavailable. Refresh the Order to check eligibility.';
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
  const totalPayloadKg = order.payloadKg; // Initial Analyze and capacity checks use ONLY the primary Order.
  const selectedDroneHasCapacity = Boolean(selectedDrone && totalPayloadKg <= selectedDrone.maxPayloadKg + 0.0001);
  const availableBundleCandidateIds = new Set((bundleCandidates?.candidates ?? []).map((item) => item.orderId));
  const hasEligibleBundleCandidates = (bundleCandidates?.candidates.length ?? 0) > 0;
  const bundleSelectionAvailable = bundledOrderIds.every((id) => availableBundleCandidateIds.has(id));
  const hasUnverifiedBundle = bundledOrderIds.length > 0;
  const routeOptions = planningAnalysis?.routes ?? [];
  // UI order only: show every BE AI-recommended route first. Keep the original
  // relative order of all other routes; never mutate the React Query/API data.
  // Selection, feasibility, relay handling and Assign still use route IDs.
  const displayedRouteOptions = [...routeOptions].sort(
    (a, b) => Number(b.recommended === true) - Number(a.recommended === true),
  );
  const selectedRoute = routeOptions.find((route) => route.id === selectedRouteId);
  const originHubLabel = formatHubName(originHub?.name || order.originHubName || eligibleDronesData?.hub.name) || order.originHubId || 'Origin hub';
  const destinationHubLabel = formatHubName(destinationHub?.name || order.destinationHubName) || order.destinationHubId || 'Destination hub';
  const hubName = (hubId: string) =>
    formatHubName(networkHubs.find((hub) => hub.id === hubId)?.name) || hubId;
  const selectedRouteEnergy = selectedRoute
    ? getEnergyFeasibility(selectedRoute, DEFAULT_BATTERY_RESERVE_PCT)
    : undefined;
  const selectedTiming = selectedRoute ? calculateRouteTiming(order, selectedRoute) : undefined;
  const selectedRelayHubIds = selectedRoute
    ? getRouteRelayHubIds(selectedRoute, order.originHubId, order.destinationHubId)
    : [];
  const hasOrderHubs = Boolean(order.originHubId && order.destinationHubId);
  const canContinueStep1 = Boolean(canCreateMissionForOrder(order) && hasOrderHubs);
  const canContinueStep2 = Boolean(
    canContinueStep1 && selectedDrone && selectedDrone.isSelectable !== false && selectedBattery &&
    selectedDroneHasCapacity && !eligibleBatteriesLoading && !eligibleBatteriesFetching && !eligibleBatteriesError
  );
  // Without a BE route-aware per-leg validation contract, an additional Order is a
  // preview ONLY. Never Review/Assign a route analyzed for the primary Order alone.
  const canReviewMission = Boolean(
    canContinueStep2 && selectedRoute && selectedTiming && !hasUnverifiedBundle &&
    !isPlanningAnalysisFetching && !planningAnalysisError
  );
  // Only final Assign is guarded by the authoritative Analyze feasibility result.
  const hasDispatchLeg = selectedRoute?.legDetails?.some((leg) =>
    leg.is_dispatch === true || leg.leg_type?.toUpperCase() === 'DISPATCH',
  ) === true;
  const canAssignMission = canReviewMission && selectedRouteEnergy?.feasible === true &&
    (!selectedDrone?.isCrossHub || hasDispatchLeg);

  const handleDroneSelect = (drone: OperatorDrone) => {
    if (drone.isSelectable === false || drone.maxPayloadKg + 0.0001 < totalPayloadKg || drone.id === selectedDroneId) return;
    setSelectedDroneId(drone.id);
    setSelectedBatteryId('');
    setSelectedRouteId('');
    setExpandedRouteId(null);
    setRouteSelectionConfirmed(false);
    setBundledOrderIds([]);
    setBundleEnabled(false);
  };

  const handleChangeDrone = () => {
    setSelectedDroneId('');
    setSelectedBatteryId('');
    setSelectedRouteId('');
    setExpandedRouteId(null);
    setRouteSelectionConfirmed(false);
    setBundledOrderIds([]);
    setBundleEnabled(false);
    // Discard old selection so it cannot return on refresh.
    saveMissionDraft({
      orderId: order.id,
      step: 2,
      selectedDroneId: '',
      selectedBatteryId: '',
      selectedRouteId: '',
      bundledOrderIds: [],
      relayBatterySelections: [],
    });
  };

  const updateBundledOrders = (nextIds: string[], enabled: boolean) => {
    // A Post-Analyze preview must not invalidate the chosen Drone, Battery, or Route.
    setBundleEnabled(enabled);
    setBundledOrderIds(enabled ? nextIds.filter((id) => availableBundleCandidateIds.has(id)) : []);
  };

  const handleBatterySelect = (batteryId: string) => {
    if (batteryId === selectedBatteryId) return;
    setSelectedBatteryId(batteryId);
    setSelectedRouteId('');
    setExpandedRouteId(null);
    setRouteSelectionConfirmed(false);
    setBundledOrderIds([]);
    setBundleEnabled(false);
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
      bundledOrderIds: [],
      relayBatterySelections: [],
    });
  };

  const handleViewAiDetails = (routeId: string) => {
    persistDraft(3, selectedRouteId);
    navigate(`/operator/ai/mission-analysis?${new URLSearchParams({ orderId: order.id, droneId: selectedDroneId, batteryId: selectedBatteryId, routeId, returnTo: 'mission-create' }).toString()}`);
  };



  const handleAssignMission = async () => {
    console.count('[CreateMission] Assign clicked');
    if (assignLockRef.current || hasUnverifiedBundle || !canAssignMission || !selectedDrone || !selectedBattery || !selectedRoute ||
      !eligibleDronesData || !eligibleBatteries || !planningAnalysis) return;
    assignLockRef.current = true;
    assignReviewSnapshotRef.current = { order, eligibleDronesData, eligibleBatteries, planningAnalysis };
    setIsAssigning(true); // Show spinner and disable repeated clicks from the first recheck.
    let assignedSuccessfully = false;

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
        showToast('Route information is incomplete. Please analyze again before assigning.');
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

      assignedSuccessfully = true;
      clearMissionDraft(order.id);
      showToast('Mission assigned successfully');
      window.setTimeout(() => navigate(`/operator/missions/${mission.id}`), 500);
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Unable to create Mission.');
    } finally {
      // Keep spinner/disabled state through the existing success navigation delay.
      // On validation/API failure, restore the button so Operator can retry.
      if (!assignedSuccessfully) {
        assignLockRef.current = false;
        assignReviewSnapshotRef.current = null;
        setIsAssigning(false);
      }
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
                onClick={() => done && !isAssigning && setStep(number)}
                disabled={isAssigning || (!done && !active)}
              >
                <i>{done ? <Icon name="check" size={12} /> : number}</i><span>{label}</span>
              </button>
            );
          })}
        </div>

        {step === 1 && (
          <div className="mission-step-stack">
          <OperatorPanel
            title="Order information"
            action={
              <StatusBadge tone={planningState === 'Ready for Planning' || (!planningState && isPlanningAllowedByBE) ? 'warning' : planningState === 'Needs Replanning' ? 'danger' : 'info'}>
                {planningBadgeLabel}
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
              <label><span>Origin hub</span><input value={originHubLabel} readOnly /></label>
              <label><span>Destination hub</span><input value={destinationHubLabel} readOnly /></label>
              <label><span>Package</span><input value={`${order.packageLabel} · ${order.payloadKg} kg`} readOnly /></label>
              <label><span>Estimated delivery</span><input value={formatDeliveryWindow(order)} readOnly /></label>
            </div>
            <div className="mission-planning-note">
              <span>
                {planningMessage}
              </span>
            </div>
            {!hasOrderHubs && (
              <div className="operator-empty-state">
                This Order does not contain a valid Origin hub and Destination hub.
              </div>
            )}
          </OperatorPanel>
          </div>
        )}

        {step === 2 && (
          <div className="mission-step-stack">
            <OperatorPanel title="Delivery network">
              <div className="delivery-network-strip">
                <div className="delivery-network-node">
                  <small>Origin hub</small>
                  <strong>{originHubLabel}</strong>
                </div>
                <div className="delivery-network-arrow">→</div>
                <div className="delivery-network-node">
                  <small>Destination hub</small>
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
                <OperatorLoadingState label="Loading available drones…" />
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
                          eligible: drone.isSelectable !== false && drone.maxPayloadKg + 0.0001 >= totalPayloadKg,
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
                        <OperatorLoadingState label="Loading available batteries…" />
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
                <OperatorLoadingState label="Analyzing routes…" />
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
                {displayedRouteOptions.map((route) => {
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
                        if (route.id !== selectedRouteId) {
                          setBundledOrderIds([]);
                          setBundleEnabled(false);
                        }
                        setRouteSelectionConfirmed(true);
                        setSelectedRouteId(route.id);
                        setExpandedRouteId((current) => current === route.id ? null : route.id);
                      }}
                      onViewDetails={() => handleViewAiDetails(route.id)}
                    />
                  );
                })}
              </div>
              {selectedRoute && !hasUnverifiedBundle && !canAssignMission && !isPlanningAnalysisFetching && !planningAnalysisError && (
                <p className="mission-route-unavailable" role="status">
                  {selectedRoute.isSelectable === false
                    ? `Route unavailable: ${selectedRoute.unselectableReason || selectedRoute.infeasibleReason || 'This route cannot be assigned.'}`
                    : selectedRoute.feasible === false
                      ? `Route infeasible: ${selectedRoute.infeasibleReason || 'This route is not feasible.'}`
                      : 'This route has flight planning warnings. You can review the plan, but Assign will require a valid route.'}
                </p>
              )}
            </OperatorPanel>
            {/* TEMPORARILY HIDDEN: Combine eligible orders is unfinished.
                The complete panel is intentionally preserved below behind the disabled
                feature flag, rather than deleted or redesigned. */}
            {ENABLE_POST_ANALYZE_ORDER_CONSOLIDATION && selectedRoute && (
              <OperatorPanel title="Combine eligible orders" eyebrow="OPTIONAL · AFTER ROUTE ANALYSIS">
                {!routeSelectionConfirmed ? (
                  <div className="mission-bundle-availability" role="status">
                    Select a route above to check for optional consolidation. The AI-recommended route is highlighted by default, but must be confirmed by the Operator for this step.
                  </div>
                ) : swapRelayHubIds.length === 0 || !selectedRouteIsFeasible ? (
                  <div className="mission-bundle-availability" role="status">
                    {!selectedRouteIsFeasible
                      ? 'The selected route has not passed BE energy and availability checks. Consolidation is not offered.'
                      : selectedRelayHubIds.length === 0
                        ? 'The selected route has no Relay Hub. Continue with this Order only.'
                        : 'This route has a Relay Hub, but BE has not confirmed a battery swap here. Consolidation is not offered.'}
                    {hasUnverifiedBundle && (
                      <ActionButton variant="secondary" onClick={() => updateBundledOrders([], false)}>Use single order</ActionButton>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="mission-bundle-summary">
                      <strong>Selected route: {selectedRoute.id}</strong>
                      <span>Battery-swap Relay Hub: {swapRelayHubIds.map(hubName).join(', ')}</span>
                      <span>Additional Orders are suggested by BE for this route, not from the general Order list.</span>
                    </div>
                    {isBundleCandidatesLoading || (isBundleCandidatesFetching && !bundleCandidates) ? (
                      <OperatorLoadingState label="Checking orders for the selected route…" compact />
                    ) : bundleCandidatesError ? (
                      <div className="operator-empty-state mission-create-gate">
                        <strong>Unable to load route-compatible orders</strong>
                        <span>{bundleCandidatesError instanceof Error ? bundleCandidatesError.message : 'Post-Analyze candidate API is unavailable.'}</span>
                        <ActionButton variant="secondary" onClick={() => void refetchBundleCandidates()}>Retry</ActionButton>
                        {hasUnverifiedBundle && (
                          <ActionButton variant="secondary" onClick={() => updateBundledOrders([], false)}>Use single order</ActionButton>
                        )}
                      </div>
                    ) : !hasEligibleBundleCandidates ? (
                      <div className="mission-bundle-availability" role="status">
                        No eligible additional Orders returned for this route. Continue with this Order only.
                        {hasUnverifiedBundle && (
                          <ActionButton variant="secondary" onClick={() => updateBundledOrders([], false)}>Use single order</ActionButton>
                        )}
                      </div>
                    ) : (
                      <>
                        <label className="mission-bundle-toggle">
                          <input
                            type="checkbox"
                            checked={bundleEnabled}
                            onChange={(event) => updateBundledOrders(event.target.checked ? bundledOrderIds : [], event.target.checked)}
                          />
                          <span>
                            <strong>Combine with other eligible orders</strong>
                            <small>{bundleCandidates?.candidates.length} route-compatible candidate(s) found. Optional preview; BE validation is still required before assigning.</small>
                          </span>
                        </label>
                        {bundleEnabled && (
                          <div className="mission-bundle-section">
                            <div className="mission-bundle-primary">
                              <span><small>Primary Order</small><strong>{order.id}</strong></span>
                              <strong>{order.payloadKg.toFixed(2)} kg</strong>
                            </div>
                            <div className="mission-bundle-candidates" role="group" aria-label="Eligible route orders to combine">
                              {bundleCandidates?.candidates.map((candidate) => (
                                <label className="mission-bundle-candidate" key={candidate.orderId}>
                                  <input
                                    type="checkbox"
                                    checked={bundledOrderIds.includes(candidate.orderId)}
                                    onChange={(event) => updateBundledOrders(
                                      event.target.checked
                                        ? [...bundledOrderIds, candidate.orderId]
                                        : bundledOrderIds.filter((id) => id !== candidate.orderId), true,
                                    )}
                                  />
                                  <span className="mission-bundle-candidate-copy">
                                    <strong>{candidate.orderId}</strong>
                                    <small>{candidate.originHubId && candidate.destinationHubId
                                      ? `${hubName(candidate.originHubId)} → ${hubName(candidate.destinationHubId)}`
                                      : candidate.deliveryMode || 'BE route candidate'}</small>
                                  </span>
                                  <strong>{candidate.payloadKg !== undefined ? `${candidate.payloadKg.toFixed(2)} kg` : '— kg'}</strong>
                                </label>
                              ))}
                            </div>
                            {hasUnverifiedBundle && (
                              <div className="mission-bundle-feedback is-error" role="alert">
                                <strong>{bundledOrderIds.length} additional Order(s) selected – preview only.</strong>
                                <span>BE has not provided route-aware validation of pickup/drop-off, payload and energy on each leg. Review and Assign are disabled for this bundle. No combined payload or energy estimate is assumed.</span>
                                <ActionButton variant="secondary" onClick={() => updateBundledOrders([], false)}>
                                  Continue with single order
                                </ActionButton>
                              </div>
                            )}
                            {!bundleSelectionAvailable && (
                              <div className="mission-bundle-alert" role="alert">Candidate availability changed. Please reselect Orders for this route.</div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </OperatorPanel>
            )}
          </div>
        )}

        {step === 3 && !selectedDrone && (
          <OperatorPanel title="Route, energy & timing">
            <div className="operator-empty-state">Choose an eligible drone in Step 2 before AI compares route, relay battery, energy, and timing.</div>
          </OperatorPanel>
        )}

        {/* Keep the already-reviewed details visible while safety queries refetch.
            isFetching temporarily makes canReviewMission false, but that should
            never unmount the review panel during an Assign request. */}
        {step === 4 && hasOrderHubs && selectedDrone && selectedRoute && selectedTiming && (canReviewMission || isAssigning) && (
          <OperatorPanel title="Review & Assign">
            {/* One unified review card. Display-only change: mission submission logic is unchanged. */}
            <div className="mission-review-unified">
              <div className="mission-review-info">
                <div className="mission-review-info-row">
                  <dl className="mission-review-field">
                    <dt>Order</dt>
                    <dd className="mission-review-order-code">{order.id}</dd>
                  </dl>
                  <dl className="mission-review-field">
                    <dt>Delivery mode</dt>
                    <dd className="mission-review-delivery-mode">
                      {String(order.deliveryMode).toUpperCase() === 'EXPRESS' && (
                        <Zap size={17} strokeWidth={2.2} aria-hidden="true" />
                      )}
                      <span>{order.deliveryMode}</span>
                    </dd>
                  </dl>
                </div>

                <div className="mission-review-info-row mission-review-info-row--full">
                  <dl className="mission-review-field">
                    <dt>Order payload</dt>
                    <dd>{order.payloadKg.toFixed(2)} kg</dd>
                  </dl>
                </div>
                <div className="mission-review-info-row mission-review-info-row--full">
                  <dl className="mission-review-field">
                    <dt>Route</dt>
                    <dd>{selectedRoute.id} · {formatRouteName(selectedRoute.name)}</dd>
                  </dl>
                </div>

                {/* Cross-hub operational information remains visible when Analyze includes dispatch. */}
                {selectedDrone.isCrossHub && (
                  <div className="mission-review-info-row mission-review-info-row--full">
                    <dl className="mission-review-field">
                      <dt>Dispatch flight</dt>
                      <dd>{formatHubName(selectedDrone.hubName || `Hub ${selectedDrone.hubId}`)} → {originHubLabel} · 0 kg (no package)</dd>
                    </dl>
                  </div>
                )}
                {selectedRoute.legDetails?.some((leg) => leg.is_dispatch || leg.leg_type?.toUpperCase() === 'DISPATCH') && (
                  <div className="mission-review-info-row mission-review-info-row--full">
                    <dl className="mission-review-field">
                      <dt>Flight legs</dt>
                      <dd>
                        {selectedRoute.legDetails.map((leg, index) => (
                          <span key={`${leg.sequence_no ?? index}-${leg.from_hub_code}`}>
                            {leg.is_dispatch || leg.leg_type?.toUpperCase() === 'DISPATCH'
                              ? 'DISPATCH · 0 kg'
                              : `DELIVERY${leg.payload_kg !== undefined ? ` · ${leg.payload_kg} kg` : ''}`}
                            {' · '}{leg.from_hub_name || leg.from_hub_code} → {leg.to_hub_name || leg.to_hub_code}
                            {index < (selectedRoute.legDetails?.length ?? 0) - 1 ? '; ' : ''}
                          </span>
                        ))}
                      </dd>
                    </dl>
                  </div>
                )}

                <div className="mission-review-info-row">
                  <dl className="mission-review-field"><dt>Origin hub</dt><dd>{originHubLabel}</dd></dl>
                  <dl className="mission-review-field"><dt>Destination hub</dt><dd>{destinationHubLabel}</dd></dl>
                </div>
                <div className="mission-review-info-row">
                  <dl className="mission-review-field">
                    <dt>Origin package</dt>
                    <dd>
                      {order.originPackageReceived || order.originHubReceivedAt ? (
                        <>Received at Hub{order.originHubReceivedAt && <span> · {formatMissionTime(order.originHubReceivedAt)}</span>}</>
                      ) : 'Awaiting package'}
                    </dd>
                  </dl>
                  <dl className="mission-review-field"><dt>Drone</dt><dd>{getDroneDisplayCode(selectedDrone)}</dd></dl>
                </div>
                <div className="mission-review-info-row">
                  <dl className="mission-review-field">
                    <dt>{selectedDrone.isCrossHub ? 'Dispatch battery' : 'Origin battery'}</dt>
                    <dd>{selectedBattery?.serialNumber || selectedBatteryId}{selectedBattery?.model ? ` · ${selectedBattery.model}` : ''}</dd>
                  </dl>
                  <dl className="mission-review-field">
                    <dt>Relay batteries</dt>
                    <dd className="mission-review-relay-list">
                      {selectedRelayHubIds.length ? selectedRelayHubIds.map((hubId) => {
                        const plan = selectedRoute.relayBatteryPlan?.find((item) => item.hubId === hubId);
                        const nextLeg = selectedRoute.legDetails?.find((leg) => String(leg.from_hub_id) === hubId);
                        const batteryId = plan?.swapBatteryId ?? nextLeg?.battery_id;
                        const model = plan?.selectedBatteryModel ?? nextLeg?.battery_model ?? plan?.batteryModel;
                        const charge = plan?.selectedBatteryChargePct ?? nextLeg?.battery_charge_pct;
                        const energy = plan?.selectedBatteryEnergyWh ?? nextLeg?.battery_energy_wh;
                        return (
                          <span className="mission-review-relay-entry" key={hubId}>
                            <strong>{batteryId || 'No battery allocated'}{batteryId && model ? ` · ${model}` : ''}</strong>
                            <small>
                              {hubName(hubId)}
                              {batteryId && charge !== undefined ? ` · ${charge}%` : ''}
                              {batteryId && energy !== undefined ? ` · ${energy.toFixed(1)} Wh` : ''}
                            </small>
                          </span>
                        );
                      }) : 'Not required'}
                    </dd>
                  </dl>
                </div>
                <div className="mission-review-info-row mission-review-info-row--last">
                  <dl className="mission-review-field"><dt>Planned start</dt><dd>{formatMissionTime(selectedTiming.plannedStartAt)}</dd></dl>
                  <dl className="mission-review-field"><dt>Estimated arrival</dt><dd>{formatMissionTime(selectedTiming.estimatedArrivalAt)}</dd></dl>
                </div>
              </div>

              <div className="mission-review-energy" aria-label="Energy prediction summary">
                <div className="mission-review-energy-heading">
                  <BarChart3 size={19} strokeWidth={2.2} aria-hidden="true" />
                  <strong>Performance &amp; Energy</strong>
                </div>
                <div className="mission-review-energy-top">
                  <span className="mission-review-energy-label">Predicted energy</span>
                  <div className="mission-review-energy-highlight">
                    <strong>{selectedRoute.predictedEnergyWh.toFixed(1)} Wh</strong>
                  </div>
                </div>
                <dl className="mission-review-energy-metrics">
                  <div>
                    <dt>{selectedRoute.relayHubIds?.length ? 'Predicted battery consumption' : 'Predicted battery consumption'}</dt>
                    <dd>
                      {selectedRoute.relayHubIds?.length ? (
                        getRouteLegBatteryUse(selectedRoute).length ? (
                          <span className="mission-review-leg-uses">
                            {getRouteLegBatteryUse(selectedRoute).map((leg) => (
                              <span className="mission-review-leg-use" key={leg.legNumber}>
                                <small>Leg {leg.legNumber}</small>
                                <strong>{leg.batteryUsePct === undefined ? '—' : `${leg.batteryUsePct}%`}</strong>
                              </span>
                            ))}
                          </span>
                        ) : '—'
                      ) : `${selectedRoute.batteryConsumptionPct}%`}
                    </dd>
                  </div>
                  <div>
                    <dt>{selectedRoute.relayHubIds?.length ? 'Expected remaining' : 'Expected remaining'}</dt>
                    <dd>{selectedRouteEnergy && Number.isFinite(selectedRouteEnergy.remainingBattery) ? `${selectedRouteEnergy.remainingBattery}%` : '—'}</dd>
                  </div>
                  <div><dt>Minimum reserve</dt><dd>{DEFAULT_BATTERY_RESERVE_PCT}%</dd></div>
                </dl>
              </div>
            </div>
          </OperatorPanel>
        )}

        <div className="form-actions mission-builder-actions">
          {step > 1 && <ActionButton variant="secondary" disabled={isAssigning} onClick={() => { const next = Math.max(1, step - 1); setStep(next); persistDraft(next); }}>Back</ActionButton>}
          {step === 1 && <ActionButton disabled={!canContinueStep1} onClick={() => { setStep(2); persistDraft(2); }}>Continue</ActionButton>}
          {step === 2 && <ActionButton disabled={!canContinueStep2} onClick={() => { setStep(3); persistDraft(3); }}>Continue</ActionButton>}
          {step === 3 && <ActionButton disabled={!canReviewMission} onClick={() => { setStep(4); persistDraft(4); }}>Review mission</ActionButton>}
          {step === 4 && (
            <div className="mission-assign-action">
              <ActionButton
                className="mission-assign-button"
                icon={isAssigning ? undefined : 'check'}
                disabled={isAssigning || createMissionMutation.isPending || isPlanningAnalysisFetching || !canAssignMission}
                aria-busy={isAssigning}
                onClick={() => void handleAssignMission()}
              >
                {isAssigning && <Loader2 size={17} className="mission-assign-spinner" aria-hidden="true" />}
                {isAssigning ? 'Assigning mission…' : 'Assign mission'}
              </ActionButton>
              {isAssigning && (
                <span className="mission-assign-progress" role="status" aria-live="polite">
                  Checking availability and creating your mission…
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {toast && <div className="operator-toast">{toast}</div>}
    </MissionPageShell>
  );
}
