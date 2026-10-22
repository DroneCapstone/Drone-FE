import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  confirmTransitArrivalOnServer,
  refreshTransitMissionHistoryFromApi,
  refreshTransitMissionsFromApi,
} from "../utils/transitMissionStorage";
import { dispatchRelayMissionApi, swapRelayBatteryApi } from "../api/transitApi";
import { invalidateAfterTechnicianDispatch } from "./invalidateAfterDispatch";

import {
  technicianQueryKeys,
} from "./queryKeys";


const TRANSIT_POLL_INTERVAL_MS = 7_000;

export function useTransitMissionsQuery() {
  return useQuery({
    queryKey:
      technicianQueryKeys.transit(),
    queryFn:
      refreshTransitMissionsFromApi,
    // Poll /technician/fleet/incoming once every 30s while the page is active.
    // A successful arrival confirmation invalidates the related caches.
    staleTime: 5_000,
    gcTime: 10 * 60_000,
    refetchInterval:
      TRANSIT_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}


export function useTransitHistoryQuery() {
  return useQuery({
    queryKey: [
      ...technicianQueryKeys.transit(),
      "history",
    ],
    queryFn: refreshTransitMissionHistoryFromApi,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useConfirmTransitArrivalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: confirmTransitArrivalOnServer,
    onSuccess: () => {
      void Promise.all([
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
        queryClient.invalidateQueries({ queryKey: [...technicianQueryKeys.transit(), "history"] }),
      ]);
    },
  });
}


export function useTransitBatterySwapMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { missionId: string; newBatteryId?: string }) =>
      swapRelayBatteryApi(args.missionId, args.newBatteryId
        ? { new_battery_id: args.newBatteryId }
        : {}),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: technicianQueryKeys.transit() }),
      queryClient.invalidateQueries({ queryKey: technicianQueryKeys.batteries() }),
    ]),
  });
}

export function useTransitDispatchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: dispatchRelayMissionApi,
    onSuccess: () => {
      // The new battery follows the drone; the removed battery stays at relay.
      // BE owns state transition and hub assignment. FE only refreshes.
      invalidateAfterTechnicianDispatch(queryClient);
    },
  });
}
