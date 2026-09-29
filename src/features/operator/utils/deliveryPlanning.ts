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
  // API-backed Orders already receive the authoritative Planning State from BE.
  if (order.planningState) return order.planningState;

  const orderMissions = getMissionsForOrder(order.id, missions);
  if (order.replanRequiredAt) return 'Needs Replanning';

  const activeMission = orderMissions.find(
    (mission) => mission.status === 'Scheduled' || mission.status === 'In Progress',
  );

  if (activeMission) return 'Planned';


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

export function getPlanningPriority(state: PlanningState | undefined) {
  if (!state) return 5;
  return {
    'Ready for Planning': 0,
    'Needs Replanning': 1,
    Planned: 2,
    Future: 3,
  }[state];
}

export function sortOrdersByPlanningPriority(orders: Order[], missions: Mission[]) {
  return [...orders].sort((a, b) => {
    const aState = getOrderPlanningBadge(a, missions);
    const bState = getOrderPlanningBadge(b, missions);
    const priority = getPlanningPriority(aState) - getPlanningPriority(bState);
    if (priority !== 0) return priority;
    return new Date(a.planningAt).getTime() - new Date(b.planningAt).getTime();
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
