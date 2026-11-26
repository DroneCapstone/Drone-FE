import { adminErrorText } from '../utils/adminDisplayText';
import { API_BASE_URL, API_WITH_CREDENTIALS } from '../../../config/api';
import { authService } from '../../auth/services/authService';

/** Live Admin API. Never fall back to prototype/localStorage on a network failure. */
export class AdminBackendError extends Error {
  status: number;
  constructor(message: string, status = 0) { super(message); this.name = 'AdminBackendError'; this.status = status; }
}
export function messageOf(error: unknown): string { return adminErrorText(error); }
export function objectOf(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function arrayOf(value: unknown, keys = ['items', 'data', 'results']): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.map(objectOf);
  const obj = objectOf(value);
  for (const key of keys) if (Array.isArray(obj[key])) return (obj[key] as unknown[]).map(objectOf);
  throw new Error('Backend returned an unexpected list format.');
}
export function str(value: unknown, fallback = ''): string { return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : fallback; }
export function num(value: unknown, fallback = 0): number { return typeof value === 'number' && Number.isFinite(value) ? value : fallback; }
export function bool(value: unknown): boolean { return value === true; }
export function date(value: unknown): string { return typeof value === 'string' ? value : ''; }

async function send(path: string, init: RequestInit, token: string | null): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${API_BASE_URL}${path}`, {
    ...init, headers, credentials: API_WITH_CREDENTIALS ? 'include' : 'omit',
  });
}
export async function adminRequest<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = authService.getAccessToken();
  let response: Response;
  try {
    response = await send(path, init, token);
    if (response.status === 401 && token) {
      const refreshed = await authService.refreshAccessToken();
      if (refreshed) response = await send(path, init, refreshed);
    }
  } catch (error) {
    throw new AdminBackendError(`Cannot connect to Backend (${path}). Check API URL and network/CORS. ${messageOf(error)}`);
  }
  const raw = response.status === 204 ? '' : await response.text();
  let data: unknown = null;
  if (raw) { try { data = JSON.parse(raw) as unknown; } catch { data = raw; } }
  if (!response.ok) {
    const record = objectOf(data);
    const detail = record.detail ?? record.message;
    const description = typeof detail === 'string' ? detail :
      Array.isArray(detail) ? detail.map((e) => str(objectOf(e).msg)).filter(Boolean).join(' · ') : '';
    throw new AdminBackendError(description || `Backend request failed: HTTP ${response.status}`, response.status);
  }
  return (objectOf(data).data ?? data) as T;
}
const json = (method: string, data: unknown): RequestInit => ({ method, body: JSON.stringify(data) });

export interface LiveHub {
  id: number; name: string; code: string; area: string; address: string;
  latitude: number | null; longitude: number | null; status: string; capacity: number;
  drones_count: number; batteries_count: number; technicians_count: number;
  created_at: string; updated_at: string;
}
export interface LiveHubTechnician { id: string; full_name: string; email: string }
export interface LiveHubDetail extends LiveHub {
  assigned_technicians: Record<string, unknown>[];
  assigned_drones: Record<string, unknown>[];
  assigned_batteries: Record<string, unknown>[];
}
export interface LiveDrone {
  id: string; name: string; model: string;
  hub_id: number | null; hub_name: string; status: string; admin_state: string;
  battery_level_pct: number | null; installed_battery_id: string | null;
  payload_capacity_kg: number; max_speed: number;
}
export interface LiveBattery {
  id: string; battery_model: string; capacity_wh: number;
  status: string; current_hub_id: number | null; drone_id: string | null;
  charge_level_pct: number; available_status: string; lifecycle_status: string;
}
export interface LivePartCategory {
  id: number; name: string; category_type: string; compatible_drone_models: string[];
  unit_cost: number | null; is_active: boolean;
}
export interface LiveInventoryItem {
  id: number; hub_id: number; part_category_id: number; part_name: string;
  category_type: string; quantity: number; min_stock_threshold: number;
  is_low_stock: boolean; unit_cost: number | null; compatible_drone_models: string[];
}
export interface LivePartRequest {
  id: number; requested_by: string; hub_id: number; drone_id: string;
  part_category_id: number; part_name: string; quantity_needed: number;
  description: string; status: string; admin_note: string; actual_cost: number | null;
  hub_stock_available: number | null; created_at: string; reviewed_at: string; fulfilled_at: string;
}
export interface LiveAuditLog {
  id: number; user_id: string; action: string; resource_table: string;
  details_json: Record<string, unknown>; created_at: string;
}
function mapHub(v: Record<string, unknown>): LiveHub {
  return { id: num(v.id), name: str(v.name), code: str(v.code), area: str(v.area), address: str(v.address),
    latitude: typeof v.latitude === 'number' ? v.latitude : null, longitude: typeof v.longitude === 'number' ? v.longitude : null,
    status: str(v.status, 'INACTIVE').toUpperCase(), capacity: num(v.capacity),
    drones_count: num(v.drones_count, num(v.drones)), batteries_count: num(v.batteries_count, num(v.batteries)),
    technicians_count: num(v.technicians_count, num(v.technicians)), created_at: date(v.created_at), updated_at: date(v.updated_at),
  };
}
function mapDrone(v: Record<string, unknown>): LiveDrone {
  return { id: str(v.id), name: str(v.name), model: str(v.model),
    hub_id: typeof v.hub_id === 'number' ? v.hub_id : typeof v.current_hub_id === 'number' ? v.current_hub_id : typeof v.assigned_hub_id === 'number' ? v.assigned_hub_id : null,
    hub_name: str(v.hub_name, str(v.assigned_hub_name, str(v.current_hub_name))), status: str(v.status).toUpperCase(),
    admin_state: str(v.admin_state, 'ACTIVE').toUpperCase(), battery_level_pct: typeof v.battery_level_pct === 'number' ? v.battery_level_pct : null,
    installed_battery_id: v.installed_battery_id == null ? null : str(v.installed_battery_id),
    payload_capacity_kg: num(v.payload_capacity_kg), max_speed: num(v.max_speed),
  };
}
function mapBattery(v: Record<string, unknown>): LiveBattery {
  return { id: str(v.id), battery_model: str(v.battery_model), capacity_wh: num(v.capacity_wh),
    status: str(v.status), current_hub_id: typeof v.current_hub_id === 'number' ? v.current_hub_id : null,
    drone_id: v.drone_id == null ? null : str(v.drone_id), charge_level_pct: num(v.charge_level_pct),
    available_status: str(v.available_status), lifecycle_status: str(v.lifecycle_status),
  };
}
function mapCategory(v: Record<string, unknown>): LivePartCategory {
  return { id: num(v.id), name: str(v.name), category_type: str(v.category_type),
    compatible_drone_models: Array.isArray(v.compatible_drone_models) ? v.compatible_drone_models.map(String) : [],
    unit_cost: typeof v.unit_cost === 'number' ? v.unit_cost : null, is_active: v.is_active !== false };
}
function mapStock(v: Record<string, unknown>): LiveInventoryItem {
  return { id: num(v.id), hub_id: num(v.hub_id), part_category_id: num(v.part_category_id), part_name: str(v.part_name), category_type: str(v.category_type),
    quantity: num(v.quantity), min_stock_threshold: num(v.min_stock_threshold), is_low_stock: bool(v.is_low_stock),
    unit_cost: typeof v.unit_cost === 'number' ? v.unit_cost : null,
    compatible_drone_models: Array.isArray(v.compatible_drone_models) ? v.compatible_drone_models.map(String) : [] };
}
function mapPartRequest(v: Record<string, unknown>): LivePartRequest {
  return { id: num(v.id), requested_by: str(v.requested_by), hub_id: num(v.hub_id), drone_id: str(v.drone_id), part_category_id: num(v.part_category_id),
    part_name: str(v.part_name), quantity_needed: num(v.quantity_needed), description: str(v.description), status: str(v.status),
    admin_note: str(v.admin_note), actual_cost: typeof v.actual_cost === 'number' ? v.actual_cost : null,
    hub_stock_available: typeof v.hub_stock_available === 'number' ? v.hub_stock_available : null,
    created_at: date(v.created_at), reviewed_at: date(v.reviewed_at), fulfilled_at: date(v.fulfilled_at) };
}

export const adminBackend = {
  hubs: async () => arrayOf(await adminRequest('/admin/system/hubs')).map(mapHub),
  hubSummary: () => adminRequest<{ total_hubs: number; active_hubs: number; total_drones: number; total_batteries: number }>('/admin/system/hubs/summary'),
  hub: async (id: number): Promise<LiveHubDetail> => { const v = objectOf(await adminRequest(`/admin/system/hubs/${id}`));
    return { ...mapHub(v), assigned_technicians: Array.isArray(v.assigned_technicians) ? v.assigned_technicians.map(objectOf) : [],
      assigned_drones: Array.isArray(v.assigned_drones) ? v.assigned_drones.map(objectOf) : [],
      assigned_batteries: Array.isArray(v.assigned_batteries) ? v.assigned_batteries.map(objectOf) : [] };
  },
  updateHub: (id: number, input: Record<string, unknown>) => adminRequest(`/admin/system/hubs/${id}`, json('PUT', input)),
  createHub: (input: Record<string, unknown>) => adminRequest('/admin/system/hubs', json('POST', input)),
  drones: async () => arrayOf(await adminRequest('/admin/fleet/drones')).map(mapDrone),
  droneSummary: () => adminRequest<{ total_drones: number; available_drones: number; maintenance_drones: number; in_flight_drones: number }>('/admin/fleet/drones/summary'),
  drone: async (id: string) => mapDrone(objectOf(await adminRequest(`/admin/fleet/drones/${encodeURIComponent(id)}`))),
  droneDetail: (id: string) => adminRequest<Record<string, unknown>>(`/admin/fleet/drones/${encodeURIComponent(id)}`),
  droneMaintenance: (id: string) => adminRequest<Record<string, unknown>>(`/admin/fleet/drones/${encodeURIComponent(id)}/maintenance`),
  droneWorkOrders: async (id: string) => arrayOf(await adminRequest(`/admin/fleet/drones/${encodeURIComponent(id)}/work-orders`)),
  droneFlightHistory: (id: string) => adminRequest<Record<string, unknown>>(`/admin/fleet/drones/${encodeURIComponent(id)}/flight-history`),
  updateDrone: (id: string, input: Record<string, unknown>) => adminRequest(`/admin/fleet/drones/${encodeURIComponent(id)}`, json('PUT', input)),
  createDrone: (input: Record<string, unknown>) => adminRequest('/admin/fleet/drones', json('POST', input)),
  setDroneActive: (id: string, active: boolean) => adminRequest(`/admin/fleet/drones/${encodeURIComponent(id)}/admin-state`, json('PATCH', { admin_state: active ? 'ACTIVE' : 'INACTIVE' })),
  batteries: async () => arrayOf(await adminRequest('/admin/fleet/batteries')).map(mapBattery),
  battery: async (id: string) => mapBattery(objectOf(await adminRequest(`/admin/fleet/batteries/${encodeURIComponent(id)}`))),
  categories: async () => arrayOf(await adminRequest('/admin/supplies/categories'), ['categories', 'items', 'data', 'results']).map(mapCategory),
  inventory: async () => arrayOf(await adminRequest('/admin/supplies'), ['inventory', 'items', 'data', 'results']).map(mapStock),
  createCategory: (input: Record<string, unknown>) => adminRequest('/admin/supplies/categories', json('POST', input)),
  updateCategory: (id: number, input: Record<string, unknown>) => adminRequest(`/admin/supplies/categories/${id}`, json('PATCH', input)),
  receiveStock: (input: {hub_id: number; part_category_id: number; quantity: number; unit_cost_override?: number; note?: string}) => adminRequest('/admin/supplies/receive', json('POST', input)),
  transferStock: (input: {from_hub_id: number; to_hub_id: number; part_category_id: number; quantity: number; note?: string}) => adminRequest('/admin/supplies/transfer', json('POST', input)),
  stockTransactions: async () => arrayOf(await adminRequest('/admin/supplies/transactions')),
  partRequests: async () => arrayOf(await adminRequest('/admin/supplies/parts-requests')).map(mapPartRequest),
  reviewPartRequest: (id: number, approve: boolean, note: string) => adminRequest(`/admin/supplies/parts-requests/${id}/${approve ? 'approve' : 'reject'}`, json('PATCH', { admin_note: note })),
  dashboard: () => adminRequest<Record<string, unknown>>('/admin/dashboard'),
  dashboardKpi: () => adminRequest<Record<string, unknown>>('/admin/dashboard/kpi'),
  audit: async (page = 1, pageSize = 20) => {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    const payload = objectOf(await adminRequest(`/system/audit-logs?${params}`));
    const items = arrayOf(payload.items ?? [], []);
    return { total: num(payload.total), items: items.map((v): LiveAuditLog => ({ id: num(v.id), user_id: str(v.user_id), action: str(v.action),
      resource_table: str(v.resource_table), details_json: objectOf(v.details_json), created_at: date(v.created_at) })) };
  },
};
