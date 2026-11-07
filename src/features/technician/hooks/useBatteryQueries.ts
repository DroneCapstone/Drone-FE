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

import { technicianQueryKeys } from "./queryKeys";

export function useBatteriesQuery() {
  return useQuery({
    queryKey: technicianQueryKeys.batteries(),
    queryFn: refreshBatteriesFromApi,
    staleTime: 15_000,
    gcTime: 10 * 60_000,
    // Poll Backend ETA periodically; UI timer ticks locally every second.
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}

export function useBatteryDetailQuery(batteryId?: string) {
  return useQuery({
    queryKey: technicianQueryKeys.battery(batteryId ?? ""),
    queryFn: () => getBatteryDetailFromApi(batteryId ?? ""),
    enabled: Boolean(batteryId),
    staleTime: 15_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}

export function useBatteryHistoryQuery() {
  return useQuery({
    queryKey: [...technicianQueryKeys.batteries(), "history"],
    queryFn: async () => loadBatteryHistory(),
    initialData: () => loadBatteryHistory(),
    staleTime: Infinity,
  });
}

export function useBatteryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ batteryId, missionId }: { batteryId: string; missionId: string }) =>
      useBatteryOnServer(batteryId, missionId),
    onSuccess: (_, variables) => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.batteries() }),
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.battery(variables.batteryId) }),
      ]);
    },
  });
}

export function useFirstReadyBatteryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (missionId: string) => useFirstReadyBatteryForMissionOnServer(missionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: technicianQueryKeys.batteries() });
    },
  });
}

export function useMarkBatteryChargedMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batteryId: string) => markBatteryChargedOnServer(batteryId),
    onSuccess: async (_, batteryId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.batteries() }),
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.battery(batteryId) }),
      ]);
    },
  });
}
