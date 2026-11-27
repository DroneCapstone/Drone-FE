import { adminFetch } from './adminHttp';

/** November 2026 Backend contracts: two distinct ADMIN log APIs, no Audit Logs endpoint. */
export type ActivityLogStatus = 'success' | 'failed';
export type SystemLogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface ActivityLogItem {
  id: number;
  user_id: string | null;
  user_email: string | null;
  role: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  description: string | null;
  status: string;
  details_json?: Record<string, unknown> | null;
  created_at: string;
}
export interface SystemLogItem {
  id: number;
  source: string;
  level: string;
  event: string;
  message: string;
  details_json?: Record<string, unknown> | null;
  created_at: string;
}
export interface LogPage<T> { total: number; page: number; page_size: number; items: T[]; }
export interface ActivityLogFilters {
  page?: number; page_size?: number;
  user_id?: string; action?: string; role?: string;
  resource_type?: string; status?: ActivityLogStatus;
}
export interface SystemLogFilters {
  page?: number; page_size?: number;
  source?: string; level?: SystemLogLevel; event?: string;
}

function buildQuery(filters: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && String(value).trim() !== '') params.set(key, String(value).trim());
  });
  return params.toString();
}
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function backendError(value: unknown, status: number): string {
  if (isObject(value)) {
    if (typeof value.detail === 'string') return value.detail;
    if (Array.isArray(value.detail)) {
      const details = value.detail.map(item => isObject(item) && typeof item.msg === 'string' ? item.msg : null).filter(Boolean);
      if (details.length) return details.join(' · ');
    }
    if (typeof value.message === 'string') return value.message;
  }
  return `HTTP ${status}: Could not load logs.`;
}
async function get<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await adminFetch(path, { headers: { Accept: 'application/json' } });
  } catch (cause) {
    throw new Error(cause instanceof Error ? `Cannot connect to Backend: ${cause.message}` : 'Cannot connect to Backend.');
  }
  const text = await response.text();
  let value: unknown = null;
  if (text) { try { value = JSON.parse(text) as unknown; } catch { value = text; } }
  if (!response.ok) throw new Error(backendError(value, response.status));
  return value as T;
}
function validatePage<T>(value: unknown, name: string, valid: (value: unknown) => value is T): LogPage<T> {
  if (!isObject(value) || typeof value.total !== 'number' || !Number.isInteger(value.total) ||
    typeof value.page !== 'number' || !Number.isInteger(value.page) ||
    typeof value.page_size !== 'number' || !Number.isInteger(value.page_size) ||
    !Array.isArray(value.items) ||
    !value.items.every(valid)) {
    throw new Error(`Unexpected ${name} response structure from Backend.`);
  }
  return value as unknown as LogPage<T>;
}
function isActivity(value: unknown): value is ActivityLogItem {
  return isObject(value) && typeof value.id === 'number' && typeof value.action === 'string' &&
    typeof value.status === 'string' && typeof value.created_at === 'string';
}
function isSystem(value: unknown): value is SystemLogItem {
  return isObject(value) && typeof value.id === 'number' && typeof value.source === 'string' &&
    typeof value.level === 'string' && typeof value.event === 'string' &&
    typeof value.message === 'string' && typeof value.created_at === 'string';
}

export const adminLogsApi = {
  async activity(filters: ActivityLogFilters = {}): Promise<LogPage<ActivityLogItem>> {
    const params = buildQuery({ page: 1, page_size: 20, ...filters });
    return validatePage(await get<unknown>(`/admin/activity-logs?${params}`), 'Activity Logs', isActivity);
  },
  async system(filters: SystemLogFilters = {}): Promise<LogPage<SystemLogItem>> {
    const params = buildQuery({ page: 1, page_size: 50, ...filters });
    return validatePage(await get<unknown>(`/admin/system-logs?${params}`), 'System Logs', isSystem);
  },
};
