import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  loadBatteries,
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
    placeholderData: () => loadBatteries(),
    refetchInterval: 10_000,
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey:
          technicianQueryKeys.batteries(),
      });
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
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey:
          technicianQueryKeys.batteries(),
      }),
  });
}
