import { formatHubName } from '../../utils/displayEnglish';
import { useEffect, useMemo, useState, useRef } from 'react';
import { OperatorLoadingState } from '../../components/OperatorLoadingState';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Info, Loader2 } from 'lucide-react';

import { ActionButton } from '../../../../components/ui/ActionButton';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';

import { EligibleDroneCard } from '../../components/EligibleDroneCard';
import { useFleetBatteriesQuery, useFleetDronesQuery } from '../../hooks/useFleetQueries';
import { PackageReceipt } from '../../components/PackageReceipt';
import { OperatorPanel } from '../../components/OperatorPanel';
import { RouteOptionCard } from '../../components/RouteOptionCard';
import { ResourceExplanationPopup } from '../../components/ResourceExplanationPopup';
import { useOperatorEligibleDronesQuery, useOperatorOrderQuery } from '../../hooks/useOrderQueries';
import {
  useCreateMissionMutation,
  useRecommendDispatchResourcesMutation,
  useEligibleMissionBatteriesQuery,
  useMissionHubsQuery,
  useMissionPlanningAnalysisQuery,
  usePostAnalyzeBundleCandidatesQuery,
} from '../../hooks/useMissionQueries';
import type { OperatorDrone, RouteOption } from '../../types/operator';
import type { DispatchResourceRecommendation } from '../../api/missionApi';

import {
  formatDeliveryWindow,
  canCreateMissionForOrder,
} from '../../utils/deliveryPlanning';
import { DEFAULT_BATTERY_RESERVE_PCT, getEnergyFeasibility } from '../../utils/droneEligibility';
import { clearMissionDraft, loadMissionDraft, saveMissionDraft } from '../../utils/missionDraftStorage';
import { calculateRouteTiming } from '../../utils/missionTiming';

import { MissionPageShell } from './MissionPageShell';
import { MissionReviewSummary } from './MissionReviewSummary';
import './create-mission-compact.css';

const STEPS = ['Order info', 'Drone, battery & route', 'Review & assign'] as const;

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

/** Review is a read-only snapshot of BE responses; it is NOT authorization to Assign.
 * Store per Order in this tab so navigation, backgrounding and F5 can preserve UI.
 * The Assign action still requires current Query results and refetches BE.
 */
type StoredMissionReview = AssignReviewSnapshot & {
  orderId: string;
  droneId: string;
  batteryId: string;
  routeId: string;
  savedAt: number;
};

