import { operatorApiRequest } from './orderApi';

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

export async function listOperatorNotificationsApi(
  page = 1,
  pageSize = 50,
): Promise<OperatorNotificationPage> {
  return operatorApiRequest<OperatorNotificationPage>(
    `/notifications?page=${page}&page_size=${pageSize}`,
  );
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
