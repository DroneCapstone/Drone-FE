import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { confirmPickupOnServer, refreshDeliveryConfirmationsFromApi } from "../utils/deliveryConfirmationStorage";
import { technicianQueryKeys } from "./queryKeys";

export function useDeliveryConfirmationsQuery() {
  return useQuery({
    queryKey: technicianQueryKeys.confirmations(),
    queryFn: refreshDeliveryConfirmationsFromApi,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchInterval: 60_000, // Get the actual cancelled status from BE even when page stays open.
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}

export function useConfirmPickupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => confirmPickupOnServer(orderId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.confirmations() }),
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.outbound() }),
        // /history includes arrival_confirmed_at, now populated by customer pickup.
        queryClient.invalidateQueries({ queryKey: [...technicianQueryKeys.transit(), "history"] }),
      ]);
    },
  });
}
