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
  getMissionApi,
  getMissionHubCheckpointsApi,
  getMissionTelemetryApi,
  listIncidentsApi,
  listMissionHubsApi,
  listMissionMiniHubsApi,
  updateIncidentStatusApi,
  type AnalyzeMissionPlanningInput,
  type CreateIncidentInput,
  type CreateMissionInput,
  type UpdateIncidentStatusInput,
} from '../api/missionApi';
import { operatorQueryKeys } from '../query/queryKeys';

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
    refetchInterval: 5_000,
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

export function useMissionPlanningAnalysisQuery(
  input: AnalyzeMissionPlanningInput | null,
) {
  return useQuery({
    queryKey: operatorQueryKeys.missionPlanning(
      input?.orderId ?? '',
      input?.droneId ?? '',
    ),
    queryFn: () => analyzeMissionPlanningApi(input as AnalyzeMissionPlanningInput),
    enabled: Boolean(input?.orderId.trim() && input?.droneId.trim()),
    staleTime: 15_000,
  });
}

export function useCreateMissionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMissionInput) => createMissionApi(input),
    onSuccess: (mission) => {
      queryClient.setQueryData(operatorQueryKeys.missionDetail(mission.id), mission);
      void queryClient.invalidateQueries({ queryKey: operatorQueryKeys.orders() });
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
