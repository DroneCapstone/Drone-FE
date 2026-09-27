import { defaultOrders } from '../data/orderMockData';
import type {
  CustomerContactChannel,
  CustomerContactResult,
  Order,
} from '../types/operator';
import { getPickupHoldMinutes } from './pickupPolicy';

const STORAGE_KEY = 'droneoptai.operator.orders.v5';

export function loadOperatorOrders(): Order[] {
  if (typeof window === 'undefined') return defaultOrders;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultOrders;
    const parsed = JSON.parse(stored) as Order[];
    if (!Array.isArray(parsed)) return defaultOrders;

    // Preserve the user's prototype state while making newly added seed Orders
    // available to browsers that already have an older v5 snapshot.
    const storedIds = new Set(parsed.map((order) => order.id));
    const newSeedOrders = defaultOrders.filter((order) => !storedIds.has(order.id));
    return [...parsed, ...newSeedOrders];
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

export function markOrderReceivedAtOriginHub(orderId: string, receivedAt = new Date()) {
  return updateOperatorOrder(orderId, {
    originHubReceivedAt: receivedAt.toISOString(),
  });
}

export function markOrderReadyForPickup(orderId: string) {
  const order = getOperatorOrder(orderId);
  if (!order) return undefined;

  const readyAt = new Date();
  const plannedPickup = new Date(order.currentEstimatedWindow.end);
  const expectedPickupAt = plannedPickup.getTime() > readyAt.getTime() ? plannedPickup : readyAt;
  const holdMinutes = getPickupHoldMinutes(order.packageType);
  const deadline = new Date(readyAt.getTime() + holdMinutes * 60_000);

  return updateOperatorOrder(orderId, {
    status: 'Ready for Pickup',
    readyForPickupAt: readyAt.toISOString(),
    expectedPickupAt: expectedPickupAt.toISOString(),
    pickupDeadline: deadline.toISOString(),
    pickupState: 'Waiting',
    contactHistory: order.contactHistory ?? [],
  });
}

export function addCustomerContact(
  orderId: string,
  channel: CustomerContactChannel,
  result: CustomerContactResult,
  note?: string,
) {
  const order = getOperatorOrder(orderId);
  if (!order) return undefined;

  const entry = {
    id: `CONTACT-${Date.now()}`,
    channel,
    result,
    note: note?.trim() || undefined,
    contactedAt: new Date().toISOString(),
  };

  return updateOperatorOrder(orderId, {
    contactHistory: [...(order.contactHistory ?? []), entry],
  });
}

export function completeOrderPickup(orderId: string) {
  return updateOperatorOrder(orderId, {
    status: 'Completed',
    packageDisposition: 'Delivered',
    pickupState: undefined,
  });
}

export function markOrderDisposed(orderId: string, confirmedBy = 'Hub staff') {
  return updateOperatorOrder(orderId, {
    status: 'Disposed',
    packageDisposition: 'Disposed',
    disposedAt: new Date().toISOString(),
    disposalConfirmedBy: confirmedBy,
    pickupState: undefined,
  });
}
