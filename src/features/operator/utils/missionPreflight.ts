import type { Hub, Mission, OperatorDrone, Order } from '../types/operator';

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
  hubs: Hub[],
  otherMissions: Mission[] = [],
  now = new Date(),
) {
  const originHub = hubs.find((hub) => hub.id === mission.originHubId);
  const destinationHub = hubs.find((hub) => hub.id === mission.destinationHubId);
  const conflictingMission = otherMissions.some(
    (item) =>
      item.id !== mission.id &&
      item.droneId === mission.droneId &&
      (item.status === 'Scheduled' || item.status === 'In Progress'),
  );

  const checks: PreflightCheck[] = [
    {
      label: 'Package at origin hub',
      passed: Boolean(order?.originHubReceivedAt),
      detail: order?.originHubReceivedAt
        ? 'Package handoff at the origin hub is confirmed.'
        : 'Waiting for physical package handoff at the origin hub.',
    },
    {
      label: 'Drone technical status',
      passed: drone?.technicalStatus === 'Available',
      detail: drone
        ? `Technical status: ${drone.technicalStatus}.`
        : 'Assigned drone is not available in the fleet record.',
    },
    {
      label: 'Drone at origin hub',
      passed: Boolean(drone && drone.hubId === mission.originHubId),
      detail: drone?.hubId === mission.originHubId
        ? 'Assigned drone is positioned at the origin hub.'
        : 'Assigned drone is not positioned at the origin hub.',
    },
    {
      label: 'Battery reserve',
      passed: mission.battery >= MINIMUM_BATTERY_RESERVE_PCT,
      detail: `Predicted battery after mission: ${mission.battery}%.`,
    },
    {
      label: 'Route / weather risk',
      passed: mission.risk !== 'High',
      detail: `Current mission risk: ${mission.risk ?? 'Not rated'}.`,
    },
    {
      label: 'Hub availability',
      passed: originHub?.status === 'Active' && destinationHub?.status === 'Active',
      detail: originHub?.status === 'Active' && destinationHub?.status === 'Active'
        ? 'Origin and destination hubs are active.'
        : 'One or more hubs are unavailable.',
    },
    {
      label: 'No assignment conflict',
      passed: !conflictingMission,
      detail: conflictingMission
        ? 'Assigned drone is linked to another active mission.'
        : 'No conflicting active mission detected.',
    },
  ];

  const allPassed = checks.every((check) => check.passed);
  const plannedStartMs = new Date(mission.plannedStartAt).getTime();
  const windowOpensMs = plannedStartMs - PREFLIGHT_WINDOW_MINUTES * 60_000;
  const withinStartWindow = now.getTime() >= windowOpensMs;
  const minutesToStart = Math.ceil((plannedStartMs - now.getTime()) / 60_000);

  let state: MissionDepartureState = 'Scheduled';
  if (withinStartWindow) state = allPassed ? 'Ready for Departure' : 'Departure Hold';

  return {
    state,
    checks,
    allPassed,
    withinStartWindow,
    canStart: withinStartWindow && allPassed,
    minutesToStart,
  };
}
