import type { OperatorBattery, OperatorDrone, RouteOption } from '../types/operator';

export type BatteryCompatibility = 'compatible' | 'incompatible' | 'unknown';

export function isActiveBattery(battery: OperatorBattery) {
  const status = battery.status.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return status === 'ACTIVE' || status === 'AVAILABLE' || status === 'READY';
}

export function getBatteryCompatibility(
  battery: OperatorBattery,
  drone: OperatorDrone,
): BatteryCompatibility {
  if (battery.model && drone.batteryModel) {
    return battery.model.trim().toLowerCase() === drone.batteryModel.trim().toLowerCase()
      ? 'compatible'
      : 'incompatible';
  }

  // Current Operator Battery API only exposes drone_id as a compatibility relation.
  if (battery.droneId) {
    return battery.droneId === drone.id ? 'compatible' : 'incompatible';
  }

  return 'unknown';
}

export function getCompatibleBatteriesAtHub(
  batteries: OperatorBattery[],
  drone: OperatorDrone,
  hubId: string,
) {
  return batteries
    .filter((battery) => battery.currentHubId === hubId)
    .filter(isActiveBattery)
    .filter((battery) => getBatteryCompatibility(battery, drone) === 'compatible')
    .sort((a, b) => b.chargeLevelPct - a.chargeLevelPct);
}

export function getUnknownCompatibilityBatteriesAtHub(
  batteries: OperatorBattery[],
  drone: OperatorDrone,
  hubId: string,
) {
  return batteries
    .filter((battery) => battery.currentHubId === hubId)
    .filter(isActiveBattery)
    .filter((battery) => getBatteryCompatibility(battery, drone) === 'unknown')
    .sort((a, b) => b.chargeLevelPct - a.chargeLevelPct);
}

export interface RelayBatteryReadiness {
  hubId: string;
  compatibleBatteries: OperatorBattery[];
  ready: boolean;
}

export function getRelayBatteryReadiness(
  route: RouteOption,
  batteries: OperatorBattery[],
  drone: OperatorDrone,
  originHubId: string,
  destinationHubId: string,
): RelayBatteryReadiness[] {
  const relayHubIds = (route.relayHubIds ?? []).filter(
    (hubId) => hubId !== originHubId && hubId !== destinationHubId,
  );

  return relayHubIds.map((hubId) => {
    const compatibleBatteries = getCompatibleBatteriesAtHub(batteries, drone, hubId);
    return {
      hubId,
      compatibleBatteries,
      ready: compatibleBatteries.length > 0,
    };
  });
}

export function isRelayBatteryPlanReady(readiness: RelayBatteryReadiness[]) {
  return readiness.every((item) => item.ready);
}
