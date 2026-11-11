import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
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
    queryFn: getNotificationsApi,
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
