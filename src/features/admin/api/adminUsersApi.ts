import { adminErrorText } from '../utils/adminDisplayText';
import { adminFetch } from './adminHttp';

/** OpenAPI: /api/v1/admin/users (ProfileResponse & UserRole). */
export type AdminApiRole = 'Admin' | 'Operator' | 'Technician' | 'Customer';
export interface AdminApiUser {
  id: string;
  full_name: string;
  email: string;
  role: AdminApiRole;
  is_active: boolean;
}
export interface CreateAdminUserInput {
  full_name: string;
  email: string;
  role: Exclude<AdminApiRole, 'Customer'>;
  password: string;
}
export interface UpdateAdminUserInput {
  full_name?: string;
  email?: string;
  role?: AdminApiRole;
}
export interface AdminUserActivityItem {
  id: number;
  user_id: string | number | null;
  action: string;
  resource_type: string | null;
  description?: string | null;
  created_at: string;
}
interface ActivityResponse { items: AdminUserActivityItem[] }

export class AdminUsersApiError extends Error {
  public status: number;
  public payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'AdminUsersApiError';
    this.status = status;
    this.payload = payload;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function errorMessage(body: unknown, status: number): string {
  if (!isRecord(body)) return `Backend request failed (HTTP ${status}).`;
  if (typeof body.detail === 'string') return body.detail;
  if (typeof body.message === 'string') return body.message;
  if (Array.isArray(body.detail)) {
    const messages = body.detail.map((item) => {
      if (!isRecord(item) || typeof item.msg !== 'string') return null;
      const field = Array.isArray(item.loc) ? item.loc.filter((segment) => segment !== 'body').join('.') : '';
      return field ? `${field}: ${item.msg}` : item.msg;
    }).filter(Boolean);
    if (messages.length) return messages.join(' · ');
  }
  return `Backend request failed (HTTP ${status}).`;
}

async function readResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text) as unknown; } catch { return text; }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body) headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await adminFetch(path, { ...init, headers });
  } catch (cause) {
    throw new AdminUsersApiError('Cannot connect to Backend. Check the API URL, network and CORS configuration.', 0, cause);
  }
  const body = await readResponse(response);
  if (!response.ok) throw new AdminUsersApiError(errorMessage(body, response.status), response.status, body);
  return body as T;
}

function asUser(value: unknown): AdminApiUser {
  if (!isRecord(value) || typeof value.id !== 'string' ||
    typeof value.email !== 'string' || typeof value.full_name !== 'string' ||
    !['Admin', 'Operator', 'Technician', 'Customer'].includes(String(value.role)) ||
    typeof value.is_active !== 'boolean') {
    throw new Error('Admin Users API returned an unexpected user structure.');
  }
  return value as unknown as AdminApiUser;
}
function unwrap(value: unknown): unknown {
  return isRecord(value) && 'data' in value && value.data != null ? value.data : value;
}

export const adminUsersApi = {
  async listUsers(isActive?: boolean): Promise<AdminApiUser[]> {
    const query = typeof isActive === 'boolean' ? `?is_active=${isActive}` : '';
    const payload = unwrap(await request<unknown>(`/admin/users/${query}`));
    if (!Array.isArray(payload)) throw new Error('Admin Users API did not return a user list.');
    return payload.map(asUser);
  },
  async getUser(id: string): Promise<AdminApiUser> {
    return asUser(unwrap(await request<unknown>(`/admin/users/${encodeURIComponent(id)}`)));
  },
  async createUser(input: CreateAdminUserInput): Promise<AdminApiUser> {
    return asUser(unwrap(await request<unknown>('/admin/users/', { method: 'POST', body: JSON.stringify(input) })));
  },
  async updateUser(id: string, input: UpdateAdminUserInput): Promise<AdminApiUser> {
    return asUser(unwrap(await request<unknown>(`/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) })));
  },
  async deactivateUser(id: string): Promise<void> {
    await request<unknown>(`/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  async restoreUser(id: string): Promise<AdminApiUser> {
    return asUser(unwrap(await request<unknown>(`/admin/users/${encodeURIComponent(id)}/restore`, { method: 'PATCH' })));
  },
  /** user_id filters events performed BY this user, not changes made TO their account. */
  async listActionsByUser(id: string): Promise<AdminUserActivityItem[]> {
    const query = new URLSearchParams({ user_id: id, page: '1', page_size: '5' });
    const payload = unwrap(await request<unknown>(`/admin/activity-logs?${query.toString()}`));
    if (!isRecord(payload) || !Array.isArray(payload.items)) return [];
    return (payload as unknown as ActivityResponse).items.filter((item) =>
      typeof item.id === 'number' && typeof item.action === 'string' && typeof item.created_at === 'string');
  },
};

export const isArchivedUser = (user: AdminApiUser) => !user.is_active && user.email.startsWith('archived_');
export const apiErrorText = (error: unknown) => adminErrorText(error);
