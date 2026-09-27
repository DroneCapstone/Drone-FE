import {
  DELIVERY_HUBS,
} from "../data/customerData";

import type {
  CustomerDelivery,
  DeliveryDraft,
  DeliveryHub,
  DeliveryPreview,
  DeliveryPrice,
} from "../types/customer";

const DELIVERY_KEY =
  "droneoptai.customer.deliveries";

const DRAFT_KEY =
  "droneoptai.customer.delivery-draft";

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

function addHours(
  date: Date,
  hours: number,
) {
  return new Date(
    date.getTime() +
      hours * 60 * 60 * 1000,
  );
}

function addMinutes(
  date: Date,
  minutes: number,
) {
  return new Date(
    date.getTime() +
      minutes * 60 * 1000,
  );
}

function createOrderId() {
  return `DRO-${Date.now()
    .toString()
    .slice(-6)}`;
}

function recommendHub(
  location: string,
): DeliveryHub {
  const query =
    location.toLowerCase();

  if (
    query.includes("thu duc") ||
    query.includes("thủ đức")
  ) {
    return DELIVERY_HUBS.find(
      (hub) =>
        hub.id === "hub-thu-duc",
    )!;
  }

  if (
    query.includes("go vap") ||
    query.includes("gò vấp")
  ) {
    return DELIVERY_HUBS.find(
      (hub) =>
        hub.id === "hub-go-vap",
    )!;
  }

  if (
    query.includes("district 7") ||
    query.includes("quận 7")
  ) {
    return DELIVERY_HUBS.find(
      (hub) =>
        hub.id ===
        "hub-district-7",
    )!;
  }

  if (
    query.includes("tan binh") ||
    query.includes("tân bình")
  ) {
    return DELIVERY_HUBS.find(
      (hub) =>
        hub.id ===
        "hub-tan-binh",
    )!;
  }

  if (
    query.includes("cau giay") ||
    query.includes("cầu giấy")
  ) {
    return DELIVERY_HUBS.find(
      (hub) =>
        hub.id ===
        "hub-cau-giay",
    )!;
  }

  if (
    query.includes("long bien") ||
    query.includes("long biên")
  ) {
    return DELIVERY_HUBS.find(
      (hub) =>
        hub.id ===
        "hub-long-bien",
    )!;
  }

  if (
    query.includes("da nang") ||
    query.includes("đà nẵng") ||
    query.includes("hai chau")
  ) {
    return DELIVERY_HUBS.find(
      (hub) =>
        hub.id ===
        "hub-hai-chau",
    )!;
  }

  return DELIVERY_HUBS[0];
}

function calculatePrice(
  draft: DeliveryDraft,
): DeliveryPrice {
  const baseFee = 65000;

  const weightFee =
    Math.max(
      0,
      draft.weightKg - 1,
    ) * 8000;

  const sizeFee = {
    S: 0,
    M: 10000,
    L: 20000,
    XL: 35000,
  }[draft.packageSize];

  const serviceFee =
    draft.deliveryMode === "express"
      ? 30000
      : 15000;

  const deliveryFee =
    Math.round(
      baseFee +
        weightFee +
        sizeFee,
    );

  return {
    deliveryFee,
    serviceFee,
    total:
      deliveryFee + serviceFee,
  };
}

function buildPreview(
  draft: DeliveryDraft,
): DeliveryPreview {
  const now = new Date();

  const handoverDeadline =
    addHours(now, 3);

  let estimatedDeparture: Date;

  if (
    draft.deliveryMode ===
      "scheduled" &&
    draft.requestedDepartureAt
  ) {
    estimatedDeparture = new Date(
      draft.requestedDepartureAt,
    );
  } else {
    estimatedDeparture =
      addMinutes(
        handoverDeadline,
        15,
      );
  }

  const estimatedArrival =
    addMinutes(
      estimatedDeparture,
      45,
    );

  return {
    originHub: recommendHub(
      draft.originArea,
    ),

    destinationHub:
      recommendHub(
        draft.destinationArea,
      ),

    handoverDeadlineAt:
      handoverDeadline.toISOString(),

    estimatedDepartureAt:
      estimatedDeparture.toISOString(),

    estimatedArrivalAt:
      estimatedArrival.toISOString(),

    price: calculatePrice(draft),
  };
}

export const customerDeliveryService = {
  saveDraft(
    draft: DeliveryDraft,
  ) {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify(draft),
    );
  },

  getDraft():
    | DeliveryDraft
    | null {
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
  },

  preview(
    draft: DeliveryDraft,
  ) {
    return buildPreview(draft);
  },

  create(
    customerId: string,
    draft: DeliveryDraft,
  ): CustomerDelivery {
    const preview =
      buildPreview(draft);

    const delivery: CustomerDelivery =
      {
        ...draft,

        id: createOrderId(),

        customerId,

        originHub:
          preview.originHub,

        destinationHub:
          preview.destinationHub,

        createdAt:
          new Date().toISOString(),

        handoverDeadlineAt:
          preview.handoverDeadlineAt,

        estimatedDepartureAt:
          preview.estimatedDepartureAt,

        estimatedArrivalAt:
          preview.estimatedArrivalAt,

        paymentStatus: "pending",

        orderStatus:
          "pending_review",

        packageReceivedAtHub:
          false,

        price: preview.price,
      };

    writeDeliveries([
      delivery,
      ...readDeliveries(),
    ]);

    this.clearDraft();

    return delivery;
  },

  getAll():
    CustomerDelivery[] {
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

  getById(
    id: string,
  ) {
    return (
      readDeliveries().find(
        (delivery) =>
          delivery.id === id,
      ) ?? null
    );
  },

  markPaid(id: string) {
    const deliveries =
      readDeliveries();

    const next =
      deliveries.map(
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
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}