import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  confirmPickupOnServer,
  loadDeliveryConfirmations,
  refreshDeliveryConfirmationsFromApi,
} from "../utils/deliveryConfirmationStorage";

import {
  technicianQueryKeys,
} from "./queryKeys";

export function useDeliveryConfirmationsQuery() {
  return useQuery({
    queryKey:
      technicianQueryKeys.confirmations(),
    queryFn:
      refreshDeliveryConfirmationsFromApi,
    placeholderData: () =>
      loadDeliveryConfirmations(),
    refetchInterval: 30_000,
  });
}

export function useConfirmPickupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) =>
      confirmPickupOnServer(orderId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey:
          technicianQueryKeys.confirmations(),
      }),
  });
}
