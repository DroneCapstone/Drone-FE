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
    (mission.status === 'Scheduled' || mission.status === 'In Progress')
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
  if (route.relayHubIds?.length) {
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

  if (!route.relayHubIds?.length) {
    const metricsValid = Number.isFinite(route.predictedEnergyWh) && route.predictedEnergyWh > 0 &&
      Number.isFinite(route.batteryConsumptionPct) && route.batteryConsumptionPct >= 0 &&
      route.batteryConsumptionPct <= 100;
    return {
      remainingBattery,
      feasible: metricsValid && route.feasible !== false && remainingBattery >= minimumReservePct,
    };
  }

  const relayIds = route.relayHubIds;
  const legs = route.legs ?? [];
  const relayPlan = route.relayBatteryPlan ?? [];
  const legsVerified = legs.length === relayIds.length + 1 && legs.every((leg, index) =>
    Boolean(leg.fromHubId && leg.toHubId) &&
    (index === 0 || legs[index - 1].toHubId === leg.fromHubId) &&
    (index >= relayIds.length || leg.toHubId === relayIds[index]) &&
    leg.feasible === true &&
    Number.isFinite(leg.predictedEnergyWh) && (leg.predictedEnergyWh ?? 0) > 0 &&
    Number.isFinite(leg.endingSocPct) &&
    (leg.endingSocPct ?? -1) >= (leg.minimumReservePct ?? minimumReservePct)
  );
  const relaysVerified = relayIds.every((hubId) => {
    const relay = relayPlan.find((item) => item.hubId === hubId);
    return Boolean(relay && relay.ready === true &&
      Number.isInteger(relay.requiredBatteryCount) && (relay.requiredBatteryCount ?? 0) > 0 &&
      Number.isInteger(relay.availableBatteryCount) &&
      (relay.availableBatteryCount ?? 0) >= (relay.requiredBatteryCount ?? 1));
  });

  return {
    remainingBattery,
    // Planning must supply a persisted/reservable plan, not just a visual forecast.
    feasible: route.feasible === true && Boolean(route.batteryPlanId) && legsVerified && relaysVerified,
  };
}
