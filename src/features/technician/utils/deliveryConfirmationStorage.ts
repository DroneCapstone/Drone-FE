import {
  confirmDeliveryPickupApi,
  getDeliveryConfirmationsApi,
} from "../api/deliveryApi";
import {
  formatApiDateTime,
  isRecord,
  pickString,
  unwrapList,
} from "../api/httpClient";

/** The pickup window begins when the parcel is available at destination hub. */
export const PICKUP_WINDOW_HOURS = 72;
const PICKUP_WINDOW_MS = PICKUP_WINDOW_HOURS * 60 * 60 * 1000;

export type DeliveryStatus = "Delivered" | "Completed" | "Cancelled";
export type OrderIdSource = "order_id" | "id" | "order_code" | "missing";

export type DeliveryConfirmation = {
  /** Used only as a React row key. */
  orderId: string;
  /** Valid order identity for POST confirm-pickup; NEVER the mission ID. */
  backendOrderId?: string;
  orderIdSource: OrderIdSource;
  orderCode: string;
  missionId: string;
  missionCode: string;
  droneId: string;
  droneCode: string;
  recipient: string;
  destination: string;
  missionStatus: string;
  status: DeliveryStatus;
  /** ISO time parcel became available for pickup (server data only). */
  deliveredAtIso: string;
  deliveredAt: string;
  pickupDeadlineAtIso: string;
  pickupDeadlineAt: string;
  receivedConfirmedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
};

function validIso(value: string): string {
  if (!value.trim()) return "";
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : "";
}

function formatTime(iso: string): string {
  return iso ? formatApiDateTime(iso, "—") : "—";
}

function normalizeStatus(value: unknown, pickupConfirmedAt: string): DeliveryStatus {
  if (!isRecord(value)) return "Delivered";
  const pickupStatus = pickString(value, ["pickup_status", "confirmation_status"], "");
  const orderStatus = pickString(value, ["order_status", "delivery_status", "package_status"], "");
  const normalize = (text: string) => text.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const statuses = [normalize(pickupStatus), normalize(orderStatus)];
  // Generic `status: Completed` is often MISSION status, not customer pickup.
  if (statuses.some((key) => ["CANCELLED", "CANCELED", "PICKUP_TIMEOUT", "EXPIRED"].includes(key)) ||
      pickString(value, ["cancelled_at", "canceled_at"], "")) return "Cancelled";
  if (
    pickupConfirmedAt ||
    statuses.some((key) => ["COMPLETED", "PICKED_UP", "PICKUP_CONFIRMED", "COLLECTED", "RECEIVED_BY_CUSTOMER"].includes(key))
  ) return "Completed";
  return "Delivered";
}

/** Exported for unit tests; every value is read from the response, not mock state. */
export function mapApiDeliveryConfirmation(value: unknown): DeliveryConfirmation | null {
  if (!isRecord(value)) return null;

  const rawId = pickString(value, ["id"], "").trim();
  const orderCode = pickString(value, ["order_code", "orderCode"], "").trim();
  const explicitId = pickString(value, ["order_id", "orderId"], "").trim();
  const legacyId = /^(ORD[-_][A-Z0-9_-]+|\d+)$/i.test(rawId) ? rawId : "";
  const orderCodeFallback = /^ORD[-_][A-Z0-9_-]+$/i.test(orderCode) ? orderCode : "";

  // The existing GET response sometimes has `id = MSN-...`, `order_code = ORD-...`.
  // When order_id is absent, try the exact ORD code, never a fabricated numeric suffix.
  // BE must support ORD codes at POST confirm-pickup; otherwise it should return order_id.
  const backendOrderId = explicitId || legacyId || orderCodeFallback || undefined;
  const orderIdSource: OrderIdSource = explicitId
    ? "order_id"
    : legacyId
      ? "id"
      : orderCodeFallback
        ? "order_code"
        : "missing";

  const rawMissionId = pickString(value, ["mission_id", "missionId", "mission_code", "missionCode"], "") ||
    (/^(MSN|MISSION)[-_]/i.test(rawId) ? rawId : "");
  const key = backendOrderId || orderCode || rawMissionId;
  if (!key) return null;

  const pickupConfirmedAt = validIso(pickString(value, [
    "pickup_confirmed_at", "received_confirmed_at", "confirmed_pickup_at",
    "recipient_confirmed_at", "collected_at",
  ], ""));
  const status = normalizeStatus(value, pickupConfirmedAt);

  const deliveredAtIso = validIso(pickString(value, [
    "pickup_available_at", "destination_received_at", "parcel_arrived_at",
    "delivered_at", "arrived_at", "arrival_at",
  ], ""));

  const fromBackend = validIso(pickString(value, [
    "pickup_deadline", "pickup_deadline_at", "pickup_expires_at", "pickup_expiry_at",
  ], ""));
  const pickupDeadlineAtIso = fromBackend || (deliveredAtIso
    ? new Date(Date.parse(deliveredAtIso) + PICKUP_WINDOW_MS).toISOString()
    : "");

  const cancelledAtIso = validIso(pickString(value, ["cancelled_at", "canceled_at"], ""));
  const recipient = pickString(value, ["recipient_name", "customer_name", "recipient"], "Customer");
  const destination = pickString(value, [
    "destination_hub", "destination_hub_name", "destination", "hub_name",
  ], "—");
  const droneId = pickString(value, ["drone_id", "droneId"], "");
  const droneCode = pickString(value, ["drone_code", "drone_name", "drone"], "") || droneId;

  return {
    orderId: key,
    backendOrderId,
    orderIdSource,
    orderCode: orderCode || backendOrderId || key,
    missionId: rawMissionId,
    missionCode: pickString(value, ["mission_code", "missionCode"], "") || rawMissionId,
    droneId,
    droneCode,
    recipient,
    destination,
    missionStatus: pickString(value, ["mission_status", "mission_state", "status"], ""),
    status,
    deliveredAtIso,
    deliveredAt: formatTime(deliveredAtIso),
    pickupDeadlineAtIso,
    pickupDeadlineAt: formatTime(pickupDeadlineAtIso),
    receivedConfirmedAt: pickupConfirmedAt ? formatTime(pickupConfirmedAt) : undefined,
    cancelledAt: cancelledAtIso ? formatTime(cancelledAtIso) : undefined,
    cancelReason: pickString(value, ["cancel_reason", "cancellation_reason", "reason"], "") || undefined,
  };
}

/** BE is authoritative for the list, cancellation, and pickup confirmation. */
export async function refreshDeliveryConfirmationsFromApi(): Promise<DeliveryConfirmation[]> {
  const payload = await getDeliveryConfirmationsApi();
  return unwrapList(payload)
    .map(mapApiDeliveryConfirmation)
    .filter((item): item is DeliveryConfirmation => item !== null);
}

export async function confirmPickupOnServer(orderId: string) {
  if (!orderId || /^(MSN|MISSION)[-_]/i.test(orderId)) {
    throw new Error("Cannot confirm pickup without a valid order ID (ORD-...).");
  }
  return confirmDeliveryPickupApi(orderId);
}
