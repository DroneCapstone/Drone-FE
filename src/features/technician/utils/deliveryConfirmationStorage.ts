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

export type DeliveryStatus =
  | "Delivered"
  | "Completed"
  | "Cancelled";

export type DeliveryConfirmation = {
  /** Internal/backend id used by action endpoints. */
  orderId: string;
  /** Human-readable order code returned by Backend. */
  orderCode?: string;

  missionId: string;
  missionCode?: string;

  droneId: string;
  droneCode?: string;

  recipient: string;
  destination: string;

  status:
    DeliveryStatus;

  deliveredAt: string;
  deliveredAtIso: string;

  pickupDeadlineAt: string;
  pickupDeadlineAtIso: string;

  receivedConfirmedAt?: string;
  confirmedBy?: string;

  cancelledAt?: string;
  cancelReason?: string;
};

const PICKUP_TIMEOUT_HOURS =
  48;

function formatDeliveryTime(
  date = new Date(),
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  )
    .format(date)
    .replace(",", " ·");
}

function buildPickupDeadline(
  deliveredAtIso: string,
) {
  const deliveredAt =
    new Date(
      deliveredAtIso,
    );

  const deadline =
    new Date(
      deliveredAt.getTime() +
        PICKUP_TIMEOUT_HOURS *
          60 *
          60 *
          1000,
    );

  return {
    pickupDeadlineAt:
      formatDeliveryTime(
        deadline,
      ),

    pickupDeadlineAtIso:
      deadline.toISOString(),
  };
}

const order2048DeliveredIso =
  "2026-09-24T09:18:00+07:00";

const order2051DeliveredIso =
  "2026-09-24T09:42:00+07:00";

/*
 * Older demo order to demonstrate automatic cancellation.
 */
const order2039DeliveredIso =
  "2026-09-21T10:00:00+07:00";

let demoDeliveries:
  DeliveryConfirmation[] = [
  {
    orderId: "ORD-2048",
    missionId: "MS-1034",
    droneId: "DR-005",

    recipient:
      "Customer Demo",

    destination:
      "Customer Zone 07",

    status:
      "Delivered",

    deliveredAt:
      formatDeliveryTime(
        new Date(
          order2048DeliveredIso,
        ),
      ),

    deliveredAtIso:
      new Date(
        order2048DeliveredIso,
      ).toISOString(),

    ...buildPickupDeadline(
      order2048DeliveredIso,
    ),
  },

  {
    orderId: "ORD-2051",
    missionId: "MS-1042",
    droneId: "DR-008",

    recipient:
      "Customer Demo 2",

    destination:
      "Locker Station 03",

    status:
      "Delivered",

    deliveredAt:
      formatDeliveryTime(
        new Date(
          order2051DeliveredIso,
        ),
      ),

    deliveredAtIso:
      new Date(
        order2051DeliveredIso,
      ).toISOString(),

    ...buildPickupDeadline(
      order2051DeliveredIso,
    ),
  },

  {
    orderId: "ORD-2039",
    missionId: "MS-1021",
    droneId: "DR-004",

    recipient:
      "Customer Demo 3",

    destination:
      "Locker Station 01",

    status:
      "Delivered",

    deliveredAt:
      formatDeliveryTime(
        new Date(
          order2039DeliveredIso,
        ),
      ),

    deliveredAtIso:
      new Date(
        order2039DeliveredIso,
      ).toISOString(),

    ...buildPickupDeadline(
      order2039DeliveredIso,
    ),
  },
];

function notifyDeliveryUpdate() {
  window.dispatchEvent(
    new Event(
      "technician-delivery-confirmations-updated",
    ),
  );
}

/*
 * System rule:
 * if customer has not received the parcel within 48 hours after delivery,
 * the order is automatically cancelled.
 *
 * Production:
 * this must run in backend scheduler/queue/cron, not depend on page being open.
 */
