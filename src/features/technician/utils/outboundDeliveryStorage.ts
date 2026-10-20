import {

  getOutboundDeliveriesApi,

} from "../api/outboundApi";

import {

  isRecord,

  pickNumber,

  pickString,

  technicianApiRequest,

  unwrapList,

} from "../api/httpClient";

import { markOrderReceivedAtOriginHub } from "../../operator/utils/operatorOrderStorage";

import {
  getMissionInfoForDelivery,
  resolveHubLabel,
  type DeliveryBackendContext,
} from "./deliveryBackendContext";

export type OutboundDeliveryStatus =

  | "Awaiting Drop-off"

  | "At Hub"

  | "Mission Assigned"

  | "Ready"

  | "Needs Review";

export type OutboundDelivery = {

  /**
   * Internal/backend order identifier. Keep this separate from orderCode so
   * action endpoints still receive the real database id.
   */
  orderId: string;

  /** Human-readable code returned by Backend, e.g. ORD-TECH-OUT-3. */
  orderCode?: string;

  customerName: string;

  packageName: string;

  weightKg: number;

  /** True only when Backend provided the payload's weight. */
  weightProvided?: boolean;

  packageType?: string;

  deliveryMode?: "EXPRESS" | "SCHEDULED" | string;

  /** Backend-provided drop-off deadline. Never infer a policy deadline on FE. */
  dropoffDeadline?: string;

  /** Backend-provided scheduled flight/delivery time (NOT the drop-off deadline). */
  scheduledAt?: string;

  createdAt?: string;
  paidAt?: string;
  receiverPhone?: string;

  /** Preserve independent Backend lifecycles for display/audit. */
  orderStatus?: string;
  handlingStatus?: string;
  missionStatus?: string;

  /** Backend has scheduled/assigned a mission before package receipt (contract violation). */
  prematureMissionAssignment?: boolean;

  batteryChargePct?: number;
  batteryStatus?: string;

  hub: string;

  destination: string;

  status: OutboundDeliveryStatus;

  missionId?: string;

  /** Exact Backend mission_id passed to battery-use API; never reconstructed from display labels. */
  backendMissionId?: string;

  missionCode?: string;

  legId?: string;

  assignedDroneId?: string;

  assignedDroneCode?: string;

  /** Explicit drone model supplied by Backend when available. */
  assignedDroneModel?: string;

  packageReceivedAt?: string;

  installedBatteryId?: string;

  /** Human-readable assigned battery serial; Operator assigns it before handoff. */
  assignedBatteryCode?: string;

  readyConfirmedAt?: string;

};

export type OutboundDeliveryHistory = {

  id: string;

  orderId: string;

  customerName: string;

  packageName: string;

  weightKg: number;

  hub: string;

  destination: string;

  missionId: string;

  legId?: string;

  droneId: string;

  droneCode: string;

  batteryId: string;

  departedAt: string;

  result: "Departed";

};

export type OperatorAssignmentPayload = {

  orderId: string;

  missionId: string;

  legId?: string;

  droneId: string;

  droneCode: string;

};

const TECHNICIAN_HUB = "—";

/*

 \* FLOW

 \* 1) Customer pays and chooses drop-off hub

 \*    -> order appears here as Awaiting Drop-off

 \*    -> Operator already knows about the paid order

 \*

 \* 2) Customer physically brings parcel to hub

 \*    -> Technician clicks Receive at hub

 \*    -> At Hub

 \*    -> Operator receives PACKAGE_AT_HUB

 \*

 \* 3) Operator assigns mission + drone

 \*    -> Mission Assigned appears automatically

 \*

 \* 4) Technician prepares a Ready battery

 \*    -> Ready

 \*

 \* 5) Departure for the initial outbound mission is controlled by the

 \*    existing Operator/Backend flow. No fake FE-only dispatch.

 */

let demoOutboundDeliveries: OutboundDelivery[] = [];

let demoOutboundHistory: OutboundDeliveryHistory[] = [];

