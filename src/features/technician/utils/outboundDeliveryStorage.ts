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

export type OutboundDeliveryStatus =
  | "Awaiting Drop-off"
  | "At Hub"
  | "Mission Assigned"
  | "Ready";

export type OutboundDelivery = {
  orderId: string;
  customerName: string;
  packageName: string;
  weightKg: number;
  hub: string;
  destination: string;
  status: OutboundDeliveryStatus;

  missionId?: string;
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

const TECHNICIAN_HUB = "Hub HCM-02";

/*
 * FLOW
 * 1) Customer pays and chooses drop-off hub
 *    -> order appears here as Awaiting Drop-off
 *    -> Operator already knows about the paid order
 *
 * 2) Customer physically brings parcel to hub
 *    -> Technician clicks Receive at hub
 *    -> At Hub
 *    -> Operator receives PACKAGE_AT_HUB
 *
 * 3) Operator assigns mission + drone
 *    -> Mission Assigned appears automatically
 *
 * 4) Technician prepares a Ready battery
 *    -> Ready
 *
 * 5) Technician confirms physical departure
 *    -> Dispatch
 *    -> active row disappears
 *    -> saved to Outbound History
 *    -> Operator receives IN_PROGRESS
 */

let demoOutboundDeliveries: OutboundDelivery[] = [
  {
    orderId: "ORD-3101",
    customerName: "Customer Demo",
    packageName: "Medical package",
    weightKg: 1.8,
    hub: TECHNICIAN_HUB,
    destination: "Hub HCM-04",
    status: "Awaiting Drop-off",
  },
  {
    orderId: "ORD-3102",
    customerName: "Customer Demo 2",
    packageName: "Document parcel",
    weightKg: 0.7,
    hub: TECHNICIAN_HUB,
    destination: "Hub HCM-07",
    status: "At Hub",
    packageReceivedAt: "24 Sep 2026 · 09:35",
  },
  {
    orderId: "ORD-3103",
    customerName: "Customer Demo 3",
    packageName: "Electronics parcel",
    weightKg: 2.2,
    hub: TECHNICIAN_HUB,
    destination: "Hub HCM-12",
    status: "Mission Assigned",
    missionId: "MS-1103",
    legId: "LEG-1103-01",
    assignedDroneId: "DR-003",
    assignedDroneCode: "AX-03",
    packageReceivedAt: "24 Sep 2026 · 09:10",
  },
];

let demoOutboundHistory: OutboundDeliveryHistory[] = [
  {
    id: "OUT-HIST-3098",
    orderId: "ORD-3098",
    customerName: "Customer Demo 4",
    packageName: "General parcel",
    weightKg: 1.3,
    hub: TECHNICIAN_HUB,
    destination: "Hub HCM-03",
    missionId: "MS-1098",
    legId: "LEG-1098-01",
    droneId: "DR-001",
    droneCode: "CX-01",
    batteryId: "BAT-006",
    departedAt: "24 Sep 2026 · 08:42",
    result: "Departed",
  },
];

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

export function markOutboundReady({
  orderId,
  batteryId,
}: {
  orderId: string;
  batteryId: string;
}) {
  const current = demoOutboundDeliveries.find(
    (item) => item.orderId === orderId,
  );

  if (
    !current ||
    current.status !== "Mission Assigned" ||
    !current.missionId ||
    !current.assignedDroneId
  ) {
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
      status: "Ready",
      installedBatteryId: batteryId,
      readyConfirmedAt: now,
    };

    return updated;
  });

  if (updated) {
    window.dispatchEvent(
      new CustomEvent("operator-mission-updated", {
        detail: {
          eventType: "OUTBOUND_READY",
          orderId: updated.orderId,
          missionId: updated.missionId,
          legId: updated.legId,
          droneId: updated.assignedDroneId,
          batteryId,
          status: "READY",
          readyAt: now,
        },
      }),
    );

    notifyOutboundUpdate();
  }

  return updated;
}

