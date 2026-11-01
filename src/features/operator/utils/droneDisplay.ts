import type { OperatorDrone } from '../types/operator';

export function getDroneDisplayCode(drone: Pick<OperatorDrone, 'id'>) {
  return drone.id;
}
