import { useQuery } from '@tanstack/react-query';
import {
  getFleetDroneApi,
  listFleetBatteriesApi,
  listFleetDronesApi,
} from '../api/fleetApi';
import { operatorQueryKeys } from '../query/queryKeys';

export function useFleetDronesQuery() {
  return useQuery({
    queryKey: operatorQueryKeys.fleetDrones(),
    queryFn: listFleetDronesApi,
    staleTime: 10_000,
  });
}

export function useFleetDroneDetailQuery(droneId: string) {
  return useQuery({
    queryKey: operatorQueryKeys.fleetDroneDetail(droneId),
    queryFn: () => getFleetDroneApi(droneId),
    enabled: Boolean(droneId.trim()),
    staleTime: 10_000,
  });
}

export function useFleetBatteriesQuery() {
  return useQuery({
    queryKey: operatorQueryKeys.fleetBatteries(),
    queryFn: listFleetBatteriesApi,
    staleTime: 10_000,
  });
}
