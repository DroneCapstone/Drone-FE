import { isRecord, pickString, technicianApiRequest, unwrapList } from "./httpClient";
import { readHistoryProofFields, type HistoryProofFields } from "../utils/proofImages";

export type ConfirmationHistoryRow = HistoryProofFields & {
  id: string; missionId: string; orderId: string; origin: string; destination: string;
  departedAt: string; arrivedAt: string; pickupAt: string; receiverName: string;
  droneId: string; droneCode: string; batteryId: string; batteryCode: string; status: string;
};

export function mapConfirmationHistory(raw: unknown): ConfirmationHistoryRow | null {
  if (!isRecord(raw)) return null;
  const read = (...keys: string[]) => pickString(raw, keys, "");
  const missionId = read("mission_id");
  const orderId = read("order_id");
  if (!missionId || !orderId) return null;
  const pickupAt = read("customer_pickup_at");
  // The endpoint is server-scoped; do not infer pickup from mission completion alone.
  return {
    id: `${missionId}:${orderId}:${pickupAt}`, missionId, orderId,
    origin: read("origin_hub_name") || (read("origin_hub_id") ? `Hub #${read("origin_hub_id")}` : ""),
    destination: read("destination_hub_name") || (read("destination_hub_id") ? `Hub #${read("destination_hub_id")}` : ""),
    departedAt: read("drone_departed_at"), arrivedAt: read("drone_arrived_at"), pickupAt,
    receiverName: read("receiver_name"), droneId: read("drone_id"), droneCode: read("drone_code"),
    batteryId: read("battery_id"), batteryCode: read("battery_code"), status: read("status"),
    ...readHistoryProofFields(raw, true),
  };
}

export async function getConfirmationHistoryApi(): Promise<ConfirmationHistoryRow[]> {
  const payload = await technicianApiRequest("/technician/fleet/confirmation-history");
  const list = Array.isArray(payload) ? payload : isRecord(payload) && Array.isArray(payload.confirmation_history)
    ? payload.confirmation_history : unwrapList(payload);
  const rows = list.map(mapConfirmationHistory).filter((row): row is ConfirmationHistoryRow => row !== null);
  if (list.length && !rows.length) throw new Error("Confirmation history records are missing mission or order identifiers.");
  return rows.sort((a, b) => (Date.parse(b.pickupAt) || 0) - (Date.parse(a.pickupAt) || 0));
}
