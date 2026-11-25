/* =========================================================
   CUSTOMER API CLIENT

   Uses VITE_API_BASE_URL when provided. The URL may include /api/v1.

   Authentication:
   - Sends credentials: "include" for cookie-based sessions.
   - Chooses a usable bearer token from known legacy auth stores.
   - Ignores *verifiably expired* JWTs; prefers the most recently issued
     remaining JWT if multiple copies are stored.
   - Does not refresh, clear, or replace login sessions; those operations
     belong to the shared Auth module, not this API client.
   ========================================================= */
/*
 * VITE_API_BASE_URL in the current project already ends with /api/v1.
 * The endpoint definitions below also use /api/v1/..., so without
 * normalization the browser calls:
 *
 *   .../api/v1/api/v1/users/me
 *
 * which returns 404.
 *
 * Normalize the configured base back to the backend origin so this
 * client works with either:
 *
 *   https://example.com
 * or
 *   https://example.com/api/v1
 */
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? ""
)
  .replace(/\/+$/, "")
  .replace(/\/api\/v1$/i, "");

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(
    message: string,
    status: number,
    data: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * This client cannot know the canonical token key without the shared Auth
 * module. Support current/legacy stores without blindly selecting the first
 * potentially expired token. The JWT payload is used ONLY for local expiry/
 * recency hints: backend validation is authoritative.
 */
type TokenCandidate = {
  token: string;
  priority: number;
  issuedAt: number | null;
};

function safeStorage(kind: "localStorage" | "sessionStorage"): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window[kind];
  } catch {
    return null;
  }
}

function normalizeStoredToken(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const token = value.trim().replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

function readJwtTimes(token: string): {
  expiresAt: number | null;
  issuedAt: number | null;
} {
  const parts = token.split(".");
  if (parts.length !== 3 || typeof atob !== "function") {
    return { expiresAt: null, issuedAt: null };
  }

  try {
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const claims: unknown = JSON.parse(atob(padded));
    if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
      return { expiresAt: null, issuedAt: null };
    }
    const record = claims as Record<string, unknown>;
    return {
      expiresAt: typeof record.exp === "number" && Number.isFinite(record.exp)
        ? record.exp : null,
      issuedAt: typeof record.iat === "number" && Number.isFinite(record.iat)
        ? record.iat : null,
    };
  } catch {
    // Opaque, malformed or unsupported tokens cannot be dated locally.
    return { expiresAt: null, issuedAt: null };
  }
}

function getAccessToken(): string | null {
  // More specific stores are considered before generic legacy keys when
  // their JWT issue times are unavailable or identical.
  const directKeys = [
    "access_token",
    "accessToken",
    "droneoptai.access_token",
    "auth_token",
    "token",
  ];
  const objectKeys = [
    "droneoptai.auth",
    "droneoptai.session",
    "auth",
    "session",
  ];

  const candidates: TokenCandidate[] = [];
  const now = Math.floor(Date.now() / 1000);
  let priority = 0;

  // Prefer sessionStorage when the source and JWT issue time are otherwise
  // indistinguishable. Both stores are tried because Auth implementation
  // may differ between deployed versions.
  for (const kind of ["sessionStorage", "localStorage"] as const) {
    const storage = safeStorage(kind);
    if (!storage) continue;

    function addToken(raw: unknown) {
      const token = normalizeStoredToken(raw);
      const sourcePriority = priority++;
      if (!token) return;
      const { expiresAt, issuedAt } = readJwtTimes(token);
      // Small skew prevents sending a token that expires during the request.
      if (expiresAt !== null && expiresAt <= now + 10) return;
      candidates.push({ token, priority: sourcePriority, issuedAt });
    }

    for (const key of directKeys) {
      try {
        addToken(storage.getItem(key));
      } catch {
        priority++;
      }
    }

    for (const key of objectKeys) {
      try {
        const raw = storage.getItem(key);
        if (!raw) { priority++; continue; }
        const parsed: unknown = JSON.parse(raw);
        const record = parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? parsed as Record<string, unknown> : null;
        const nested = record?.session && typeof record.session === "object"
          ? record.session as Record<string, unknown> : null;
        addToken(
          record?.access_token ?? record?.accessToken ?? record?.token ??
          nested?.access_token ?? nested?.accessToken ?? nested?.token,
        );
      } catch {
        priority++;
      }
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (a.issuedAt !== null && b.issuedAt !== null && a.issuedAt !== b.issuedAt) {
      return b.issuedAt - a.issuedAt;
    }
    if (a.issuedAt !== null && b.issuedAt === null) return -1;
    if (a.issuedAt === null && b.issuedAt !== null) return 1;
    return a.priority - b.priority;
  });
  return candidates[0].token;
}

function buildUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseResponse(response: Response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(data: unknown, fallback: string) {
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;

    if (typeof record.detail === "string") {
      return record.detail;
    }

    if (typeof record.message === "string") {
      return record.message;
    }

    if (Array.isArray(record.detail)) {
      const first = record.detail[0] as
        | Record<string, unknown>
        | undefined;

      if (typeof first?.msg === "string") {
        return first.msg;
      }
    }
  }

  return fallback;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  config: {
    auth?: boolean;
  } = {},
): Promise<T> {
  const token = config.auth === false ? null : getAccessToken();

  const headers = new Headers(options.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (
    options.body !== undefined &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
    credentials: "include",
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(
        data,
        `Request failed with status ${response.status}`,
      ),
      response.status,
      data,
    );
  }

  return data as T;
}

/* =========================================================
   TYPES
========================================================= */

export type CustomerHubApi = {
  id: string | number;
  name: string;
  address?: string;
  city?: string;
  area?: string;
};

export type CustomerEstimateRequest = {
  origin_hub_id: string | number;
  destination_hub_id: string | number;
  payload_kg: number;
  package_size: "S" | "M" | "L" | "XL";

  /**
   * Current backend pricing distinguishes normal vs fragile handling.
   * Example values from the BE contract: "Standard", "Fragile".
   */
  package_type: string;

  delivery_mode: "NORMAL" | "EXPRESS" | "SCHEDULED";

  /**
   * Retained for Scheduled delivery compatibility.
   */
  requested_delivery_at: string | null;

  /**
   * New BE field. Insurance is 10% of core_fee.
   */
  has_insurance: boolean;
};

export type CustomerFeeDetailsApi = {
  base_fee: number;
  distance_fee: number;
  payload_fee: number;
  insurance_fee: number;
  express_surcharge: number;
  fragile_surcharge: number;
};

export type CustomerEstimateResponse = {
  delivery_fee: number;
  service_fee: number;
  total_fee: number;

  /** Distance (km) returned by POST /customer/orders/estimate. */
  distance_km?: number | null;

  /**
   * New detailed backend breakdown.
   */
  fee_details?: CustomerFeeDetailsApi;

  estimated_departure: string;
  estimated_arrival: string;
  handover_deadline: string;
};

export type CustomerCreateOrderRequest = {
  package_type: string;
  package_label: string;

  payload_kg: number;
  package_size: "S" | "M" | "L" | "XL";

  origin_hub_id: string | number;
  destination_hub_id: string | number;

  delivery_mode: "NORMAL" | "EXPRESS" | "SCHEDULED";

  /**
   * Retained for Scheduled delivery compatibility.
   */
  requested_delivery_at: string | null;

  sender_phone: string;
  /** Requires BE support in POST /api/v1/customer/orders. */
  sender_email: string;
  receiver_name: string;
  receiver_email: string;
  /** Requires BE support in POST /api/v1/customer/orders. */
  receiver_phone: string;

  /**
   * New BE field.
   */
  has_insurance: boolean;
};

export type CustomerCreateOrderResponse = {
  id: string;
  status?: string;
  origin_hub_id?: string | number;
  destination_hub_id?: string | number;
  created_at?: string;
  [key: string]: unknown;
};

export type CustomerProfileApi = {
  id?: string | number;
  email?: string;
  name?: string;
  full_name?: string;
  phone?: string;
  phone_number?: string;
  role?: string;
  [key: string]: unknown;
};

export type NotificationApi = {
  id: string | number;
  title?: string;
  message?: string;
  description?: string;
  content?: string;
  is_read?: boolean;
  read?: boolean;
  read_at?: string | null;
  created_at?: string;
  updated_at?: string;
  order_id?: string;
  delivery_id?: string;
  type?: string;
  [key: string]: unknown;
};