export function autoCancelExpiredDeliveries(
  notify = true,
) {
  const now =
    Date.now();

  const cancelled:
    DeliveryConfirmation[] = [];

  demoDeliveries =
    demoDeliveries.map(
      (delivery) => {
        if (
          delivery.status !==
          "Delivered"
        ) {
          return delivery;
        }

        const deadline =
          new Date(
            delivery
              .pickupDeadlineAtIso,
          ).getTime();

        if (
          now < deadline
        ) {
          return delivery;
        }

        const next:
          DeliveryConfirmation = {
          ...delivery,

          status:
            "Cancelled",

          cancelledAt:
            formatDeliveryTime(
              new Date(now),
            ),

          cancelReason:
            "Customer did not receive the parcel within 48 hours.",
        };

        cancelled.push(
          next,
        );

        return next;
      },
    );

  for (
    const delivery
    of cancelled
  ) {
    window.dispatchEvent(
      new CustomEvent(
        "operator-order-updated",
        {
          detail: {
            eventType:
              "ORDER_AUTO_CANCELLED",

            orderId:
              delivery.orderId,

            missionId:
              delivery.missionId,

            droneId:
              delivery.droneId,

            status:
              "cancelled",

            reason:
              delivery.cancelReason,

            cancelledAt:
              delivery.cancelledAt,
          },
        },
      ),
    );
  }

  if (
    notify &&
    cancelled.length >
      0
  ) {
    notifyDeliveryUpdate();
  }

  return cancelled.length;
}

export function loadDeliveryConfirmations():
  DeliveryConfirmation[] {
  /*
   * Backend is the source of truth for delivery/order status.
   * Do not auto-cancel API data in the browser.
   */
  return demoDeliveries.map(
    (item) => ({
      ...item,
    }),
  );
}

/*
 * Manual Technician confirmation restored.
 */
export function confirmOrderReceived(
  orderId: string,
) {
  const current =
    demoDeliveries.find(
      (item) =>
        item.orderId ===
        orderId,
    );

  if (
    !current ||
    current.status !==
      "Delivered"
  ) {
    return undefined;
  }

  const now =
    formatDeliveryTime();

  let updated:
    DeliveryConfirmation |
    undefined;

  demoDeliveries =
    demoDeliveries.map(
      (item) => {
        if (
          item.orderId !==
          orderId
        ) {
          return item;
        }

        updated = {
          ...item,

          status:
            "Completed",

          receivedConfirmedAt:
            now,

          confirmedBy:
            "Technician",
        };

        return updated;
      },
    );

  if (updated) {
    window.dispatchEvent(
      new CustomEvent(
        "operator-order-updated",
        {
          detail: {
            eventType:
              "ORDER_RECEIVED_CONFIRMED",

            orderId:
              updated.orderId,

            missionId:
              updated.missionId,

            droneId:
              updated.droneId,

            status:
              "completed",

            confirmedBy:
              "TECHNICIAN",

            receivedConfirmedAt:
              updated
                .receivedConfirmedAt,
          },
        },
      ),
    );

    notifyDeliveryUpdate();
  }

  return updated;
}

// ---------------------------------------------------------------------------
// Backend API integration
// ---------------------------------------------------------------------------


function confirmationDisplayId(prefix: string, value: string, width = 4) {
  if (!value) return "";
  if (value.toUpperCase().startsWith(`${prefix}-`)) return value.toUpperCase();
  const match = value.match(/(\d+)$/);
  return match ? `${prefix}-${match[1].padStart(width, "0")}` : `${prefix}-${value}`;
}

function normalizeApiDeliveryStatus(
  rawStatus: string,
  confirmedAt: string,
): DeliveryStatus {
  const key = rawStatus
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (
    key === "CANCELLED" ||
    key === "CANCELED"
  ) {
    return "Cancelled";
  }

  if (
    confirmedAt ||
    key === "COMPLETED" ||
    key === "RECEIVED" ||
    key === "PICKED_UP"
  ) {
    return "Completed";
  }

  return "Delivered";
}

