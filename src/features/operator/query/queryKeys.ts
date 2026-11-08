import type { ListOperatorOrdersParams } from '../api/orderApi';

export const operatorQueryKeys = {
  all: ['operator'] as const,

  operatorDashboard: () => [...operatorQueryKeys.all, 'dashboard'] as const,

  operatorAiPredictions: () => [...operatorQueryKeys.all, 'ai-predictions'] as const,

  aiExplanation: (predictionId: string) => [...operatorQueryKeys.operatorAiPredictions(), 'explain', predictionId] as const,

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

  missionMiniHubs: () => [...operatorQueryKeys.missionHubs(), 'mini'] as const,

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

  eligibleMissionBatteries: (orderId: string, droneId: string, hubId?: string) =>
    [...operatorQueryKeys.missions(), 'eligible-batteries', orderId, droneId, hubId ?? null] as const,

  missionBundleCandidates: (orderId: string) =>
    [...operatorQueryKeys.missions(), 'bundle', 'candidates-pre-analyze', orderId] as const,

  missionBundleValidation: (orderIds: string[], droneId?: string) =>
    [...operatorQueryKeys.missions(), 'bundle', 'validate-pre-analyze', ...orderIds, droneId || null] as const,

  missionPlanning: (orderId: string, droneId: string, batteryId: string, bundledOrderIds: string[] = []) =>
    [...operatorQueryKeys.missions(), 'planning', orderId, droneId, batteryId, ...bundledOrderIds] as const,

  fleet: () => [...operatorQueryKeys.all, 'fleet'] as const,

  fleetDrones: () => [...operatorQueryKeys.fleet(), 'drones'] as const,

  fleetDroneDetail: (droneId: string) =>
    [...operatorQueryKeys.fleet(), 'drones', 'detail', droneId] as const,

  fleetBatteries: () => [...operatorQueryKeys.fleet(), 'batteries'] as const,
};
