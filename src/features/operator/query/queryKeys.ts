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

  missions: () => [...operatorQueryKeys.all, 'missions'] as const,

  missionList: () => [...operatorQueryKeys.missions(), 'list'] as const,

  missionDashboardKpi: () => [...operatorQueryKeys.missions(), 'dashboard', 'kpi'] as const,

  missionDashboardStatus: () => [...operatorQueryKeys.missions(), 'dashboard', 'status'] as const,

  missionActiveFlights: () => [...operatorQueryKeys.missions(), 'dashboard', 'active-flights'] as const,

  missionHubs: () => [...operatorQueryKeys.missions(), 'hubs'] as const,

  liveTracking: () => [...operatorQueryKeys.missions(), 'live-tracking'] as const,

  missionDetail: (missionId: string) =>
    [...operatorQueryKeys.missions(), 'detail', missionId] as const,

  missionTelemetry: (missionId: string) =>
    [...operatorQueryKeys.missionDetail(missionId), 'telemetry'] as const,

  missionHubCheckpoints: (missionId: string) =>
    [...operatorQueryKeys.missionDetail(missionId), 'hub-checkpoints'] as const,

  incidents: () => [...operatorQueryKeys.missions(), 'incidents'] as const,

  incidentDetail: (incidentId: string) =>
    [...operatorQueryKeys.incidents(), 'detail', incidentId] as const,

  missionPlanning: (orderId: string, droneId: string) =>
    [...operatorQueryKeys.missions(), 'planning', orderId, droneId] as const,

  fleet: () => [...operatorQueryKeys.all, 'fleet'] as const,

  fleetDrones: () => [...operatorQueryKeys.fleet(), 'drones'] as const,
};
