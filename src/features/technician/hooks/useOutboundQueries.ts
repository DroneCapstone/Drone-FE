import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  prepareOutboundBatteryOnServer,
  receiveOutboundOrderOnServer,
  refreshOutboundDeliveriesFromApi,
} from "../utils/outboundDeliveryStorage";

import {
  technicianQueryKeys,
} from "./queryKeys";
import { dispatchInitialOutboundMissionApi, markOutboundMissionReadyApi } from "../api/outboundDispatchApi";
import { getOutboundHistoryApi, mergeOutboundHistoryRows } from "../api/outboundHistoryApi";
import type { OutboundDeliveryHistory } from "../utils/outboundDeliveryStorage";
import { invalidateAfterTechnicianDispatch } from "./invalidateAfterDispatch";

export function useOutboundDeliveriesQuery() {
  return useQuery({
    queryKey:
      technicianQueryKeys.outbound(),
    queryFn:
      refreshOutboundDeliveriesFromApi,
    // Reuse cached data when returning to the page. Only the Outbound GET is
    // required for the list; unrelated auth/mission requests no longer block it.
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}

/** Fetch history only when opened; keep React Query cache for quick reopen. */
export function useOutboundHistoryQuery(enabled = true) {
  const queryClient = useQueryClient();
  const historyKey = [...technicianQueryKeys.outbound(), "history"];
  return useQuery({
    queryKey: historyKey,
    queryFn: async () => {
      const rows = await getOutboundHistoryApi();
      // Keep the BE-confirmed Dispatch result visible while the missions list
      // and audit trail are still propagating on the server.
      const cached = queryClient.getQueryData<OutboundDeliveryHistory[]>(historyKey) ?? [];
      return mergeOutboundHistoryRows(cached, rows);
    },
    enabled,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

function invalidateOutboundRelated(
  queryClient: ReturnType<
    typeof useQueryClient
  >,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey:
        technicianQueryKeys.outbound(),
    }),
    queryClient.invalidateQueries({
      queryKey:
        technicianQueryKeys.batteries(),
    }),
    queryClient.invalidateQueries({
      queryKey:
        technicianQueryKeys.fleet(),
    }),
  ]);
}

export function useReceiveOutboundMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) =>
      receiveOutboundOrderOnServer(
        orderId,
      ),
    onSuccess: () => {
      // A successful POST is authoritative; refresh related screens in the
      // background rather than delaying success until slow GETs finish.
      void invalidateOutboundRelated(queryClient);
    },
  });
}

export function usePrepareOutboundBatteryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) =>
      prepareOutboundBatteryOnServer(orderId),
    onSuccess: () =>
      invalidateOutboundRelated(queryClient),
  });
}

/**
 * Confirms the Technician physically installed/checked the Operator-assigned
 * battery before the first departure. A successful response means READY was
 * persisted by BE; Scheduled mission status may remain unchanged.
 */
export function useOutboundReadyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (missionId: string) => markOutboundMissionReadyApi(missionId),
    onSuccess: () => {
      // A successful READY response is authoritative; do not wait for slow GET.
      void queryClient.invalidateQueries({ queryKey: technicianQueryKeys.outbound() });
    },
  });
}

/** First departure at Origin Hub. BE has confirmed this route supports it. */
export function useOutboundDispatchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (missionId: string) => dispatchInitialOutboundMissionApi(missionId),
    onSuccess: () => {
      // A new departure must invalidate cached history, without blocking dispatch.
      void queryClient.invalidateQueries({
        queryKey: [...technicianQueryKeys.outbound(), "history"],
      });
      return invalidateAfterTechnicianDispatch(queryClient);
    },
  });
}
