import type { OperatorDrone } from '../types/operator';

export function getDroneDisplayCode(drone: Pick<OperatorDrone, 'name' | 'displayId'>) {
  return `${drone.name}-${drone.displayId}`;
}