function formatOutboundTime() {

  return new Intl.DateTimeFormat("en-GB", {

    day: "2-digit",

    month: "short",

    year: "numeric",

    hour: "2-digit",

    minute: "2-digit",

    hour12: false,

  })

    .format(new Date())

    .replace(",", " ·");

}

function notifyOutboundUpdate() {

  window.dispatchEvent(

    new Event("technician-outbound-deliveries-updated"),

  );

}

export function loadOutboundDeliveries(): OutboundDelivery[] {

  return demoOutboundDeliveries.map((item) => ({ ...item }));

}

export function loadOutboundDeliveryHistory(): OutboundDeliveryHistory[] {

  return demoOutboundHistory.map((item) => ({ ...item }));

}

export function confirmPackageAtHub(orderId: string) {

  const current = demoOutboundDeliveries.find(

    (item) => item.orderId === orderId,

  );

  if (!current || current.status !== "Awaiting Drop-off") {

    return undefined;

  }

  const now = formatOutboundTime();

  let updated: OutboundDelivery | undefined;

  demoOutboundDeliveries = demoOutboundDeliveries.map((item) => {

    if (item.orderId !== orderId) {

      return item;

    }

    updated = {

      ...item,

      status: "At Hub",

      packageReceivedAt: now,

    };

    return updated;

  });

  if (updated) {

    // Shared frontend prototype state: Technician receipt immediately becomes

    // the Operator Final Validation package-at-origin condition.

    markOrderReceivedAtOriginHub(updated.orderId);

    window.dispatchEvent(

      new CustomEvent("operator-order-updated", {

        detail: {

          eventType: "PACKAGE_AT_HUB",

          orderId: updated.orderId,

          hub: updated.hub,

          status: "AT_HUB",

          receivedAt: updated.packageReceivedAt,

        },

      }),

    );

    notifyOutboundUpdate();

  }

  return updated;

}

export function applyOperatorMissionAssignment({

  orderId,

  missionId,

  legId,

  droneId,

  droneCode,

}: OperatorAssignmentPayload) {

  let updated: OutboundDelivery | undefined;

  demoOutboundDeliveries = demoOutboundDeliveries.map((item) => {

    if (

      item.orderId !== orderId ||

      item.status !== "At Hub"

    ) {

      return item;

    }

    updated = {

      ...item,

      status: "Mission Assigned",

      missionId,

      legId,

      assignedDroneId: droneId,

      assignedDroneCode: droneCode,

    };

    return updated;

  });

  if (updated) {

    notifyOutboundUpdate();

  }

  return updated;

}

// Initial Outbound Dispatch is wired separately through a BE-confirmed
// endpoint template in api/outboundDispatchApi.ts. Never treat a Relay Hub
// continuation endpoint as an initial departure without BE confirmation.
// Backend owns the Flying transition and physical drone/battery hub removal.

// ---------------------------------------------------------------------------

// Backend API integration

// ---------------------------------------------------------------------------


function outboundDisplayId(prefix: string, value: string, width = 4) {

  if (!value) return "";

  if (value.toUpperCase().startsWith(`${prefix}-`)) return value.toUpperCase();

  const match = value.match(/(\d+)$/);

  return match ? `${prefix}-${match[1].padStart(width, "0")}` : `${prefix}-${value}`;

}

/**
 * Resolve the Technician handoff from all available Backend fields.
 * `status` is usually an order-lifecycle status, while `handling_status`
 * tracks handoff. The backend may return contradictory/stale values; proof
 * that the package has arrived must win over "PENDING" or "INCOMING".
 * Unknown/terminal statuses must not silently enable Receive at hub.
 */
