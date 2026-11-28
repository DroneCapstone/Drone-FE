import {
  keepPreviousData,
  useQuery,
} from '@tanstack/react-query';

import {
  getEligibleDronesApi,
  getOperatorOrderApi,
  listOperatorOrdersApi,
  type ListOperatorOrdersParams,
} from '../api/orderApi';
import { getPackageReceiptApi } from '../api/packageReceiptApi';
import { operatorQueryKeys } from '../query/queryKeys';

export function useOperatorOrdersQuery(
  params: ListOperatorOrdersParams = {},
) {
  return useQuery({
    queryKey: operatorQueryKeys.orderList(params),
    queryFn: () => listOperatorOrdersApi(params),
    placeholderData: keepPreviousData,
  });
}

export function useOperatorOrderQuery(orderId: string) {
  return useQuery({
    queryKey: operatorQueryKeys.orderDetail(orderId),
    queryFn: () => getOperatorOrderApi(orderId),
    enabled: Boolean(orderId.trim()),
  });
}

export function useOperatorEligibleDronesQuery(orderId: string) {
  return useQuery({
    queryKey: operatorQueryKeys.eligibleDrones(orderId),
    queryFn: () => getEligibleDronesApi(orderId),
    enabled: Boolean(orderId.trim()),
    retry: false, // Operator can retry explicitly on the Create Mission screen.
  });
}

export function usePackageReceiptQuery(orderId: string, originHubId: string, received: boolean) {
  return useQuery({
    queryKey: operatorQueryKeys.packageReceipt(orderId, originHubId),
    queryFn: ({ signal }) => getPackageReceiptApi(orderId, originHubId, signal),
    enabled: Boolean(orderId.trim()) && received,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
