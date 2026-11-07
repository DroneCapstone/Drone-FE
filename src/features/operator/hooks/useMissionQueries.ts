import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  analyzeMissionPlanningApi,
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
  listIncidentsApi,
  listMissionsApi,
  listMissionHubsApi,
  listMissionMiniHubsApi,
  updateIncidentStatusApi,
  type AnalyzeMissionPlanningInput,
  type CreateIncidentInput,
  type CreateMissionInput,
  type UpdateIncidentStatusInput,
} from '../api/missionApi';
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

export function useLiveTrackingQuery() {
  return useQuery({
    queryKey: operatorQueryKeys.liveTracking(),
    queryFn: getLiveTrackingApi,
    refetchInterval: 3_000, // BE GPS cadence: one new fix approximately every 3 s.
    refetchIntervalInBackground: true,
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
    queryFn: () => getMissionTelemetryApi(missionId),
    enabled: Boolean(missionId.trim()),
    refetchInterval: 5_000,
  });
}

export function useMissionHubCheckpointsQuery(missionId: string) {
  return useQuery({
    queryKey: operatorQueryKeys.missionHubCheckpoints(missionId),
    queryFn: () => getMissionHubCheckpointsApi(missionId),
    enabled: Boolean(missionId.trim()),
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
    staleTime: 0,
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
    ),
    queryFn: () => analyzeMissionPlanningApi(input as AnalyzeMissionPlanningInput),
    enabled: Boolean(input?.orderId.trim() && input?.droneId.trim() && input?.batteryId.trim()),
    staleTime: 15_000,
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
