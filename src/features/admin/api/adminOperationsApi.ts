import { API_BASE_URL, API_WITH_CREDENTIALS } from '../../../config/api';
import { authService } from '../../auth/services/authService';

/** Admin endpoints in the November 2026 OpenAPI. All paths below are relative to /api/v1. */
export class AdminApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'AdminApiError';
  }
}

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const msg = (value: unknown, status: number) => {
  if (!object(value)) return `Request failed (HTTP ${status}).`;
  if (typeof value.detail === 'string') return value.detail;
  if (typeof value.message === 'string') return value.message;
  if (Array.isArray(value.detail)) return value.detail.map((item) => object(item) && typeof item.msg === 'string' ? item.msg : '').filter(Boolean).join('; ') || `HTTP ${status}`;
  return `Request failed (HTTP ${status}).`;
};

export async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  async function send(token: string | null) {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: API_WITH_CREDENTIALS ? 'include' : 'omit' });
  }
  let response: Response;
  try {
    const token = authService.getAccessToken();
    response = await send(token);
    if (response.status === 401 && token) {
      const refreshed = await authService.refreshAccessToken();
      if (refreshed) response = await send(refreshed);
    }
  } catch (cause) {
    throw new AdminApiError(cause instanceof Error ? `Cannot connect to Backend: ${cause.message}` : 'Cannot connect to Backend.', 0);
  }
  const raw = await response.text();
  let parsed: unknown = null;
  if (raw) { try { parsed = JSON.parse(raw) as unknown; } catch { parsed = raw; } }
  if (!response.ok) throw new AdminApiError(msg(parsed, response.status), response.status);
  return parsed as T;
}

function unwrap(value: unknown): unknown { return object(value) && value.data != null ? value.data : value; }
export function apiList<T>(value: unknown, label: string): T[] {
  const data = unwrap(value);
  if (Array.isArray(data)) return data as T[];
  if (object(data) && Array.isArray(data.items)) return data.items as T[];
  throw new Error(`${label} returned an unexpected list shape; no demo data was substituted.`);
}
export const apiError = (error: unknown) => error instanceof Error ? error.message : 'Unexpected API error.';

export interface HubApi {
  id: number; name: string; code?: string | null; area?: string | null; address?: string | null;
  latitude?: number | null; longitude?: number | null; status?: string | null; capacity: number;
  drones?: number; drones_count?: number; batteries?: number; batteries_count?: number;
  technicians?: number; technicians_count?: number; assigned_drones?: unknown[];
  created_at?: string | null; updated_at?: string | null;
}
export interface HubDetailApi extends HubApi {
  assigned_technician?: { id: string; full_name: string; email: string } | null;
  assigned_technicians?: { id: string; full_name: string; email: string }[];
  assigned_batteries?: { id: string; serial_number?: string; battery_model?: string; status?: string; charge_level_pct?: number | null }[];
  assigned_drones?: { id: string; name: string; model: string; status: string; serial_number?: string; battery_level_pct?: number | null }[];
}
export type HubUpdateApi = Partial<Pick<HubApi, 'name' | 'code' | 'area' | 'address' | 'capacity' | 'latitude' | 'longitude' | 'status'>>;
export interface HubSummaryApi { total_hubs: number; active_hubs: number; total_drones: number; total_batteries: number; }

export interface DroneApi {
  id: string; name: string; model: string; serial_number: string; status: string; admin_state: string;
  hub_id?: number | null; hub_name?: string | null; hub_code?: string | null;
  battery_level_pct?: number | null; payload_capacity_kg: number; max_speed: number;
  installed_battery_id?: string | null; utilization_pct?: number | null;
}
export interface DroneOverviewApi extends DroneApi {
  assigned_hub_id?: number | null; assigned_hub_name?: string | null; current_hub_id?: number | null;
  current_hub_name?: string | null; installed_battery_serial?: string | null; installed_battery_model?: string | null;
  maintenance_status: { open_work_orders: number; completed_work_orders: number; last_maintenance?: string | null; next_maintenance?: string | null; schedule_status?: string; maintenance_note?: string };
  recent_work_orders?: WorkOrderApi[];
  flight_activity: { last_flight?: string | null; total_flights: number; total_flight_hours: number };
}
export interface WorkOrderApi {
  id: number; work_order_code: string; issue: string; status: string; technician_name?: string | null;
  updated_at?: string | null; diagnosis?: string | null; corrective_action?: string | null;
}
export interface FlightApi { id?: string | number; flight_id?: string; flight_code?: string; mission_id?: string | null; route?: string | null; departure?: string | null; departed_at?: string | null; status?: string; [key: string]: unknown; }
export interface FlightHistoryApi { total_flights: number; flight_hours: number; latest_flight?: string | null; flights: FlightApi[]; }
export interface DroneSummaryApi { total_drones: number; available_drones: number; maintenance_drones: number; in_flight_drones: number; }
export interface DroneMaintenanceApi { open_work_orders: number; completed_work_orders: number; maintenance_schedule: string; maintenance_overview: Record<string, unknown>; recent_technician_records: WorkOrderApi[]; }
export interface BatteryApi {
  id: string; serial_number: string; capacity_wh: number; status: string; drone_id?: string | number | null;
  current_hub_id?: number | null; charge_level_pct?: number | null; battery_model?: string | null;
  last_charged_at?: string | null; available_status?: string | null; lifecycle_status?: string | null;
  days_until_expiry?: number | null;
}
export interface PartCategoryApi { id: number; name: string; category_type: string; compatible_drone_models?: string[] | null; unit_cost?: number | null; description?: string | null; is_active?: boolean; }
export interface StockApi { id: number; hub_id: number; part_category_id: number; part_name: string; category_type: string; quantity: number; min_stock_threshold: number; is_low_stock: boolean; unit_cost?: number | null; compatible_drone_models?: string[] | null; }
export interface AuditApi { id: number; user_id: string | number | null; action: string; resource_table: string | null; details_json: Record<string, unknown> | null; created_at: string; }
export interface AuditPageApi { total: number; page: number; page_size: number; items: AuditApi[]; }
export interface NotificationApi { id: number; title: string; message: string; notifications_type: string; is_read: boolean; created_at: string; reference_id?: string | null; }
export interface AdminDashboardApi {
  revenue: { total: number; today: number; this_month: number; paid_orders: number; pending_payments: number; refunds: number };
  users: { total: number; by_role: Record<string, number>; active: number; inactive: number };
  missions: { total: number; by_status: Record<string, number>; success_rate: number };
  fleet: { total_drones: number; by_status: Record<string, number>; avg_utilization_pct: number };
  batteries: { total: number; by_status: Record<string, number>; avg_charge_pct: number };
  ai: { missions_with_prediction: number; avg_estimated_energy_wh: number; risk_breakdown: Record<string, number> };
  alerts: { pending_maintenance_alerts: number; open_incidents: number; total_audit_logs: number };
}
export interface KpiApi { total_drones: number; total_batteries: number; successful_flights: number; failed_flights: number; total_revenue: number; revenue_chart: unknown[]; }

