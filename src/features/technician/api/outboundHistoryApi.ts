import { readHistoryProofFields, type HistoryProofFields } from "../utils/proofImages";
import { technicianApiRequest } from "../utils/technicianApi";
import type { OutboundDelivery, OutboundDeliveryHistory } from "../utils/outboundDeliveryStorage";

type ApiRecord = Record<string, unknown>;

/** Optional fields used only in the Outbound History dialog. */
export type OutboundHistoryViewRow = OutboundDeliveryHistory & HistoryProofFields & {
  customerDropoffAt?: string;
  receiverName?: string;
  batteryCode?: string;
};

function asRecord(value: unknown): ApiRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as ApiRecord : null;
}

function readText(record: ApiRecord | null, keys: string[]): string {
  if (!record) return "";
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function readNested(record: ApiRecord | null, keys: string[]): ApiRecord | null {
  if (!record) return null;
  for (const key of keys) {
    const value = asRecord(record[key]);
    if (value) return value;
  }
  return null;
}

function readList(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) return payload;
  const object = asRecord(payload);
  if (!object) return null;
  for (const key of ["outbound_history", "outbound_missions", "history", "missions", "flights", "items", "results", "records", "rows", "data"]) {
    if (!(key in object)) continue;
    if (Array.isArray(object[key])) return object[key] as unknown[];
    const nested = readList(object[key]);
    if (nested) return nested;
  }
  return null;
}

function readableEntity(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return readText(asRecord(value), ["name", "code", "label", "id"]);
}

function readableHub(record: ApiRecord, prefix: "origin" | "destination"): string {
  return (
    readText(record, [`${prefix}_hub_name`, `${prefix}_hub_code`]) ||
    (typeof record[`${prefix}_hub`] === "number"
      ? `Hub #${record[`${prefix}_hub`]}`
      : readableEntity(record[`${prefix}_hub`])) ||
    (readText(record, [`${prefix}_hub_id`])
      ? `Hub #${readText(record, [`${prefix}_hub_id`])}` : "")
  );
}

function firstLeg(record: ApiRecord | null): ApiRecord | null {
  if (!record) return null;
  for (const key of ["mission_legs", "flight_legs", "legs", "dispatched_legs"]) {
    const raw = record[key];
    if (!Array.isArray(raw)) continue;
    const legs = raw.map(asRecord).filter((row): row is ApiRecord => row !== null);
    return legs.find((leg) => readText(leg, ["sequence_no", "sequence", "leg_number"]) === "1") ?? null;
  }
  const leg = readNested(record, ["dispatched_leg", "flight_leg"]);
  return leg && (!readText(leg, ["sequence_no", "sequence", "leg_number"]) ||
    readText(leg, ["sequence_no", "sequence", "leg_number"]) === "1") ? leg : null;
}

function explicitDeparture(record: ApiRecord | null): string {
  if (!record) return "";
  return readText(record, ["drone_departed_at", "mission_departed_at", "departed_at", "dispatched_at", "departure_at", "initial_departure_at"])
    || readText(firstLeg(record), ["started_at", "departed_at", "dispatched_at"]);
}

function normalizedStatus(value: string, hasDeparture: boolean): string {
  if (!value) return hasDeparture ? "Departed" : "—";
  return value.trim().replace(/_/g, " ").replace(/\s+/g, " ").toLowerCase()
    .replace(/(^|\s)\S/g, (match) => match.toUpperCase());
}

function mapHistoryRecord(value: unknown): OutboundHistoryViewRow | null {
  const outer = asRecord(value);
  if (!outer) return null;
  // Some backends nest mission fields inside { mission: {...} }.
  const record = { ...outer, ...(readNested(outer, ["mission"]) ?? {}) };
  const first = firstLeg(record);
  const order = readNested(record, ["order"]);
  const drone = readNested(record, ["drone"]);
  const battery = readNested(record, ["battery"]);
  const missionId = readText(record, ["mission_id", "mission_code", "missionId", "id"]);
  if (!missionId) return null;
  // Only actual departure fields count; scheduled_at/created_at aren't departure times.
  const departedAt = explicitDeparture(record);
  const legId = readText(record, ["leg_id", "flight_leg_id"]) || readText(first, ["id", "leg_id"]);
  const status = readText(record, ["mission_state", "status", "mission_status", "flight_status", "state", "result"]);
  const origin = readableHub(record, "origin") ||
    (readText(first, ["from_hub_id"]) ? `Hub #${readText(first, ["from_hub_id"])}` : "");
  const destination = readableHub(record, "destination") ||
    (readText(first, ["to_hub_id"]) ? `Hub #${readText(first, ["to_hub_id"])}` : "");

  return {
    // Keep distinct flights/legs when the endpoint returns multiple per mission.
    id: `${missionId}:${legId || departedAt || "mission"}`,
    missionId,
    orderId: readText(record, ["order_id", "order_code"]) || readText(order, ["id", "code"]) || "—",
    customerName: "",
    packageName: "",
    weightKg: 0,
    hub: origin || "—",
    destination: destination || "—",
    droneId: readText(record, ["drone_id", "assigned_drone_id"]) || readText(drone, ["id"]) || "—",
    droneCode: readText(record, ["drone_code", "drone_name"]) || readText(drone, ["name"]) || "",
    batteryId: readText(record, ["battery_id", "installed_battery_id", "battery_code"]) || readText(battery, ["id", "serial_number"]) || "—",
    legId: legId || undefined,
    departedAt,
    result: normalizedStatus(status, Boolean(departedAt)),
    // Display-only fields supplied by GET /technician/fleet/outbound-history.
    ...readHistoryProofFields(record),
    customerDropoffAt: readText(record, ["customer_dropoff_at", "dropoff_at"]),
    receiverName: readText(record, ["receiver_name"]),
    batteryCode: readText(record, ["battery_code"]),
  };
}