function normalizeOutboundStatus(
  record: Record<string, unknown>,
  hasMission: boolean,
  hasDrone: boolean,
): OutboundDeliveryStatus {
  const normalize = (raw: string) =>
    raw.trim().toUpperCase().replace(/[\s-]+/g, "_");

  const handling = normalize(
    pickString(record, ["handling_status", "handlingStatus"], ""),
  );
  const packageStatus = normalize(
    pickString(record, ["package_status", "packageStatus"], ""),
  );
  const lifecycle = normalize(
    pickString(record, ["order_status", "orderStatus", "status"], ""),
  );
  const alternateLifecycle = normalize(
    pickString(record, ["status"], ""),
  );

  const statuses = [handling, packageStatus, lifecycle, alternateLifecycle].filter(Boolean);

  // A completed/cancelled/in-flight order cannot be received again.
  if (statuses.some((value) => [
    "CANCELLED", "CANCELED", "EXPIRED", "FAILED", "REJECTED",
    "COMPLETED", "DELIVERED", "DELIVERY_COMPLETE", "IN_PROGRESS",
    "IN_TRANSIT", "IN_DELIVERY", "ARRIVED_AT_HUB", "IN_FLIGHT", "DISPATCHED",
  ].includes(value))) {
    return "Needs Review";
  }

  if (statuses.includes("READY") || statuses.includes("READY_TO_DISPATCH")) {
    return "Ready";
  }

  if (statuses.includes("MISSION_ASSIGNED")) {
    return "Mission Assigned";
  }

  const originPackage =
    isRecord(record.originPackage)
      ? record.originPackage
      : isRecord(record.origin_package)
        ? record.origin_package
        : null;

  const receivedFlag =
    record.origin_package_received === true ||
    record.package_received === true ||
    record.is_received === true ||
    originPackage?.received === true;

  const receivedAt =
    pickString(record, [
      "package_received_at", "received_at", "origin_received_at",
    ], "") ||
    (originPackage
      ? pickString(originPackage, ["received_at", "receivedAt"], "")
      : "");

  const isAtHub =
    statuses.some((value) => [
      "AT_HUB", "RECEIVED", "RECEIVED_AT_HUB", "PACKAGE_AT_HUB",
    ].includes(value)) ||
    receivedFlag ||
    Boolean(receivedAt);

  if (isAtHub) {
    // The Operator may have already selected a battery for this mission.
    // Only a Backend-confirmed Ready mission may be presented as Ready:
    // presence of a 100% battery is not permission to depart.
    const missionState = normalize(
      pickString(record, ["mission_status", "mission_state", "missionStatus"], ""),
    );
    const hasAssignedBattery = Boolean(readableEntity(record, [
      "battery_id", "installed_battery_id", "battery", "battery_code",
    ]));
    if (hasMission && hasDrone && hasAssignedBattery &&
        ["READY", "READY_TO_DISPATCH", "READY_FOR_DEPARTURE"].includes(missionState)) {
      return "Ready";
    }
    return hasMission && hasDrone ? "Mission Assigned" : "At Hub";
  }

  const awaitingStates = [
    "INCOMING", "PENDING", "AWAITING_DROP_OFF", "AWAITING_DROPOFF",
    "WAITING_FOR_DROP_OFF", "NOT_RECEIVED",
    "SCHEDULED", "PAID", "CONFIRMED", "BOOKED",
  ];

  // If Backend explicitly supplies an unknown handling/package state, do not
  // override it with a generic lifecycle status like SCHEDULED or PAID.
  if (
    (handling && !awaitingStates.includes(handling)) ||
    (packageStatus && !awaitingStates.includes(packageStatus))
  ) {
    return "Needs Review";
  }

  return statuses.some((value) => awaitingStates.includes(value))
    ? "Awaiting Drop-off"
    : "Needs Review";
}

/** Support API fields that may be either a display string or an object. */
function readableEntity(
  record: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
    if (isRecord(value)) {
      const label = pickString(
        value,
        ["name", "label", "code", "battery_code", "serial_number", "model", "id"],
        "",
      );
      if (label.trim()) return label.trim();
    }
  }
  return "";
}

