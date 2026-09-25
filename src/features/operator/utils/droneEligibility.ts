import type { DroneEligibilityResult, Mission, OperatorDrone, RouteOption } from '../types/operator';
import { hasActiveMissionForDrone } from './operatorMissionStorage';

export const AVAILABLE_DRONE_START_BATTERY_PCT = 100;
export const DEFAULT_BATTERY_RESERVE_PCT = 20;

export function getBasicDroneEligibility(
  drone: OperatorDrone,
  hubId: string,
  payloadKg: number,
  missions: Mission[] = [],
): DroneEligibilityResult {
  const reasons: string[] = [];

  if (drone.hubId !== hubId) reasons.push('Drone is located at another hub');
  if (drone.technicalStatus !== 'Available') reasons.push(`Technical status: ${drone.technicalStatus}`);
  if (hasActiveMissionForDrone(drone.id, missions)) reasons.push('Already assigned to an active mission');
  if (drone.maxPayloadKg < payloadKg) reasons.push(`Payload exceeds ${drone.maxPayloadKg} kg capacity`);

  return { eligible: reasons.length === 0, reasons };
}

export function getRemainingBattery(route: RouteOption) {
  return Math.max(0, AVAILABLE_DRONE_START_BATTERY_PCT - route.batteryConsumptionPct);
}

export function getEnergyFeasibility(
  route: RouteOption,
  minimumReservePct = DEFAULT_BATTERY_RESERVE_PCT,
) {
  const remainingBattery = getRemainingBattery(route);
  return { remainingBattery, feasible: remainingBattery >= minimumReservePct };
}
