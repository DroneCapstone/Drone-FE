import { adminErrorText } from '../utils/adminDisplayText';
import { adminFetch } from './adminHttp';

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
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await adminFetch(path, { ...init, headers });
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
export const apiError = (error: unknown) => adminErrorText(error);

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
  assigned_batteries?: { id: string; battery_model?: string; status?: string; charge_level_pct?: number | null }[];
  assigned_drones?: { id: string; name: string; model: string; status: string; battery_level_pct?: number | null }[];
}
/** POST /admin/system/hubs expects the fields documented in the Admin Hub creation guide. */
export interface HubCreateApi {
  code: string;
  name: string;
  address: string;
  area: string;
  capacity: number;
  latitude: number;
  longitude: number;
  status: 'Active' | 'Inactive';
}
export type HubUpdateApi = Partial<Pick<HubApi, 'name' | 'code' | 'area' | 'address' | 'capacity' | 'latitude' | 'longitude' | 'status'>>;
export interface HubSummaryApi { total_hubs: number; active_hubs: number; total_drones: number; total_batteries: number; }

export interface DroneApi {
  id: string; name: string; model: string; status: string; admin_state: string;
  hub_id?: number | null; hub_name?: string | null; hub_code?: string | null;
  battery_level_pct?: number | null; payload_capacity_kg: number; max_speed: number;
  installed_battery_id?: string | null; utilization_pct?: number | null;
}
export interface DroneOverviewApi extends DroneApi {
  assigned_hub_id?: number | null; assigned_hub_name?: string | null; current_hub_id?: number | null;
  current_hub_name?: string | null; installed_battery_model?: string | null;
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
  id: string; capacity_wh: number; status: string; drone_id?: string | number | null;
  current_hub_id?: number | null; charge_level_pct?: number | null; battery_model?: string | null;
  last_charged_at?: string | null; available_status?: string | null; lifecycle_status?: string | null;
  days_until_expiry?: number | null; unit_cost?: number | null; acquisition_cost?: number | null; compatible_drone_models?: string[]; quantity?: number; battery_ids?: string[];
}
export interface PartCategoryApi { id: number; name: string; category_type: string; compatible_drone_models?: string[] | null; unit_cost?: number | null; description?: string | null; is_active?: boolean; }
export interface StockApi { id?: number; hub_id: number; part_category_id: number; part_name: string; category_type: string; quantity: number; min_stock_threshold: number; is_low_stock: boolean; unit_cost?: number | null; compatible_drone_models?: string[] | null; }
export interface AuditApi { id: number; user_id: string | number | null; action: string; resource_table: string | null; details_json: Record<string, unknown> | null; created_at: string; }
export interface AuditPageApi { total: number; page: number; page_size: number; items: AuditApi[]; }
export interface NotificationApi { id: number; title: string; message: string; notifications_type: string; is_read: boolean; created_at: string; reference_id?: string | null; drone_id?: string | number | null; mission_id?: string | null; work_order_id?: number | null; }
export type NotificationType = 'Mission_Status' | 'Payment' | 'System_Alert' | 'AI_Warning' | 'Maintenance';
export interface NotificationQuery { page?: number; page_size?: number; is_read?: boolean; notification_type?: NotificationType; }
export interface NotificationPageApi { total: number; unread_count: number; page: number; page_size: number; items: NotificationApi[]; }
export interface DroneCreateApi { name?: string; model: string; payload_capacity_kg: number; max_speed: number; status?: string; current_hub_id?: number | null; acquisition_cost?: number | null }
export type DroneUpdateApi = Partial<DroneCreateApi>;
export interface BatteryCreateApi { quantity: number; battery_model: string; capacity_wh?: number; unit_cost_override?: number; acquisition_cost?: number; current_hub_id?: number | null; status?: string; charge_level_pct?: number }
export type BatteryUpdateApi = Partial<Pick<BatteryApi, 'battery_model' | 'capacity_wh' | 'status' | 'current_hub_id' | 'charge_level_pct' | 'last_charged_at'>>;
export interface BatteryModelApi { id: number; name: string; capacity_wh: number; unit_cost: number | null; compatible_drone_models?: string[] | null; description?: string | null; is_active: boolean }
export type BatteryModelCreateApi = Pick<BatteryModelApi, 'name' | 'capacity_wh'> & Partial<Pick<BatteryModelApi, 'unit_cost' | 'compatible_drone_models' | 'description'>>;
export interface BatterySupplyApi { hub_id: number; battery_ids: string[]; note?: string }
export interface BatterySupplyResultApi { message: string; hub_id: number; hub_name: string; supplied_count: number; battery_ids: string[]; notified_technician_count: number }
export interface UnassignedTechnicianApi { id: string; full_name: string; email: string; is_active: boolean; created_at: string }
export interface HubTechnicianActionApi { message: string; technician_id: string; full_name: string; hub_id: number | null; hub_name?: string | null; previous_hub_id?: number | null }
export interface StockTransactionApi { id: number; hub_id: number; part_category_id: number; part_name?: string; quantity_delta: number; reason: string; performed_by?: string; reference_id?: string; note?: string; created_at: string }
export interface PartsRequestApi { id: number; requested_by: string; hub_id: number; drone_id: string; part_category_id: number; part_name: string; quantity_needed: number; description: string; status: string; admin_note?: string; hub_stock_available?: number; created_at: string }
export interface ReplacementRequestApi { request_id: number; type: 'BATTERY' | 'PART'; damaged_item_id?: string | null; part_category_id?: number | null; part_name?: string | null; quantity: number; reason: string; status: string; hub_id: number; requested_by: string; photo_urls?: string[] | null; supplied_item_id?: string | null; supplied_at?: string | null; rejection_reason?: string | null; hub_stock_available?: number | null; created_at: string; reviewed_at?: string | null }
export interface RefundResultApi { message: string; order_id: string; refund_amount: number; refund_reason: string; refund_at: string }
export interface SimulatorConfigApi { incident_enabled: boolean; incident_probability: number; incident_min_step: number; incident_severity: string; interval_sec: number; steps_per_leg: number; next_flight_incident: boolean; next_flight_incident_step?: number | null; next_flight_incident_severity?: string | null; next_flight_incident_type: string; next_flight_incident_armed_at?: string | null }
export interface SimulatorIncidentApi { enabled: boolean; incident_type?: 'FAILSAFE_RTH' | 'SIGNAL_LOSS' | 'DISCONNECT_CRASH'; severity?: string; trigger_step?: number | null }
export interface SimulatorTriggerResultApi { message: string; config: SimulatorConfigApi }
export interface AdminDashboardApi {
  revenue: { gross_revenue?: number | null; total_expenses?: number | null; total: number; today: number; this_month: number; paid_orders: number; pending_payments: number; refunds: number };
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
  createHub: (data: HubCreateApi) => send<HubApi>('/admin/system/hubs', 'POST', data),
  updateHub: (id: number, data: HubUpdateApi) => send<HubApi>(`/admin/system/hubs/${id}`, 'PUT', data),
  drones: async () => apiList<DroneApi>(await get<unknown>('/admin/fleet/drones'), 'Drones'),
  drone: (id: string) => get<DroneOverviewApi>(`/admin/fleet/drones/${encodeURIComponent(id)}`),
  droneSummary: () => get<DroneSummaryApi>('/admin/fleet/drones/summary'),
  updateDrone: (id: string, data: DroneUpdateApi) => send<unknown>(`/admin/fleet/drones/${encodeURIComponent(id)}`, 'PUT', data),
  setDroneActive: (id: string, isActive: boolean) => send<unknown>(`/admin/fleet/drones/${encodeURIComponent(id)}/admin-state`, 'PATCH', { admin_state: isActive ? 'ACTIVE' : 'INACTIVE' }),
  droneMaintenance: (id: string) => get<DroneMaintenanceApi>(`/admin/fleet/drones/${encodeURIComponent(id)}/maintenance`),
  droneWorkOrders: async (id: string) => apiList<WorkOrderApi>(await get<unknown>(`/admin/fleet/drones/${encodeURIComponent(id)}/work-orders`), 'Work orders'),
  droneFlights: (id: string) => get<FlightHistoryApi>(`/admin/fleet/drones/${encodeURIComponent(id)}/flight-history`),
  createDrone: (data: DroneCreateApi) => send<DroneApi>('/admin/fleet/drones', 'POST', data),
  deleteDrone: (id: string) => send<unknown>(`/admin/fleet/drones/${encodeURIComponent(id)}`, 'DELETE'),
  workOrderDetail: (id: string) => get<WorkOrderApi>(`/admin/fleet/work-orders/${encodeURIComponent(id)}`),
  flightDetail: (id: string) => get<FlightApi>(`/admin/fleet/flights/${encodeURIComponent(id)}`),
  batteries: async () => apiList<BatteryApi>(await get<unknown>('/admin/fleet/batteries'), 'Batteries'),
  battery: (id: string) => get<BatteryApi>(`/admin/fleet/batteries/${encodeURIComponent(id)}`),
  createBattery: (data: BatteryCreateApi) => send<BatteryApi>('/admin/fleet/batteries', 'POST', data),
  updateBattery: (id: string, data: BatteryUpdateApi) => send<BatteryApi>(`/admin/fleet/batteries/${encodeURIComponent(id)}`, 'PUT', data),
  deleteBattery: (id: string) => send<unknown>(`/admin/fleet/batteries/${encodeURIComponent(id)}`, 'DELETE'),
  batteryModels: async () => apiList<BatteryModelApi>(await get<unknown>('/admin/fleet/battery-models'), 'Battery models'),
  createBatteryModel: (data: BatteryModelCreateApi) => send<BatteryModelApi>('/admin/fleet/battery-models', 'POST', data),
  updateBatteryModel: (id: number, data: Partial<BatteryModelCreateApi> & { is_active?: boolean }) => send<BatteryModelApi>(`/admin/fleet/battery-models/${id}`, 'PATCH', data),
  supplyBatteries: (data: BatterySupplyApi) => send<BatterySupplyResultApi>('/admin/fleet/batteries/supply', 'POST', data),
  techniciansUnassigned: async () => apiList<UnassignedTechnicianApi>(await get<unknown>('/admin/fleet/technicians/unassigned'), 'Unassigned technicians'),
  assignTechnician: (hubId: number, technicianId: string) => send<HubTechnicianActionApi>(`/admin/fleet/hubs/${hubId}/technicians`, 'POST', { technician_id: technicianId }),
  unassignTechnician: (hubId: number, technicianId: string) => send<HubTechnicianActionApi>(`/admin/fleet/hubs/${hubId}/technicians/${encodeURIComponent(technicianId)}`, 'DELETE'),
  transferTechnician: (hubId: number, technicianId: string, newHubId: number) => send<HubTechnicianActionApi>(`/admin/fleet/hubs/${hubId}/technicians/${encodeURIComponent(technicianId)}/transfer`, 'PUT', { new_hub_id: newHubId }),

