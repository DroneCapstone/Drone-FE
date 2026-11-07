import type { OperatorBattery, OperatorDrone, RouteOption } from '../types/operator';

export type BatteryCompatibility = 'compatible' | 'incompatible' | 'unknown';

/** Pin sẵn sàng thay, theo availability do BE trả; Active đơn thuần là chưa đủ. */
export function isReadyBattery(battery: OperatorBattery) {
  const availability = (battery.availableStatus ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  // BE contract: Ready already means the pack is fully charged and usable.
  return availability === 'READY';
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

  // drone_id indicates an installed battery, not compatibility with this drone.
  // No model/compatibility mapping from BE means compatibility is unknown.
  return 'unknown';
}

/** Only physically spare batteries count: installed packs are NOT hub inventory. */
export function getSpareBatteriesAtHub(
  batteries: OperatorBattery[],
  hubId: string,
): OperatorBattery[] {
  return batteries.filter((battery) =>
    battery.currentHubId === hubId && !battery.droneId
  );
}

/** UI candidates only; backend must still validate reservation & swap eligibility. */
export function getCompatibleBatteriesAtHub(
  batteries: OperatorBattery[],
  drone: OperatorDrone,
  hubId: string,
) {
  return getSpareBatteriesAtHub(batteries, hubId)
    .filter(isReadyBattery)
    .filter((battery) => getBatteryCompatibility(battery, drone) === 'compatible')
    .sort((a, b) => b.chargeLevelPct - a.chargeLevelPct);
}

export function getUnknownCompatibilityBatteriesAtHub(
  batteries: OperatorBattery[],
  drone: OperatorDrone,
  hubId: string,
) {
  return getSpareBatteriesAtHub(batteries, hubId)
    .filter(isReadyBattery)
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
