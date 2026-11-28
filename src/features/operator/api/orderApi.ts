import {
  API_BASE_URL,
  API_WITH_CREDENTIALS,
} from '../../../config/api';
import { authService } from '../../auth/services/authService';
import type {
  DeliveryMode,
  Order,
  OrderStatus,
  PlanningState,
  OrderPriorityLevel,
  OperatorDrone,
} from '../types/operator';

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
  | 'AWAITING_DROP_OFF'
  | 'AT_HUB'
  | 'PENDING'
  | 'IN_DELIVERY'
  | 'DELIVERED_TO_HUB'
  | 'CANCELLED';

type BackendDeliveryMode = 'EXPRESS' | 'SCHEDULED' | 'NORMAL';

type BackendPlanningState =
  | 'WAITING_PACKAGE'
  | 'FUTURE'
  | 'READY_FOR_PLANNING'
  | 'PLANNED'
  | 'NEEDS_REPLANNING'
  | string;

interface BackendOriginPackage {
  received: boolean;
  received_at?: string | null;
}

interface BackendOrderHub {
  id: string | number;
  name: string;
}

export interface BackendOperatorOrder {
  id: string;
  customer_id: string;
  package_label: string;
  package_type: string;
  payload_kg: number;
  delivery_mode: BackendDeliveryMode;
  status: BackendOrderStatus;
  planningState?: BackendPlanningState | null;
  planning_state?: BackendPlanningState | null;
  planning_state_label?: string | null;
  planningStateLabel?: string | null;
  can_create_mission?: boolean | null;
  canCreateMission?: boolean | null;
  originPackage?: BackendOriginPackage | null;
  requested_delivery_at?: string | null;
  estimated_window_start?: string | null;
  estimated_window_end?: string | null;
  planning_at?: string | null;
  slack_minutes?: number | null;
  priority_score?: number | null;
  priority_level?: string | null;
  coordination_deadline?: string | null;
  customer_deadline?: string | null;
  overdue_minutes?: number | null;
  is_overdue?: boolean | null;