export function dispatchOutboundDelivery(orderId: string) {
  const delivery = demoOutboundDeliveries.find(
    (item) => item.orderId === orderId,
  );

  if (
    !delivery ||
    delivery.status !== "Ready" ||
    !delivery.missionId ||
    !delivery.assignedDroneId ||
    !delivery.assignedDroneCode ||
    !delivery.installedBatteryId
  ) {
    return undefined;
  }

  const now = formatOutboundTime();

  const historyItem: OutboundDeliveryHistory = {
    id: `OUT-HIST-${delivery.orderId}-${Date.now()}`,
    orderId: delivery.orderId,
    customerName: delivery.customerName,
    packageName: delivery.packageName,
    weightKg: delivery.weightKg,
    hub: delivery.hub,
    destination: delivery.destination,
    missionId: delivery.missionId,
    legId: delivery.legId,
    droneId: delivery.assignedDroneId,
    droneCode: delivery.assignedDroneCode,
    batteryId: delivery.installedBatteryId,
    departedAt: now,
    result: "Departed",
  };

  demoOutboundHistory = [
    historyItem,
    ...demoOutboundHistory,
  ];

  demoOutboundDeliveries = demoOutboundDeliveries.filter(
    (item) => item.orderId !== orderId,
  );

  clientDispatchedOrderIds.add(orderId);

  window.dispatchEvent(
    new CustomEvent("operator-mission-updated", {
      detail: {
        eventType: "OUTBOUND_DEPARTED",
        orderId: delivery.orderId,
        missionId: delivery.missionId,
        legId: delivery.legId,
        droneId: delivery.assignedDroneId,
        batteryId: delivery.installedBatteryId,
        originHub: delivery.hub,
        destination: delivery.destination,
        status: "IN_PROGRESS",
        departedAt: now,
      },
    }),
  );

  notifyOutboundUpdate();

  return { ...historyItem };
}

// ---------------------------------------------------------------------------
// Backend API integration
// ---------------------------------------------------------------------------


const clientDispatchedOrderIds = new Set<string>();

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

function mapApiOutbound(value: unknown): OutboundDelivery | null {
  if (!isRecord(value)) return null;

  const rawOrderId = pickString(value, ["order_id", "orderId", "id"]);
  if (!rawOrderId) return null;
  const orderId = outboundDisplayId("ORD", rawOrderId);

  const rawMissionId = pickString(value, ["mission_id", "missionId"], "");
  const rawDroneId = pickString(value, ["drone_id", "assigned_drone_id", "droneId"], "");
  const rawBatteryId = pickString(value, ["battery_id", "installed_battery_id"], "");
  const missionId = rawMissionId ? outboundDisplayId("MSN", rawMissionId) : undefined;
  const assignedDroneId = rawDroneId ? outboundDisplayId("DR", rawDroneId, 3) : undefined;
  const assignedDroneCode = pickString(value, ["drone_code", "assigned_drone_code", "drone_name"], assignedDroneId ?? "") || undefined;

  return {
    orderId,
    customerName: pickString(value, ["customer_name", "recipient_name", "customer"], "Customer"),
    packageName: pickString(value, ["package_name", "package_type", "parcel_name"], "Package"),
    weightKg: pickNumber(value, ["weight_kg", "package_weight_kg", "weight"], 0),
    hub: pickString(value, ["origin_hub_name", "hub_name", "hub"], TECHNICIAN_HUB),
    destination: pickString(value, ["destination_hub_name", "destination", "destination_name"], "—"),
    status: normalizeOutboundStatus(
      pickString(value, ["status", "handling_status", "package_status"], "INCOMING"),
      Boolean(missionId),
      Boolean(assignedDroneId),
    ),
    missionId,
    legId: pickString(value, ["leg_id", "mission_leg_id"], "") || undefined,
    assignedDroneId,
    assignedDroneCode,
    packageReceivedAt: pickString(value, ["package_received_at", "received_at"], "") || undefined,
    installedBatteryId: rawBatteryId ? outboundDisplayId("BAT", rawBatteryId, 3) : undefined,
    readyConfirmedAt: pickString(value, ["ready_confirmed_at", "ready_at"], "") || undefined,
  };
}

export async function refreshOutboundDeliveriesFromApi() {
  const payload = await getOutboundDeliveriesApi();
  demoOutboundDeliveries = unwrapList(payload)
    .map(mapApiOutbound)
    .filter((item): item is OutboundDelivery => Boolean(item))
    .filter((item) => !clientDispatchedOrderIds.has(item.orderId));

  notifyOutboundUpdate();
  return loadOutboundDeliveries();
}

export async function receiveOutboundOrderOnServer(orderId: string) {
  const result = await receiveOutboundOrderApi(orderId);
  await refreshOutboundDeliveriesFromApi();
  return result;
}

export async function prepareOutboundBatteryOnServer(
  orderId: string,
  installedBatteryId?: string,
) {
  const result = await prepareOutboundBatteryApi(orderId);
  await refreshOutboundDeliveriesFromApi();

  if (installedBatteryId) {
    demoOutboundDeliveries = demoOutboundDeliveries.map((item) =>
      item.orderId === orderId
        ? {
            ...item,
            status: "Ready",
            installedBatteryId,
          }
        : item,
    );
    notifyOutboundUpdate();
  }

  return result;
}

export function rememberClientDispatchedOrder(orderId: string) {
  clientDispatchedOrderIds.add(orderId);
}
