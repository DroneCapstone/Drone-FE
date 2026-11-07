import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPartsRequestApi,
  fulfillPartsRequestApi,
  getHubSupplyDetailApi,
  getHubSuppliesApi,
  getMyPartsRequestsApi,
  getPartsRequestDetailApi,
  useHubSupplyApi,
  type CreatePartsRequestInput,
} from "../api/hubSuppliesApi";
import { technicianQueryKeys } from "./queryKeys";

const inventoryKey = technicianQueryKeys.hubSupplies();
const requestKey = [...inventoryKey, "requests"] as const;
export const inventoryDetailKey = (id: number) => [...inventoryKey, "detail", id] as const;
const requestDetailKey = (id: number) => [...requestKey, "detail", id] as const;

export function useHubSuppliesQuery() {
  return useQuery({
    queryKey: inventoryKey,
    queryFn: getHubSuppliesApi,
    staleTime: 30_000,
    gcTime: 60 * 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}

/** Detail endpoint provides the part name, type, compatibility and unit cost. */
export function useHubSupplyDetailQuery(inventoryId?: number) {
  return useQuery({
    queryKey: inventoryDetailKey(inventoryId ?? 0),
    queryFn: () => getHubSupplyDetailApi(inventoryId as number),
    enabled: Boolean(inventoryId),
    staleTime: 5 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useMyPartsRequestsQuery() {
  return useQuery({
    queryKey: requestKey,
    queryFn: getMyPartsRequestsApi,
    staleTime: 30_000,
    gcTime: 60 * 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
  });
}

export function usePartsRequestDetailQuery(requestId?: number) {
  return useQuery({
    queryKey: requestDetailKey(requestId ?? 0),
    queryFn: () => getPartsRequestDetailApi(requestId as number),
    enabled: Boolean(requestId),
    staleTime: 15_000,
  });
}

export function useUseHubPartsMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ inventoryId, quantityUsed }: { inventoryId: number; quantityUsed: number }) =>
      useHubSupplyApi(inventoryId, quantityUsed),
    onSuccess: (_result, input) => {
      void client.invalidateQueries({ queryKey: inventoryKey });
      void client.invalidateQueries({ queryKey: inventoryDetailKey(input.inventoryId) });
    },
  });
}

export function useRequestPartsMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePartsRequestInput) => createPartsRequestApi(payload),
    onSuccess: () => { void client.invalidateQueries({ queryKey: requestKey }); },
  });
}

export function useFulfillPartsRequestMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (requestId: number) => fulfillPartsRequestApi(requestId),
    onSuccess: (_result, requestId) => {
      void client.invalidateQueries({ queryKey: inventoryKey });
      void client.invalidateQueries({ queryKey: requestKey });
      void client.invalidateQueries({ queryKey: requestDetailKey(requestId) });
      // Part names and categories may have been updated by Admin.
      void client.invalidateQueries({ queryKey: [...inventoryKey, "detail"] });
    },
  });
}
