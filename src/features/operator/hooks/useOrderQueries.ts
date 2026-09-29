import {
  keepPreviousData,
  useQuery,
} from '@tanstack/react-query';

import {
  listOperatorOrdersApi,
  type ListOperatorOrdersParams,
} from '../api/orderApi';
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
