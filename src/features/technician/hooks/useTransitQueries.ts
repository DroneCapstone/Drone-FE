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

const TRANSIT_POLL_INTERVAL_MS = 30_000;

export function useTransitMissionsQuery() {
  return useQuery({
    queryKey:
      technicianQueryKeys.transit(),
    queryFn:
      refreshTransitMissionsFromApi,
    // Transit data changes often enough to poll, but 30 seconds avoids
    // continuously hammering both /technician/missions/ and /fleet/incoming.
    staleTime: 15_000,
    refetchInterval:
      TRANSIT_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}


export function useTechnicianMissionsQuery() {
  return useQuery({
    queryKey:
      technicianQueryKeys.missions(),
    queryFn: getTechnicianMissionsApi,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
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
