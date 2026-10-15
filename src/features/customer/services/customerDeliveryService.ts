import {
  PACKAGE_CATEGORIES,
} from "../data/customerData";

import type {
  CustomerDelivery,
  DeliveryDraft,
  DeliveryHub,
  DeliveryPreview,
  DeliveryPrice,
  OrderStatus,
} from "../types/customer";

import {
  customerApi,
  normalizePaymentStatus,
  type CustomerEstimateResponse,
  type CustomerHubApi,
} from "./customerApi";

const DELIVERY_KEY =
  "droneoptai.customer.deliveries";

const DRAFT_KEY =
  "droneoptai.customer.delivery-draft";

const HUBS_KEY =
  "droneoptai.customer.hubs";

const ESTIMATE_KEY =
  "droneoptai.customer.delivery-estimate";

/* =========================================================
   LOCAL CACHE

   NOTE:
   Swagger currently has POST /customer/orders but no
   GET /customer/orders or GET /customer/orders/{id}.

   Therefore Dashboard / My Deliveries / Detail keep a local cache
   of orders created through the backend. Once BE exposes customer
   order GET endpoints, replace these reads with server queries.
========================================================= */

function readDeliveries(): CustomerDelivery[] {
  try {
    return JSON.parse(
      localStorage.getItem(
        DELIVERY_KEY,
      ) ?? "[]",
    ) as CustomerDelivery[];
  } catch {
    return [];
  }
}

function writeDeliveries(
  deliveries: CustomerDelivery[],
) {
  localStorage.setItem(
    DELIVERY_KEY,
    JSON.stringify(deliveries),
  );
}

function upsertDelivery(
  delivery: CustomerDelivery,
) {
  const current = readDeliveries();

  const exists = current.some(
    (item) => item.id === delivery.id,
  );

  const next = exists
    ? current.map((item) =>
      item.id === delivery.id
        ? delivery
        : item,
    )
    : [delivery, ...current];

  writeDeliveries(next);

  return delivery;
}

function normalizeHub(
  hub: CustomerHubApi,
): DeliveryHub {
  return {
    id: hub.id,
    name: hub.name,
    address: hub.address ?? "",
    city: hub.city,
    area: hub.area,
  };
}

function sameHubId(
  left: string | number,
  right: string,
) {
  return String(left) === right;
}

function resolveHubFromDraft(
  hubId: string,
  hubs: DeliveryHub[],
) {
  return (
    hubs.find((hub) =>
      sameHubId(hub.id, hubId),
    ) ?? null
  );
}

function normalizeOrderStatus(
  rawStatus: unknown,
): OrderStatus {
  const normalized = String(
    rawStatus ?? "",
  ).toLowerCase();

  if (normalized.includes("complete")) {
    return "completed";
  }

  if (
    normalized.includes("delivery") ||
    normalized.includes("transit") ||
    normalized.includes("in_progress")
  ) {
    return "in_delivery";
  }

  if (
    normalized.includes("accept") ||
    normalized.includes("schedule")
  ) {
    return "accepted";
  }

  if (normalized.includes("reject")) {
    return "rejected";
  }

  if (normalized.includes("cancel")) {
    return "cancelled";
  }

  return "pending_review";
}

function categoryLabel(
  value: DeliveryDraft["packageCategory"],
) {
  return (
    PACKAGE_CATEGORIES.find(
      (item) => item.value === value,
    )?.label ?? value
  );
}

/**
 * Pricing contract helper.
 *
 * The updated estimate API now accepts package_type so Backend can return
 * fragile_surcharge in fee_details. We keep the mapping centralized here
 * so it is easy to adjust if Backend later changes the enum/string values.
 */
function backendPackageType(
  draft: DeliveryDraft,
) {
  return draft.packageCategory === "fragile"
    ? "Fragile"
    : "Standard";
}

function backendPackageLabel(
  draft: DeliveryDraft,
) {
  if (
    draft.packageCategory === "other" &&
    draft.packageDescription.trim()
  ) {
    return draft.packageDescription.trim();
  }

  return categoryLabel(
    draft.packageCategory,
  );
}

function readEstimate(): DeliveryPreview | null {
  try {
    return JSON.parse(
      localStorage.getItem(
        ESTIMATE_KEY,
      ) ?? "null",
    ) as DeliveryPreview | null;
  } catch {
    return null;
  }
}

function writeEstimate(
  preview: DeliveryPreview,
) {
  localStorage.setItem(
    ESTIMATE_KEY,
    JSON.stringify(preview),
  );
}

function clearEstimate() {
  localStorage.removeItem(
    ESTIMATE_KEY,
  );
}

function readCachedHubs(): DeliveryHub[] {
  try {
    return JSON.parse(
      localStorage.getItem(
        HUBS_KEY,
      ) ?? "[]",
    ) as DeliveryHub[];
  } catch {
    return [];
  }
}

