import { defaultOrders } from '../data/orderMockData';
import type { Order, OrderStatus } from '../types/operator';

const STORAGE_KEY = 'droneoptai.operator.orders.v6';

export function loadOperatorOrders(): Order[] {
  if (typeof window === 'undefined') return defaultOrders;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultOrders;
    const parsed = JSON.parse(stored) as Order[];
    return Array.isArray(parsed) ? parsed : defaultOrders;
  } catch {
    return defaultOrders;
  }
}

export function saveOperatorOrders(orders: Order[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

export function getOperatorOrder(orderId: string) {
  return loadOperatorOrders().find((order) => order.id === orderId);
}

export function updateOperatorOrder(orderId: string, updates: Partial<Order>) {
  const orders = loadOperatorOrders();
  const next = orders.map((order) => (order.id === orderId ? { ...order, ...updates } : order));
  saveOperatorOrders(next);
  return next.find((order) => order.id === orderId);
}

export function updateOperatorOrderStatus(orderId: string, status: OrderStatus) {
  return updateOperatorOrder(orderId, { status });
}


export function markOrderNeedsReplanning(orderId: string, at = new Date()) {
  return updateOperatorOrder(orderId, {
    status: 'Pending',
    replanRequiredAt: at.toISOString(),
  });
}

export function clearOrderReplanning(orderId: string) {
  return updateOperatorOrder(orderId, { replanRequiredAt: undefined });
}

/** Technician confirms the physical package handoff at the Origin Hub. */
export function markOrderReceivedAtOriginHub(orderId: string, receivedAt = new Date()) {
  return updateOperatorOrder(orderId, {
    originHubReceivedAt: receivedAt.toISOString(),
  });
}

/**
 * Technician confirms the package at the Destination Hub.
 * For Operator this is the end of the delivery lifecycle.
 */
export function markOrderDeliveredToHub(orderId: string, receivedAt = new Date()) {
  return updateOperatorOrder(orderId, {
    destinationHubReceivedAt: receivedAt.toISOString(),
    status: 'Delivered to Hub',
  });
}