  // The current Swagger List Orders schema does not show these fields yet,
  // but the Operator table needs them to render Origin → Destination.
  // Keep them optional so FE is ready when BE adds them.
  origin_hub_id?: string | null;
  destination_hub_id?: string | null;
  origin_hub?: BackendOrderHub | null;
  destination_hub?: BackendOrderHub | null;

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

interface BackendEligibleDrone {
  id?: string | number;
  drone_id?: string | number;
  name?: string | null;
  model?: string | null;
  maxPayloadKg?: number;
  payload_capacity_kg?: number;
  current_hub_id?: string | number | null;
  current_hub_name?: string | null;
  hub_id?: string | number | null;
  is_cross_hub?: boolean | null;
  isCrossHub?: boolean | null;
  is_selectable?: boolean | null;
  isSelectable?: boolean | null;
  unavailable_reason?: string | null;
  battery_model?: string | null;
  batteryModel?: string | null;
  required_battery_model?: string | null;
  requiredBatteryModel?: string | null;
  compatible_battery_models?: string[];
}

export interface EligibleDronesResult {
  hub: {
    id: string;
    name: string;
    totalDrones: number;
    availableDrones: number;
  };
  drones: OperatorDrone[];
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

export async function operatorApiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const execute = async (accessToken?: string | null) => {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');

    if (init.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    return fetch(`${API_BASE_URL}${path}`, {
      ...init,
      method: init.method ?? 'GET',
      headers,
      credentials: API_WITH_CREDENTIALS ? 'include' : 'omit',
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
    case 'AWAITING_DROP_OFF':
      return 'Awaiting Drop-off';
    case 'AT_HUB':
      return 'At Hub';
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
  switch (mode) {
    case 'EXPRESS': return 'Express';
    case 'NORMAL': return 'Normal';
    case 'SCHEDULED': default: return 'Scheduled';
  }
}

function mapPriorityLevel(value?: string | null): OrderPriorityLevel | undefined {
  const normalized = value?.trim().toUpperCase();
  if (normalized === 'CRITICAL' || normalized === 'HIGH' || normalized === 'MEDIUM' || normalized === 'LOW') {
    return normalized;
  }
  return undefined;
}

function finiteNumber(value?: number | null): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function mapPlanningState(value?: BackendPlanningState | null): PlanningState | undefined {
  if (value == null || !String(value).trim()) return undefined;
  const normalized = String(value).trim().toUpperCase().replace(/[\s-]+/g, '_');

  switch (normalized) {
    case 'WAITING_PACKAGE':
      return 'Waiting for package';
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
  // Never synthesize an estimated window from requested/planning times.
  // If BE did not return an endpoint, show '—' instead of a zero-minute trip.
  const estimatedStart = validIso(raw.estimated_window_start) ?? '';
  const estimatedEnd = validIso(raw.estimated_window_end) ?? '';
  const planningAt = validIso(raw.planning_at) ?? estimatedStart ?? '';
  const createdAt = validIso(raw.created_at) ?? planningAt;
  const originHubId = raw.origin_hub?.id ?? raw.origin_hub_id;
  const destinationHubId = raw.destination_hub?.id ?? raw.destination_hub_id;
  // BE deployments use both camelCase and snake_case. Do not treat missing
  // planning data as Closed or invent permission to create a Mission.
  const rawPlanningState = raw.planningState ?? raw.planning_state;
  const planningLabel = raw.planning_state_label ?? raw.planningStateLabel;
  const rawCanCreate = raw.can_create_mission ?? raw.canCreateMission;

  return {
    id: String(raw.id),
    customerName: raw.customer_name?.trim() || String(raw.customer_id ?? '—'),
    customerPhone: raw.customer_phone?.trim() || '—',
    packageLabel: raw.package_label || '—',
    packageType: raw.package_type || '—',
    payloadKg: Number(raw.payload_kg ?? 0),
    originHubId: originHubId !== null && originHubId !== undefined ? String(originHubId) : '',
    originHubName: raw.origin_hub?.name?.trim() || undefined,
    destinationHubId: destinationHubId !== null && destinationHubId !== undefined ? String(destinationHubId) : '',
    destinationHubName: raw.destination_hub?.name?.trim() || undefined,
    deliveryMode: mapDeliveryMode(raw.delivery_mode),
    requestedDeliveryAt: requested,
    requestedDate: (requested || estimatedStart || createdAt).slice(0, 10),
    initialEstimatedWindow: {
      start: estimatedStart,
      end: estimatedEnd,
    },
    currentEstimatedWindow: {
      start: estimatedStart,
      end: estimatedEnd,
    },
    planningAt,
    planningState: mapPlanningState(rawPlanningState) ?? mapPlanningState(planningLabel),
    planningStateLabel: planningLabel?.trim() || undefined,
    canCreateMission: typeof rawCanCreate === 'boolean' ? rawCanCreate : undefined,
    priorityLevel: mapPriorityLevel(raw.priority_level),
    priorityScore: finiteNumber(raw.priority_score),
    slackMinutes: finiteNumber(raw.slack_minutes),
    coordinationDeadline: validIso(raw.coordination_deadline),
    customerDeadline: validIso(raw.customer_deadline),
    overdueMinutes: finiteNumber(raw.overdue_minutes),
    isOverdue: raw.is_overdue ?? undefined,
    status: mapStatus(raw.status),
    originPackageReceived: raw.originPackage?.received === true,
    originHubReceivedAt:
      raw.originPackage?.received
        ? validIso(raw.originPackage.received_at) ?? undefined
        : undefined,
    destinationHubReceivedAt: validIso(raw.destination_received_at),
    replanRequiredAt: validIso(raw.replan_required_at),
    createdAt,
  };
}


export async function getOperatorOrderApi(orderId: string): Promise<Order> {
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    throw new OperatorApiError('Order ID is required.', 400);
  }

  const payload = await operatorApiRequest<BackendOperatorOrder>(
    `/operator/orders/${encodeURIComponent(normalizedOrderId)}`,
  );

  const detail = toOperatorOrder(payload);
  if (detail.planningState !== undefined && detail.canCreateMission !== undefined) {
    return detail;
  }

  // The detail endpoint may omit planningState/can_create_mission although the
  // Order list endpoint provides them. Reuse only BE-confirmed fields for the
  // exact same Order; never infer permission from timestamps or Order status.
  try {
    const matchingListOrder = (await listOperatorOrdersApi({ search: normalizedOrderId }))
      .find((item) => item.id === normalizedOrderId);
    if (!matchingListOrder) return detail;
    return {
      ...detail,
      planningState: detail.planningState ?? matchingListOrder.planningState,
      planningStateLabel: detail.planningStateLabel ?? matchingListOrder.planningStateLabel,
      canCreateMission: detail.canCreateMission ?? matchingListOrder.canCreateMission,
    };
  } catch {
    // Detail remains usable if the optional list cross-check is unavailable.
    return detail;
  }
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


/** Supports the deployed Operator endpoint and the BE-v2 documented endpoint.
 * Do not switch to a different endpoint on validation/authorization/network failures. */
export async function getEligibleDronesApi(
  orderId: string,
): Promise<EligibleDronesResult> {
  const normalizedOrderId = orderId.trim();
  if (!normalizedOrderId) throw new OperatorApiError('Order ID is required.', 400);

  const encoded = encodeURIComponent(normalizedOrderId);
  const signal = AbortSignal.timeout(20_000);
  let payload: unknown;
  try {
    payload = await operatorApiRequest<unknown>(`/operator/orders/${encoded}/eligible-drones`, { signal });
  } catch (error) {
    if (!(error instanceof OperatorApiError) || ![404, 405].includes(error.status)) throw error;
    payload = await operatorApiRequest<unknown>(`/orders/${encoded}/eligible-drones`, { signal });
  }

  const envelope = isRecord(payload) ? payload : {};
  const nested = isRecord(envelope.data) ? envelope.data : {};
  const rawHub: Record<string, unknown> = isRecord(envelope.hub) ? envelope.hub : isRecord(nested.hub) ? nested.hub : {};
  const rawDrones = Array.isArray(payload) ? payload
    : Array.isArray(envelope.drones) ? envelope.drones
    : Array.isArray(envelope.data) ? envelope.data
    : Array.isArray(nested.drones) ? nested.drones : null;
  if (rawDrones === null) {
    throw new OperatorApiError('Eligible-drones API returned an unsupported response.', 502, payload);
  }

  const hubId = rawHub.id != null ? String(rawHub.id) : '';
  const hubName = typeof rawHub.name === 'string' ? rawHub.name : '';
  const drones = rawDrones.map((entry): OperatorDrone | null => {
    if (!isRecord(entry)) return null;
    const raw = entry as BackendEligibleDrone;
    const rawId = raw.drone_id ?? raw.id;
    if (rawId === null || rawId === undefined || String(rawId).trim() === '') return null;
    const id = String(rawId);
    const locatedAt = raw.current_hub_id ?? raw.hub_id;
    const droneHubId = locatedAt != null ? String(locatedAt) : hubId;
    const crossHub = raw.is_cross_hub === true || raw.isCrossHub === true ||
      Boolean(hubId && droneHubId && droneHubId !== hubId);
    const capacity = Number(raw.payload_capacity_kg ?? raw.maxPayloadKg ?? 0);
    const compatibleModels = Array.isArray(raw.compatible_battery_models) ? raw.compatible_battery_models : [];
    const selectability = raw.is_selectable ?? raw.isSelectable;
    return {
      id,
      // Preserve the actual BE drone name; use `id` as the displayed code.
      name: raw.name?.trim() || id,
      displayId: id,
      model: raw.model?.trim() || '—',
      hubId: droneHubId,
      hubName: raw.current_hub_name?.trim() || (droneHubId === hubId ? hubName : undefined),
      isCrossHub: crossHub,
      isSelectable: selectability !== false,
      unavailableReason: raw.unavailable_reason?.trim() || undefined,
      technicalStatus: 'Available',
      maxPayloadKg: Number.isFinite(capacity) ? capacity : 0,
      batteryModel: raw.requiredBatteryModel?.trim() || raw.required_battery_model?.trim() ||
        raw.batteryModel?.trim() || raw.battery_model?.trim() ||
        (compatibleModels.length === 1 ? compatibleModels[0] : undefined),
    };
  }).filter((drone): drone is OperatorDrone => drone !== null);
  return {
    hub: {
      id: hubId,
      name: hubName,
      totalDrones: Number(rawHub.totalDrones ?? rawHub.total_drones ?? drones.length),
      availableDrones: Number(rawHub.availableDrones ?? rawHub.available_drones ?? drones.filter(d => d.isSelectable !== false).length),
    },
    drones,
  };
}
