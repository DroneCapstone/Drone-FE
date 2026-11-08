import type { Mission, Order, PlanningState } from '../types/operator';

export const MISSION_PLANNING_BUFFER_MINUTES = 60;

export function calculatePlanningAt(
  deliveryMode: Order['deliveryMode'],
  estimatedDeliveryStart: string | Date,
  createdAt: string | Date = new Date(),
) {
  if (deliveryMode === 'Express') {
    return new Date(createdAt).toISOString();
  }

  const deliveryStart = new Date(estimatedDeliveryStart);
  return new Date(
    deliveryStart.getTime() - MISSION_PLANNING_BUFFER_MINUTES * 60_000,
  ).toISOString();
}

export function getMissionsForOrder(orderId: string, missions: Mission[]) {
  return missions
    .filter((mission) => mission.orderId === orderId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function hasDeliveryMission(orderId: string, missions: Mission[]) {
  return getMissionsForOrder(orderId, missions).some(
    (mission) => mission.status === 'Scheduled' || mission.status === 'In Progress' || mission.status === 'Incident return',
  );
}

/**
 * Returns the Mission that currently represents this Order in Operator UI.
 * Cancelled/Failed attempts do not block a new planning cycle.
 */
export function getDeliveryMission(orderId: string, missions: Mission[]) {
  const orderMissions = getMissionsForOrder(orderId, missions);
  return (
    orderMissions.find((mission) => mission.status === 'Scheduled' || mission.status === 'In Progress' || mission.status === 'Incident return') ??
    orderMissions.find((mission) => mission.status === 'Completed')
  );
}

export function getPlanningState(
  order: Order,
  missions: Mission[],
): PlanningState | undefined {
  // Mission evidence can correct stale list data between queries.
  if (getDeliveryMission(order.id, missions)) return 'Planned';
  // Otherwise BE's planningState is the source of truth.
  // Never turn missing/null into Ready for Planning.
  return order.planningState;
}

export function getOrderPlanningBadge(order: Order, missions: Mission[]) {
  if (order.status === 'Cancelled' || order.status === 'Delivered to Hub') return undefined;
  return getPlanningState(order, missions);
}

export function isActionablePlanningState(state: PlanningState | undefined) {
  return state === 'Ready for Planning' || state === 'Needs Replanning';
}

/**
 * BE can_create_mission is authoritative for Express, Scheduled, and Normal.
 * AT_HUB is expected after Technician receives the package; it is not Pending.
 * Never infer permission from planning_at or receipt timestamp.
 */
export function canCreateMissionForOrder(order: Order, missions: Mission[] = []) {
  return order.canCreateMission === true && !hasDeliveryMission(order.id, missions);
}

export function getPlanningPriority(state: PlanningState | undefined) {
  if (!state) return 5;
  return {
    'Ready for Planning': 0,
    'Needs Replanning': 1,
    Planned: 2,
    Future: 3,
    'Waiting for package': 4,
  }[state];
}

/** A missing/invalid time must not move an Order ahead of an actionable Order. */
function sortTimestamp(value?: string) {
  const timestamp = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

/**
 * Default Priority-first queue, without a user-facing Sort control.
 * Eligible Orders come first. Inside that queue use BE's priority level and
 * score, then slack and timestamps as stable ties. Do not recompute BE scoring.
 * All Orders remain visible; non-actionable Orders follow the planning states.
 */
export function sortOrdersByPlanningPriority(orders: Order[], missions: Mission[]) {
  return [...orders].sort((a, b) => {
    const aCanCreate = canCreateMissionForOrder(a, missions);
    const bCanCreate = canCreateMissionForOrder(b, missions);
    if (aCanCreate !== bCanCreate) return aCanCreate ? -1 : 1;

    if (aCanCreate && bCanCreate) {
      const levelRank: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const aRank = a.priorityLevel ? levelRank[a.priorityLevel] : 4;
      const bRank = b.priorityLevel ? levelRank[b.priorityLevel] : 4;
      if (aRank !== bRank) return aRank - bRank;

      // BE score is the official priority within each level. Slack resolves ties.
      const aScore = a.priorityScore ?? Number.NEGATIVE_INFINITY;
      const bScore = b.priorityScore ?? Number.NEGATIVE_INFINITY;
      if (aScore !== bScore) return aScore > bScore ? -1 : 1;
      const aSlack = a.slackMinutes ?? Number.POSITIVE_INFINITY;
      const bSlack = b.slackMinutes ?? Number.POSITIVE_INFINITY;
      if (aSlack !== bSlack) return aSlack < bSlack ? -1 : 1;
    }

    const aState = getOrderPlanningBadge(a, missions);
    const bState = getOrderPlanningBadge(b, missions);
    const priority = getPlanningPriority(aState) - getPlanningPriority(bState);
    if (priority !== 0) return priority;

    const aDeadline = sortTimestamp(a.currentEstimatedWindow?.end ?? a.requestedDeliveryAt);
    const bDeadline = sortTimestamp(b.currentEstimatedWindow?.end ?? b.requestedDeliveryAt);
    if (aDeadline !== bDeadline) return aDeadline < bDeadline ? -1 : 1;

    const aPlanning = sortTimestamp(a.planningAt);
    const bPlanning = sortTimestamp(b.planningAt);
    if (aPlanning !== bPlanning) return aPlanning < bPlanning ? -1 : 1;

    return a.id.localeCompare(b.id);
  });
}

export function formatDeliveryWindow(order: Order) {
  const { start: startRaw, end: endRaw } = order.currentEstimatedWindow;
  if (!startRaw || !endRaw) return '—';
  const start = new Date(startRaw);
  const end = new Date(endRaw);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return '—';

  const sameDay = start.toDateString() === new Date().toDateString();
  const day = sameDay
    ? 'Today'
    : start.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${formatTime(start)}–${formatTime(end)}`;
}
