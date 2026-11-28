import { getConfirmationHistoryApi } from "../api/confirmationHistoryApi";
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
    mutationFn: (input: string | { orderId: string; proofImageUrl: string }) =>
      typeof input === "string" ? confirmPickupOnServer(input) : confirmPickupOnServer(input.orderId, input.proofImageUrl),
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

/** Load Base64 history only when the history dialog is open. */
export function useConfirmationHistoryQuery(enabled = true) {
  return useQuery({
    queryKey: [...technicianQueryKeys.confirmations(), "history"],
    queryFn: getConfirmationHistoryApi,
    enabled,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