function optionalNumeric(
  record: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

function normalizeDeliveryMode(value: string): string | undefined {
  const mode = value.trim().toUpperCase().replace(/[ -]+/g, "_");
  return mode || undefined;
}

function mapApiOutbound(
  value: unknown,
  context?: DeliveryBackendContext,
): OutboundDelivery | null {

  if (!isRecord(value)) return null;

  // GET /technician/deliveries/outbound may have id = MSN-... (mission row id).
  // The receive URL MUST use the genuine order_id, never the mission row's id.
  const canonicalOrderId = pickString(value, ["order_id", "orderId"], "").trim();
  const recordId = pickString(value, ["id"], "").trim();
  const orderCodeField = pickString(value, ["order_code", "orderCode"], "").trim();
  const orderId = canonicalOrderId ||
    (recordId && !/^MSN[-_]|^MISSION[-_]/i.test(recordId) ? recordId : "") ||
    (/^ORD[-_]/i.test(orderCodeField) ? orderCodeField : "");

  if (!orderId) {
    // Never send an MSN-... id to a receive endpoint that expects an order id.
    console.warn("Outbound row has no usable order_id", value);
    return null;
  }

  const orderCode =
    pickString(
      value,
      ["order_code", "orderCode", "code"],
      "",
    ) || orderId;

  const missionInfo =
    getMissionInfoForDelivery(value, context);

  const rawMissionId =
    pickString(value, ["mission_id", "missionId", "mission_code", "missionCode"], "") ||
    missionInfo?.missionId ||
    "";

  const rawDroneId =
    pickString(
      value,
      ["drone_id", "assigned_drone_id", "droneId"],
      "",
    ) ||
    missionInfo?.droneId ||
    "";

  const rawBatteryId =
    readableEntity(value, ["battery_id", "installed_battery_id", "installed_battery", "battery", "battery_code"]) ||
    missionInfo?.batteryId ||
    "";

  const missionId = rawMissionId
    ? outboundDisplayId("MSN", rawMissionId)
    : undefined;

  const missionCode =
    pickString(
      value,
      ["mission_code", "missionCode"],
      "",
    ) ||
    missionInfo?.missionCode ||
    missionId;

  // Keep the genuine Backend ID; never fabricate a DR- serial from its digits.
  const assignedDroneId = rawDroneId || undefined;

  const assignedDroneCode =
    pickString(
      value,
      ["drone_code", "assigned_drone_code", "drone_name"],
      "",
    ) ||
    readableEntity(value, ["drone", "assigned_drone"]) ||
    missionInfo?.droneCode ||
    (assignedDroneId ? `Drone #${assignedDroneId}` : undefined);

  const hub = resolveHubLabel(
    value,
    "origin",
    context,
    missionInfo?.originHub,
    true,
  );

  const destination = readableEntity(value, ["destination_hub", "destinationHub"]) ||
    resolveHubLabel(value, "destination", context, missionInfo?.destinationHub);

  return {

    orderId,

    orderCode,

    customerName: pickString(
      value,
      ["customer_name", "recipient_name", "customer"],
      "Customer",
    ),

    packageName: pickString(
      value,
      ["package_label", "package_name", "parcel_name", "package_type"],
      "",
    ),

    weightKg: pickNumber(
      value,
      ["payload_kg", "weight_kg", "package_weight_kg", "weight"],
      0,
    ),

    weightProvided: optionalNumeric(
      value,
      ["payload_kg", "weight_kg", "package_weight_kg", "weight"],
    ) !== undefined,

    packageType: pickString(value, ["package_type", "parcel_type"], "") || undefined,

    deliveryMode: normalizeDeliveryMode(
      pickString(value, ["delivery_mode", "deliveryMode", "service_type"], ""),
    ),

    dropoffDeadline: pickString(
      value,
      ["dropoff_deadline", "drop_off_deadline", "dropoff_deadline_at", "dropoff_due_at", "drop_off_due_at", "dropoff_by"],
      "",
    ) || undefined,

    // A Scheduled delivery time is not a drop-off deadline.
    scheduledAt: pickString(
      value,
      ["scheduled_at", "scheduled_for", "scheduled_delivery_at", "scheduled_departure_at"],
      "",
    ) || undefined,

    createdAt: pickString(value, ["created_at", "createdAt"], "") || undefined,
    paidAt: pickString(value, ["paid_at", "payment_completed_at"], "") || undefined,
    receiverPhone: pickString(value, ["receiver_phone", "recipient_phone"], "") || undefined,
    orderStatus: pickString(value, ["order_status", "orderStatus", "status"], "") || undefined,
    handlingStatus: pickString(value, ["handling_status", "handlingStatus", "package_status"], "") || undefined,
    missionStatus: pickString(value, ["mission_status", "mission_state", "missionStatus"], "") || undefined,
    prematureMissionAssignment:
      normalizeOutboundStatus(value, Boolean(missionId), Boolean(assignedDroneCode)) === "Awaiting Drop-off" &&
      Boolean(missionId || assignedDroneId || assignedDroneCode),
    batteryChargePct: optionalNumeric(value, ["battery_percent", "battery_charge_pct", "battery_level_pct"]),
    batteryStatus: pickString(value, ["battery_status"], "") || undefined,

    hub,

    destination,

    // Match the latest Backend handoff state instead of blindly preferring
    // handling_status (which may still say PENDING after status becomes AT_HUB).
    status: normalizeOutboundStatus(
      value,
      Boolean(missionId),
      Boolean(assignedDroneCode),
    ),

    missionId,

    backendMissionId:
      pickString(value, ["mission_id", "missionId"], "") ||
      missionInfo?.missionId ||
      undefined,

    missionCode: missionCode || undefined,

    legId:
      pickString(value, ["leg_id", "mission_leg_id"], "") ||
      undefined,

    assignedDroneId,

    assignedDroneCode:
      assignedDroneCode || undefined,

    assignedDroneModel:
      pickString(value, ["drone_model", "assigned_drone_model", "drone_type"], "") ||
      undefined,

    // The receipt timestamp must be saved and returned by Backend. Some
    // versions nest it under originPackage; never substitute Date.now() here.
    packageReceivedAt:
      pickString(value, [
        "package_received_at", "received_at", "receivedAt", "origin_received_at",
      ], "") ||
      (isRecord(value.originPackage)
        ? pickString(value.originPackage, ["received_at", "receivedAt"], "")
        : isRecord(value.origin_package)
          ? pickString(value.origin_package, ["received_at", "receivedAt"], "")
          : "") ||
      undefined,

    installedBatteryId: rawBatteryId || undefined,

    assignedBatteryCode: pickString(value, ["battery_code", "battery_serial_number", "battery_serial", "serial_number"], "") || undefined,

    readyConfirmedAt:
      pickString(
        value,
        ["ready_confirmed_at", "ready_at"],
        "",
      ) || undefined,

  };

}

export async function refreshOutboundDeliveriesFromApi() {
  // Show primary response as soon as it arrives: do not block Outbound on
  // /missions and /auth (both can add several seconds of server latency).
  // The live Outbound response already contains order/mission/drone/hub names.
  const payload = await getOutboundDeliveriesApi();
  demoOutboundDeliveries = unwrapList(payload)
    .map((value) => mapApiOutbound(value))
    .filter((item): item is OutboundDelivery => Boolean(item));
  notifyOutboundUpdate();
  return loadOutboundDeliveries();
}

/**
 * Use exactly the canonical orderId supplied in the outbound list.
 * The generic flexible-ID helper retries with a numeric suffix derived from
 * strings such as ORD-20261014-0023, which can target the wrong order.
 */
export async function receiveOutboundOrderOnServer(orderId: string) {
  if (!orderId.trim()) throw new Error("Backend order ID is missing.");

  return technicianApiRequest(
    `/technician/deliveries/outbound/${encodeURIComponent(orderId)}/receive`,
    { method: "POST" },
  );
}

export async function prepareOutboundBatteryOnServer(orderId: string) {
  if (!orderId.trim()) throw new Error("Backend order ID is missing.");

  // This is the authoritative Backend operation. Do not reserve a battery
  // locally or retry using an inferred numeric suffix.
  return technicianApiRequest(
    `/technician/deliveries/outbound/${encodeURIComponent(orderId)}/prepare-battery`,
    { method: "POST" },
  );
}
