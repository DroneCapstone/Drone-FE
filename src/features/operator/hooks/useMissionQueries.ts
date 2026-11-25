import { useEffect, useState } from 'react';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  analyzeMissionPlanningApi,
  recommendDispatchResourcesApi,
  collectMissionTelemetryApi,
  createIncidentApi,
  createMissionApi,
  getIncidentApi,
  getLiveTrackingApi,
  getMissionActiveFlightsApi,
  getMissionDashboardKpiApi,
  getMissionDashboardStatusApi,
  getMissionApi,
  getMissionHubCheckpointsApi,
  getEligibleMissionBatteriesApi,
  getMissionTelemetryApi,
  getAllMissionTelemetryApi,
  listIncidentsApi,
  listMissionsApi,
  listMissionHubsApi,
  listMissionMiniHubsApi,
  updateIncidentStatusApi,
  type AnalyzeMissionPlanningInput,
  type RecommendDispatchResourcesInput,
  type CreateIncidentInput,
  type CreateMissionInput,
  type UpdateIncidentStatusInput,
} from '../api/missionApi';
import {
  getPreAnalyzeBundleCandidatesApi,
  getPostAnalyzeBundleCandidatesApi,
  validateMissionBundleApi,
} from '../api/missionBundleApi';
import { operatorQueryKeys } from '../query/queryKeys';

export function useMissionListQuery() {
  return useQuery({
    queryKey: operatorQueryKeys.missionList(),
    queryFn: listMissionsApi,
    staleTime: 5_000,
  });
}

export function useMissionDashboardKpiQuery() {
  return useQuery({
    queryKey: operatorQueryKeys.missionDashboardKpi(),
    queryFn: getMissionDashboardKpiApi,
    refetchInterval: 15_000,
  });
}

export function useMissionDashboardStatusQuery() {
  return useQuery({
    queryKey: operatorQueryKeys.missionDashboardStatus(),
    queryFn: getMissionDashboardStatusApi,
    refetchInterval: 15_000,
  });
}

export function useMissionActiveFlightsQuery() {
  return useQuery({
    queryKey: operatorQueryKeys.missionActiveFlights(),
    queryFn: getMissionActiveFlightsApi,
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });
}

export function useMissionHubsQuery() {
  return useQuery({
    queryKey: operatorQueryKeys.missionHubs(),
    queryFn: listMissionHubsApi,
  });
}

export function useMissionMiniHubsQuery() {
  return useQuery({
    queryKey: operatorQueryKeys.missionMiniHubs(),
    queryFn: listMissionMiniHubsApi,
  });
}

/**
 * One shared Live Tracking query stays subscribed for the entire Operator session.
 * This keeps its latest GPS snapshot in React Query while the Operator is on a
 * different page or browser tab. The Live Tracking screen only consumes it;
 * it does not start a second polling timer.
 *
 * Browser background throttling and BE simulator speed can still outpace FE;
 * the snapshot always represents the BE's latest known (not historical) GPS.
 */
// Aggressive refresh: one request at a time, never an unconditional 4 RPS
// if BE is slow. The interval starts again when the previous request settles.
export const LIVE_TRACKING_FOREGROUND_POLL_MS = 250;
export const LIVE_TRACKING_BACKGROUND_POLL_MS = 1_000;
const LIVE_TRACKING_ERROR_RETRY_MS = 2_000;