  // Read-only Admin inventory endpoints (available to existing/future views without altering layout).
  suppliesSummary: () => get<unknown>('/admin/supplies/summary'),
  hubSupplies: (hubId: number, query?: { low_stock_only?: boolean; category_type?: string }) =>
    get<unknown>(`/admin/supplies/hubs/${hubId}${query ? '?' + new URLSearchParams({
      ...(query.low_stock_only !== undefined ? { low_stock_only: String(query.low_stock_only) } : {}),
      ...(query.category_type ? { category_type: query.category_type } : {}),
    }).toString() : ''}`),
  partsRequestDetail: (id: number) => get<PartsRequestApi>(`/admin/supplies/parts-requests/${id}`),
  stockFinanceReport: (month?: number, year?: number) => get<unknown>(`/admin/supplies/finance-report${month || year ? '?' + new URLSearchParams({ ...(month ? { month: String(month) } : {}), ...(year ? { year: String(year) } : {}) }).toString() : ''}`),
  // Administrative stock actions included for typed API parity with the supplied OpenAPI.
  // They are not exposed outside approved UI flows without separate confirmation.
  categories: async () => apiList<PartCategoryApi>(await get<unknown>('/admin/supplies/categories'), 'Part categories'),
  stocks: async () => apiList<StockApi>(await get<unknown>('/admin/supplies'), 'Inventory'), // OpenAPI: no stock row ID; use (hub_id, part_category_id) as row key.
  createCategory: (data: { name: string; category_type: string; compatible_drone_models?: string[]; unit_cost?: number; description?: string }) => send<unknown>('/admin/supplies/categories', 'POST', data),
  updateCategory: (id: number, data: { name?: string; compatible_drone_models?: string[]; unit_cost?: number; description?: string; is_active?: boolean }) => send<unknown>(`/admin/supplies/categories/${id}`, 'PATCH', data),
  receiveStock: (data: { hub_id: number; part_category_id: number; quantity: number; unit_cost_override?: number; note?: string }) => send<unknown>('/admin/supplies/receive', 'POST', data),
  transferStock: (data: { from_hub_id: number; to_hub_id: number; part_category_id: number; quantity: number; note?: string }) => send<unknown>('/admin/supplies/transfer', 'POST', data),
  stockTransactions: async () => apiList<StockTransactionApi>(await get<unknown>('/admin/supplies/transactions'), 'Stock transactions'),
  stockTransactionsFiltered: async (query: { hub_id?: number; part_category_id?: number; reason?: string; limit?: number }) =>
    apiList<StockTransactionApi>(await get<unknown>(`/admin/supplies/transactions?${new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]))}`), 'Stock transactions'),
  setStockThreshold: (hubId: number, data: { part_category_id: number; min_stock_threshold: number }) => send<unknown>(`/admin/supplies/hubs/${hubId}/threshold`, 'PATCH', data),
  adjustStock: (hubId: number, data: { part_category_id: number; quantity_delta: number; reason?: string; note?: string }) => send<unknown>(`/admin/supplies/hubs/${hubId}/adjust`, 'POST', data),
  discardStock: (hubId: number, data: { part_category_id: number; quantity: number; note?: string }) => send<unknown>(`/admin/supplies/hubs/${hubId}/discard`, 'POST', data),
  bulkReceive: (hubId: number, items: Array<{ part_category_id: number; quantity: number; unit_cost_override?: number; note?: string }>) => send<unknown>(`/admin/supplies/hubs/${hubId}/bulk-receive`, 'POST', {hub_id: hubId, items}),
  partsRequests: async () => apiList<PartsRequestApi>(await get<unknown>('/admin/supplies/parts-requests'), 'Parts requests'),
  approvePartsRequest: (id: number, note: string) => send<unknown>(`/admin/supplies/parts-requests/${id}/approve`, 'PATCH', {admin_note: note}),
  rejectPartsRequest: (id: number, note: string) => send<unknown>(`/admin/supplies/parts-requests/${id}/reject`, 'PATCH', {admin_note: note}),
  replacementRequests: async () => apiList<ReplacementRequestApi>(await get<unknown>('/admin/supplies/replacement-requests'), 'Replacement requests'),
  replacementRequest: (id: number) => get<ReplacementRequestApi>(`/admin/supplies/replacement-requests/${id}`),
  supplyReplacement: (id: number, supplied_item_id?: string, admin_note?: string) => send<unknown>(`/admin/supplies/replacement-requests/${id}/supply`, 'PATCH', { ...(supplied_item_id ? { supplied_item_id } : {}), ...(admin_note ? { admin_note } : {}) }),
  rejectReplacement: (id: number, rejection_reason: string) => send<unknown>(`/admin/supplies/replacement-requests/${id}/reject`, 'PATCH', { rejection_reason }),
  transactions: () => get<unknown>('/payments/transactions'), // No structured response schema published by BE.
  refunds: () => get<unknown>('/payments/refunds'), // No structured response schema published by BE.
  refundOrder: (orderId: string, data: { reason: string; amount?: number }) => send<RefundResultApi>(`/payments/orders/${encodeURIComponent(orderId)}/refund`, 'POST', data),
  financialOverview: (month?: number, year?: number) => get<unknown>(`/admin/supplies/financial-overview${month || year ? '?' + new URLSearchParams({...(month ? {month: String(month)} : {}), ...(year ? {year: String(year)} : {})}).toString() : ''}`),
  simulatorConfig: () => get<SimulatorConfigApi>('/system/simulator-config'),
  patchSimulatorConfig: (data: Partial<Pick<SimulatorConfigApi, 'incident_enabled' | 'incident_probability' | 'incident_min_step' | 'incident_severity' | 'interval_sec' | 'steps_per_leg' | 'next_flight_incident'>>) => send<SimulatorConfigApi>('/system/simulator-config', 'PATCH', data),
  triggerNextIncident: (data: SimulatorIncidentApi) => send<SimulatorTriggerResultApi>('/system/simulator-config/trigger-next-incident', 'POST', data),
  audit: (page: number, pageSize = 30) => get<AuditPageApi>(`/system/audit-logs?page=${page}&page_size=${pageSize}`),
  notifications: async (query: NotificationQuery = {}): Promise<NotificationPageApi> => {
    const params = new URLSearchParams({ page: String(query.page ?? 1), page_size: String(query.page_size ?? 20) });
    if (query.is_read !== undefined) params.set('is_read', String(query.is_read));
    if (query.notification_type) params.set('notification_type', query.notification_type);
    const payload = unwrap(await get<unknown>(`/notifications?${params.toString()}`));
    if (!object(payload) || !Array.isArray(payload.items) ||
        !payload.items.every(item => object(item) && Number.isSafeInteger(item.id) &&
          typeof item.title === 'string' && typeof item.message === 'string' &&
          typeof item.notifications_type === 'string' && typeof item.is_read === 'boolean' &&
          typeof item.created_at === 'string') ||
        ![payload.total, payload.unread_count, payload.page, payload.page_size].every(v => typeof v === 'number' && Number.isInteger(v) && v >= 0) ||
        Number(payload.page) < 1 || Number(payload.page_size) < 1) {
      throw new Error('Unexpected notification response structure.');
    }
    return payload as unknown as NotificationPageApi;
  },
  // Compatibility with the paginated helper introduced in main.
  notificationsPage: (page = 1, pageSize = 50): Promise<NotificationPageApi> =>
    adminOperationsApi.notifications({ page, page_size: pageSize }),
  notificationUnreadCount: async (): Promise<number> => {
    const payload = unwrap(await get<unknown>('/notifications/unread-count'));
    const candidates = object(payload) ? [payload.unread_count, payload.count, payload.unread] : [payload];
    for (const candidate of candidates) {
      const value = typeof candidate === 'string' && /^\d+$/.test(candidate.trim()) ? Number(candidate) : candidate;
      if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value;
    }
    throw new Error('Unexpected notification count response.');
  },
  markNotification: (id: number) => send<unknown>(`/notifications/${id}/read`, 'PATCH'),
  markNotificationsRead: () => send<unknown>('/notifications/read-all', 'PATCH'),
  clearReadNotifications: () => send<unknown>('/notifications/clear-read', 'DELETE'),
  deleteNotification: (id: number) => send<unknown>(`/notifications/${id}`, 'DELETE'),
  kpi: () => get<KpiApi>('/admin/dashboard/kpi'),
  dashboard: () => get<AdminDashboardApi>('/admin/dashboard'),
  // ── Reports & Charts ──────────────────────────────────────────────
  revenueChart: (days = 30) => get<{ days: number; data: Array<{ date: string; revenue: number; mission_count: number }> }>(`/admin/reports/chart/revenue?days=${days}`),
  missionsChart: (days = 30) => get<{ days: number; data: Array<{ date: string; total: number; completed: number; failed: number; cancelled: number }> }>(`/admin/reports/chart/missions?days=${days}`),
  droneDailyStats: (days = 30, droneId?: string) => get<{ days: number; total_records: number; data: unknown[] }>(`/admin/fleet/drones/daily-stats?days=${days}${droneId ? `&drone_id=${encodeURIComponent(droneId)}` : ''}`),
  maintenanceDue: () => get<{ total: number; overdue_count: number; warning_count: number; drones: unknown[] }>('/admin/fleet/drones/maintenance-due'),
  cancellationStats: () => get<{ total_cancelled: number; distribution: Array<{ reason: string; count: number; pct: number }>; top_reason: string | null }>('/admin/reports/cancellation-stats'),
};