export type PaymentCheckoutResponse = {
  checkout_url?: string;
  checkoutUrl?: string;
  payment_url?: string;
  paymentUrl?: string;

  qr_code?: string;
  qrCode?: string;
  qr_data_url?: string;
  qrDataURL?: string;

  bin?: string | number;
  account_number?: string;
  accountNumber?: string;
  account_name?: string;
  accountName?: string;
  amount?: number;
  description?: string;
  order_code?: number;
  orderCode?: number;
  payment_link_id?: string;
  paymentLinkId?: string;
  status?: string;

  data?: {
    checkout_url?: string;
    checkoutUrl?: string;
    payment_url?: string;
    paymentUrl?: string;

    qr_code?: string;
    qrCode?: string;
    qr_data_url?: string;
    qrDataURL?: string;

    bin?: string | number;
    account_number?: string;
    accountNumber?: string;
    account_name?: string;
    accountName?: string;
    amount?: number;
    description?: string;
    order_code?: number;
    orderCode?: number;
    payment_link_id?: string;
    paymentLinkId?: string;
    status?: string;

    [key: string]: unknown;
  };

  [key: string]: unknown;
};

export type PaymentCheckoutDetails = {
  checkoutUrl: string | null;
  qrCode: string | null;
  qrDataUrl: string | null;
  bin: string | null;
  accountNumber: string | null;
  accountName: string | null;
  amount: number | null;
  description: string | null;
  orderCode: number | null;
  paymentLinkId: string | null;
  status: string | null;
};

