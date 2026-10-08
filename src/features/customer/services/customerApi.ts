/* =========================================================
   CUSTOMER API CLIENT

   Uses VITE_API_BASE_URL when provided.
   Example:
   VITE_API_BASE_URL=https://your-backend.example.com

   Auth:
   - Sends credentials: "include" for cookie-based auth.
   - Also tries common localStorage token keys and sends
     Authorization: Bearer <token> when one is found.
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

function getAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  const directKeys = [
    "access_token",
    "accessToken",
    "token",
    "auth_token",
    "droneoptai.access_token",
  ];

  for (const key of directKeys) {
    const value = window.localStorage.getItem(key);

    if (value) {
      return value.replace(/^Bearer\s+/i, "").trim();
    }
  }

  const objectKeys = [
    "auth",
    "session",
    "droneoptai.auth",
    "droneoptai.session",
  ];

  for (const key of objectKeys) {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw);
      const token =
        parsed?.access_token ??
        parsed?.accessToken ??
        parsed?.token ??
        parsed?.session?.access_token ??
        parsed?.session?.accessToken;

      if (typeof token === "string" && token.trim()) {
        return token.replace(/^Bearer\s+/i, "").trim();
      }
    } catch {
      // Ignore non-JSON localStorage entries.
    }
  }

  return null;
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

  delivery_mode: "EXPRESS" | "SCHEDULED";

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

  delivery_mode: "EXPRESS" | "SCHEDULED";

  /**
   * Retained for Scheduled delivery compatibility.
   */
  requested_delivery_at: string | null;

  sender_phone: string;
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
  data?: {
    checkout_url?: string;
    checkoutUrl?: string;
    payment_url?: string;
    paymentUrl?: string;
    qr_code?: string;
    qrCode?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
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

export function normalizePaymentStatus(value: PaymentStatusResponse) {
  const raw =
    value.payment_status ??
    value.status ??
    value.data?.payment_status ??
    value.data?.status;

  if (value.paid === true || value.data?.paid === true) {
    return "paid" as const;
  }

  const normalized = String(raw ?? "").toLowerCase();

  if (
    normalized.includes("paid") ||
    normalized.includes("success") ||
    normalized.includes("completed")
  ) {
    return "paid" as const;
  }

  if (
    normalized.includes("cancel") ||
    normalized.includes("expired") ||
    normalized.includes("failed")
  ) {
    return "failed" as const;
  }

  return "pending" as const;
}
