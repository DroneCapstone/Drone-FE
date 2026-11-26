import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  clearReadOperatorNotificationsApi,
  deleteOperatorNotificationApi,
  getOperatorUnreadCountApi,
  listOperatorNotificationsApi,
  markAllOperatorNotificationsReadApi,
  markOperatorNotificationReadApi,
  type OperatorNotificationFilters,
} from '../api/notificationApi';
import { operatorQueryKeys } from '../query/queryKeys';

export const OPERATOR_NOTIFICATION_PAGE_SIZE = 20;

export function useOperatorNotificationsQuery(page = 1, filters: OperatorNotificationFilters = {}) {
  return useQuery({
    queryKey: [...operatorQueryKeys.notificationList(), page, OPERATOR_NOTIFICATION_PAGE_SIZE, filters],
    queryFn: ({ signal }) => listOperatorNotificationsApi(page, OPERATOR_NOTIFICATION_PAGE_SIZE, filters, signal),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}

export function useOperatorUnreadCountQuery() {
  return useQuery({
    queryKey: operatorQueryKeys.notificationUnreadCount(),
    queryFn: getOperatorUnreadCountApi,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}

function useInvalidateOperatorNotifications() {
  const queryClient = useQueryClient();
  return () => {
    return Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: operatorQueryKeys.notificationList() }),
      queryClient.invalidateQueries({ queryKey: operatorQueryKeys.notificationUnreadCount() }),
    ]).then(() => undefined);
  };
}

export function useMarkOperatorNotificationReadMutation() {
  const invalidate = useInvalidateOperatorNotifications();
  return useMutation({
    mutationFn: (id: number) => markOperatorNotificationReadApi(id),
    onSuccess: invalidate,
  });
}

export function useMarkAllOperatorNotificationsReadMutation() {
  const invalidate = useInvalidateOperatorNotifications();
  return useMutation({
    mutationFn: markAllOperatorNotificationsReadApi,
    onSuccess: invalidate,
  });
}

export function useDeleteOperatorNotificationMutation() {
  const invalidate = useInvalidateOperatorNotifications();
  return useMutation({
    mutationFn: (id: number) => deleteOperatorNotificationApi(id),
    onSuccess: invalidate,
  });
}

export function useClearReadOperatorNotificationsMutation() {
  const invalidate = useInvalidateOperatorNotifications();
  return useMutation({
    mutationFn: clearReadOperatorNotificationsApi,
    onSuccess: invalidate,
  });
}