export function useLiveTrackingQuery(options?: { subscribeOnly?: boolean }) {
  const [tabVisible, setTabVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible',
  );

  useEffect(() => {
    // Also works when Technician is active in another tab/window.
    const onVisibilityChange = () => setTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  return useQuery({
    queryKey: operatorQueryKeys.liveTracking(),
    queryFn: getLiveTrackingApi,
    staleTime: 0,
    // Only the session-wide OperatorLayout warmup owns this timer.
    // Other screens subscribe to the same cache without starting more timers.
    refetchInterval: (query) => {
      if (options?.subscribeOnly !== false) return false;
      // IMPORTANT: don't restart a request while the previous one is pending.
      // Prevent overlapping GETs when latency exceeds the 250 ms interval.
      if (query.state.fetchStatus === 'fetching') return false;
      if (query.state.status === 'error') return LIVE_TRACKING_ERROR_RETRY_MS;
      return tabVisible ? LIVE_TRACKING_FOREGROUND_POLL_MS : LIVE_TRACKING_BACKGROUND_POLL_MS;
    },
    refetchIntervalInBackground: options?.subscribeOnly === false,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: true,
  });
}

export function useMissionDetailQuery(missionId: string) {
  return useQuery({
    queryKey: operatorQueryKeys.missionDetail(missionId),
    queryFn: () => getMissionApi(missionId),
    enabled: Boolean(missionId.trim()),
  });
}

export function useMissionTelemetryQuery(missionId: string) {
  return useQuery({
    queryKey: operatorQueryKeys.missionTelemetry(missionId),
    queryFn: () => getAllMissionTelemetryApi(missionId),
    enabled: Boolean(missionId.trim()),
    refetchInterval: 8_000,
    refetchOnWindowFocus: false,
  });
}

export function useMissionHubCheckpointsQuery(missionId: string, refetchIntervalMs?: number) {
  return useQuery({
    queryKey: operatorQueryKeys.missionHubCheckpoints(missionId),
    queryFn: () => getMissionHubCheckpointsApi(missionId),
    enabled: Boolean(missionId.trim()),
    // Live Tracking opts into polling; detail/history callers keep old behavior.
    refetchInterval: refetchIntervalMs ?? false,
  });
}

export function useIncidentsQuery() {
  return useQuery({
    queryKey: operatorQueryKeys.incidents(),
    queryFn: listIncidentsApi,
  });
}

export function useIncidentQuery(incidentId: string) {
  return useQuery({
    queryKey: operatorQueryKeys.incidentDetail(incidentId),
    queryFn: () => getIncidentApi(incidentId),
    enabled: Boolean(incidentId.trim()),
  });
}

export function useEligibleMissionBatteriesQuery(orderId: string, droneId: string, crossHubCurrentHubId?: string) {
  return useQuery({
    queryKey: operatorQueryKeys.eligibleMissionBatteries(orderId, droneId, crossHubCurrentHubId),
    queryFn: () => getEligibleMissionBatteriesApi(droneId, orderId, crossHubCurrentHubId),
    enabled: Boolean(orderId.trim() && droneId.trim()),
    // Keep the user's current Step-2/3 selection stable when switching windows.
    // Final Assign explicitly refetches and validates battery eligibility.
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function usePreAnalyzeBundleCandidatesQuery(orderId: string, enabled: boolean) {
  return useQuery({
    queryKey: operatorQueryKeys.missionBundleCandidates(orderId),
    queryFn: () => getPreAnalyzeBundleCandidatesApi(orderId),
    enabled: enabled && Boolean(orderId.trim()),
    staleTime: 0,
  });
}

export function useValidateMissionBundleQuery(orderIds: string[], droneId: string, enabled: boolean) {
  return useQuery({
    queryKey: operatorQueryKeys.missionBundleValidation(orderIds, droneId),
    queryFn: () => validateMissionBundleApi({ orderIds, ...(droneId ? { droneId } : {}) }),
    enabled: enabled && orderIds.length > 1,
    staleTime: 0,
  });
}

/** BE candidate discovery for the chosen primary-order route; never a safety validation. */
export function usePostAnalyzeBundleCandidatesQuery(
  orderId: string,
  droneId: string,
  routeId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: operatorQueryKeys.missionPostAnalyzeBundleCandidates(orderId, droneId, routeId),
    queryFn: () => getPostAnalyzeBundleCandidatesApi({ orderId, droneId, routeId }),
    enabled: enabled && Boolean(orderId.trim() && droneId.trim() && routeId.trim()),
    staleTime: 0,
  });
}

/** Read-only BE resource suggestions; never invokes the full auto-dispatch flow. */
export function useRecommendDispatchResourcesMutation() {
  return useMutation({
    mutationFn: (input: RecommendDispatchResourcesInput) => recommendDispatchResourcesApi(input),
  });
}

export function useMissionPlanningAnalysisQuery(
  input: AnalyzeMissionPlanningInput | null,
) {
  return useQuery({
    queryKey: operatorQueryKeys.missionPlanning(
      input?.orderId ?? '',
      input?.droneId ?? '',
      input?.batteryId ?? '',
      input?.bundledOrderIds ?? [],
    ),
    queryFn: () => analyzeMissionPlanningApi(input as AnalyzeMissionPlanningInput),
    enabled: Boolean(input?.orderId.trim() && input?.droneId.trim() && input?.batteryId.trim()),
    // AI Analyze can take several seconds. Keep successful results visible when
    // the tab regains focus or this page is revisited, instead of re-running it.
    // Changing Order/Drone/Battery still changes the query key and analyzes anew.
    // The Assign handler explicitly refetches fresh analysis before submission.
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}

export function useCreateMissionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMissionInput) => createMissionApi(input),
    onSuccess: (mission) => {
      queryClient.setQueryData(operatorQueryKeys.missionDetail(mission.id), mission);
      void queryClient.invalidateQueries({ queryKey: operatorQueryKeys.missions() });
      void queryClient.invalidateQueries({ queryKey: operatorQueryKeys.orders() });
      void queryClient.invalidateQueries({ queryKey: operatorQueryKeys.fleet() });
    },
  });
}

export function useCollectMissionTelemetryMutation(missionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (telemetry: Record<string, unknown>) =>
      collectMissionTelemetryApi(missionId, telemetry),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: operatorQueryKeys.missionTelemetry(missionId),
      });
      void queryClient.invalidateQueries({
        queryKey: operatorQueryKeys.liveTracking(),
      });
    },
  });
}

export function useCreateIncidentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateIncidentInput) => createIncidentApi(input),
    onSuccess: (incident) => {
      queryClient.setQueryData(operatorQueryKeys.incidentDetail(incident.id), incident);
      void queryClient.invalidateQueries({ queryKey: operatorQueryKeys.incidents() });
    },
  });
}

export function useUpdateIncidentStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateIncidentStatusInput) => updateIncidentStatusApi(input),
    onSuccess: (incident) => {
      queryClient.setQueryData(operatorQueryKeys.incidentDetail(incident.id), incident);
      void queryClient.invalidateQueries({ queryKey: operatorQueryKeys.incidents() });
    },
  });
}