function normalizeEstimate(
  response: CustomerEstimateResponse,
  originHub: DeliveryHub,
  destinationHub: DeliveryHub,
): DeliveryPreview {
  const details =
    response.fee_details;

  const price: DeliveryPrice = {
    deliveryFee: Number(
      response.delivery_fee ?? 0,
    ),
    serviceFee: Number(
      response.service_fee ?? 0,
    ),
    total: Number(
      response.total_fee ?? 0,
    ),

    feeDetails: details
      ? {
        baseFee: Number(
          details.base_fee ?? 0,
        ),
        distanceFee: Number(
          details.distance_fee ?? 0,
        ),
        payloadFee: Number(
          details.payload_fee ?? 0,
        ),
        insuranceFee: Number(
          details.insurance_fee ?? 0,
        ),
        expressSurcharge: Number(
          details.express_surcharge ?? 0,
        ),
        fragileSurcharge: Number(
          details.fragile_surcharge ?? 0,
        ),
      }
      : undefined,
  };

  return {
    originHub,
    destinationHub,
    handoverDeadlineAt:
      response.handover_deadline,
    estimatedDepartureAt:
      response.estimated_departure,
    estimatedArrivalAt:
      response.estimated_arrival,
    price,
  };
}

export const customerDeliveryService = {
  /* =======================================================
     DRAFT
  ======================================================== */

  saveDraft(
    draft: DeliveryDraft,
  ) {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify(draft),
    );
  },

  getDraft(): DeliveryDraft | null {
    try {
      return JSON.parse(
        localStorage.getItem(
          DRAFT_KEY,
        ) ?? "null",
      ) as DeliveryDraft | null;
    } catch {
      return null;
    }
  },

  clearDraft() {
    localStorage.removeItem(
      DRAFT_KEY,
    );
    clearEstimate();
  },

  getCachedEstimate() {
    return readEstimate();
  },

  clearEstimate,

  /* =======================================================
     HUBS
  ======================================================== */

  getCachedHubs(): DeliveryHub[] {
    return readCachedHubs();
  },

  async loadHubs() {
    const response =
      await customerApi.getHubs();

    const hubs = response.map(
      normalizeHub,
    );

    localStorage.setItem(
      HUBS_KEY,
      JSON.stringify(hubs),
    );

    return hubs;
  },

  /* =======================================================
     ESTIMATE

     Grounded in FE-Customer-APIs.docx:
     POST /api/v1/customer/orders/estimate
  ======================================================== */

  async estimateRemote(
    draft: DeliveryDraft,
    hubs?: DeliveryHub[],
  ) {
    const availableHubs =
      hubs ?? readCachedHubs();

    const originHub =
      resolveHubFromDraft(
        draft.originArea,
        availableHubs,
      );

    const destinationHub =
      resolveHubFromDraft(
        draft.destinationArea,
        availableHubs,
      );

    if (!originHub || !destinationHub) {
      throw new Error(
        "Please select a valid origin and Pick-up Point.",
      );
    }

    const response =
      await customerApi.estimateOrder({
        origin_hub_id:
          originHub.id,
        destination_hub_id:
          destinationHub.id,
        payload_kg:
          draft.weightKg,
        package_size:
          draft.packageSize,
        package_type:
          backendPackageType(
            draft,
          ),
        delivery_mode:
          draft.deliveryMode ===
            "express"
            ? "EXPRESS"
            : "SCHEDULED",
        requested_delivery_at:
          draft.deliveryMode ===
            "scheduled" &&
            draft.requestedDepartureAt
            ? new Date(
              draft.requestedDepartureAt,
            ).toISOString()
            : null,
        has_insurance:
          Boolean(
            draft.hasInsurance,
          ),
      });

    const preview = normalizeEstimate(
      response,
      originHub,
      destinationHub,
    );

    writeEstimate(preview);

    return preview;
  },

  /**
   * Retained for pages/components that expect a sync preview.
   * It now reads the latest backend estimate cache rather than
   * calculating a fake price in FE.
   */
  preview(
    _draft: DeliveryDraft,
  ) {
    const estimate = readEstimate();

    if (!estimate) {
      throw new Error(
        "No backend estimate is available yet.",
      );
    }

    return estimate;
  },

  /* =======================================================
     CREATE ORDER

     Grounded in FE-Customer-APIs.docx:
     POST /api/v1/customer/orders
  ======================================================== */

  async createRemote(
    customerId: string,
    draft: DeliveryDraft,
  ): Promise<CustomerDelivery> {
    const receiverEmail = (draft.recipientEmail ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiverEmail)) {
      throw new Error("Please enter a valid recipient email address.");
    }

    const hubs = readCachedHubs();

    const originHub =
      resolveHubFromDraft(
        draft.originArea,
        hubs,
      );

    const destinationHub =
      resolveHubFromDraft(
        draft.destinationArea,
        hubs,
      );

    const estimate = readEstimate();

    if (
      !originHub ||
      !destinationHub ||
      !estimate
    ) {
      throw new Error(
        "Delivery estimate is missing. Please return to Create delivery and estimate the order again.",
      );
    }

    const response =
      await customerApi.createOrder({
        package_type:
          backendPackageType(
            draft,
          ),
        package_label:
          backendPackageLabel(
            draft,
          ),

        payload_kg:
          draft.weightKg,
        package_size:
          draft.packageSize,

        origin_hub_id:
          originHub.id,
        destination_hub_id:
          destinationHub.id,

        delivery_mode:
          draft.deliveryMode ===
            "express"
            ? "EXPRESS"
            : "SCHEDULED",

        requested_delivery_at:
          draft.deliveryMode ===
            "scheduled" &&
            draft.requestedDepartureAt
            ? new Date(
              draft.requestedDepartureAt,
            ).toISOString()
            : null,

        sender_phone:
          draft.senderPhone.trim(),
        receiver_name:
          draft.recipientName.trim(),
        receiver_email:
          receiverEmail,

        has_insurance:
          Boolean(
            draft.hasInsurance,
          ),
      });

    const delivery: CustomerDelivery = {
      ...draft,
      id: String(response.id),
      customerId,
      originHub,
      destinationHub,
      createdAt:
        response.created_at ??
        new Date().toISOString(),
      handoverDeadlineAt:
        estimate.handoverDeadlineAt,
      estimatedDepartureAt:
        estimate.estimatedDepartureAt,
      estimatedArrivalAt:
        estimate.estimatedArrivalAt,
      paymentStatus: "pending",
      orderStatus:
        normalizeOrderStatus(
          response.status,
        ),
      packageReceivedAtHub: false,
      price: estimate.price,
      backendStatus:
        response.status,
    };

    upsertDelivery(delivery);

    return delivery;
  },

  /* =======================================================
     LOCAL ORDER CACHE READS
  ======================================================== */

  getAll(): CustomerDelivery[] {
    return readDeliveries();
  },

  getByCustomer(
    customerId: string,
  ) {
    return readDeliveries().filter(
      (delivery) =>
        delivery.customerId ===
        customerId,
    );
  },

  getById(id: string) {
    return (
      readDeliveries().find(
        (delivery) =>
          delivery.id === id,
      ) ?? null
    );
  },

  /* =======================================================
     PAYMENT
  ======================================================== */

  async refreshPaymentStatus(
    id: string,
  ) {
    const response =
      await customerApi.getPaymentStatus(
        id,
      );

    const status =
      normalizePaymentStatus(
        response,
      );

    const deliveries =
      readDeliveries();

    const next = deliveries.map(
      (delivery) =>
        delivery.id === id
          ? {
            ...delivery,
            paymentStatus:
              status === "paid"
                ? ("paid" as const)
                : status === "failed"
                  ? ("failed" as const)
                  : ("pending" as const),
          }
          : delivery,
    );

    writeDeliveries(next);

    return (
      next.find(
        (delivery) =>
          delivery.id === id,
      ) ?? null
    );
  },

  markPaid(id: string) {
    const deliveries =
      readDeliveries();

    const next = deliveries.map(
      (delivery) =>
        delivery.id === id
          ? {
            ...delivery,
            paymentStatus:
              "paid" as const,
          }
          : delivery,
    );

    writeDeliveries(next);

    return (
      next.find(
        (delivery) =>
          delivery.id === id,
      ) ?? null
    );
  },

  /* =======================================================
     CUSTOMER STATUS
  ======================================================== */

  getCustomerStatus(
    delivery: CustomerDelivery,
  ) {
    if (
      delivery.orderStatus ===
      "cancelled"
    ) {
      return "Cancelled";
    }

    if (
      delivery.orderStatus ===
      "rejected"
    ) {
      return "Rejected";
    }

    if (
      delivery.paymentStatus !==
      "paid"
    ) {
      return "Awaiting payment";
    }

    if (
      !delivery.packageReceivedAtHub
    ) {
      if (
        new Date() >
        new Date(
          delivery.handoverDeadlineAt,
        )
      ) {
        return "Drop-off overdue";
      }

      return "Awaiting package drop-off";
    }

    if (
      delivery.orderStatus ===
      "pending_review"
    ) {
      return "Pending review";
    }

    if (
      delivery.orderStatus ===
      "accepted"
    ) {
      return "Scheduled";
    }

    if (
      delivery.orderStatus ===
      "in_delivery"
    ) {
      return "In delivery";
    }

    if (
      delivery.orderStatus ===
      "completed"
    ) {
      return "Completed";
    }

    return "Processing";
  },
};

export function formatVnd(
  value: number,
) {
  return new Intl.NumberFormat(
    "vi-VN",
    {
      style: "currency",
      currency: "VND",
    },
  ).format(value);
}

export function formatDateTime(
  value: string,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}
