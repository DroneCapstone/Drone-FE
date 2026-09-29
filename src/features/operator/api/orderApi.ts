import { authService } from '../../auth/services/authService';
import type {
  DeliveryMode,
  Order,
  OrderStatus,
  PlanningState,
} from '../types/operator';

const DEFAULT_OPERATOR_API_BASE_URL =
  'https://execute-blind-pitch-frequently.trycloudflare.com/api/v1';

console.log("VITE_API_BASE_URL =", import.meta.env.VITE_API_BASE_URL);

const viteEnv = (import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
}).env;

const OPERATOR_API_BASE_URL = (
  viteEnv?.VITE_API_BASE_URL ?? DEFAULT_OPERATOR_API_BASE_URL
).replace(/\/+$/, '');

export class OperatorApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'OperatorApiError';
    this.status = status;
    this.payload = payload;
  }
}

type BackendOrderStatus =
  | 'PENDING'
  | 'IN_DELIVERY'
  | 'DELIVERED_TO_HUB'
  | 'CANCELLED';

type BackendDeliveryMode = 'EXPRESS' | 'SCHEDULED';

type BackendPlanningState =
  | 'FUTURE'
  | 'READY_FOR_PLANNING'
  | 'PLANNED'
  | 'NEEDS_REPLANNING'
  | string;

interface BackendOriginPackage {
  received: boolean;
  received_at?: string | null;
}

export interface BackendOperatorOrder {
  id: string;
  customer_id: string;
  package_label: string;
  package_type: string;
  payload_kg: number;
  delivery_mode: BackendDeliveryMode;
  status: BackendOrderStatus;
  planningState: BackendPlanningState;
  originPackage?: BackendOriginPackage | null;
  requested_delivery_at?: string | null;
  estimated_window_start?: string | null;
  estimated_window_end?: string | null;
  planning_at?: string | null;

  // The current Swagger List Orders schema does not show these fields yet,
  // but the Operator table needs them to render Origin → Destination.
  // Keep them optional so FE is ready when BE adds them.
  origin_hub_id?: string | null;
  destination_hub_id?: string | null;

  // Optional fields that may be added by BE later without breaking this mapper.
  customer_name?: string | null;
  customer_phone?: string | null;
  destination_received_at?: string | null;
  replan_required_at?: string | null;
  created_at?: string | null;
}

export interface ListOperatorOrdersParams {
  search?: string;
  status?: BackendOrderStatus;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

async function parseResponseBody(response: Response) {
  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return response.json();

  const text = await response.text();
  return text || null;
}

function getApiErrorMessage(payload: unknown, status: number) {
  if (isRecord(payload)) {
    if (typeof payload.detail === 'string') return payload.detail;
    if (typeof payload.message === 'string') return payload.message;

    if (Array.isArray(payload.detail)) {
      const first = payload.detail[0];
      if (isRecord(first) && typeof first.msg === 'string') return first.msg;
    }
  }

  return `Operator API request failed (${status}).`;
}

async function operatorApiRequest<T>(path: string): Promise<T> {
  const withCredentials = viteEnv?.VITE_API_WITH_CREDENTIALS === 'true';

  const execute = async (accessToken?: string | null) => {
    const headers = new Headers({ Accept: 'application/json' });

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    return fetch(`${OPERATOR_API_BASE_URL}${path}`, {
      method: 'GET',
      headers,
      credentials: withCredentials ? 'include' : 'omit',
    });
  };

  let accessToken = authService.getAccessToken();
  let response = await execute(accessToken);

  if (response.status === 401 && accessToken) {
    const refreshedToken = await authService.refreshAccessToken();
    if (refreshedToken) {
      accessToken = refreshedToken;
      response = await execute(accessToken);
    }
  }

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    throw new OperatorApiError(
      getApiErrorMessage(payload, response.status),
      response.status,
      payload,
    );
  }

  return payload as T;
}

function unwrapOrderList(payload: unknown): BackendOperatorOrder[] {
  if (Array.isArray(payload)) return payload as BackendOperatorOrder[];

  if (!isRecord(payload)) return [];

  for (const candidate of [payload.data, payload.items, payload.results]) {
    if (Array.isArray(candidate)) return candidate as BackendOperatorOrder[];
  }

  return [];
}

function mapStatus(status: BackendOrderStatus): OrderStatus {
  switch (status) {
    case 'IN_DELIVERY':
      return 'In Delivery';
    case 'DELIVERED_TO_HUB':
      return 'Delivered to Hub';
    case 'CANCELLED':
      return 'Cancelled';
    case 'PENDING':
    default:
      return 'Pending';
  }
}

function mapDeliveryMode(mode: BackendDeliveryMode): DeliveryMode {
  return mode === 'EXPRESS' ? 'Express' : 'Scheduled';
}

function mapPlanningState(value: BackendPlanningState): PlanningState | undefined {
  const normalized = String(value).trim().toUpperCase().replace(/[\s-]+/g, '_');

  switch (normalized) {
    case 'FUTURE':
      return 'Future';
    case 'READY_FOR_PLANNING':
      return 'Ready for Planning';
    case 'PLANNED':
      return 'Planned';
    case 'NEEDS_REPLANNING':
      return 'Needs Replanning';
    default:
      return undefined;
  }
}

function validIso(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function toOperatorOrder(raw: BackendOperatorOrder): Order {
  const requested = validIso(raw.requested_delivery_at);
  const estimatedStart =
    validIso(raw.estimated_window_start) ??
    requested ??
    validIso(raw.planning_at) ??
    new Date().toISOString();
  const estimatedEnd = validIso(raw.estimated_window_end) ?? estimatedStart;
  const planningAt = validIso(raw.planning_at) ?? estimatedStart;
  const createdAt = validIso(raw.created_at) ?? planningAt;

  return {
    id: String(raw.id),
    customerName: raw.customer_name?.trim() || String(raw.customer_id ?? '—'),
    customerPhone: raw.customer_phone?.trim() || '—',
    packageLabel: raw.package_label || '—',
    packageType: raw.package_type || '—',
    payloadKg: Number(raw.payload_kg ?? 0),
    originHubId: raw.origin_hub_id ? String(raw.origin_hub_id) : '',
    destinationHubId: raw.destination_hub_id ? String(raw.destination_hub_id) : '',
    deliveryMode: mapDeliveryMode(raw.delivery_mode),
    requestedDeliveryAt: requested,
    requestedDate: (requested ?? estimatedStart).slice(0, 10),
    initialEstimatedWindow: {
      start: estimatedStart,
      end: estimatedEnd,
    },
    currentEstimatedWindow: {
      start: estimatedStart,
      end: estimatedEnd,
    },
    planningAt,
    planningState: mapPlanningState(raw.planningState),
    status: mapStatus(raw.status),
    originHubReceivedAt:
      raw.originPackage?.received
        ? validIso(raw.originPackage.received_at) ?? undefined
        : undefined,
    destinationHubReceivedAt: validIso(raw.destination_received_at),
    replanRequiredAt: validIso(raw.replan_required_at),
    createdAt,
  };
}

export async function listOperatorOrdersApi(
  params: ListOperatorOrdersParams = {},
): Promise<Order[]> {
  const query = new URLSearchParams();

  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.status) query.set('status', params.status);

  const suffix = query.toString() ? `?${query.toString()}` : '';
  const payload = await operatorApiRequest<unknown>(`/operator/orders${suffix}`);

  return unwrapOrderList(payload).map(toOperatorOrder);
}
