import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getNotificationsApi,
  getUnreadNotificationCountApi,
  markAllNotificationsReadApi,
} from "../api/notificationApi";

import {
  technicianQueryKeys,
} from "./queryKeys";

export function useNotificationsQuery() {
  return useQuery({
    queryKey:
      technicianQueryKeys.notifications(),
    queryFn: getNotificationsApi,
    refetchInterval: 30_000,
  });
}

export function useUnreadCountQuery() {
  return useQuery({
    queryKey:
      technicianQueryKeys.unreadCount(),
    queryFn:
      getUnreadNotificationCountApi,
    refetchInterval: 30_000,
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn:
      markAllNotificationsReadApi,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey:
            technicianQueryKeys.notifications(),
        }),
        queryClient.invalidateQueries({
          queryKey:
            technicianQueryKeys.unreadCount(),
        }),
      ]);
    },
  });
}
