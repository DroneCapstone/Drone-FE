import type { Mission, Order, PickupState, PlanningState } from '../types/operator';
import { PICKUP_POLICY } from './pickupPolicy';

export const MISSION_PLANNING_BUFFER_MINUTES = 60;
export const PLANNING_OVERDUE_AFTER_MINUTES = 30;


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

export function hasDeliveryMission(orderId: string, missions: Mission[]) {
  return missions.some((mission) => mission.orderId === orderId);
}

export function getDeliveryMission(orderId: string, missions: Mission[]) {
  return missions.find((mission) => mission.orderId === orderId);
}

export function getMissionsForOrder(orderId: string, missions: Mission[]) {
  return missions.filter((mission) => mission.orderId === orderId);
}

export function getPlanningState(
  order: Order,
  missions: Mission[],
  now = new Date(),
): PlanningState {
  const planningAt = new Date(order.planningAt).getTime();
  const nowMs = now.getTime();
  const overdueAt = planningAt + PLANNING_OVERDUE_AFTER_MINUTES * 60_000;

  if (nowMs >= planningAt && !order.originHubReceivedAt) return 'Awaiting Package';
  if (nowMs >= overdueAt) return 'Planning Overdue';
  if (nowMs >= planningAt) return 'Ready for Planning';

  const minutesUntilPlanning = (planningAt - nowMs) / 60_000;
  if (minutesUntilPlanning <= MISSION_PLANNING_BUFFER_MINUTES) return 'Upcoming';
  return 'Future';
}

export function getOrderPlanningBadge(order: Order, missions: Mission[], now = new Date()) {
  if (order.status !== 'Pending' || hasDeliveryMission(order.id, missions)) return undefined;
  return getPlanningState(order, missions, now);
}

export function isActionablePlanningState(state: PlanningState | undefined) {
  return state === 'Planning Overdue' || state === 'Ready for Planning';
}

export function getPlanningPriority(state: PlanningState | undefined) {
  if (!state) return 5;
  return {
    'Planning Overdue': 0,
    'Ready for Planning': 1,
    'Awaiting Package': 2,
    Upcoming: 3,
    Future: 4,
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

export function getPickupState(order: Order, now = new Date()): PickupState | undefined {
  if (order.status !== 'Ready for Pickup' || !order.pickupDeadline) return undefined;

  const nowMs = now.getTime();
  const deadlineMs = new Date(order.pickupDeadline).getTime();
  const expectedPickupMs = order.expectedPickupAt
    ? new Date(order.expectedPickupAt).getTime()
    : order.readyForPickupAt
      ? new Date(order.readyForPickupAt).getTime()
      : deadlineMs;

  if (nowMs >= deadlineMs) return 'Disposal Required';
  if (nowMs < expectedPickupMs) return 'Waiting';

  const minutesUntilDeadline = (deadlineMs - nowMs) / 60_000;
  if (minutesUntilDeadline <= PICKUP_POLICY.finalReminderBeforeMinutes) {
    return 'Final Reminder';
  }

  const contactedAfterExpected = (order.contactHistory ?? []).some(
    (entry) => new Date(entry.contactedAt).getTime() >= expectedPickupMs,
  );
  if (!contactedAfterExpected) return 'Contact Required';

  return 'Waiting';
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
