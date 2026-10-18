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
  return batteries.filter((battery) => {
    // A drone in flight is not physically at any hub, even when a battery
    // record still references the drone's previous hub.
    const mountedDrone = battery.droneId
      ? drones.find((drone) => drone.id === battery.droneId)
      : undefined;
    if (mountedDrone?.technicalStatus === 'In Flight') return false;

    // Prefer the drone's actual hub when known; otherwise use the explicit
    // current_hub_id supplied by the battery API.  This keeps Hub totals
    // usable even if the Fleet request is still loading or has failed.
    const actualHubId = mountedDrone?.hubId || battery.currentHubId || undefined;
    return actualHubId === hubId;
  }).length;
}
