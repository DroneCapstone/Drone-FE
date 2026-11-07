import type { DroneEligibilityResult, Mission, OperatorDrone, RouteOption } from '../types/operator';

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
  if (missions.some((mission) => (
    mission.droneId === drone.id &&
    (mission.status === 'Scheduled' || mission.status === 'In Progress' || mission.status === 'Incident return')
  ))) reasons.push('Already assigned to an active mission');
  if (drone.maxPayloadKg < payloadKg) reasons.push(`Payload exceeds ${drone.maxPayloadKg} kg capacity`);

  return { eligible: reasons.length === 0, reasons };
}

/**
 * Available drones start with their correctly installed, full battery set (BE invariant).
 * For a relay route, never apply 100% - total route usage: batteries are swapped
 * between flight legs. Require explicit BE verification for every leg and relay set.
 */
export function getRemainingBattery(
  route: RouteOption,
  startingBatteryPct = AVAILABLE_DRONE_START_BATTERY_PCT,
) {
  if (route.relayHubIds?.length || route.legDetails?.some((leg) =>
    leg.is_dispatch || leg.leg_type?.toUpperCase() === 'DISPATCH')) {
    const finalLeg = route.legs?.[route.legs.length - 1];
    return finalLeg?.endingSocPct ?? Number.NaN;
  }
  return Math.max(0, startingBatteryPct - route.batteryConsumptionPct);
}

export function getEnergyFeasibility(
  route: RouteOption,
  minimumReservePct = DEFAULT_BATTERY_RESERVE_PCT,
  startingBatteryPct = AVAILABLE_DRONE_START_BATTERY_PCT,
) {
  const remainingBattery = getRemainingBattery(route, startingBatteryPct);

  // Cross-hub flights have distinct DISPATCH (0kg) and DELIVERY legs.
  // BE validates each leg; do not subtract aggregate consumption from one battery.
  const hasMultipleBatteryLegs = route.relayHubIds?.length || route.legDetails?.some((leg) =>
    leg.is_dispatch || leg.leg_type?.toUpperCase() === 'DISPATCH');
  if (!hasMultipleBatteryLegs) {
    const metricsValid = Number.isFinite(route.predictedEnergyWh) && route.predictedEnergyWh > 0 &&
      Number.isFinite(route.batteryConsumptionPct) && route.batteryConsumptionPct >= 0 &&
      route.batteryConsumptionPct <= 100;
    return {
      remainingBattery,
      feasible: metricsValid && route.feasible === true && remainingBattery >= minimumReservePct,
    };
  }

  // The updated Analyze contract exposes BE-computed `feasible`; its detailed
  // per-leg energy and battery status shapes are optional/undocumented.
  // Never invent a local positive validation from aggregate route %.
  // BE MUST guarantee that feasible=true incorporates all legs + relay inventory,
  // and recheck the availability atomically on POST /operator/missions.
  return {
    remainingBattery,
    feasible: route.feasible === true,
  };
}