export type PaymentStatusResponse = {
  status?: string;
  payment_status?: string;
  paid?: boolean;
  data?: {
    status?: string;
    payment_status?: string;
    paid?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

/* =========================================================
   CUSTOMER API
========================================================= */

/**
 * Last detail response in this running session. This is NOT persisted and
 * never grants deletion by itself: the DELETE endpoint is authoritative.
 * Keeping the raw response allows a page using loadOrderSummaryFromBackend()
 * to check mission_id without issuing a duplicate GET.
 */
const lastOrderDetailById = new Map<string, unknown>();

export const customerApi = {
  getProfile() {
    return apiRequest<CustomerProfileApi>("/api/v1/users/me");
  },

  updateProfile(body: Record<string, unknown>) {
    return apiRequest<CustomerProfileApi>("/api/v1/users/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  /** Soft-delete the signed-in account. Backend verifies active orders/work. */
  deleteMyAccount() {
    return apiRequest<unknown>("/api/v1/users/me", {
      method: "DELETE",
    });
  },

  getHubs() {
    return apiRequest<CustomerHubApi[]>(
      "/api/v1/customer/hubs",
    );
  },

  estimateOrder(body: CustomerEstimateRequest) {
    return apiRequest<CustomerEstimateResponse>(
      "/api/v1/customer/orders/estimate",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
  },

  createOrder(body: CustomerCreateOrderRequest) {
    return apiRequest<CustomerCreateOrderResponse>(
      "/api/v1/customer/orders",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
  },

  /**
   * Fetch Customer orders ONCE per list view, not GET payment status per row.
   * The response shape may be an array or a paginated wrapper.
   */
  getOrders() {
    return apiRequest<unknown>("/api/v1/customer/orders");
  },

  /** Refresh just the currently selected order. */
  async getOrder(orderId: string) {
    const response = await apiRequest<unknown>(
      `/api/v1/customer/orders/${encodeURIComponent(orderId)}`,
    );
    lastOrderDetailById.set(orderId, response);
    return response;
  },

  /** Read the raw detail that the existing detail-page request just fetched. */
  getLastOrderDetail(orderId: string): unknown {
    return lastOrderDetailById.get(orderId) ?? null;
  },

  /** Backend permits deletion only while the order is PENDING, unpaid and has no mission. */
  async deleteOrder(orderId: string) {
    const result = await apiRequest<unknown>(
      `/api/v1/customer/orders/${encodeURIComponent(orderId)}`,
      { method: "DELETE" },
    );
    lastOrderDetailById.delete(orderId);
    return result;
  },

  /** Track only the selected order. Actual event timestamps depend on BE. */
  getOrderTracking(orderId: string) {
    return apiRequest<unknown>(
      `/api/v1/customer/orders/${encodeURIComponent(orderId)}/tracking`,
    );
  },

  createCheckout(orderId: string) {
    return apiRequest<PaymentCheckoutResponse>(
      `/api/v1/payments/orders/${encodeURIComponent(orderId)}/checkout`,
      {
        method: "POST",
      },
    );
  },

  getPaymentStatus(orderId: string) {
    return apiRequest<PaymentStatusResponse>(
      `/api/v1/payments/orders/${encodeURIComponent(orderId)}/status`,
    );
  },

  cancelPayment(orderId: string) {
    return apiRequest<unknown>(
      `/api/v1/payments/orders/${encodeURIComponent(orderId)}/cancel`,
      {
        method: "POST",
      },
    );
  },

  getNotifications() {
    return apiRequest<unknown>("/api/v1/notifications/");
  },

  getUnreadCount() {
    return apiRequest<unknown>("/api/v1/notifications/unread-count");
  },

  markNotificationRead(notificationId: string | number) {
    return apiRequest<unknown>(
      `/api/v1/notifications/${encodeURIComponent(String(notificationId))}/read`,
      {
        method: "PATCH",
      },
    );
  },

  markAllNotificationsRead() {
    return apiRequest<unknown>("/api/v1/notifications/read-all", {
      method: "PATCH",
    });
  },

  getCustomerMissions() {
    return apiRequest<unknown>("/api/v1/customer/missions/");
  },

  getCustomerFleet() {
    return apiRequest<unknown>("/api/v1/customer/fleet/");
  },

  getCustomerAiPredictions() {
    return apiRequest<unknown>("/api/v1/customer/ai_predictions/");
  },

  // ── Delivery Rating ──────────────────────────────────────────────
  submitRating(orderId: string, rating: number, comment?: string) {
    return apiRequest<{
      id: number;
      order_id: string;
      rating: number;
      comment: string | null;
      created_at: string;
    }>(
      `/api/v1/customer/orders/${encodeURIComponent(orderId)}/rating`,
      {
        method: "POST",
        body: JSON.stringify({ rating, comment: comment ?? null }),
      },
    );
  },

  getRating(orderId: string) {
    return apiRequest<{
      id: number;
      order_id: string;
      rating: number;
      comment: string | null;
      created_at: string;
    }>(
      `/api/v1/customer/orders/${encodeURIComponent(orderId)}/rating`,
    );
  },

  // ── Live Position ────────────────────────────────────────────────
  getLivePosition(orderId: string) {
    return apiRequest<{
      order_id: string;
      mission_id: string | null;
      mission_status: string | null;
      latitude: number | null;
      longitude: number | null;
      altitude_m: number | null;
      speed_mps: number | null;
      battery_pct: number | null;
      last_update: string | null;
      elapsed_sec: number | null;
      eta_sec: number | null;
      is_flying: boolean;
      status_label: string;
    }>(
      `/api/v1/customer/orders/${encodeURIComponent(orderId)}/live-position`,
    );
  },

  // ── Cancel Order with Reason ─────────────────────────────────────
  cancelOrderWithReason(orderId: string, reason: string, note?: string) {
    return apiRequest<{ message: string; order_id: string; reason: string; cancelled_at: string }>(
      `/api/v1/customer/orders/${encodeURIComponent(orderId)}/cancel`,
      {
        method: "PATCH",
        body: JSON.stringify({ reason, note: note ?? null }),
      },
    );
  },

  // ── Address Book ─────────────────────────────────────────────────
  getAddresses() {
    return apiRequest<Array<{
      id: number; label: string; recipient_name: string;
      recipient_phone: string; recipient_email: string | null;
      hub_id: number | null; is_default: boolean; created_at: string;
    }>>("/api/v1/customer/addresses");
  },

  createAddress(body: {
    label: string; recipient_name: string; recipient_phone: string;
    recipient_email?: string; hub_id?: number; is_default?: boolean;
  }) {
    return apiRequest<{ id: number; label: string; recipient_name: string; recipient_phone: string; recipient_email: string | null; hub_id: number | null; is_default: boolean; created_at: string }>(
      "/api/v1/customer/addresses",
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  updateAddress(id: number, body: {
    label: string; recipient_name: string; recipient_phone: string;
    recipient_email?: string; hub_id?: number; is_default?: boolean;
  }) {
    return apiRequest<{ id: number; label: string; recipient_name: string; recipient_phone: string; recipient_email: string | null; hub_id: number | null; is_default: boolean; created_at: string }>(
      `/api/v1/customer/addresses/${id}`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
  },

  deleteAddress(id: number) {
    return apiRequest<unknown>(`/api/v1/customer/addresses/${id}`, { method: "DELETE" });
  },
};

/* =========================================================
   NORMALIZERS FOR UNKNOWN WRAPPER SHAPES
========================================================= */

export function unwrapArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;

  for (const key of [
    "items",
    "data",
    "results",
    "notifications",
    "missions",
  ]) {
    if (Array.isArray(record[key])) {
      return record[key] as T[];
    }
  }

  return [];
}

export function extractUnreadCount(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (!value || typeof value !== "object") {
    return 0;
  }

  const record = value as Record<string, unknown>;

  for (const key of [
    "unread_count",
    "unreadCount",
    "count",
  ]) {
    const item = record[key];

    if (typeof item === "number") {
      return item;
    }
  }

  if (record.data && typeof record.data === "object") {
    return extractUnreadCount(record.data);
  }

  return 0;
}

export function extractCheckoutUrl(value: PaymentCheckoutResponse) {
  return (
    value.checkout_url ??
    value.checkoutUrl ??
    value.payment_url ??
    value.paymentUrl ??
    value.data?.checkout_url ??
    value.data?.checkoutUrl ??
    value.data?.payment_url ??
    value.data?.paymentUrl ??
    null
  );
}

export function extractPaymentCheckoutDetails(
  value: PaymentCheckoutResponse,
): PaymentCheckoutDetails {
  const data =
    value.data && typeof value.data === "object"
      ? value.data
      : undefined;

  const readString = (
    ...items: unknown[]
  ): string | null => {
    for (const item of items) {
      if (
        typeof item === "string" &&
        item.trim()
      ) {
        return item.trim();
      }

      if (
        typeof item === "number" &&
        Number.isFinite(item)
      ) {
        return String(item);
      }
    }

    return null;
  };

  const readNumber = (
    ...items: unknown[]
  ): number | null => {
    for (const item of items) {
      if (
        typeof item === "number" &&
        Number.isFinite(item)
      ) {
        return item;
      }

      if (
        typeof item === "string" &&
        item.trim() &&
        Number.isFinite(Number(item))
      ) {
        return Number(item);
      }
    }

    return null;
  };

  const checkoutUrl =
    readString(
      value.checkout_url,
      value.checkoutUrl,
      value.payment_url,
      value.paymentUrl,
      data?.checkout_url,
      data?.checkoutUrl,
      data?.payment_url,
      data?.paymentUrl,
    );

  const qrCode =
    readString(
      value.qr_code,
      value.qrCode,
      data?.qr_code,
      data?.qrCode,
    );

  const qrDataUrl =
    readString(
      value.qr_data_url,
      value.qrDataURL,
      data?.qr_data_url,
      data?.qrDataURL,
    );

  return {
    checkoutUrl,
    qrCode,
    qrDataUrl,

    bin: readString(
      value.bin,
      data?.bin,
    ),

    accountNumber:
      readString(
        value.account_number,
        value.accountNumber,
        data?.account_number,
        data?.accountNumber,
      ),

    accountName:
      readString(
        value.account_name,
        value.accountName,
        data?.account_name,
        data?.accountName,
      ),

    amount: readNumber(
      value.amount,
      data?.amount,
    ),

    description:
      readString(
        value.description,
        data?.description,
      ),

    orderCode:
      readNumber(
        value.order_code,
        value.orderCode,
        data?.order_code,
        data?.orderCode,
      ),

    paymentLinkId:
      readString(
        value.payment_link_id,
        value.paymentLinkId,
        data?.payment_link_id,
        data?.paymentLinkId,
      ),

    status:
      readString(
        value.status,
        data?.status,
      ),
  };
}

/**
 * PayOS / backend payment status mapping.
 * Exact matches matter: "UNPAID" and "NOT_PAID" contain the word "paid",
 * so includes("paid") must NEVER be used to grant payment success.
 * An explicit backend status is authoritative over a boolean `paid` flag.
 */
export function normalizePaymentStatus(value: PaymentStatusResponse) {
  const raw =
    value.payment_status ??
    value.status ??
    value.data?.payment_status ??
    value.data?.status;

  const status = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (
    status === "PAID" ||
    status === "SUCCESS" ||
    status === "SUCCEEDED" ||
    status === "SUCCESSFUL" ||
    status === "COMPLETED" ||
    status === "COMPLETE" ||
    status === "PAYMENT_SUCCESS" ||
    status === "PAYMENT_COMPLETED"
  ) {
    return "paid" as const;
  }

  if (
    status === "CANCELLED" ||
    status === "CANCELED" ||
    status === "EXPIRED" ||
    status === "FAILED" ||
    status === "FAILURE" ||
    status === "REJECTED"
  ) {
    return "failed" as const;
  }

  // Never report PENDING/UNPAID/NOT_PAID as a completed payment.
  // If an explicit status exists but is unknown, fail closed as pending.
  if (status) {
    return "pending" as const;
  }

  // Legacy responses that only provide a boolean flag.
  if (value.paid === true || value.data?.paid === true) {
    return "paid" as const;
  }

  return "pending" as const;
}
