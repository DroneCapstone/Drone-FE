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

export type DeliveryStatus =
  | "Delivered"
  | "Completed"
  | "Cancelled";

export type DeliveryConfirmation = {
  orderId: string;
  missionId: string;
  droneId: string;

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
   * Mock convenience:
   * production backend would already return correct status.
   */
  autoCancelExpiredDeliveries(
    false,
  );

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
  /*
   * Do not allow confirmation after the 48-hour timeout.
   */
  autoCancelExpiredDeliveries(
    false,
  );

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

function mapApiDeliveryConfirmation(value: unknown): DeliveryConfirmation | null {
  if (!isRecord(value)) return null;

  const rawOrderId = pickString(value, ["order_id", "orderId", "id"]);
  if (!rawOrderId) return null;

  const deliveredAtRaw = pickString(value, ["arrived_at", "delivered_at", "arrival_at"], "");
  const deliveredDate = deliveredAtRaw ? new Date(deliveredAtRaw) : new Date();
  const deliveredIso = Number.isNaN(deliveredDate.getTime())
    ? new Date().toISOString()
    : deliveredDate.toISOString();
  const deadline = buildPickupDeadline(deliveredIso);
  const confirmedAt = pickString(value, ["arrival_confirmed_at", "pickup_confirmed_at", "received_confirmed_at"], "");

  return {
    orderId: confirmationDisplayId("ORD", rawOrderId),
    missionId: confirmationDisplayId(
      "MSN",
      pickString(value, ["mission_id", "missionId"], "0"),
    ),
    droneId: confirmationDisplayId(
      "DR",
      pickString(value, ["drone_id", "droneId"], "0"),
      3,
    ),
    recipient: pickString(value, ["recipient_name", "customer_name", "recipient"], "Customer"),
    destination: pickString(value, ["destination_hub_name", "hub_name", "destination"], "—"),
    status: confirmedAt ? "Completed" : "Delivered",
    deliveredAt: formatApiDateTime(deliveredAtRaw, "—"),
    deliveredAtIso: deliveredIso,
    ...deadline,
    receivedConfirmedAt: confirmedAt ? formatApiDateTime(confirmedAt, confirmedAt) : undefined,
    confirmedBy: pickString(value, ["confirmed_by", "technician_name"], "") || undefined,
  };
}

export async function refreshDeliveryConfirmationsFromApi() {
  const payload = await getDeliveryConfirmationsApi();
  demoDeliveries = unwrapList(payload)
    .map(mapApiDeliveryConfirmation)
    .filter((item): item is DeliveryConfirmation => Boolean(item));

  notifyDeliveryUpdate();
  return loadDeliveryConfirmations();
}

export async function confirmPickupOnServer(orderId: string) {
  const result = await confirmDeliveryPickupApi(orderId);
  await refreshDeliveryConfirmationsFromApi();
  return result;
}