const REVIEW_CACHE_PREFIX = 'droneoptai.operator.mission-review.v1.';
const REVIEW_CACHE_MAX_AGE_MS = 12 * 60 * 60_000;
function loadStoredMissionReview(orderId: string): StoredMissionReview | null {
  if (!orderId || typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${REVIEW_CACHE_PREFIX}${orderId}`);
    if (!raw) return null;
    const item = JSON.parse(raw) as StoredMissionReview;
    if (item.orderId !== orderId || item.order?.id !== orderId ||
      !item.droneId || !item.batteryId || !item.routeId ||
      !Array.isArray(item.planningAnalysis?.routes) ||
      !item.planningAnalysis.routes.some((route) => route.id === item.routeId) ||
      !Array.isArray(item.eligibleBatteries) ||
      !Array.isArray(item.eligibleDronesData?.drones) ||
      !Number.isFinite(item.savedAt) || Date.now() - item.savedAt > REVIEW_CACHE_MAX_AGE_MS) return null;
    return item;
  } catch {
    return null;
  }
}
function saveStoredMissionReview(snapshot: StoredMissionReview) {
  try { sessionStorage.setItem(`${REVIEW_CACHE_PREFIX}${snapshot.orderId}`, JSON.stringify(snapshot)); }
  catch { /* Storage unavailable/full: in-memory React Query still works. */ }
}
function clearStoredMissionReview(orderId: string) {
  try { sessionStorage.removeItem(`${REVIEW_CACHE_PREFIX}${orderId}`); }
  catch { /* Storage may be disabled. */ }
}


// Keep current local-drone spare battery selection unchanged.
// A cross-hub drone instead takes a BE-eligible battery from its current Hub,
// including a battery installed on that SAME drone. Never take another drone's battery.
function isSelectableMissionBattery(
  battery: { availableStatus?: string; isSelectable?: boolean; droneId?: string; hubId?: string; isInstalledOnDrone?: boolean },
  drone: OperatorDrone,
  originHubId: string,
) {
  // `available_status` describes storage/installation state, while BE's
  // is_selectable/feasible flag is its eligibility decision. Do not reject an
  // approved battery simply because the status is AVAILABLE/INSTALLED rather
  // than the old READY spelling. Always respect explicit unsafe statuses.
  if (battery.isSelectable === false) return false;
  const status = battery.availableStatus?.trim().toLowerCase().replace(/[\s-]+/g, '_');
  const unsafeStatuses = new Set([
    'unavailable', 'reserved', 'assigned', 'in_use', 'maintenance', 'damaged',
    'faulty', 'depleted', 'retired', 'inactive', 'charging', 'blocked',
  ]);
  if (status && unsafeStatuses.has(status)) return false;
  if (battery.isSelectable !== true && status !== 'ready' && status !== 'available') return false;

  // A BE-approved, already mounted battery may belong to the SAME selected
  // drone. Reject batteries installed on any other drone. This applies to
  // local drones too; the old local rule rejected every mounted battery.
  if (battery.droneId && battery.droneId !== drone.id) return false;
  const eligibleHubId = drone.isCrossHub ? drone.hubId : originHubId;
  if (!eligibleHubId) return false;
  if (battery.hubId && battery.hubId !== eligibleHubId) return false;
  // Cross-hub batteries must have their donor Hub confirmed by BE. Local hub
  // battery lists can omit hub_id because the endpoint is already order-scoped.
  if (drone.isCrossHub && !battery.hubId) return false;
  return true;
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
  const [storedReview, setStoredReview] = useState<StoredMissionReview | null>(
    () => loadStoredMissionReview(orderId),
  );
  const sameOrderReview = storedReview?.orderId === orderId ? storedReview : null;

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
    isFetching: isEligibleDronesFetching,
    refetch: refetchEligibleDrones,
  } = useOperatorEligibleDronesQuery(orderId);
  // Cache is for display continuity only. Never use it to authorize Assign.
  const order = (isAssigning && assignReviewSnapshotRef.current?.order) || queriedOrder || sameOrderReview?.order;
  const eligibleDronesData = (isAssigning && assignReviewSnapshotRef.current?.eligibleDronesData) || queriedEligibleDronesData || sameOrderReview?.eligibleDronesData;
  const restoredDraft = useMemo(() => (orderId ? loadMissionDraft(orderId) : undefined), [orderId]);

  // Do not restore directly into Review: availability and planning may have changed.
  // Existing drafts used a 5-step flow: Step 3 was Select battery, Step 4 was Route.
  // Never restore into Review directly; both flows return to Route for validation.
  const [step, setStep] = useState(() => {
    const savedStep = restoredDraft?.step ?? 1;
    if (savedStep >= 4) return sameOrderReview?.routeId === restoredDraft?.selectedRouteId &&
      sameOrderReview?.droneId === restoredDraft?.selectedDroneId &&
      sameOrderReview?.batteryId === restoredDraft?.selectedBatteryId ? 4 : 3;
    // Step 3 is the automatic preview destination, including after a refresh.
    // A draft saved while manually editing Step 2 remains on Step 2.
    if (savedStep === 3) return 3;
    return Math.min(2, Math.max(1, savedStep));
  });
  const [toast, setToast] = useState('');
  const [resourceExplanationOpen, setResourceExplanationOpen] = useState(false);
  const [resourceExplanationForOrder, setResourceExplanationForOrder] = useState<{
    orderId: string; data: DispatchResourceRecommendation;
  } | null>(null);
  const [resourceExplanationError, setResourceExplanationError] = useState('');
  const [resourceVerificationIssue, setResourceVerificationIssue] = useState('');

  const [selectedDroneId, setSelectedDroneId] = useState(
    restoredDraft?.selectedDroneId && (restoredDraft.selectedBatteryId ||
      (restoredDraft.step === 2 && restoredDraft.manualSelectionOverride))
      ? restoredDraft.selectedDroneId : '',
  );
  const [selectedBatteryId, setSelectedBatteryId] = useState(restoredDraft?.selectedBatteryId || '');
  const [selectedRouteId, setSelectedRouteId] = useState(restoredDraft?.selectedRouteId || '');
  // The resource picker is an inline editor within the combined Route step.
  // Draft selections do not affect the active Route until Apply is confirmed.
  const [resourceEditorOpen, setResourceEditorOpen] = useState(false);
  const [draftDroneId, setDraftDroneId] = useState('');
  const [draftBatteryId, setDraftBatteryId] = useState('');
  const [stateOrderId, setStateOrderId] = useState(orderId);
  const restoredManualChoice = Boolean(restoredDraft?.manualSelectionOverride &&
    (restoredDraft.selectedBatteryId || restoredDraft.step === 2));
  const [manualSelectionOverride, setManualSelectionOverride] = useState(restoredManualChoice);
  const manualSelectionRef = useRef(restoredManualChoice);
  const autoPreviewRequestedForOrderRef = useRef<string | null>(null);
  const autoPreviewAttemptRef = useRef(0);
  const pendingAiBatteryRef = useRef<{ orderId: string; droneId: string; batteryId: string; routeId: string } | null>(null);
  const [aiRouteSuggestion, setAiRouteSuggestion] = useState<{
    orderId: string; droneId: string; batteryId: string; routeId: string;
  } | null>(null);
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
    const nextDraft = orderId ? loadMissionDraft(orderId) : undefined;
    const nextReview = loadStoredMissionReview(orderId);
    setStoredReview(nextReview);
    const savedStep = nextDraft?.step ?? 1;
    const canRestoreReview = savedStep >= 4 && nextReview?.routeId === nextDraft?.selectedRouteId &&
      nextReview?.droneId === nextDraft?.selectedDroneId &&
      nextReview?.batteryId === nextDraft?.selectedBatteryId;
    setStep(canRestoreReview ? 4 : savedStep >= 4 ? 3 : Math.min(3, Math.max(1, savedStep)));
    setSelectedDroneId(nextDraft?.selectedDroneId && (nextDraft.selectedBatteryId ||
      (nextDraft.step === 2 && nextDraft.manualSelectionOverride))
      ? nextDraft.selectedDroneId : '');
    setSelectedBatteryId(nextDraft?.selectedBatteryId ?? '');
    setSelectedRouteId(nextDraft?.selectedRouteId ?? '');
    manualSelectionRef.current = Boolean(nextDraft?.manualSelectionOverride &&
      (nextDraft.selectedBatteryId || nextDraft.step === 2));
    setManualSelectionOverride(manualSelectionRef.current);
    autoPreviewRequestedForOrderRef.current = null;
    autoPreviewAttemptRef.current += 1;
    pendingAiBatteryRef.current = null;
    setAiRouteSuggestion(null);
    setResourceEditorOpen(false);
    setDraftDroneId('');
    setDraftBatteryId('');
    setResourceExplanationOpen(false);
    setResourceExplanationForOrder(null);
    setResourceExplanationError('');
    setResourceVerificationIssue('');
    setStateOrderId(orderId);
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
    orderId, crossHubDroneForQuery ? selectedDroneId : '',
    crossHubDroneForQuery?.isCrossHub ? crossHubDroneForQuery.hubId : undefined,
  );
  const eligibleBatteries = (isAssigning && assignReviewSnapshotRef.current?.eligibleBatteries) || queriedEligibleBatteries ||
    (step === 4 && sameOrderReview?.droneId === selectedDroneId &&
      sameOrderReview?.batteryId === selectedBatteryId ? sameOrderReview.eligibleBatteries : undefined);
  // Fetch batteries for the draft drone separately. The selected Drone/Pin and
  // current route remain untouched while the Operator explores alternatives.
  const draftDroneForQuery = eligibleDronesData?.drones.find((drone) => drone.id === draftDroneId);
  const {
    data: draftEligibleBatteries,
    isLoading: draftBatteriesLoading,
    isFetching: draftBatteriesFetching,
    error: draftBatteriesError,
    refetch: refetchDraftBatteries,
  } = useEligibleMissionBatteriesQuery(
    orderId,
    step === 3 && resourceEditorOpen ? draftDroneId : '',
    draftDroneForQuery?.isCrossHub ? draftDroneForQuery.hubId : undefined,
  );
  const {
    data: queriedPlanningAnalysis,
    error: planningAnalysisError,
    isFetching: isPlanningAnalysisFetching,
    refetch: refetchPlanningAnalysis,
  } = useMissionPlanningAnalysisQuery(
    step >= 3 && order?.id && selectedDroneId && selectedBatteryId
      ? { orderId: order.id, droneId: selectedDroneId, batteryId: selectedBatteryId }
      : null,
  );
  const planningAnalysis = (isAssigning && assignReviewSnapshotRef.current?.planningAnalysis) || queriedPlanningAnalysis ||
    (step === 4 && sameOrderReview?.droneId === selectedDroneId &&
      sameOrderReview?.batteryId === selectedBatteryId ? sameOrderReview.planningAnalysis : undefined);
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
  const resourceRecommendationMutation = useRecommendDispatchResourcesMutation();

  // Step 1 -> Step 3: recommend Drone and Battery with the read-only resource API.
  // Route AI Recommended comes separately from /mission-planning/analyze.
  // Step 2 remains available for manual changes, never overwritten by late AI results.
  useEffect(() => {
    if (stateOrderId !== orderId || !order || order.id !== orderId ||
      !order.originHubId || !order.destinationHubId || !canCreateMissionForOrder(order) ||
      step !== 3 || isAssigning || selectedDroneId || selectedBatteryId || manualSelectionRef.current ||
      autoPreviewRequestedForOrderRef.current === orderId) return;

    autoPreviewRequestedForOrderRef.current = orderId;
    const attemptId = ++autoPreviewAttemptRef.current;
    void resourceRecommendationMutation.mutateAsync({ orderId, bundledOrderIds: [] })
      .then((preview) => {
        if (currentOrderRef.current !== orderId || manualSelectionRef.current ||
          autoPreviewAttemptRef.current !== attemptId) return;
        // Preserve the original BE explanation even if Operator later changes resources.
        setResourceExplanationForOrder({ orderId, data: preview });
        // The resource endpoint is the first useful result. Do NOT wait for the
        // separately fetched eligible-drones list just to show its recommendation.
        // Eligibility and payload validation remain mandatory before Assign.
        // Progressive rendering: show both BE-recommended resources immediately.
        // Analyze starts as soon as these IDs are set; eligibility is validated
        // independently before Review/Assign becomes available.
        pendingAiBatteryRef.current = {
          orderId, droneId: preview.selectedDroneId, batteryId: preview.selectedBatteryId, routeId: '',
        };
        setResourceVerificationIssue('');
        setSelectedDroneId(preview.selectedDroneId);
        setSelectedBatteryId(preview.selectedBatteryId);
      })
      .catch(() => {
        // Do not leave Step 3 empty if the preview fails; retain the manual path.
        if (currentOrderRef.current !== orderId || manualSelectionRef.current ||
          autoPreviewAttemptRef.current !== attemptId) return;
        autoPreviewRequestedForOrderRef.current = null;
        setToast('Automatic selection is unavailable. Please select a drone and battery manually.');
        setStep(2);
      });
  }, [stateOrderId, orderId, order, step, isAssigning, selectedDroneId, selectedBatteryId,
    resourceRecommendationMutation.mutateAsync]);

  // Validate the recommended pair in parallel with Analyze. Do not block
  // displaying the recommended Drone/Battery on this secondary request.
  useEffect(() => {
    const pending = pendingAiBatteryRef.current;
    if (!pending || step !== 3 || stateOrderId !== orderId || currentOrderRef.current !== orderId ||
      pending.orderId !== orderId || pending.droneId !== selectedDroneId ||
      pending.batteryId !== selectedBatteryId || manualSelectionRef.current ||
      !order || !eligibleDronesData || isEligibleDronesLoading || eligibleDronesError) return;
    if (eligibleBatteriesLoading || (eligibleBatteriesFetching && !eligibleBatteries)) return;
    if (!eligibleBatteries && !eligibleBatteriesError) return;

    pendingAiBatteryRef.current = null;
    if (eligibleBatteriesError || !eligibleBatteries) {
      // Keep the recommendation visible, but do not unlock Review or Assign.
      setResourceVerificationIssue('Unable to verify battery availability. Retry or choose manually.');
      return;
    }
    const drone = eligibleDronesData.drones.find((item) => item.id === pending.droneId);
    const validDrone = Boolean(drone && drone.isSelectable !== false &&
      drone.maxPayloadKg + 0.0001 >= order.payloadKg);
    const validBattery = Boolean(drone && eligibleBatteries.some((battery) =>
      battery.id === pending.batteryId && isSelectableMissionBattery(battery, drone, order.originHubId)
    ));
    const foundBattery = eligibleBatteries.some((battery) => battery.id === pending.batteryId);
    setResourceVerificationIssue(validDrone && validBattery
      ? ''
      : !validDrone
        ? 'Recommended drone did not pass eligibility checks. Choose another drone.'
        : foundBattery
          ? 'Recommended battery did not pass eligibility checks. Choose another battery.'
          : 'Recommended battery is missing from the eligible-batteries response. Retry verification.');
    // Leave the recommendation visible for explanation, but the existing
    // canContinueStep2 check blocks Review and Assign when not eligible.
  }, [step, stateOrderId, orderId, order, selectedDroneId, selectedBatteryId, eligibleDronesData, eligibleBatteries,
    isEligibleDronesLoading, eligibleDronesError, eligibleBatteriesLoading, eligibleBatteriesFetching, eligibleBatteriesError]);

  // After F5, Step 3 can mount before the eligible-drone query has returned.
  // Do not interpret an as-yet-unresolved ID as an invalid selection. Only after
  // BE has replied may an existing saved Drone be rejected. Auto choices are
  // re-recommended; manual choices are returned to Step 2 for Operator review.
  useEffect(() => {
    if (step !== 3 || stateOrderId !== orderId || !order || order.id !== orderId ||
      !selectedDroneId || !eligibleDronesData || isEligibleDronesLoading ||
      eligibleDronesError || isAssigning) return;
    const savedDrone = eligibleDronesData.drones.find((item) => item.id === selectedDroneId);
    if (savedDrone && savedDrone.isSelectable !== false &&
      savedDrone.maxPayloadKg + 0.0001 >= order.payloadKg) return;
    autoPreviewAttemptRef.current += 1;
    pendingAiBatteryRef.current = null;
    setAiRouteSuggestion(null);
    setResourceVerificationIssue('');
    setSelectedDroneId('');
    setSelectedBatteryId('');
    setSelectedRouteId('');
    setExpandedRouteId(null);
    setRouteSelectionConfirmed(false);
    if (manualSelectionRef.current) {
      setToast('Saved drone is no longer eligible. Please choose a drone and battery again.');
    } else {
      setToast('Recommended drone is no longer eligible. Please choose manually.');
    }
    // The operator must retry manually; an automatic loop would hammer both APIs.
    setStep(2);
  }, [step, stateOrderId, orderId, order, selectedDroneId, eligibleDronesData,
    isEligibleDronesLoading, eligibleDronesError, isAssigning]);

  // A previous manual edit might have been saved without a complete Drone/Pin
  // pair. Never leave a restored manual draft stranded on the Route step.
  useEffect(() => {
    if (step !== 3 || stateOrderId !== orderId || isAssigning ||
      !manualSelectionRef.current || selectedDroneId) return;
    setToast('Please complete your manual drone and battery selection.');
    setStep(2);
  }, [step, stateOrderId, orderId, selectedDroneId, isAssigning]);

  // An unavailable eligible-drone endpoint cannot support automatic selection.
  // Fallback to the unchanged manual Step 2 instead of leaving Step 3 loading forever.
  useEffect(() => {
    if (step !== 3 || !eligibleDronesError || isAssigning) return;
    autoPreviewAttemptRef.current += 1;
    autoPreviewRequestedForOrderRef.current = null;
    pendingAiBatteryRef.current = null;
    setToast('Cannot verify eligible drones. Please select manually.');
    setStep(2);
  }, [step, eligibleDronesError, isAssigning]);

  // Persist immediately after each choice, including Step 2 selections. Prevent
  // cross-Order draft writes during navigation and never re-save after Assign.
  useEffect(() => {
    if (!orderId || stateOrderId !== orderId || order?.id !== orderId || isAssigning) return;
    saveMissionDraft({
      orderId, step, selectedDroneId, selectedBatteryId, selectedRouteId,
      manualSelectionOverride, bundledOrderIds: [], relayBatterySelections: [],
    });
  }, [orderId, stateOrderId, order?.id, step, selectedDroneId, selectedBatteryId,
    selectedRouteId, manualSelectionOverride, isAssigning]);

  // Save the actual BE response used to build Review. When the page unmounts,
  // React state disappears, but this display snapshot stays in sessionStorage.
  useEffect(() => {
    if (step !== 4 || stateOrderId !== orderId || !orderId || isAssigning ||
      !queriedOrder || !queriedEligibleDronesData || !queriedEligibleBatteries ||
      !queriedPlanningAnalysis || !selectedDroneId || !selectedBatteryId || !selectedRouteId ||
      !queriedEligibleDronesData.drones.some((drone) => drone.id === selectedDroneId) ||
      !queriedEligibleBatteries.some((battery) => battery.id === selectedBatteryId) ||
      !queriedPlanningAnalysis.routes.some((route) => route.id === selectedRouteId)) return;
    const snapshot: StoredMissionReview = {
      orderId, droneId: selectedDroneId, batteryId: selectedBatteryId,
      routeId: selectedRouteId, savedAt: Date.now(),
      order: queriedOrder, eligibleDronesData: queriedEligibleDronesData,
      eligibleBatteries: queriedEligibleBatteries, planningAnalysis: queriedPlanningAnalysis,
    };
    saveStoredMissionReview(snapshot);
    setStoredReview(snapshot);
  }, [step, stateOrderId, orderId, isAssigning, selectedDroneId, selectedBatteryId,
    selectedRouteId, queriedOrder, queriedEligibleDronesData, queriedEligibleBatteries, queriedPlanningAnalysis]);

  // AI recommends; the Operator remains free to select and review any proposed route.
  // Default to AI Recommended for convenience, not as an assignment/approval decision.
  // This effect must stay above early returns (React hooks rule).
  useEffect(() => {
    // Do not let a background revalidation replace the route during submission.
    if (isAssigning || step < 3 || isPlanningAnalysisFetching || !planningAnalysis) return;
    if (planningAnalysis.routes.some((route) => route.id === selectedRouteId)) return;
    const selectable = (route: RouteOption) => route.isSelectable !== false && route.feasible !== false;
    const recommended = planningAnalysis.routes.find((route) => route.recommended && selectable(route));
    const aiRoute = aiRouteSuggestion?.orderId === orderId &&
      aiRouteSuggestion.droneId === selectedDroneId && aiRouteSuggestion.batteryId === selectedBatteryId
      ? planningAnalysis.routes.find((route) => route.id === aiRouteSuggestion.routeId && selectable(route))
      : undefined;
    const nextRouteId = (recommended ?? aiRoute)?.id ?? '';
    if (nextRouteId === selectedRouteId) return;
    setSelectedRouteId(nextRouteId);
    setExpandedRouteId(null);
    setRouteSelectionConfirmed(false);
    setBundledOrderIds([]);
    setBundleEnabled(false);
  }, [planningAnalysis, isPlanningAnalysisFetching, selectedRouteId, isAssigning, step, orderId, selectedDroneId, selectedBatteryId, aiRouteSuggestion]);

  useEffect(() => {
    // The Assign handler owns final validation while submitting; avoid clearing
    // the selected battery (and hiding Review) mid-request.
    if (isAssigning || !selectedBatteryId || !eligibleBatteries || !order || !eligibleDronesData ||
      isEligibleDronesLoading || eligibleDronesError || eligibleBatteriesLoading ||
      eligibleBatteriesFetching || eligibleBatteriesError) return;
    const drone = eligibleDronesData.drones.find((item) => item.id === selectedDroneId);
    if (drone?.isSelectable !== false && drone && eligibleBatteries.some((battery) =>
      battery.id === selectedBatteryId && isSelectableMissionBattery(battery, drone, order.originHubId)
    )) {
      if (resourceVerificationIssue) setResourceVerificationIssue('');
      return;
    }
    if (step === 3 && !manualSelectionRef.current) {
      pendingAiBatteryRef.current = null;
      const hasBatteryInResponse = eligibleBatteries.some((item) => item.id === selectedBatteryId);
      setResourceVerificationIssue(hasBatteryInResponse
        ? 'The selected battery does not pass eligibility checks. Choose another battery.'
        : 'The recommended battery was not included in the eligible-batteries response. Retry verification.');
      // Keep the preview IDs so the Operator can see what BE recommended.
      // canContinueStep2 still blocks Review and Assign until verification passes.
      return;
    }
    setSelectedBatteryId('');
    setSelectedRouteId('');
    setExpandedRouteId(null);
    setRouteSelectionConfirmed(false);
    setBundledOrderIds([]);
    setBundleEnabled(false);
    if (step === 3) {
      // Do not strand Step 3 with a Drone but no eligible Battery after reload.
      pendingAiBatteryRef.current = null;
      setAiRouteSuggestion(null);
      autoPreviewAttemptRef.current += 1;
      if (manualSelectionRef.current) {
        setToast('Saved battery is no longer eligible. Please select another battery.');
        setStep(2);
      } else {
        setSelectedDroneId('');
        autoPreviewRequestedForOrderRef.current = null;
      }
    }
  }, [selectedBatteryId, selectedDroneId, eligibleBatteries, eligibleDronesData, order, step, isAssigning,
    isEligibleDronesLoading, eligibleDronesError, eligibleBatteriesLoading, eligibleBatteriesFetching, eligibleBatteriesError,
    resourceVerificationIssue]);

  if (isOrderLoading && !order) {
    return (
      <MissionPageShell active="/operator/missions/all">
        <OperatorPanel title="Create a mission from an order" eyebrow="DELIVERY OPERATIONS">
          <OperatorLoadingState label="Loading order…" />
        </OperatorPanel>
      </MissionPageShell>
    );
  }

  if (orderError && !isAssigning && !sameOrderReview) {
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
  const selectedDrone = eligibleDronesAtOrigin.find((drone) => drone.id === selectedDroneId) ||
    (step === 4 && sameOrderReview?.droneId === selectedDroneId &&
      sameOrderReview?.batteryId === selectedBatteryId
      ? sameOrderReview.eligibleDronesData.drones.find((drone) => drone.id === selectedDroneId)
      : undefined);
  const availableOriginBatteries = (eligibleBatteries ?? []).filter((battery) =>
    selectedDrone && isSelectableMissionBattery(battery, selectedDrone, order.originHubId),
  );
  const selectedBattery = availableOriginBatteries.find((battery) => battery.id === selectedBatteryId) ||
    (step === 4 && sameOrderReview?.droneId === selectedDroneId &&
      sameOrderReview?.batteryId === selectedBatteryId
      ? sameOrderReview.eligibleBatteries.find((battery) => battery.id === selectedBatteryId)
      : undefined);
  const draftDrone = eligibleDronesAtOrigin.find((drone) => drone.id === draftDroneId);
  const availableDraftBatteries = (draftEligibleBatteries ?? []).filter((battery) =>
    draftDrone && isSelectableMissionBattery(battery, draftDrone, order.originHubId),
  );
  const draftBattery = availableDraftBatteries.find((battery) => battery.id === draftBatteryId);

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
  const selectedRoute = routeOptions.find((route) => route.id === selectedRouteId) ||
    (step === 4 && sameOrderReview?.droneId === selectedDroneId &&
      sameOrderReview?.batteryId === selectedBatteryId && sameOrderReview?.routeId === selectedRouteId
      ? sameOrderReview.planningAnalysis.routes.find((route) => route.id === selectedRouteId)
      : undefined);
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
  // Only current authoritative Query results can unlock Assign. Stored Review
  // data is display-only and may not reflect resource changes at the backend.
  const liveSelectedDrone = queriedEligibleDronesData?.drones.find((drone) => drone.id === selectedDroneId);
  const liveSelectedBattery = queriedEligibleBatteries?.find((battery) => battery.id === selectedBatteryId);
  const liveSelectedRoute = queriedPlanningAnalysis?.routes.find((route) => route.id === selectedRouteId);
  const hasCurrentApiValidation = Boolean(
    queriedOrder && liveSelectedDrone && liveSelectedBattery && liveSelectedRoute &&
    canCreateMissionForOrder(queriedOrder) &&
    liveSelectedDrone.isSelectable !== false &&
    liveSelectedDrone.maxPayloadKg + 0.0001 >= queriedOrder.payloadKg &&
    isSelectableMissionBattery(liveSelectedBattery, liveSelectedDrone, queriedOrder.originHubId) &&
    getEnergyFeasibility(liveSelectedRoute).feasible &&
    (!liveSelectedDrone.isCrossHub || liveSelectedRoute.legDetails?.some((leg) =>
      leg.is_dispatch || leg.leg_type?.toUpperCase() === 'DISPATCH')) &&
    !eligibleDronesError && !eligibleBatteriesError && !planningAnalysisError &&
    !isEligibleDronesFetching && !eligibleBatteriesLoading && !eligibleBatteriesFetching &&
    !isPlanningAnalysisFetching,
  );
  const canAssignMission = hasCurrentApiValidation && canReviewMission && selectedRouteEnergy?.feasible === true &&
    (!selectedDrone?.isCrossHub || hasDispatchLeg);

  const handleDroneSelect = (drone: OperatorDrone) => {
    if (drone.isSelectable === false || drone.maxPayloadKg + 0.0001 < totalPayloadKg || drone.id === selectedDroneId) return;
    manualSelectionRef.current = true;
    setManualSelectionOverride(true);
    pendingAiBatteryRef.current = null;
    setAiRouteSuggestion(null);
    setResourceVerificationIssue('');
    setSelectedDroneId(drone.id);
    setSelectedBatteryId('');
    setSelectedRouteId('');
    setExpandedRouteId(null);
    setRouteSelectionConfirmed(false);
    setBundledOrderIds([]);
    setBundleEnabled(false);
  };

  const handleChangeDrone = () => {
    manualSelectionRef.current = true;
    setManualSelectionOverride(true);
    pendingAiBatteryRef.current = null;
    setAiRouteSuggestion(null);
    setResourceVerificationIssue('');
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
      manualSelectionOverride: true,
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
    manualSelectionRef.current = true;
    setManualSelectionOverride(true);
    pendingAiBatteryRef.current = null;
    setAiRouteSuggestion(null);
    setResourceVerificationIssue('');
    setSelectedBatteryId(batteryId);
    setSelectedRouteId('');
    setExpandedRouteId(null);
    setRouteSelectionConfirmed(false);
    setBundledOrderIds([]);
    setBundleEnabled(false);
  };

  const openResourceEditor = () => {
    if (isAssigning) return;
    setDraftDroneId(selectedDroneId);
    setDraftBatteryId(selectedBatteryId);
    setResourceEditorOpen(true);
  };

  const applyResourceEditor = () => {
    if (!draftDrone || draftDrone.isSelectable === false || draftDrone.maxPayloadKg + 0.0001 < totalPayloadKg || !draftBattery || draftBatteriesLoading || draftBatteriesFetching || draftBatteriesError) return;
    setResourceEditorOpen(false);
    if (draftDroneId === selectedDroneId && draftBatteryId === selectedBatteryId) return;
    // A manual choice takes priority over late AI responses. Invalidate the
    // previous analyzed route; React Query will analyze the new Drone/Pin tuple.
    manualSelectionRef.current = true;
    setManualSelectionOverride(true);
    autoPreviewAttemptRef.current += 1;
    pendingAiBatteryRef.current = null;
    setAiRouteSuggestion(null);
    setResourceVerificationIssue('');
    setSelectedDroneId(draftDroneId);
    setSelectedBatteryId(draftBatteryId);
    setSelectedRouteId('');
    setExpandedRouteId(null);
    setRouteSelectionConfirmed(false);
    setBundledOrderIds([]);
    setBundleEnabled(false);
  };

  const loadResourceExplanation = () => {
    if (resourceRecommendationMutation.isPending || !order?.id) return;
    const requestedOrderId = order.id;
    setResourceExplanationError('');
    void resourceRecommendationMutation.mutateAsync({ orderId: requestedOrderId, bundledOrderIds: [] })
      .then((data) => {
        if (currentOrderRef.current !== requestedOrderId) return;
        // Read-only BE recommendation: opening the popup NEVER changes selected Drone/Pin/Route.
        setResourceExplanationForOrder({ orderId: requestedOrderId, data });
      })
      .catch(() => {
        if (currentOrderRef.current === requestedOrderId) {
          setResourceExplanationError('Unable to load resource explanation.');
        }
      });
  };

  const handleOpenResourceExplanation = () => {
    setResourceExplanationOpen(true);
    if (resourceExplanationForOrder?.orderId !== order.id) loadResourceExplanation();
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
      manualSelectionOverride,
      bundledOrderIds: [],
      relayBatterySelections: [],
    });
  };

  const handleViewAiDetails = (routeId: string) => {
    persistDraft(3, selectedRouteId);
    navigate(`/operator/ai/mission-analysis?${new URLSearchParams({ orderId: order.id, droneId: selectedDroneId, batteryId: selectedBatteryId, routeId, returnTo: 'mission-create' }).toString()}`);
  };



  const handleAssignMission = async () => {
    if (assignLockRef.current || hasUnverifiedBundle || !canAssignMission || !selectedDrone || !selectedBattery || !selectedRoute ||
      !eligibleDronesData || !eligibleBatteries || !planningAnalysis) return;
    assignLockRef.current = true;
    assignReviewSnapshotRef.current = { order, eligibleDronesData, eligibleBatteries, planningAnalysis };
    setIsAssigning(true); // Show spinner and disable repeated clicks from the first recheck.
    let assignedSuccessfully = false;

    // Re-check drone eligibility and planning. A previously available drone may
    // have been assigned elsewhere while the Operator was reviewing the route.
    try {
      // These independent BE read checks can run concurrently. Validate every
      // result before POSTing; do not use cached display data to authorize Assign.
      // The Create Mission endpoint remains the authoritative final reservation.
      const [latestOrder, eligibleNow, batteriesNow, current] = await Promise.all([
        refetchOrder(),
        refetchEligibleDrones(),
        refetchEligibleBatteries(),
        refetchPlanningAnalysis(),
      ]);
      if (latestOrder.error || !latestOrder.data || !canCreateMissionForOrder(latestOrder.data)) {
        setStep(1);
        showToast('Package receipt or planning status is not valid. Refresh the Order before assigning.');
        return;
      }
      if (eligibleNow.error || !eligibleNow.data?.drones.some((drone) => drone.id === selectedDrone.id && drone.isSelectable !== false)) {
        setStep(2);
        setSelectedDroneId('');
        setSelectedBatteryId('');
        setSelectedRouteId('');
        showToast('Drone is no longer eligible. Please select another available drone.');
        return;
      }
      if (batteriesNow.error || !batteriesNow.data?.some((item) =>
        item.id === selectedBatteryId && isSelectableMissionBattery(item, selectedDrone, order.originHubId)
      )) {
        setStep(2);
        setSelectedBatteryId('');
        setSelectedRouteId('');
        showToast('Selected battery is no longer eligible. Choose another battery.');
        return;
      }
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
      clearStoredMissionReview(order.id);
      setStoredReview(null);
      clearMissionDraft(order.id);
      // Navigate as soon as BE confirms creation, rather than waiting 500ms.
      navigate(`/operator/missions/${mission.id}`);
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : 'Unable to create Mission.');
    } finally {
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
            const visibleStep = step === 4 ? 3 : step === 1 ? 1 : 2;
            const active = number === visibleStep;
            const done = number < visibleStep;
            return (
              <button
                key={label}
                type="button"
                className={`${active ? 'active' : ''} ${done ? 'done' : ''}`}
                onClick={() => { if (done && !isAssigning) { setResourceEditorOpen(false); setStep(number === 1 ? 1 : 3); } }}
                disabled={isAssigning || (!done && !active)}
              >
                <i>{done ? <Icon name="check" size={12} /> : number}</i><span>{label}</span>
              </button>
            );
          })}
        </div>

        {step === 1 && (
          <div className="mission-step-stack">
          <OperatorPanel title="Order information">
            <div className="fields two">
              <label><span>Order</span><input value={order.id} readOnly /></label>
              <label><span>Customer</span><input value={order.customerName} readOnly /></label>
              <label><span>Delivery mode</span><input value={order.deliveryMode} readOnly /></label>
              <div className="operator-receipt-field-group">
                <span>Origin package</span>
                <PackageReceipt key={order.id} order={order} variant="field" />
              </div>
              <label><span>Origin hub</span><input value={originHubLabel} readOnly /></label>
              <label><span>Destination hub</span><input value={destinationHubLabel} readOnly /></label>
              <label><span>Package</span><input value={`${order.packageLabel} · ${order.payloadKg} kg`} readOnly /></label>
              <label><span>Estimated delivery</span><input value={formatDeliveryWindow(order)} readOnly /></label>
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
            {selectedBatteryId && (
              <OperatorPanel
                title="Flight Plan Overview"
                action={(
                  <button type="button" className="mission-resource-trigger" onClick={handleOpenResourceExplanation}>
                    Resource explanation <Info size={14} aria-hidden="true" />
                  </button>
                )}
              >
                <div className="mission-ai-plan-summary" aria-label="Current flight plan selections">
                  <div className="mission-ai-plan-tile">
                    <small>Primary order</small>
                    <strong>{order.id}</strong>
                  </div>
                  <div className="mission-ai-plan-tile">
                    <small>Selected drone</small>
                    <div className="mission-ai-plan-tile-head">
                      <strong>{selectedDrone.id}</strong>
                      <button type="button" className="mission-ai-plan-change" onClick={openResourceEditor}>Change drone</button>
                    </div>
                  </div>
                  <div className="mission-ai-plan-tile">
                    <small>{pendingAiBatteryRef.current ? 'Recommended battery' : 'Selected battery'}</small>
                    <div className="mission-ai-plan-tile-head">
                      <strong>{selectedBatteryId}</strong>
                      <button type="button" className="mission-ai-plan-change" onClick={openResourceEditor}>Change battery</button>
                    </div>
                  </div>
                </div>
              </OperatorPanel>
            )}
            {resourceEditorOpen && (
              <OperatorPanel
                title="Edit drone & battery"
              >
                <div className="mission-resource-editor-columns">
                  <div className="mission-resource-editor-group">
                    <h3>Available drones</h3>
                    <div className="eligible-drone-grid mission-resource-editor-drone-grid" role="group" aria-label="Choose drone">
                      {eligibleDronesAtOrigin.map((drone) => (
                        <EligibleDroneCard
                          key={drone.id}
                          drone={drone}
                          eligibility={{
                            eligible: drone.isSelectable !== false && drone.maxPayloadKg + 0.0001 >= totalPayloadKg,
                            reasons: drone.unavailableReason ? [drone.unavailableReason] : [],
                          }}
                          selected={drone.id === draftDroneId}
                          routeSelectionIndicator
                          onSelect={() => {
                            if (drone.id === draftDroneId) return;
                            setDraftDroneId(drone.id);
                            setDraftBatteryId('');
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mission-resource-editor-group">
                    <h3>Available batteries</h3>
                    {!draftDrone ? (
                      <div className="operator-empty-state">Choose a drone to view compatible batteries.</div>
                    ) : draftBatteriesLoading || (draftBatteriesFetching && !draftEligibleBatteries) ? (
                      <OperatorLoadingState label="Loading compatible batteries…" compact />
                    ) : draftBatteriesError ? (
                      <div className="operator-empty-state mission-create-gate">
                        <strong>Unable to load batteries</strong>
                        <ActionButton variant="secondary" onClick={() => void refetchDraftBatteries()}>Retry</ActionButton>
                      </div>
                    ) : availableDraftBatteries.length === 0 ? (
                      <div className="operator-empty-state">No compatible batteries available for this drone.</div>
                    ) : (
                      <div className="mission-origin-battery-grid mission-resource-editor-battery-grid" role="radiogroup" aria-label="Choose battery">
                        {availableDraftBatteries.map((battery) => (
                          <button
                            type="button"
                            key={battery.id}
                            role="radio"
                            aria-checked={draftBatteryId === battery.id}
                            className={`mission-origin-battery-card${draftBatteryId === battery.id ? ' is-selected' : ''}`}
                            onClick={() => setDraftBatteryId(battery.id)}
                          >
                            <span className="mission-origin-battery-head">
                              <span className={`mission-resource-editor-choice-radio${draftBatteryId === battery.id ? ' is-checked' : ''}`} aria-hidden="true">
                                {draftBatteryId === battery.id && <Icon name="check" size={12} />}
                              </span>
                              <span className="mission-resource-editor-battery-identity">
                                <strong className="mission-origin-battery-id">{battery.id}</strong>
                                <small className="mission-origin-battery-model">{battery.model || draftDrone.batteryModel || 'Battery'}</small>
                              </span>
                            </span>
                            <span className="mission-origin-battery-metrics">
                              <span><small>Capacity</small><strong>{battery.capacityWh === undefined ? '—' : `${battery.capacityWh} Wh`}</strong></span>
                              <span><small>Charge</small><strong>{battery.chargeLevelPct === undefined ? '—' : `${battery.chargeLevelPct}%`}</strong></span>
                              <span><small>Energy</small><strong>{battery.availableEnergyWh === undefined ? '—' : `${battery.availableEnergyWh.toFixed(1)} Wh`}</strong></span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mission-resource-editor-actions">
                  <ActionButton variant="secondary" onClick={() => setResourceEditorOpen(false)}>Cancel</ActionButton>
                  <ActionButton
                    disabled={!draftDrone || draftDrone.isSelectable === false || draftDrone.maxPayloadKg + 0.0001 < totalPayloadKg || !draftBattery || draftBatteriesLoading || draftBatteriesFetching || Boolean(draftBatteriesError)}
                    onClick={applyResourceEditor}
                  >Apply selection</ActionButton>
                </div>
              </OperatorPanel>
            )}
            {selectedBatteryId && (
            <OperatorPanel title="Choose flight route">
              {/* Progressive loading: the resource overview above is already usable.
                  Only the route section waits for Analyze. Never hide previous routes. */}
              {resourceVerificationIssue && (
                <div className="operator-empty-state mission-create-gate" role="alert">
                  <strong>{resourceVerificationIssue}</strong>
                  <div className="mission-resource-progress-actions">
                    <ActionButton variant="secondary" onClick={() => void refetchEligibleBatteries()}>Retry verification</ActionButton>
                    <ActionButton variant="secondary" onClick={openResourceEditor}>Change drone or battery</ActionButton>
                  </div>
                </div>
              )}
              {selectedBatteryId && !planningAnalysis && !planningAnalysisError && (
                <OperatorLoadingState label="Analyzing routes…" />
              )}
              {planningAnalysisError && (
                <div className="operator-empty-state mission-create-gate" role="alert">
                  <strong>Unable to analyze routes.</strong>
                  <span>{planningAnalysisError instanceof Error ? planningAnalysisError.message : 'Could not load route options.'}</span>
                  <ActionButton variant="secondary" onClick={() => void refetchPlanningAnalysis()}>Retry analysis</ActionButton>
                </div>
              )}
              {selectedBatteryId && !isPlanningAnalysisFetching && !planningAnalysisError && planningAnalysis && routeOptions.length === 0 && (
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
              {/* Eligibility queries may refetch when navigating back. A temporarily
                  disabled Assign button is not evidence that the route is unsafe.
                  Only show route warnings for actual feasibility/energy failures. */}
              {selectedRoute && !hasUnverifiedBundle && !isPlanningAnalysisFetching && !planningAnalysisError &&
                (selectedRoute.isSelectable === false || selectedRoute.feasible === false ||
                 selectedRouteEnergy?.feasible === false || (selectedDrone?.isCrossHub === true && !hasDispatchLeg)) && (
                <p className="mission-route-unavailable" role="status">
                  {selectedRoute.isSelectable === false
                    ? `Route unavailable: ${selectedRoute.unselectableReason || selectedRoute.infeasibleReason || 'This route cannot be assigned.'}`
                    : selectedRoute.feasible === false
                      ? `Route infeasible: ${selectedRoute.infeasibleReason || 'This route is not feasible.'}`
                      : selectedDrone?.isCrossHub && !hasDispatchLeg
                        ? 'This cross-hub route has no dispatch leg and cannot be assigned.'
                        : 'This route does not meet the energy reserve requirement.'}
                </p>
              )}
            </OperatorPanel>
            )}
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
          <div className="mission-step-stack">
            <OperatorPanel
            title={selectedDroneId && selectedBatteryId ? 'Flight Plan Overview' : 'Resource recommendation'}
            action={selectedDroneId && selectedBatteryId && resourceExplanationForOrder?.orderId === order.id ? (
              <button type="button" className="mission-resource-trigger" onClick={handleOpenResourceExplanation}>
                Resource explanation <Info size={14} aria-hidden="true" />
              </button>
            ) : undefined}
          >
              {selectedDroneId && selectedBatteryId ? (
                <div className="mission-ai-plan-summary" aria-label="Resource recommendation">
                  <div className="mission-ai-plan-tile"><small>Primary order</small><strong>{order.id}</strong></div>
                  <div className="mission-ai-plan-tile"><small>Recommended drone</small><strong>{selectedDroneId}</strong></div>
                  <div className="mission-ai-plan-tile"><small>Recommended battery</small><strong>{selectedBatteryId}</strong></div>
                </div>
              ) : (
                <OperatorLoadingState label="Finding recommended drone and battery…" compact />
              )}
              {/* Resource recommendation is in progress. Manual changes are
                  available through Change drone / Change battery after results
                  appear; failures use the existing manual fallback. */}
            </OperatorPanel>
            {selectedDroneId && selectedBatteryId && (
            <OperatorPanel title="Choose flight route">
              {planningAnalysisError ? (
                <div className="operator-empty-state mission-create-gate" role="alert">
                  <strong>Unable to analyze routes.</strong>
                  <ActionButton variant="secondary" onClick={() => void refetchPlanningAnalysis()}>Retry analysis</ActionButton>
                </div>
              ) : (
                <OperatorLoadingState label={planningAnalysis ? 'Verifying drone availability…' : 'Analyzing routes…'} compact />
              )}
            </OperatorPanel>
            )}
          </div>
        )}

        {/* Review is a display of the last selected mission plan, not an API
            verification status. Revalidation can temporarily make
            canReviewMission false when the tab regains focus. Keep the panel
            mounted; Assign remains disabled by canAssignMission until all
            safety checks finish. */}
        {step === 4 && hasOrderHubs && selectedDrone && selectedRoute && selectedTiming && (
          <OperatorPanel title="Review & Assign">
            <MissionReviewSummary
              order={order}
              drone={selectedDrone}
              battery={selectedBattery}
              batteryId={selectedBatteryId}
              route={selectedRoute}
              timing={selectedTiming}
              originLabel={originHubLabel}
              destinationLabel={destinationHubLabel}
              relayHubIds={selectedRelayHubIds}
              swapHubIds={getBatterySwapRelayHubIds(selectedRoute, order.originHubId, order.destinationHubId)}
              hubName={hubName}
            />
          </OperatorPanel>
        )}
        {/* If a query has genuinely lost the selected data, show a recovery
            state instead of leaving an empty area above Back / Assign. */}
        {step === 4 && (!hasOrderHubs || !selectedDrone || !selectedRoute || !selectedTiming) && (
          <OperatorPanel title="Review & Assign">
            {eligibleDronesError || planningAnalysisError || eligibleBatteriesError ? (
              <div className="operator-empty-state">
                <strong>Unable to restore mission review.</strong>
                <p>Please return to route selection to verify the mission resources.</p>
                <ActionButton variant="secondary" onClick={() => setStep(3)}>Back to routes</ActionButton>
              </div>
            ) : (
              <OperatorLoadingState label="Restoring mission review…" compact />
            )}
          </OperatorPanel>
        )}

        <div className="form-actions mission-builder-actions">
          {step > 1 && <ActionButton variant="secondary" disabled={isAssigning} onClick={() => {
            // Internal Step 2 is a manual fallback within visible Step 2.
            const next = step === 4 ? 3 : 1;
            setResourceEditorOpen(false);
            if (step === 3 && !selectedBatteryId && !manualSelectionRef.current) {
              autoPreviewAttemptRef.current += 1;
              autoPreviewRequestedForOrderRef.current = null;
              pendingAiBatteryRef.current = null;
              setSelectedDroneId('');
            }
            setStep(next);
            persistDraft(next);
          }}>Back</ActionButton>}
          {step === 1 && <ActionButton disabled={!canContinueStep1} onClick={() => {
            // Always enter Step 3: Step 2 is for an explicit manual change only.
            // A partial previous selection cannot block a fresh AI dry-run.
            if (!selectedDroneId || !selectedBatteryId) {
              manualSelectionRef.current = false;
              setManualSelectionOverride(false);
              autoPreviewAttemptRef.current += 1;
              autoPreviewRequestedForOrderRef.current = null;
              pendingAiBatteryRef.current = null;
              setSelectedDroneId('');
              setSelectedBatteryId('');
              setSelectedRouteId('');
              setAiRouteSuggestion(null);
              saveMissionDraft({
                orderId: order.id, step: 3, selectedDroneId: '', selectedBatteryId: '',
                selectedRouteId: '', manualSelectionOverride: false,
                bundledOrderIds: [], relayBatterySelections: [],
              });
            } else {
              persistDraft(3);
            }
            setStep(3);
          }}>Continue</ActionButton>}
          {step === 2 && <ActionButton disabled={!canContinueStep2} onClick={() => { setStep(3); persistDraft(3); }}>Show routes</ActionButton>}
          {step === 3 && <ActionButton disabled={resourceEditorOpen || !canReviewMission} onClick={() => { setStep(4); persistDraft(4); }}>Review mission</ActionButton>}
          {step === 4 && (
            <div className="mission-assign-action">
              <ActionButton
                className="mission-assign-button"
                icon={isAssigning ? undefined : 'check'}
                disabled={isAssigning || createMissionMutation.isPending || isPlanningAnalysisFetching || !canAssignMission}
                aria-busy={isAssigning}
                aria-label={isAssigning ? 'Assigning mission' : 'Assign mission'}
                onClick={() => void handleAssignMission()}
              >
                {isAssigning && <Loader2 size={17} className="mission-assign-spinner" aria-hidden="true" />}
                {isAssigning ? 'Assigning mission…' : 'Assign mission'}
              </ActionButton>
            </div>
          )}
        </div>
      </div>
      {toast && <div className="operator-toast">{toast}</div>}
      <ResourceExplanationPopup
        open={resourceExplanationOpen && step === 3}
        onClose={() => setResourceExplanationOpen(false)}
        onRetry={loadResourceExplanation}
        recommendation={resourceExplanationForOrder?.orderId === orderId ? resourceExplanationForOrder.data : null}
        selectedDroneId={selectedDroneId}
        selectedBatteryId={selectedBatteryId}
        loading={resourceRecommendationMutation.isPending}
        error={resourceExplanationError}
      />
    </MissionPageShell>
  );
}
