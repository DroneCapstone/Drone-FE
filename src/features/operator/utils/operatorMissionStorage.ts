import { missions as defaultMissions } from '../data/mockOperatorData';
import type { Mission, MissionStatus, Tone } from '../types/operator';

const STORAGE_KEY = 'droneoptai.operator.missions.v5';

export function getMissionTone(status: MissionStatus): Tone {
  if (status === 'Completed') return 'success';
  if (status === 'Failed' || status === 'Cancelled') return 'danger';
  if (status === 'In Progress') return 'success';
  return 'info';
}

function normalizeMission(item: Partial<Mission> & Record<string, unknown>): Mission {
  const rawStatus = String(item.status ?? 'Scheduled');
  let status: MissionStatus = 'Scheduled';
  let scheduleState: Mission['scheduleState'];

  if (rawStatus === 'In flight' || rawStatus === 'In Flight' || rawStatus === 'In Progress') status = 'In Progress';
  else if (rawStatus === 'Completed') status = 'Completed';
  else if (rawStatus === 'Cancelled') status = 'Cancelled';
  else if (rawStatus === 'Failed') status = 'Failed';
  else if (rawStatus === 'Delayed') {
    status = 'In Progress';
    scheduleState = 'Delayed';
  } else if (rawStatus === 'Review') status = 'Scheduled';

  const now = new Date().toISOString();
  const legacyStart = String(item.plannedStartAt ?? item.scheduledDepartureAt ?? now);
  const predictedDurationMin = Number(item.predictedDurationMin ?? 30);

  return {
    id: String(item.id ?? `MSN-${Date.now()}`),
    orderId: String(item.orderId ?? 'UNLINKED'),
    type: 'Delivery',
    name: String(item.name ?? 'Delivery mission'),
    droneId: String(item.droneId ?? ''),
    drone: String(item.drone ?? 'Unassigned'),
    originHubId: String(item.originHubId ?? item.hubId ?? ''),
    destinationHubId: String(item.destinationHubId ?? ''),
    routeId: String(item.routeId ?? ''),
    route: String(item.route ?? 'Pending route'),
    status,
    tone: getMissionTone(status),
    eta: String(item.eta ?? 'Pending'),
    battery: Number(item.battery ?? 0),
    plannedStartAt: legacyStart,
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
    createdAt: String(item.createdAt ?? now),
  };
}

function isActive(mission: Mission) {
  return mission.status === 'Scheduled' || mission.status === 'In Progress';
}

export function loadOperatorMissions(): Mission[] {
  if (typeof window === 'undefined') return defaultMissions;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed: Array<Partial<Mission> & Record<string, unknown>> = stored
      ? JSON.parse(stored) as Array<Partial<Mission> & Record<string, unknown>>
      : defaultMissions as unknown as Array<Partial<Mission> & Record<string, unknown>>;
    return Array.isArray(parsed) ? parsed.map(normalizeMission) : defaultMissions;
  } catch {
    return defaultMissions;
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
  return loadOperatorMissions().find((mission) => mission.orderId === orderId);
}

export function getMissionsForOrder(orderId: string) {
  return loadOperatorMissions().filter((mission) => mission.orderId === orderId);
}
