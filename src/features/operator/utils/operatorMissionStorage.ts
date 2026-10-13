import type { Mission, MissionLeg, MissionStatus, Tone } from '../types/operator';
import { calculatePackageReceiveDeadline } from './missionTiming';
import { loadOperatorOrders, markOrderNeedsReplanning } from './operatorOrderStorage';

const STORAGE_KEY = 'droneoptai.operator.missions.v6';

export function getMissionTone(status: MissionStatus): Tone {
  if (status === 'Completed') return 'success';
  if (status === 'Failed' || status === 'Cancelled') return 'danger';
  if (status === 'In Progress') return 'success';
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
        : status === 'In Progress' && index === 0
          ? 'In Progress'
          : 'Pending',
  }));
}

function normalizeMission(item: Partial<Mission>): Mission {
  const legacy = item as Partial<Mission> & Record<string, unknown>;
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
  return mission.status === 'Scheduled' || mission.status === 'In Progress';
}

function cancelExpiredPackageWaits(items: Mission[]) {
  const orders = loadOperatorOrders();
  const now = Date.now();
  let changed = false;

  const next = items.map((mission) => {
    if (mission.status !== 'Scheduled' || !mission.packageReceiveDeadlineAt) return mission;
    const order = orders.find((item) => item.id === mission.orderId);
    if (order?.originHubReceivedAt) return mission;
    if (now < new Date(mission.packageReceiveDeadlineAt).getTime()) return mission;

    changed = true;
    if (order) markOrderNeedsReplanning(order.id);
    return { ...mission, status: 'Cancelled' as const, tone: getMissionTone('Cancelled') };
  });

  if (changed && typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function loadOperatorMissions(): Mission[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as Array<Partial<Mission>>;
    const normalized = Array.isArray(parsed)
      ? parsed.map(normalizeMission)
      : [];
    return cancelExpiredPackageWaits(normalized);
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
    (mission) => mission.orderId === orderId && mission.status !== 'Cancelled' && mission.status !== 'Failed',
  );
}

export function getMissionsForOrder(orderId: string) {
  return loadOperatorMissions().filter((mission) => mission.orderId === orderId);
}
