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
    (mission) => mission.status === 'Scheduled' || mission.status === 'In Progress',
  );
}

/**
 * Returns the Mission that currently represents this Order in Operator UI.
 * Cancelled/Failed attempts do not block a new planning cycle.
 */
export function getDeliveryMission(orderId: string, missions: Mission[]) {
  const orderMissions = getMissionsForOrder(orderId, missions);
  return (
    orderMissions.find((mission) => mission.status === 'Scheduled' || mission.status === 'In Progress') ??
    orderMissions.find((mission) => mission.status === 'Completed')
  );
}

export function getPlanningState(
  order: Order,
  missions: Mission[],
  now = new Date(),
): PlanningState {
  // Mission records are stronger evidence that an Order is already planned.
  // BE's planningState can lag behind the Mission creation response.
  const orderMissions = getMissionsForOrder(order.id, missions);
  const activeMission = orderMissions.find(
    (mission) => mission.status === 'Scheduled' || mission.status === 'In Progress',
  );
  if (activeMission) return 'Planned';
  if (order.replanRequiredAt) return 'Needs Replanning';
  if (orderMissions.some((mission) => mission.status === 'Completed')) return 'Planned';
  if (order.planningState) return order.planningState;


  const planningAt = new Date(order.planningAt).getTime();
  return now.getTime() >= planningAt ? 'Ready for Planning' : 'Future';
}

export function getOrderPlanningBadge(order: Order, missions: Mission[], now = new Date()) {
  if (order.status !== 'Pending') return undefined;
  return getPlanningState(order, missions, now);
}

export function isActionablePlanningState(state: PlanningState | undefined) {
  return state === 'Ready for Planning';
}

/** Both Express and Scheduled Orders can be assigned only AFTER Technician receipt. */
export function canCreateMissionForOrder(order: Order, missions: Mission[] = []) {
  return order.status === 'Pending' &&
    getOrderPlanningBadge(order, missions) === 'Ready for Planning' &&
    (order.originPackageReceived === true || Boolean(order.originHubReceivedAt)) &&
    Boolean(order.originHubId && order.destinationHubId) &&
    !hasDeliveryMission(order.id, missions);
}

export function getPlanningPriority(state: PlanningState | undefined) {
  if (!state) return 5;
  return {
    'Ready for Planning': 0,
    'Needs Replanning': 1,
    Planned: 2,
    Future: 3,
  }[state];
}

/** A missing/invalid time must not move an Order ahead of an actionable Order. */
function sortTimestamp(value?: string) {
  const timestamp = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

/**
 * Operator priority:
 * 1. Orders eligible for Create Mission (Technician already received package).
 * 2. Existing planning-state priority for other Orders.
 * 3. Earlier estimated delivery deadline, then planning time.
 *
 * The page must filter received Orders before sorting and pagination.
 */
export function sortOrdersByPlanningPriority(orders: Order[], missions: Mission[]) {
  return [...orders].sort((a, b) => {
    const aCanCreate = canCreateMissionForOrder(a, missions);
    const bCanCreate = canCreateMissionForOrder(b, missions);
    if (aCanCreate !== bCanCreate) return aCanCreate ? -1 : 1;

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
  const start = new Date(order.currentEstimatedWindow.start);
  const end = new Date(order.currentEstimatedWindow.end);
  const sameDay = start.toDateString() === new Date().toDateString();
  const day = sameDay
    ? 'Today'
    : start.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const time = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return `${day} · ${time}`;
}