function mapApiDeliveryConfirmation(
  value: unknown,
  context?: DeliveryBackendContext,
): DeliveryConfirmation | null {
  if (!isRecord(value)) return null;

  /*
   * Use id/order_id for backend actions and keep order_code only for display.
   * The two values are not interchangeable (e.g. id=25 while
   * order_code=ORD-TECH-CONFIRM-1).
   */
  const rawOrderId = pickString(value, ["order_id", "orderId", "id"]);
  if (!rawOrderId) return null;

  const orderId = confirmationDisplayId("ORD", rawOrderId);
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

  const rawMissionCode =
    pickString(
      value,
      ["mission_code", "missionCode"],
      "",
    ) ||
    missionInfo?.missionCode ||
    "";

  const rawDroneId =
    pickString(value, ["drone_id", "droneId"], "") ||
    missionInfo?.droneId ||
    "";

  const rawDroneCode =
    pickString(
      value,
      ["drone_code", "drone_name"],
      "",
    ) ||
    missionInfo?.droneCode ||
    "";

  const deliveredAtRaw =
    pickString(
      value,
      ["arrived_at", "delivered_at", "arrival_at"],
      "",
    ) ||
    missionInfo?.arrivedAt ||
    "";

  /*
   * Do not fabricate "now" when Backend does not return an arrival timestamp.
   * That used to create a fake 48-hour countdown on every page refresh.
   */
  const deliveredDate = deliveredAtRaw
    ? new Date(deliveredAtRaw)
    : null;

  const hasValidDeliveredAt = Boolean(
    deliveredDate &&
      !Number.isNaN(deliveredDate.getTime()),
  );

  const deliveredIso =
    hasValidDeliveredAt && deliveredDate
      ? deliveredDate.toISOString()
      : "";

  const deadline = deliveredIso
    ? buildPickupDeadline(deliveredIso)
    : {
        pickupDeadlineAt: "—",
        pickupDeadlineAtIso: "",
      };

  const confirmedAt = pickString(
    value,
    [
      "arrival_confirmed_at",
      "pickup_confirmed_at",
      "received_confirmed_at",
    ],
    "",
  );

  const rawStatus = pickString(
    value,
    ["status", "order_status", "delivery_status", "package_status"],
    "Delivered",
  );

  const status = normalizeApiDeliveryStatus(
    rawStatus,
    confirmedAt,
  );

  const cancelledAt = pickString(
    value,
    ["cancelled_at", "canceled_at"],
    "",
  );

  const cancelReason = pickString(
    value,
    ["cancel_reason", "cancellation_reason", "reason"],
    "",
  );

  const missionId = rawMissionId
    ? confirmationDisplayId("MSN", rawMissionId)
    : "";

  const missionCode =
    rawMissionCode || missionId;

  const droneId = rawDroneId
    ? confirmationDisplayId("DR", rawDroneId, 3)
    : "";

  const droneCode =
    rawDroneCode || droneId;

  return {
    orderId,
    orderCode,

    missionId,
    missionCode: missionCode || undefined,

    droneId,
    droneCode: droneCode || undefined,

    recipient: pickString(
      value,
      ["recipient_name", "customer_name", "recipient"],
      "Customer",
    ),

    destination: resolveHubLabel(
      value,
      "destination",
      context,
      missionInfo?.destinationHub,
      true,
    ),

    status,

    deliveredAt: deliveredAtRaw
      ? formatApiDateTime(deliveredAtRaw, "—")
      : "—",

    deliveredAtIso: deliveredIso,

    ...deadline,

    receivedConfirmedAt: confirmedAt
      ? formatApiDateTime(confirmedAt, confirmedAt)
      : undefined,

    confirmedBy:
      pickString(
        value,
        ["confirmed_by", "technician_name"],
        "",
      ) || undefined,

    cancelledAt: cancelledAt
      ? formatApiDateTime(cancelledAt, cancelledAt)
      : undefined,

    cancelReason: cancelReason || undefined,
  };
}

export async function refreshDeliveryConfirmationsFromApi() {
  const payload = await getDeliveryConfirmationsApi();

  /*
   * Confirmation rows may only contain order/hub ids. Enrich them with the
   * Technician mission list and current Technician hub from Backend. Both
   * enrichment calls are optional; the confirmation API remains the source
   * of truth and the page still renders if either helper endpoint fails.
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

  demoDeliveries = unwrapList(payload)
    .map((value) => mapApiDeliveryConfirmation(value, context))
    .filter((item): item is DeliveryConfirmation => Boolean(item));

  notifyDeliveryUpdate();
  return loadDeliveryConfirmations();
}

export async function confirmPickupOnServer(orderId: string) {
  const result = await confirmDeliveryPickupApi(orderId);
  await refreshDeliveryConfirmationsFromApi();
  return result;
}
