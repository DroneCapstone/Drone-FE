import {

  getOutboundDeliveriesApi,

  prepareOutboundBatteryApi,

  receiveOutboundOrderApi,

} from "../api/outboundApi";

import {

  isRecord,

  pickNumber,

  pickString,

  unwrapList,

} from "../api/httpClient";

import { markOrderReceivedAtOriginHub } from "../../operator/utils/operatorOrderStorage";

import {
  getTechnicianAuthApi,
} from "../api/authApi";

import {
  getTechnicianMissionsApi,
} from "../api/transitApi";

import {
  buildDeliveryBackendContext,
  getMissionInfoForDelivery,
  resolveHubLabel,
  type DeliveryBackendContext,
} from "./deliveryBackendContext";

export type OutboundDeliveryStatus =

  | "Awaiting Drop-off"

  | "At Hub"

  | "Mission Assigned"

  | "Ready";

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

  hub: string;

  destination: string;

  status: OutboundDeliveryStatus;

  missionId?: string;

  missionCode?: string;

  legId?: string;

  assignedDroneId?: string;

  assignedDroneCode?: string;

  packageReceivedAt?: string;

  installedBatteryId?: string;

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

 \* 5) Technician confirms physical departure

 \*    -> Dispatch

 \*    -> active row disappears

 \*    -> saved to Outbound History

 \*    -> Operator receives IN_PROGRESS

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

// Dispatch is intentionally not implemented on the frontend:
// the published Technician Swagger has no departure/dispatch endpoint.
// Backend must provide an authoritative transition to IN_PROGRESS.

// ---------------------------------------------------------------------------

// Backend API integration

// ---------------------------------------------------------------------------


function outboundDisplayId(prefix: string, value: string, width = 4) {

  if (!value) return "";

  if (value.toUpperCase().startsWith(`${prefix}-`)) return value.toUpperCase();

  const match = value.match(/(\d+)$/);

  return match ? `${prefix}-${match[1].padStart(width, "0")}` : `${prefix}-${value}`;

}

function normalizeOutboundStatus(

  raw: string,

  hasMission: boolean,

  hasDrone: boolean,

): OutboundDeliveryStatus {

  const key = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");

  if (key === "READY") return "Ready";

  if (key === "MISSION_ASSIGNED" || (hasMission && hasDrone && key === "AT_HUB")) {

    return "Mission Assigned";

  }

  if (key === "AT_HUB" || key === "RECEIVED") return "At Hub";

  return "Awaiting Drop-off";

}

function mapApiOutbound(
  value: unknown,
  context?: DeliveryBackendContext,
): OutboundDelivery | null {

  if (!isRecord(value)) return null;

  /*
   * Keep the database id as the action id. `order_code` is only a display
   * value; using ORD-TECH-OUT-3 as the API id could incorrectly resolve to 3
   * even when the actual backend order id is 24.
   */
  const rawOrderId = pickString(value, ["order_id", "orderId", "id"]);

  if (!rawOrderId) return null;

  const orderId = rawOrderId;

  const orderCode =
    pickString(
      value,
      ["order_code", "orderCode", "code"],
      "",
    ) || orderId;

  const missionInfo =
    getMissionInfoForDelivery(value, context);

  const rawMissionId =
    pickString(value, ["mission_id", "missionId"], "") ||
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
    pickString(
      value,
      ["battery_id", "installed_battery_id"],
      "",
    ) ||
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

  const assignedDroneId = rawDroneId
    ? outboundDisplayId("DR", rawDroneId, 3)
    : undefined;

  const assignedDroneCode =
    pickString(
      value,
      ["drone_code", "assigned_drone_code", "drone_name"],
      "",
    ) ||
    missionInfo?.droneCode ||
    assignedDroneId;

  const hub = resolveHubLabel(
    value,
    "origin",
    context,
    missionInfo?.originHub,
    true,
  );

  const destination = resolveHubLabel(
    value,
    "destination",
    context,
    missionInfo?.destinationHub,
  );

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
      ["package_name", "package_type", "parcel_name"],
      "Package",
    ),

    weightKg: pickNumber(
      value,
      ["weight_kg", "package_weight_kg", "weight"],
      0,
    ),

    hub,

    destination,

    /*
     * `status` is the order lifecycle (e.g. Scheduled/In Progress), while
     * `handling_status` describes the Technician handoff state
     * (Incoming/At hub/Ready). This page must use handling_status first.
     */
    status: normalizeOutboundStatus(

      pickString(
        value,
        ["handling_status", "package_status", "status"],
        "INCOMING",
      ),

      Boolean(missionId),

      Boolean(assignedDroneId),

    ),

    missionId,

    missionCode: missionCode || undefined,

    legId:
      pickString(value, ["leg_id", "mission_leg_id"], "") ||
      undefined,

    assignedDroneId,

    assignedDroneCode:
      assignedDroneCode || undefined,

    packageReceivedAt:
      pickString(
        value,
        ["package_received_at", "received_at"],
        "",
      ) || undefined,

    installedBatteryId: rawBatteryId
      ? outboundDisplayId("BAT", rawBatteryId, 3)
      : undefined,

    readyConfirmedAt:
      pickString(
        value,
        ["ready_confirmed_at", "ready_at"],
        "",
      ) || undefined,

  };

}

export async function refreshOutboundDeliveriesFromApi() {

  const payload = await getOutboundDeliveriesApi();

  /*
   * Outbound rows currently expose hub/order ids but may omit readable hub
   * names, mission and drone fields. Enrich from other Technician-scoped
   * Backend endpoints when available. Enrichment is best-effort so a failure
   * in /missions or /auth never hides the outbound list itself.
   */
  const [missionsResult, authResult] = await Promise.allSettled([
    getTechnicianMissionsApi(),
    getTechnicianAuthApi(),
  ]);

  const context = buildDeliveryBackendContext(
    missionsResult.status === "fulfilled"
      ? missionsResult.value
      : null,
    authResult.status === "fulfilled"
      ? authResult.value
      : null,
  );

  demoOutboundDeliveries = unwrapList(payload)

    .map((value) => mapApiOutbound(value, context))

    .filter((item): item is OutboundDelivery => Boolean(item));

  notifyOutboundUpdate();

  return loadOutboundDeliveries();

}

export async function receiveOutboundOrderOnServer(orderId: string) {

  return receiveOutboundOrderApi(orderId);

}

export async function prepareOutboundBatteryOnServer(
  orderId: string,
) {
  // POST /prepare-battery is the one authoritative Backend operation.
  // Do not also call /batteries/{id}/use or invent a local Ready status.
  // The refreshed response determines the new status and assigned battery.
  return prepareOutboundBatteryApi(orderId);
}
