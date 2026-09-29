import type { ListOperatorOrdersParams } from '../api/orderApi';

export const operatorQueryKeys = {
  all: ['operator'] as const,

  orders: () => [...operatorQueryKeys.all, 'orders'] as const,

  orderList: (params: ListOperatorOrdersParams = {}) =>
    [
      ...operatorQueryKeys.orders(),
      'list',
      {
        search: params.search?.trim() || null,
        status: params.status ?? null,
      },
    ] as const,

  orderDetail: (orderId: string) =>
    [...operatorQueryKeys.orders(), 'detail', orderId] as const,

  eligibleDrones: (orderId: string) =>
    [...operatorQueryKeys.orders(), 'detail', orderId, 'eligible-drones'] as const,
};
