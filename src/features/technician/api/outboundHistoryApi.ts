import { technicianApiRequest } from "../utils/technicianApi";
import type { OutboundDelivery, OutboundDeliveryHistory } from "../utils/outboundDeliveryStorage";

/**
 * Outbound History has no dedicated GET endpoint in the supplied Swagger.
 * The authenticated Technician missions list supplies candidate missions;
 * the per-mission audit trail confirms the real departure time.
 *
 * Important: GET /technician/missions/ must be scoped to the authenticated
 * Technician's hub by Backend. Do not infer an origin hub from the drone's
 * CURRENT hub; the drone may already have moved away after dispatch.
 */
type ApiRecord = Record<string, unknown>;

function asRecord(value: unknown): ApiRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as ApiRecord)
    : null;
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

function readList(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return [];
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
    const nested = asRecord(value);
    if (nested) {
      const found = readList(nested, keys);
      if (found.length) return found;
    }
  }
  return [];
}

function readableEntity(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return readText(asRecord(value), ["name", "code", "label", "id"]);
}

function readableHub(record: ApiRecord, prefix: "origin" | "destination"): string {
  return (
    readableEntity(record[`${prefix}_hub`]) ||
    readText(record, [`${prefix}_hub_name`, `${prefix}_hub_code`]) ||
    (readText(record, [`${prefix}_hub_id`])
      ? `Hub #${readText(record, [`${prefix}_hub_id`])}`
      : "")
  );
}

function legRecords(record: ApiRecord | null): ApiRecord[] {
  if (!record) return [];
  const list = readList(record, ["mission_legs", "flight_legs", "legs", "dispatched_legs"]);
  return list.map(asRecord).filter((leg): leg is ApiRecord => leg !== null);
}

function firstLeg(record: ApiRecord | null): ApiRecord | null {
  if (!record) return null;
  const legs = legRecords(record);
  const first = legs.find((leg) =>
    Number(readText(leg, ["sequence_no", "sequence", "leg_number"])) === 1,
  );
  if (first) return first;
  const dispatchedLeg = readNested(record, ["dispatched_leg"]);
  if (dispatchedLeg &&
      Number(readText(dispatchedLeg, ["sequence_no", "sequence", "leg_number"])) === 1) {
    return dispatchedLeg;
  }
  return null;
}

/** Never use scheduled_at, created_at, or a later relay leg as a departure. */
function explicitDeparture(record: ApiRecord | null): string {
  if (!record) return "";
  return (
    readText(record, [
      "mission_departed_at", "departed_at", "dispatched_at",
      "departure_at", "initial_departure_at",
    ]) ||
    readText(firstLeg(record), ["started_at", "departed_at", "dispatched_at"])
  );
}

function isActualDispatchEvent(value: string): boolean {
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return [
    "DRONE_DISPATCHED", "MISSION_DISPATCHED", "MISSION_DEPARTED",
    "DRONE_DEPARTED", "DISPATCH", "DISPATCHED", "DEPARTED",
  ].includes(normalized);
}

function auditDeparture(payload: unknown): string {
  const audit = asRecord(payload);
  if (!audit) return "";

  const direct = explicitDeparture(audit) ||
    explicitDeparture(readNested(audit, ["mission", "data", "timeline", "timestamps"]));
  if (direct) return direct;

  const events = readList(audit, ["timeline", "events", "audit_trail", "history"])
    .map(asRecord)
    .filter((event): event is ApiRecord => event !== null);

  // Use the earliest origin departure, not a later relay dispatch.
  const departures = events.flatMap((event) => {
    const eventName = readText(event, ["event", "event_type", "action", "type"]);
    const at = readText(event, ["timestamp", "occurred_at", "created_at", "at"]);
    if (!at) return [];
    if (isActualDispatchEvent(eventName)) {
      const sequence = readText(event, ["sequence_no", "leg_sequence_no"]);
      return sequence && sequence !== "1" ? [] : [at];
    }
    const sequence = readText(event, ["sequence_no", "leg_sequence_no"]);
    const eventKey = eventName.trim().toUpperCase().replace(/[\s-]+/g, "_");
    return sequence === "1" && ["LEG_STARTED", "LEG_1_STARTED", "FLIGHT_LEG_STARTED"].includes(eventKey)
      ? [at]
      : [];
  });

  return departures.sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? "";
}

function missionRecord(value: unknown): ApiRecord | null {
  const outer = asRecord(value);
  if (!outer) return null;
  const mission = readNested(outer, ["mission"]);
  return mission ? { ...outer, ...mission } : outer;
}

function missionId(record: ApiRecord): string {
  // Use the actual Backend ID (MSN-...), never synthesize it from an array index.
  return readText(record, ["mission_id", "mission_code", "id"]);
}

/**
 * Backend can lag after POST Dispatch: the missions list may still say
 * Scheduled/Ready. Do not exclude those rows before checking audit-trail.
 * A departure is shown only if BE supplies a real departure timestamp.
 */
