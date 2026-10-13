import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getBatteryDetailFromApi,
  loadBatteryHistory,
  markBatteryChargedOnServer,
  refreshBatteriesFromApi,
  useBatteryOnServer,
  useFirstReadyBatteryForMissionOnServer,
} from "../utils/batteryStorage";

import {
  technicianQueryKeys,
} from "./queryKeys";

export function useBatteriesQuery() {
  return useQuery({
    queryKey:
      technicianQueryKeys.batteries(),
    queryFn: refreshBatteriesFromApi,
    refetchInterval: 30_000,
  });
}

export function useBatteryDetailQuery(
  batteryId?: string,
) {
  return useQuery({
    queryKey: technicianQueryKeys.battery(
      batteryId ?? "",
    ),
    queryFn: () =>
      getBatteryDetailFromApi(
        batteryId ?? "",
      ),
    enabled: Boolean(batteryId),
    staleTime: 15_000,
    // Battery charging is backend-owned. Poll detail data so the UI
    // automatically reflects charge/status changes without a manual
    // "Mark fully charged" action.
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}

export function useBatteryHistoryQuery() {
  return useQuery({
    queryKey: [
      ...technicianQueryKeys.batteries(),
      "history",
    ],
    queryFn: async () =>
      loadBatteryHistory(),
    initialData: () =>
      loadBatteryHistory(),
    staleTime: Infinity,
  });
}

export function useBatteryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      batteryId,
      missionId,
    }: {
      batteryId: string;
      missionId: string;
    }) =>
      useBatteryOnServer(
        batteryId,
        missionId,
      ),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey:
            technicianQueryKeys.batteries(),
        }),
        queryClient.invalidateQueries({
          queryKey: technicianQueryKeys.battery(
            variables.batteryId,
          ),
        }),
      ]);
    },
  });
}

export function useFirstReadyBatteryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (missionId: string) =>
      useFirstReadyBatteryForMissionOnServer(
        missionId,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey:
          technicianQueryKeys.batteries(),
      });
    },
  });
}

export function useMarkBatteryChargedMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (batteryId: string) =>
      markBatteryChargedOnServer(
        batteryId,
      ),
    onSuccess: async (_, batteryId) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey:
            technicianQueryKeys.batteries(),
        }),
        queryClient.invalidateQueries({
          queryKey: technicianQueryKeys.battery(
            batteryId,
          ),
        }),
      ]);
    },
  });
}
