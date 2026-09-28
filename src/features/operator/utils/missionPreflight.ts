import type { Mission, OperatorDrone, Order } from '../types/operator';

export const PREFLIGHT_WINDOW_MINUTES = 15;
export const MINIMUM_BATTERY_RESERVE_PCT = 20;

export type MissionDepartureState = 'Scheduled' | 'Ready for Departure' | 'Departure Hold';

export interface PreflightCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export function getMissionPreflight(
  mission: Mission,
  order: Order | undefined,
  drone: OperatorDrone | undefined,
  otherMissions: Mission[] = [],
  now = new Date(),
) {
  const conflictingMission = otherMissions.some(
    (item) =>
      item.id !== mission.id &&
      item.droneId === mission.droneId &&
      (item.status === 'Scheduled' || item.status === 'In Progress'),
  );

  const droneReady = Boolean(
    drone &&
    drone.technicalStatus === 'Available' &&
    drone.hubId === mission.originHubId &&
    !conflictingMission,
  );

  const checks: PreflightCheck[] = [
    {
      label: 'Package at origin hub',
      passed: Boolean(order?.originHubReceivedAt),
      detail: order?.originHubReceivedAt
        ? `Received ${new Date(order.originHubReceivedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.`
        : 'Waiting for Technician to confirm package receipt.',
    },
    {
      label: 'Drone ready at origin hub',
      passed: droneReady,
      detail: droneReady
        ? 'Assigned drone is ready for departure.'
        : 'Assigned drone is not ready at the Origin Hub.',
    },
    {
      label: 'Route & weather',
      passed: mission.risk !== 'High',
      detail: mission.risk === 'High'
        ? 'Current route or weather conditions are not safe for departure.'
        : 'Current route remains safe for departure.',
    },
    {
      label: 'Energy sufficient',
      passed: mission.battery >= MINIMUM_BATTERY_RESERVE_PCT,
      detail: mission.battery >= MINIMUM_BATTERY_RESERVE_PCT
        ? `Predicted battery after the planned route: ${mission.battery}%.`
        : `Predicted battery after the planned route is below the ${MINIMUM_BATTERY_RESERVE_PCT}% reserve.`,
    },
  ];

  const allPassed = checks.every((check) => check.passed);
  const plannedStartMs = new Date(mission.plannedStartAt).getTime();
  const windowOpensMs = plannedStartMs - PREFLIGHT_WINDOW_MINUTES * 60_000;
  const withinStartWindow = now.getTime() >= windowOpensMs;
  const minutesToStart = Math.ceil((plannedStartMs - now.getTime()) / 60_000);
  const packageDeadlineExpired = Boolean(
    !order?.originHubReceivedAt &&
    mission.packageReceiveDeadlineAt &&
    now.getTime() >= new Date(mission.packageReceiveDeadlineAt).getTime(),
  );

  let state: MissionDepartureState = 'Scheduled';
  if (withinStartWindow) state = allPassed ? 'Ready for Departure' : 'Departure Hold';

  return {
    state,
    checks,
    allPassed,
    withinStartWindow,
    canStart: withinStartWindow && allPassed && !packageDeadlineExpired,
    minutesToStart,
    packageDeadlineExpired,
  };
}
