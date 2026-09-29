import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  dispatchOutboundDelivery,
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
    mutationFn: ({
      orderId,
      installedBatteryId,
    }: {
      orderId: string;
      installedBatteryId?: string;
    }) =>
      prepareOutboundBatteryOnServer(
        orderId,
        installedBatteryId,
      ),
    onSuccess: () =>
      invalidateOutboundRelated(
        queryClient,
      ),
  });
}

export function useDispatchOutboundMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const result =
        dispatchOutboundDelivery(orderId);

      if (!result) {
        throw new Error(
          "This mission is not ready to dispatch yet.",
        );
      }

      return result;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey:
          technicianQueryKeys.outbound(),
      });
    },
  });
}
