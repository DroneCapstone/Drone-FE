import type { Order, RouteOption } from '../types/operator';

export const MISSION_PREPARATION_BUFFER_MINUTES = 5;
export const MISSION_PACKAGE_RECEIVE_WINDOW_MINUTES = 180;

export function calculateRouteTiming(order: Order, route: RouteOption, now = new Date()) {
  if (order.deliveryMode === 'Express') {
    const plannedStartAt = new Date(now.getTime() + MISSION_PREPARATION_BUFFER_MINUTES * 60_000);
    const estimatedArrivalAt = new Date(
      plannedStartAt.getTime() + route.predictedDurationMin * 60_000,
    );
    return {
      plannedStartAt,
      estimatedArrivalAt,
      preparationBufferMin: MISSION_PREPARATION_BUFFER_MINUTES,
    };
  }

  const targetArrivalAt = new Date(order.currentEstimatedWindow.start);
  const calculatedStartAt = new Date(
    targetArrivalAt.getTime() - (route.predictedDurationMin + MISSION_PREPARATION_BUFFER_MINUTES) * 60_000,
  );
  const earliestStartAt = new Date(now.getTime() + MISSION_PREPARATION_BUFFER_MINUTES * 60_000);
  const plannedStartAt = calculatedStartAt.getTime() > earliestStartAt.getTime()
    ? calculatedStartAt
    : earliestStartAt;
  const estimatedArrivalAt = calculatedStartAt.getTime() > earliestStartAt.getTime()
    ? targetArrivalAt
    : new Date(plannedStartAt.getTime() + route.predictedDurationMin * 60_000);

  return {
    plannedStartAt,
    estimatedArrivalAt,
    preparationBufferMin: MISSION_PREPARATION_BUFFER_MINUTES,
  };
}

export function calculatePackageReceiveDeadline(createdAt: string | Date = new Date()) {
  const created = new Date(createdAt);
  return new Date(
    created.getTime() + MISSION_PACKAGE_RECEIVE_WINDOW_MINUTES * 60_000,
  );
}

export function formatMissionTime(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
