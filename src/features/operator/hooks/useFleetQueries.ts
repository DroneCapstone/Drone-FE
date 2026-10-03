import { useQuery } from '@tanstack/react-query';
import { listFleetDronesApi } from '../api/fleetApi';
import { operatorQueryKeys } from '../query/queryKeys';

export function useFleetDronesQuery() {
  return useQuery({
    queryKey: operatorQueryKeys.fleetDrones(),
    queryFn: listFleetDronesApi,
    staleTime: 10_000,
  });
}