export function mergeOutboundHistoryRows(
  cached: OutboundDeliveryHistory[],
  server: OutboundDeliveryHistory[],
): OutboundDeliveryHistory[] {
  const byMission = new Map<string, OutboundDeliveryHistory>();
  for (const row of server) byMission.set(row.missionId, row);
  // The successful Dispatch response can be newer than the eventually-consistent
  // missions index. Preserve that BE-confirmed receipt in the query cache.
  for (const row of cached) byMission.set(row.missionId, row);
  return Array.from(byMission.values()).sort(
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

function makeHistoryRow(
  record: ApiRecord,
  auditPayload: unknown,
  departedAt: string,
): OutboundDeliveryHistory {
  const audit = asRecord(auditPayload);
  const missionAudit = readNested(audit, ["mission", "data"]);
  const first = firstLeg(record) || firstLeg(audit) || firstLeg(missionAudit);
  const id = missionId(record);
  const originHub = readableHub(record, "origin") ||
    (first ? `Hub #${readText(first, ["from_hub_id"])}` : "") ||
    readableHub(audit ?? {}, "origin");
  const destHub = readableHub(record, "destination") || readableHub(audit ?? {}, "destination");
  const order = readNested(record, ["order"]);
  const drone = readNested(record, ["drone"]);
  const battery = readNested(record, ["battery"]);

  return {
    id,
    missionId: id,
    orderId: readText(record, ["order_id", "order_code"]) ||
      readText(audit, ["order_id", "order_code"]) || readText(order, ["id", "code"]) || "—",
    customerName: "",
    packageName: "",
    weightKg: 0,
    hub: originHub || "—",
    destination: destHub || (first ? `Hub #${readText(first, ["to_hub_id"])}` : "") || "—",
    droneId: readText(record, ["drone_id", "assigned_drone_id"]) ||
      readText(audit, ["drone_id"]) || readText(drone, ["id"]) || "—",
    droneCode: readText(record, ["drone_code", "drone_name"]) || readText(drone, ["name"]) || "",
    batteryId: readText(record, ["battery_id", "battery_code", "installed_battery_id"]) ||
      readText(audit, ["battery_id", "battery_code"]) || readText(battery, ["id", "serial_number"]) || "—",
    legId: readText(first, ["id", "leg_id"]) || undefined,
    departedAt,
    result: "Departed",
  };
}

export async function getOutboundHistoryApi(): Promise<OutboundDeliveryHistory[]> {
  // The Technician-specific missions endpoint is advertised in Swagger.
  // The outgoing-deliveries GET intentionally excludes already-dispatched jobs.
  const payload = await technicianApiRequest("/technician/missions/");
  const envelopeKeys = ["missions", "items", "results", "data", "records"];
  const envelope = asRecord(payload);
  if (!Array.isArray(payload) && (!envelope || !envelopeKeys.some((key) => key in envelope))) {
    throw new Error("Technician mission list has an unexpected response format. Check GET /technician/missions/ in Network → Response.");
  }
  const missions = readList(payload, envelopeKeys)
    .map(missionRecord)
    .filter((item): item is ApiRecord => item !== null);

  const unique = new Map<string, ApiRecord>();
  missions.forEach((mission) => {
    const id = missionId(mission);
    if (id && !unique.has(id)) unique.set(id, mission);
  });

  const rows: OutboundDeliveryHistory[] = [];
  let auditFailures = 0;
  // Never skip Scheduled/Ready before audit: the list may be stale even after
  // POST /dispatch has created an IN_PROGRESS leg. Check server events instead.
  const candidates = Array.from(unique.values());
  const BATCH_SIZE = 4;

  for (let index = 0; index < candidates.length; index += BATCH_SIZE) {
    const batch = candidates.slice(index, index + BATCH_SIZE);
    const found = await Promise.all(batch.map(async (mission) => {
      const id = missionId(mission);
      const direct = explicitDeparture(mission);
      if (direct) return makeHistoryRow(mission, null, direct);

      try {
        const audit = await technicianApiRequest(
          `/technician/missions/${encodeURIComponent(id)}/audit-trail`,
        );
        const departure = auditDeparture(audit);
        return departure ? makeHistoryRow(mission, audit, departure) : null;
      } catch (error) {
        auditFailures += 1;
        console.warn(`Cannot read departure audit trail for mission ${id}`, error);
        return null;
      }
    }));
    for (const row of found) if (row) rows.push(row);
  }

  if (auditFailures && !rows.length) {
    throw new Error("Unable to verify outbound departures from the Technician mission audit API. Check GET /technician/missions/{mission_id}/audit-trail permissions and response.");
  }

  return rows.sort((a, b) => (Date.parse(b.departedAt) || 0) - (Date.parse(a.departedAt) || 0));
}
