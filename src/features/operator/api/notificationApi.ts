import { operatorApiRequest } from './orderApi';
import type { NotificationDetailData } from '../../../components/common/NotificationDetailDialog';

export interface OperatorNotification {
  id: number;
  title: string;
  message: string;
  notifications_type: string;
  is_read: boolean;
  created_at: string;
  reference_id?: string | null;
  drone_id?: string | null;
  work_order_id?: number | null;
  mission_id?: string | null;
}

export interface OperatorNotificationPage {
  items: OperatorNotification[];
  total: number;
  unread_count: number;
  page: number;
  page_size: number;
}

export interface OperatorNotificationFilters {
  is_read?: boolean;
  notification_type?: string;
}

export async function listOperatorNotificationsApi(
  page = 1,
  pageSize = 50,
  filters: OperatorNotificationFilters = {},
  signal?: AbortSignal,
): Promise<OperatorNotificationPage> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (filters.is_read !== undefined) params.set('is_read', String(filters.is_read));
  if (filters.notification_type) params.set('notification_type', filters.notification_type);
  const response = await operatorApiRequest<OperatorNotificationPage | { data: OperatorNotificationPage }>(
    `/notifications?${params.toString()}`, { signal },
  );
  const payload = response && 'data' in response ? response.data : response;
  if (!payload || !Array.isArray(payload.items) ||
      !payload.items.every(item => item && Number.isSafeInteger(item.id) &&
        typeof item.title === 'string' && typeof item.message === 'string' &&
        typeof item.notifications_type === 'string' && typeof item.is_read === 'boolean' &&
        typeof item.created_at === 'string') ||
      !Number.isSafeInteger(payload.total) || payload.total < 0 ||
      !Number.isSafeInteger(payload.page) || payload.page < 1 ||
      !Number.isSafeInteger(payload.page_size) || payload.page_size < 1 ||
      !Number.isSafeInteger(payload.unread_count) || payload.unread_count < 0) {
    throw new Error('Unable to load notifications. Unexpected response structure.');
  }
  return payload;
}

export async function getOperatorUnreadCountApi(): Promise<number> {
  const payload = await operatorApiRequest<{ unread_count?: number } | number>(
    '/notifications/unread-count',
  );
  if (typeof payload === 'number') return payload;
  return typeof payload?.unread_count === 'number' ? payload.unread_count : 0;
}

export const markOperatorNotificationReadApi = (id: number) =>
  operatorApiRequest<unknown>(`/notifications/${id}/read`, { method: 'PATCH' });

export const markAllOperatorNotificationsReadApi = () =>
  operatorApiRequest<unknown>('/notifications/read-all', { method: 'PATCH' });

export const deleteOperatorNotificationApi = (id: number) =>
  operatorApiRequest<unknown>(`/notifications/${id}`, { method: 'DELETE' });

export const clearReadOperatorNotificationsApi = () =>
  operatorApiRequest<unknown>('/notifications/clear-read', { method: 'DELETE' });

export async function getOperatorNotificationDetailApi(id: number): Promise<NotificationDetailData> {
  const response = await operatorApiRequest<NotificationDetailData | { data: NotificationDetailData }>(
    `/notifications/${id}/detail`
  );
  const payload = response && 'data' in response ? response.data : response;
  if (!payload || !payload.notification || !Array.isArray(payload.evidence)) {
    throw new Error('Unable to load notification details. Unexpected response structure.');
  }
  return payload;
}
