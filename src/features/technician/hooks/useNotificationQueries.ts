import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  clearReadNotificationsApi,
  deleteNotificationApi,
  getNotificationsApi,
  getUnreadNotificationCountApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from "../api/notificationApi";

import {
  technicianQueryKeys,
} from "./queryKeys";

export function useNotificationsQuery() {
  return useQuery({
    queryKey:
      technicianQueryKeys.notifications(),
    queryFn: () => getNotificationsApi(1, 50),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}

export function useUnreadCountQuery() {
  return useQuery({
    queryKey:
      technicianQueryKeys.unreadCount(),
    queryFn:
      getUnreadNotificationCountApi,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => markNotificationReadApi(notificationId),
    onSuccess: () => {
      // Invalidate in the background: a successful PATCH should not be marked failed
      // only because a subsequent GET has a transient error.
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.notifications() }),
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.unreadCount() }),
      ]);
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn:
      markAllNotificationsReadApi,
    onSuccess: () => {
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.notifications() }),
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.unreadCount() }),
      ]);
    },
  });
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () => {
    void Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: technicianQueryKeys.notifications() }),
      queryClient.invalidateQueries({ queryKey: technicianQueryKeys.unreadCount() }),
    ]);
  };
}

export function useDeleteNotificationMutation() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (notificationId: string) => deleteNotificationApi(notificationId),
    onSuccess: invalidate,
  });
}

export function useClearReadNotificationsMutation() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: clearReadNotificationsApi,
    onSuccess: invalidate,
  });
}
