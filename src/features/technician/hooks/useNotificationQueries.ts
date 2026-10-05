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
