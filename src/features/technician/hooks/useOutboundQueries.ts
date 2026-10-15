import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  loadOutboundDeliveryHistory,
  prepareOutboundBatteryOnServer,
  receiveOutboundOrderOnServer,
  refreshOutboundDeliveriesFromApi,
} from "../utils/outboundDeliveryStorage";

import {
  technicianQueryKeys,
} from "./queryKeys";

export function useOutboundDeliveriesQuery() {
  return useQuery({
    queryKey:
      technicianQueryKeys.outbound(),
    queryFn:
      refreshOutboundDeliveriesFromApi,
  });
}

export function useOutboundHistoryQuery() {
  return useQuery({
    queryKey: [
      ...technicianQueryKeys.outbound(),
      "history",
    ],
    queryFn: async () =>
      loadOutboundDeliveryHistory(),
    initialData: () =>
      loadOutboundDeliveryHistory(),
    staleTime: Infinity,
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
    onSuccess: () =>
      invalidateOutboundRelated(
        queryClient,
      ),
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
