import {
  PACKAGE_CATEGORIES,
} from "../data/customerData";
import type {
  CustomerDelivery,
  DeliveryMode,
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
/**
 * Backend API uses uppercase delivery mode values.
 * Do not fall back to SCHEDULED for NORMAL orders.
 */
function toApiDeliveryMode(
  mode: DeliveryMode,
): "NORMAL" | "EXPRESS" | "SCHEDULED" {
  switch (mode) {
    case "normal":
      return "NORMAL";
    case "express":
      return "EXPRESS";
    case "scheduled":
      return "SCHEDULED";
    default:
      throw new Error("Please select a valid delivery mode.");
  }
}
/** Shared label used by Create, Review and Order Detail pages. */
export function formatDeliveryMode(
  mode: DeliveryMode | "" | null | undefined,
): string {
  switch (mode) {
    case "normal":
      return "Normal";
    case "express":
      return "Express";
    case "scheduled":
      return "Scheduled";
    default:
      return "—";
  }
}
const DELIVERY_KEY =
  "droneoptai.customer.deliveries";
const DRAFT_KEY =
  "droneoptai.customer.delivery-draft";
const HUBS_KEY =
  "droneoptai.customer.hubs";
const ESTIMATE_KEY =
  "droneoptai.customer.delivery-estimate";
/* =========================================================
   LOCAL CACHE + BACKEND REFRESH
   Backend provides GET /customer/orders and GET /customer/orders/{id}.
   We update the existing local delivery records from those endpoints,
   without polling payment status for all orders. Local details are
   preserved until the exact full response schema can be mapped safely.
\========================================================= */
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
  // Collection by recipient is distinct from arrival at destination hub.
  if (["picked_up", "collected", "package_collected", "package_picked_up", "received_by_recipient", "handed_over_to_recipient"].includes(normalized)) {
    return "collected";
  }
  if (["delivered_to_hub", "at_destination_hub", "ready_for_pickup"].includes(normalized)) {
    return "arrived_at_destination";
  }
  if (
    normalized.includes("complete") ||
    normalized === "delivered"
  ) {
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
    normalized.includes("schedule") ||
    normalized === "at_hub"
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
  const distanceValue = response.distance_km;
  const distanceKm =
    typeof distanceValue === "number" &&
    Number.isFinite(distanceValue) &&
    distanceValue >= 0
      ? distanceValue
      : undefined;
  return {
    originHub,
    destinationHub,
    distanceKm,
    handoverDeadlineAt:
      response.handover_deadline,
    estimatedDepartureAt:
      response.estimated_departure,
    estimatedArrivalAt:
      response.estimated_arrival,
    price,
  };
}
/**
 * Parse the known /customer/orders list wrappers without guessing missing
 * fields. Never clear the local order cache because of an unknown shape.
 */
function parseServerOrders(value: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === "object" && !Array.isArray(item),
    );
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of ["items", "orders", "results", "data"]) {
    if (record[key] !== undefined) {
      const parsed = parseServerOrders(record[key]);
      if (parsed !== null) return parsed;
    }
  }
  return null;
}
function parseServerOrder(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.id !== undefined || record.order_id !== undefined) return record;
  for (const key of ["data", "order", "result"]) {
    const found = parseServerOrder(record[key]);
    if (found) return found;
  }
  return null;
}
function getServerOrderId(order: Record<string, unknown>): string {
  const value = order.id ?? order.order_id;
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}
/** Never infer payment success from an order's generic status field. */
function getServerPaymentStatus(
  order: Record<string, unknown>,
): CustomerDelivery["paymentStatus"] | null {
  const payment =
    order.payment && typeof order.payment === "object" &&
    !Array.isArray(order.payment)
      ? (order.payment as Record<string, unknown>)
      : null;
  const raw =
    order.payment_status ?? order.paymentStatus ??
    payment?.payment_status ?? payment?.status;
  if (typeof raw === "string") {
    const status = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (["PAID", "SUCCESS", "COMPLETED", "SUCCEEDED"].includes(status)) {
      return "paid";
    }
    if (["PENDING", "UNPAID", "NOT_PAID", "WAITING", "PROCESSING"].includes(status)) {
      return "pending";
    }
    if (["FAILED", "CANCELLED", "CANCELED", "EXPIRED", "REJECTED"].includes(status)) {
      return "failed";
    }
    if (status === "REFUNDED") return "refunded";
    return null;
  }
  if (order.paid === true || payment?.paid === true) return "paid";
  if (order.paid === false || payment?.paid === false) return "pending";
  if (typeof order.paid_at === "string" && order.paid_at.trim()) return "paid";
  return null;
}
/** Preserve local fields such as package info/price until BE schema is known. */
function mergeOrderFromServer(
  delivery: CustomerDelivery,
  order: Record<string, unknown>,
): CustomerDelivery {
  const paymentStatus = getServerPaymentStatus(order);
  const backendStatus =
    readText(order.order_status) ?? readText(order.status) ?? undefined;
  const normalized = backendStatus?.trim().toLowerCase() ?? "";
  const isKnownStatus =
    ["pending", "pending_review", "accepted", "scheduled", "cancelled", "canceled",
      "rejected", "in_delivery", "in_transit", "delivered", "completed", "delivered_to_hub", "at_hub",
      "at_destination_hub", "ready_for_pickup", "picked_up", "collected", "package_collected", "package_picked_up", "received_by_recipient",
      "handed_over_to_recipient"].includes(normalized);
  const originPackage = order.originPackage ?? order.origin_package;
  const originReceived =
    originPackage && typeof originPackage === "object"
      ? (originPackage as Record<string, unknown>).received
      : undefined;
  return {
    ...delivery,
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(isKnownStatus
      ? { orderStatus: normalizeOrderStatus(backendStatus) }
      : {}),
    ...(backendStatus ? { backendStatus } : {}),
    ...(typeof originReceived === "boolean"
      ? { packageReceivedAtHub: originReceived }
      : ["at_hub", "in_delivery", "delivered_to_hub"].includes(normalized)
        ? { packageReceivedAtHub: true }
        : {}),
  };
}
/**
 * A list row needs fewer fields than a full CustomerDelivery.
 * GET /customer/orders does not return package_size, handover times or
 * the fee breakdown. Keep missing fields as null instead of fabricating them.
 */
