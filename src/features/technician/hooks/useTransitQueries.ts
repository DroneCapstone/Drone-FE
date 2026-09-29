import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  confirmTransitArrivalOnServer,
  loadTransitMissionHistory,
  refreshTransitMissionsFromApi,
} from "../utils/transitMissionStorage";

import {
  technicianQueryKeys,
} from "./queryKeys";

import {
  getTechnicianMissionsApi,
} from "../api/transitApi";

export function useTransitMissionsQuery() {
  return useQuery({
    queryKey:
      technicianQueryKeys.transit(),
    queryFn:
      refreshTransitMissionsFromApi,
    refetchInterval: 15_000,
  });
}


export function useTechnicianMissionsQuery() {
  return useQuery({
    queryKey:
      technicianQueryKeys.missions(),
    queryFn: getTechnicianMissionsApi,
    staleTime: 30_000,
  });
}

export function useTransitHistoryQuery() {
  return useQuery({
    queryKey: [
      ...technicianQueryKeys.transit(),
      "history",
    ],
    queryFn: async () =>
      loadTransitMissionHistory(),
    initialData: () =>
      loadTransitMissionHistory(),
    staleTime: Infinity,
  });
}

export function useConfirmTransitArrivalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (missionId: string) =>
      confirmTransitArrivalOnServer(
        missionId,
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey:
            technicianQueryKeys.transit(),
        }),
        queryClient.invalidateQueries({
          queryKey:
            technicianQueryKeys.fleet(),
        }),
        queryClient.invalidateQueries({
          queryKey:
            technicianQueryKeys.batteries(),
        }),
        queryClient.invalidateQueries({
          queryKey:
            technicianQueryKeys.maintenanceAlerts(),
        }),
      ]);
    },
  });
}