const get = <T>(path: string) => adminRequest<T>(path);
const send = <T>(path: string, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: object) => adminRequest<T>(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) });

export const adminOperationsApi = {
  hubs: async () => apiList<HubApi>(await get<unknown>('/admin/system/hubs'), 'Hubs'),
  hub: (id: number | string) => get<HubDetailApi>(`/admin/system/hubs/${encodeURIComponent(String(id))}`),
  hubSummary: () => get<HubSummaryApi>('/admin/system/hubs/summary'),
  updateHub: (id: number, data: HubUpdateApi) => send<HubApi>(`/admin/system/hubs/${id}`, 'PUT', data),
  drones: async () => apiList<DroneApi>(await get<unknown>('/admin/fleet/drones'), 'Drones'),
  drone: (id: string) => get<DroneOverviewApi>(`/admin/fleet/drones/${encodeURIComponent(id)}`),
  droneSummary: () => get<DroneSummaryApi>('/admin/fleet/drones/summary'),
  updateDrone: (id: string, data: { name?: string; model?: string; payload_capacity_kg?: number; max_speed?: number; current_hub_id?: number | null }) => send<unknown>(`/admin/fleet/drones/${encodeURIComponent(id)}`, 'PUT', data),
  setDroneActive: (id: string, isActive: boolean) => send<unknown>(`/admin/fleet/drones/${encodeURIComponent(id)}/admin-state`, 'PATCH', { admin_state: isActive ? 'ACTIVE' : 'INACTIVE' }),
  droneMaintenance: (id: string) => get<DroneMaintenanceApi>(`/admin/fleet/drones/${encodeURIComponent(id)}/maintenance`),
  droneWorkOrders: async (id: string) => apiList<WorkOrderApi>(await get<unknown>(`/admin/fleet/drones/${encodeURIComponent(id)}/work-orders`), 'Work orders'),
  droneFlights: (id: string) => get<FlightHistoryApi>(`/admin/fleet/drones/${encodeURIComponent(id)}/flight-history`),
  batteries: async () => apiList<BatteryApi>(await get<unknown>('/admin/fleet/batteries'), 'Batteries'),
  battery: (id: string) => get<BatteryApi>(`/admin/fleet/batteries/${encodeURIComponent(id)}`),
  categories: async () => apiList<PartCategoryApi>(await get<unknown>('/admin/inventory/categories'), 'Part categories'),
  stocks: async () => apiList<StockApi>(await get<unknown>('/admin/inventory'), 'Inventory'),
  createCategory: (data: { name: string; category_type: string; compatible_drone_models?: string[]; unit_cost?: number; description?: string }) => send<unknown>('/admin/inventory/categories', 'POST', data),
  updateCategory: (id: number, data: { name?: string; compatible_drone_models?: string[]; unit_cost?: number; description?: string; is_active?: boolean }) => send<unknown>(`/admin/inventory/categories/${id}`, 'PATCH', data),
  receiveStock: (data: { hub_id: number; part_category_id: number; quantity: number; unit_cost_override?: number; note?: string }) => send<unknown>('/admin/inventory/receive', 'POST', data),
  audit: (page: number, pageSize = 30) => get<AuditPageApi>(`/system/audit-logs?page=${page}&page_size=${pageSize}`),
  notifications: async () => apiList<NotificationApi>(await get<unknown>('/notifications/'), 'Notifications'),
  markNotification: (id: number) => send<unknown>(`/notifications/${id}/read`, 'PATCH'),
  markNotificationsRead: () => send<unknown>('/notifications/read-all', 'PATCH'),
  kpi: () => get<KpiApi>('/admin/dashboard/kpi'),
  dashboard: () => get<AdminDashboardApi>('/admin/dashboard'),
};
