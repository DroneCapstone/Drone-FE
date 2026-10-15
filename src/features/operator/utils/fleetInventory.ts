import type { OperatorBattery, OperatorDrone } from '../types/operator';

/**
 * A battery stored in a hub is located by currentHubId.
 * For batteries attached to a drone, the drone is the location source;
 * the battery API normally returns current_hub_id = null for these records.
 * A drone currently flying is NOT physically at a hub.
 * Unknown locations are never guessed.
 */
export function getBatteryHubId(
  battery: OperatorBattery,
  drones: OperatorDrone[],
): string | undefined {
  if (!battery.droneId) return battery.currentHubId || undefined;

  const attachedDrone = drones.find((drone) => drone.id === battery.droneId);
  if (!attachedDrone || attachedDrone.technicalStatus === 'In Flight') return undefined;
  return attachedDrone.hubId || undefined;
}

export function countBatteriesAtHub(
  batteries: OperatorBattery[],
  drones: OperatorDrone[],
  hubId: string,
): number {
  return batteries.filter((battery) => getBatteryHubId(battery, drones) === hubId).length;
}