/**
 * Prefer the new server history endpoint. The cache only supplements a recently
 * confirmed POST /dispatch while the read model is still catching up.
 */
export function mergeOutboundHistoryRows(
  cached: OutboundDeliveryHistory[],
  server: OutboundDeliveryHistory[],
): OutboundDeliveryHistory[] {
  const merged = new Map<string, OutboundDeliveryHistory>();
  for (const row of server) merged.set(row.id, row);
  for (const row of cached) {
    const existing = Array.from(merged.values()).filter((item) => item.missionId === row.missionId);
    if (existing.some((item) => item.departedAt && item.departedAt !== "—")) {
      // Server already confirms a departure for this mission: it wins.
      continue;
    }
    if (row.departedAt && row.result === "Departed" && existing.length) {
      // Dispatch success is newer than the server's still-Scheduled row.
      for (const item of existing) merged.delete(item.id);
    }
    if (!merged.has(row.id)) merged.set(row.id, row);
  }
  return Array.from(merged.values()).sort(
    (a, b) => (Date.parse(b.departedAt) || 0) - (Date.parse(a.departedAt) || 0),
  );
}

/** Map the actual successful POST /dispatch response; never invent departure time. */
export function historyFromConfirmedDispatch(
  delivery: OutboundDelivery,
  payload: unknown,
): OutboundDeliveryHistory | null {
  const result = asRecord(payload);
  const dispatchedLeg = readNested(result, ["dispatched_leg"]);
  if (!result || !dispatchedLeg) return null;
  const sequence = readText(dispatchedLeg, ["sequence_no", "sequence"]);
  const departedAt = readText(dispatchedLeg, ["started_at", "departed_at"]);
  // This popup is for the initial departure at the origin hub (leg 1).
  if (sequence !== "1" || !departedAt || !Number.isFinite(Date.parse(departedAt))) return null;
  const id = readText(result, ["mission_id"]) || delivery.backendMissionId;
  if (!id) return null;
  return {
    id,
    missionId: id,
    orderId: readText(result, ["order_id"]) || delivery.orderId,
    customerName: delivery.customerName,
    packageName: delivery.packageName,
    weightKg: delivery.weightKg,
    hub: delivery.hub,
    destination: delivery.destination || `Hub #${readText(dispatchedLeg, ["to_hub_id"])}`,
    droneId: delivery.assignedDroneId || "—",
    droneCode: delivery.assignedDroneCode || "",
    batteryId: delivery.installedBatteryId || "—",
    legId: readText(dispatchedLeg, ["id", "leg_id"]) || undefined,
    departedAt,
    result: "Departed",
  };
}

/**
 * GET /api/v1/technician/fleet/outbound-history
 * BE scopes the response to the logged-in Technician's hub. It includes
 * Scheduled, flying, arrived/completed, incident, cancelled and failed flights.
 * No more calls to the placeholder GET /technician/missions/ or audit trail.
 */
export async function getOutboundHistoryApi(): Promise<OutboundHistoryViewRow[]> {
  const payload = await technicianApiRequest("/technician/fleet/outbound-history");
  const list = readList(payload);
  if (!list) {
    throw new Error("Outbound history has an unexpected Backend response. Check GET /technician/fleet/outbound-history in Network → Response.");
  }
  const rows = list
    .map(mapHistoryRecord)
    .filter((item): item is OutboundHistoryViewRow => item !== null);
  if (list.length && !rows.length) {
    throw new Error("Outbound history records are missing mission identifiers. Check the response of GET /technician/fleet/outbound-history.");
  }
  return rows.sort((a, b) => (Date.parse(b.departedAt) || 0) - (Date.parse(a.departedAt) || 0));
}
