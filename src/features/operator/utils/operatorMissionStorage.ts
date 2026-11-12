import type { Mission, MissionLeg, MissionStatus, Tone } from '../types/operator';
import { calculatePackageReceiveDeadline } from './missionTiming';

const STORAGE_KEY = 'droneoptai.operator.missions.v6';

export function getMissionTone(status: MissionStatus): Tone {
  if (status === 'Completed') return 'success';
  if (status === 'Failed') return 'danger';
  if (status === 'Flying') return 'success';
  return 'info';
}

function buildMissionLegs(
  originHubId: string,
  destinationHubId: string,
  relayHubIds: string[],
  status: MissionStatus,
): MissionLeg[] {
  const path = [originHubId, ...relayHubIds, destinationHubId].filter(Boolean);
  return path.slice(0, -1).map((fromHubId, index) => ({
    id: `LEG-${index + 1}`,
    fromHubId,
    toHubId: path[index + 1],
    status:
      status === 'Completed'
        ? 'Completed'
        : status === 'Flying' && index === 0
          ? 'In Progress'
          : 'Pending',
  }));
}

function normalizeMission(item: Partial<Mission>): Mission | null {
  const legacy = item as Partial<Mission> & Record<string, unknown>;
  const rawStatus = String(item.status ?? 'Scheduled');
  let status: MissionStatus = 'Scheduled';
  let scheduleState: Mission['scheduleState'];

  // Migrate older cached Mission labels without changing the Backend's status values.
  if (['Flying', 'FLYING', 'In flight', 'In Flight', 'In Progress', 'IN_PROGRESS'].includes(rawStatus)) status = 'Flying';
  else if (rawStatus === 'Completed') status = 'Completed';
  else if (rawStatus === 'Failed') status = 'Failed';
  else if (rawStatus === 'Delayed') {
    status = 'Flying';
    scheduleState = 'Delayed';
  } else if (rawStatus === 'Review') status = 'Scheduled';
  else if (rawStatus !== 'Scheduled') return null; // Do not reinterpret unsupported cached statuses.

  const now = new Date().toISOString();
  const createdAt = String(item.createdAt ?? now);
  const legacyStart = String(item.plannedStartAt ?? legacy.scheduledDepartureAt ?? now);
  const predictedDurationMin = Number(item.predictedDurationMin ?? 30);
  const originHubId = String(item.originHubId ?? legacy.hubId ?? '');
  const destinationHubId = String(item.destinationHubId ?? '');
  const relayHubIds = Array.isArray(item.relayHubIds)
    ? item.relayHubIds.map(String)
    : [];
  const legs = Array.isArray(item.legs) && item.legs.length > 0
    ? item.legs as MissionLeg[]
    : buildMissionLegs(originHubId, destinationHubId, relayHubIds, status);

  return {
    id: String(item.id ?? `MSN-${Date.now()}`),
    orderId: String(item.orderId ?? 'UNLINKED'),
    type: 'Delivery',
    name: String(item.name ?? 'Delivery mission'),
    droneId: String(item.droneId ?? ''),
    drone: String(item.drone ?? 'Unassigned'),
    originHubId,
    destinationHubId,
    relayHubIds,
    legs,
    routeId: String(item.routeId ?? ''),
    route: String(item.route ?? 'Pending route'),
    status,
    tone: getMissionTone(status),
    eta: String(item.eta ?? 'Pending'),
    battery: Number(item.battery ?? 0),
    plannedStartAt: legacyStart,
    packageReceiveDeadlineAt: String(
      item.packageReceiveDeadlineAt ?? calculatePackageReceiveDeadline(createdAt).toISOString(),
    ),
    actualStartedAt: item.actualStartedAt,
    actualCompletedAt: item.actualCompletedAt,
    estimatedArrivalAt: String(item.estimatedArrivalAt ?? now),
    predictedDurationMin,
    estimatedEnergyWh: Number(item.estimatedEnergyWh ?? 0),
    batteryConsumptionPct: Number(item.batteryConsumptionPct ?? 0),
    confidencePct: item.confidencePct,
    risk: item.risk,
    scheduleState: item.scheduleState ?? scheduleState,
    assignmentHistory: Array.isArray(item.assignmentHistory) ? item.assignmentHistory : [],
    createdAt,
  };
}

function isActive(mission: Mission) {
  return mission.status === 'Scheduled' || mission.status === 'Flying';
}

// Mission transitions (including preflight failure/replanning) are BE-owned.
// The local demo cache must not silently cancel an overdue Scheduled Mission.

export function loadOperatorMissions(): Mission[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as Array<Partial<Mission>>;
    const normalized = Array.isArray(parsed)
      ? parsed.map(normalizeMission).filter((mission): mission is Mission => mission !== null)
      : [];
    return normalized;
  } catch {
    return [];
  }
}

export function saveOperatorMissions(items: Mission[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function prependMission(mission: Mission) {
  const current = loadOperatorMissions();
  saveOperatorMissions([mission, ...current.filter((item) => item.id !== mission.id)]);
}

export function updateMission(missionId: string, updates: Partial<Mission>) {
  const current = loadOperatorMissions();
  const next = current.map((mission) => {
    if (mission.id !== missionId) return mission;
    const nextStatus = updates.status ?? mission.status;
    return { ...mission, ...updates, tone: getMissionTone(nextStatus) };
  });
  saveOperatorMissions(next);
  return next.find((mission) => mission.id === missionId);
}

export function updateMissionStatus(missionId: string, status: MissionStatus) {
  return updateMission(missionId, { status });
}

export function hasActiveMissionForDrone(droneId: string, missions = loadOperatorMissions()) {
  return missions.some(
    (mission) => mission.droneId === droneId && isActive(mission),
  );
}

export function reassignMissionDrone(
  missionId: string,
  droneId: string,
  droneName: string,
  reason = 'Replacement required during mission',
) {
  const current = loadOperatorMissions();
  const mission = current.find((item) => item.id === missionId);
  if (!mission) return undefined;

  return updateMission(missionId, {
    assignmentHistory: [
      ...(mission.assignmentHistory ?? []),
      {
        droneId: mission.droneId,
        droneName: mission.drone,
        replacedAt: new Date().toISOString(),
        reason,
      },
    ],
    droneId,
    drone: droneName,
  });
}

export function getMissionForOrder(orderId: string) {
  return loadOperatorMissions().find(
    (mission) => mission.orderId === orderId && mission.status !== 'Failed',
  );
}

export function getMissionsForOrder(orderId: string) {
  return loadOperatorMissions().filter((mission) => mission.orderId === orderId);
}