/**
 * Server-provided historical quotation components. All figures are optional:
 * GET /customer/orders/{id} may omit them for older orders. Never recreate
 * historical financial values from today's pricing rules.
 */
export type CustomerOrderFeeBreakdown = {
  baseFee: number | null;
  distanceFee: number | null;
  payloadFee: number | null;
  insuranceFee: number | null;
  expressSurcharge: number | null;
  fragileSurcharge: number | null;
  coreFee: number | null;
  deliverySubtotal: number | null;
  serviceFee: number | null;
};
function readFeeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value.trim())) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  return null;
}
function feeObject(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
function readServerFeeBreakdown(
  order: Record<string, unknown>,
): CustomerOrderFeeBreakdown | null {
  const pricing = feeObject(order.pricing) ?? feeObject(order.quotation);
  const fees = feeObject(order.fee_details) ??
    feeObject(order.price_breakdown) ??
    feeObject(order.pricing_details) ??
    feeObject(pricing?.fee_details) ??
    feeObject(pricing?.price_breakdown);
  if (!fees) return null;
  // Only use explicitly provided components. A bare delivery_fee from the
  // list endpoint is the amount charged, NOT necessarily the subtotal.
  const baseFee = readFeeNumber(fees.base_fee);
  const distanceFee = readFeeNumber(fees.distance_fee);
  const payloadFee = readFeeNumber(fees.payload_fee);
  const coreFee = readFeeNumber(fees.core_fee) ??
    (baseFee !== null && distanceFee !== null && payloadFee !== null
      ? baseFee + distanceFee + payloadFee : null);
  const result: CustomerOrderFeeBreakdown = {
    baseFee,
    distanceFee,
    payloadFee,
    insuranceFee: readFeeNumber(fees.insurance_fee),
    expressSurcharge: readFeeNumber(fees.express_surcharge),
    fragileSurcharge: readFeeNumber(fees.fragile_surcharge),
    coreFee,
    deliverySubtotal: readFeeNumber(fees.delivery_subtotal) ??
      readFeeNumber(order.delivery_subtotal),
    serviceFee: readFeeNumber(fees.service_fee) ??
      readFeeNumber(order.service_fee),
  };
  if (Object.values(result).every((value) => value === null)) return null;
  return result;
}
export type CustomerOrderSummary = {
  id: string;
  customerId: string;
  createdAt: string;
  originHub: DeliveryHub;
  destinationHub: DeliveryHub;
  weightKg: number | null;
  packageSize: string | null;
  deliveryMode: DeliveryMode | null;
  paymentStatus: CustomerDelivery["paymentStatus"] | null;
  orderStatus: string;
  statusLabel: string;
  customerStatus?: string;
  /** Confirmed backend timestamps; null when the API has not supplied them. */
  paidAt?: string | null;
  originReceivedAt?: string | null;
  scheduledAt?: string | null;
  departedAt?: string | null;
  destinationReceivedAt?: string | null;
  collectedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  /** Forecasts, NOT evidence that a milestone was reached. */
  estimatedDepartureAt?: string | null;
  estimatedArrivalAt?: string | null;
  packageLabel?: string | null;
  packageType?: string | null;
  insuranceIncluded?: boolean | null;
  totalFee: number | null;
  feeBreakdown?: CustomerOrderFeeBreakdown | null;
  source: "backend" | "local";
};
const backendOrdersByCustomer = new Map<string, Map<string, Record<string, unknown>>>();
function readText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function readNumeric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function readServerHub(value: unknown, fallback?: DeliveryHub): DeliveryHub {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback ?? { id: "", name: "—", address: "" };
  }
  const raw = value as Record<string, unknown>;
  return {
    id: typeof raw.id === "string" || typeof raw.id === "number"
      ? raw.id : fallback?.id ?? "",
    name: readText(raw.name) ?? fallback?.name ?? "—",
    address: readText(raw.address) ?? fallback?.address ?? "",
  };
}
function summarizeLocal(delivery: CustomerDelivery): CustomerOrderSummary {
  return {
    id: delivery.id,
    customerId: delivery.customerId,
    createdAt: delivery.createdAt,
    originHub: delivery.originHub,
    destinationHub: delivery.destinationHub,
    weightKg: delivery.weightKg,
    packageSize: delivery.packageSize,
    deliveryMode: delivery.deliveryMode,
    paymentStatus: delivery.paymentStatus,
    orderStatus: delivery.backendStatus ?? delivery.orderStatus,
    statusLabel: customerDeliveryService.getCustomerStatus(delivery),
    customerStatus: undefined,
    estimatedDepartureAt: delivery.estimatedDepartureAt ?? null,
    estimatedArrivalAt: delivery.estimatedArrivalAt ?? null,
    packageLabel: null,
    packageType: null,
    insuranceIncluded: delivery.hasInsurance,
    totalFee: delivery.price.total,
    source: "local",
  };
}
function summarizeServer(
  order: Record<string, unknown>,
  customerId: string,
  local?: CustomerDelivery,
): CustomerOrderSummary {
  const mode = readText(order.delivery_mode)?.toUpperCase();
  const deliveryMode = mode === "NORMAL" ? "normal" as const
    : mode === "EXPRESS" ? "express" as const
    : mode === "SCHEDULED" ? "scheduled" as const
    : local?.deliveryMode ?? null;
  const backendStatus = readText(order.order_status) ?? readText(order.status)
    ?? local?.backendStatus ?? "";
  const customerStatus = readText(order.customer_status);
  // BE currently labels DELIVERED_TO_HUB as "Completed"; that is hub arrival,
  // not proof of collection by the recipient.
  const statusLabel = backendStatus.trim().toUpperCase() === "DELIVERED_TO_HUB"
    ? "Arrived at destination hub / Ready for pickup"
    : readText(order.status_label)
    ?? (customerStatus === "awaiting_payment" ? "Awaiting payment" : null)
    ?? (local ? customerDeliveryService.getCustomerStatus(local) : null)
    ?? (backendStatus ? backendStatus.replace(/_/g, " ") : "—");
  return {
    id: getServerOrderId(order),
    customerId,
    createdAt: readText(order.created_at) ?? local?.createdAt ?? "",
    originHub: readServerHub(order.origin_hub, local?.originHub),
    destinationHub: readServerHub(order.destination_hub, local?.destinationHub),
    weightKg: readNumeric(order.payload_kg) ?? local?.weightKg ?? null,
    // This field is NOT present in current GET /customer/orders response.
    packageSize: readText(order.package_size) ?? local?.packageSize ?? null,
    deliveryMode,
    paymentStatus: getServerPaymentStatus(order) ?? local?.paymentStatus ?? null,
    orderStatus: backendStatus,
    statusLabel,
    customerStatus: customerStatus ?? undefined,
    // Distinguish actual backend events from estimated times.
    paidAt: readText(order.paid_at) ?? readText(order.payment_confirmed_at),
    originReceivedAt: readText(order.origin_received_at),
    scheduledAt: readText(order.mission_scheduled_at) ?? readText(order.scheduled_at),
    departedAt: readText(order.departed_at) ?? readText(order.flight_started_at),
    destinationReceivedAt: readText(order.destination_received_at),
    collectedAt: readText(order.collected_at) ?? readText(order.recipient_collected_at),
    cancelledAt: readText(order.cancelled_at),
    cancellationReason: readText(order.cancellation_reason),
    estimatedDepartureAt: readText(order.estimated_departure),
    estimatedArrivalAt: readText(order.estimated_arrival),
    packageLabel: readText(order.package_label),
    packageType: readText(order.package_type),
    insuranceIncluded: typeof order.has_insurance === "boolean" ? order.has_insurance : null,
    totalFee: readNumeric(order.total_fee) ?? readNumeric(order.delivery_fee)
      ?? local?.price.total ?? null,
    feeBreakdown: readServerFeeBreakdown(order),
    source: "backend",
  };
}
// Reuse an in-flight GET when React StrictMode or two screens request it.
const ordersSyncInFlight = new Map<string, Promise<void>>();
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
        "Please select a valid origin and destination hub.",
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
        delivery_mode: toApiDeliveryMode(draft.deliveryMode),
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
    const senderEmail = (draft.senderEmail ?? "").trim().toLowerCase();
    const receiverPhone = (draft.recipientPhone ?? "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiverEmail)) {
      throw new Error("Please enter a valid recipient email address.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
      throw new Error("Please enter a valid sender email address.");
    }
    if (receiverPhone.replace(/\D/g, "").length < 9) {
      throw new Error("Please enter a valid recipient phone number.");
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
        delivery_mode: toApiDeliveryMode(draft.deliveryMode),
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

        sender_email: senderEmail,

        receiver_name:

          draft.recipientName.trim(),

        receiver_email:

          receiverEmail,

        receiver_phone: receiverPhone,
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
      distanceKm: estimate.distanceKm,
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
  /**
   * A single GET /customer/orders replaces the old N calls to
   * /payments/orders/{id}/status. Existing cached orders are reconciled
   * using explicit fields returned by BE; no cache data is deleted.
   *
   * When BE's full order-list schema is available, remote-only orders can
   * be mapped here as well (instead of fabricating missing order details).
   */
  async syncOrdersFromBackend(customerId: string): Promise<void> {
    const existing = ordersSyncInFlight.get(customerId);
    if (existing) return existing;
    const request = (async () => {
      const response = await customerApi.getOrders();
      const orders = parseServerOrders(response);
      if (!orders) {
        throw new Error("Unexpected format from GET /customer/orders");
      }
      const byId = new Map(
        orders.map((order) => [getServerOrderId(order), order] as const)
          .filter(([id]) => Boolean(id)),
      );
      // The remote list is authoritative for the list UI, including records
      // created on another device or missing from localStorage.
      backendOrdersByCustomer.set(customerId, byId);
      // Reconcile existing full cached records without inventing fields that
      // the list endpoint does not provide (size, price breakdown, ETA, etc).
      const merged = readDeliveries().map((delivery) => {
        if (delivery.customerId !== customerId) return delivery;
        const serverOrder = byId.get(delivery.id);
        return serverOrder ? mergeOrderFromServer(delivery, serverOrder) : delivery;
      });
      writeDeliveries(merged);
    })();
    ordersSyncInFlight.set(customerId, request);
    try {
      await request;
    } finally {
      if (ordersSyncInFlight.get(customerId) === request) {
        ordersSyncInFlight.delete(customerId);
      }
    }
  },
  /** Display all BE orders, then any legacy cached-only orders as fallback. */
  getOrderSummariesByCustomer(customerId: string): CustomerOrderSummary[] {
    const locals = readDeliveries().filter((d) => d.customerId === customerId);
    const localById = new Map(locals.map((d) => [d.id, d] as const));
    const backend = backendOrdersByCustomer.get(customerId);
    // After a successful GET, the server list is authoritative. If GET has
    // not succeeded yet, keep showing the local cache as an offline fallback.
    const result: CustomerOrderSummary[] = backend
      ? Array.from(backend.values())
          .filter((order) => Boolean(getServerOrderId(order)))
          .map((order) => summarizeServer(order, customerId, localById.get(getServerOrderId(order))))
      : locals.map(summarizeLocal);
    return result.sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
    );
  },
  /** Timeline fallback for a legacy local order, even if BE list lacks it. */
  getLocalOrderSummary(customerId: string, id: string): CustomerOrderSummary | null {
    const delivery = readDeliveries().find(
      (item) => item.id === id && item.customerId === customerId,
    );
    return delivery ? summarizeLocal(delivery) : null;
  },
  getServerOrderSummary(customerId: string, id: string): CustomerOrderSummary | null {
    const order = backendOrdersByCustomer.get(customerId)?.get(id);
    if (!order) return null;
    const local = readDeliveries().find((d) => d.id === id && d.customerId === customerId);
    return summarizeServer(order, customerId, local);
  },
  /** Supports direct navigation/reload for orders absent from localStorage. */
  async loadOrderSummaryFromBackend(customerId: string, id: string): Promise<CustomerOrderSummary> {
    const response = await customerApi.getOrder(id);
    const order = parseServerOrder(response);
    if (!order || getServerOrderId(order) !== id) {
      throw new Error("Order details are unavailable.");
    }
    const byId = backendOrdersByCustomer.get(customerId) ?? new Map();
    // Detail may return a different subset of fields from the list endpoint.
    const combined = { ...(byId.get(id) ?? {}), ...order };
    byId.set(id, combined);
    backendOrdersByCustomer.set(customerId, byId);
    const local = readDeliveries().find((d) => d.id === id && d.customerId === customerId);
    if (local) upsertDelivery(mergeOrderFromServer(local, combined));
    return summarizeServer(combined, customerId, local);
  },
  /** A selected detail only fetches its own Order, never all payment statuses. */
  async syncOrderFromBackend(id: string): Promise<CustomerDelivery | null> {
    const response = await customerApi.getOrder(id);
    const order = parseServerOrder(response);
    if (!order || getServerOrderId(order) !== id) {
      return this.getById(id);
    }
    const cached = this.getById(id);
    if (!cached) return null;
    return upsertDelivery(mergeOrderFromServer(cached, order));
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
      return delivery.backendStatus?.toUpperCase() === "AT_HUB"
        ? "Package received at origin hub / Preparing delivery"
        : "Scheduled";
    }
    if (
      delivery.orderStatus ===
      "in_delivery"
    ) {
      return "In delivery";
    }
    if (delivery.orderStatus === "arrived_at_destination") {
      return "Arrived at destination hub / Ready for pickup";
    }
    if (delivery.orderStatus === "collected") {
      return "Package collected by recipient";
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
/** Format hub distance without calculating or inventing a route. */
export function formatDistanceKm(distanceKm?: number | null): string {
  if (
    typeof distanceKm !== "number" ||
    !Number.isFinite(distanceKm) ||
    distanceKm < 0
  ) {
    return "—";
  }
  return `${distanceKm.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} km`;
}
