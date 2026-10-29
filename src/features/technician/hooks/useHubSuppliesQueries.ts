import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adjustHubSupplyApi,
  createHubSupplyApi,
  deleteHubSupplyApi,
  getHubSuppliesApi,
  updateHubSupplyApi,
  type HubSupplyInput,
} from "../api/hubSuppliesApi";
import { technicianQueryKeys } from "./queryKeys";

export function useHubSuppliesQuery() {
  return useQuery({
    queryKey: technicianQueryKeys.hubSupplies(),
    queryFn: getHubSuppliesApi,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}

export function useCreateHubSupplyMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: HubSupplyInput) => createHubSupplyApi(payload),
    onSuccess: () => client.invalidateQueries({ queryKey: technicianQueryKeys.hubSupplies() }),
  });
}

export function useUpdateHubSupplyMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<HubSupplyInput> }) => updateHubSupplyApi(id, payload),
    onSuccess: () => client.invalidateQueries({ queryKey: technicianQueryKeys.hubSupplies() }),
  });
}

export function useAdjustHubSupplyMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, delta }: { id: number; delta: number }) => adjustHubSupplyApi(id, delta),
    onSuccess: () => client.invalidateQueries({ queryKey: technicianQueryKeys.hubSupplies() }),
  });
}

export function useDeleteHubSupplyMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteHubSupplyApi,
    onSuccess: () => client.invalidateQueries({ queryKey: technicianQueryKeys.hubSupplies() }),
  });
}
