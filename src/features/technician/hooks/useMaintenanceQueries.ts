import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  loadMaintenanceAlerts,
  refreshMaintenanceAlertsFromApi,
  syncMaintenanceAlertsOnServer,
} from "../utils/maintenanceAlertStorage";

import {
  createMaintenanceRecordOnServer,
  createWorkOrderOnServer,
  fetchWorkOrderFromApi,
  loadWorkOrders,
  refreshWorkOrdersFromApi,
  updateWorkOrderInspectionOnServer,
  updateWorkOrderOnServer,
} from "../utils/maintenanceStorage";

import {
  technicianQueryKeys,
} from "./queryKeys";

export function useMaintenanceAlertsQuery() {
  return useQuery({
    queryKey:
      technicianQueryKeys.maintenanceAlerts(),
    queryFn:
      refreshMaintenanceAlertsFromApi,
    placeholderData: () =>
      loadMaintenanceAlerts(),
  });
}

export function useSyncMaintenanceAlertsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn:
      syncMaintenanceAlertsOnServer,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey:
          technicianQueryKeys.maintenanceAlerts(),
      }),
  });
}

export function useWorkOrdersQuery() {
  return useQuery({
    queryKey:
      technicianQueryKeys.workOrders(),
    queryFn: refreshWorkOrdersFromApi,
    placeholderData: () =>
      loadWorkOrders(),
  });
}

export function useWorkOrderQuery(
  workOrderId?: string,
) {
  return useQuery({
    queryKey:
      technicianQueryKeys.workOrder(
        workOrderId ?? "missing",
      ),
    queryFn: () =>
      fetchWorkOrderFromApi(
        workOrderId as string,
      ),
    enabled: Boolean(workOrderId),
    placeholderData: () =>
      loadWorkOrders().find(
        (item) =>
          item.id === workOrderId,
      ),
  });
}

export function useCreateWorkOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn:
      createWorkOrderOnServer,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey:
            technicianQueryKeys.workOrders(),
        }),
        queryClient.invalidateQueries({
          queryKey:
            technicianQueryKeys.maintenanceAlerts(),
        }),
      ]);
    },
  });
}

export function useUpdateWorkOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workOrderId,
      payload,
    }: {
      workOrderId: string;
      payload: Record<string, unknown>;
    }) =>
      updateWorkOrderOnServer(
        workOrderId,
        payload,
      ),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey:
            technicianQueryKeys.workOrders(),
        }),
        queryClient.invalidateQueries({
          queryKey:
            technicianQueryKeys.workOrder(
              variables.workOrderId,
            ),
        }),
      ]);
    },
  });
}

export function useUpdateWorkOrderInspectionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workOrderId,
      payload,
    }: {
      workOrderId: string;
      payload: Record<string, unknown>;
    }) =>
      updateWorkOrderInspectionOnServer(
        workOrderId,
        payload,
      ),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey:
            technicianQueryKeys.workOrders(),
        }),
        queryClient.invalidateQueries({
          queryKey:
            technicianQueryKeys.workOrder(
              variables.workOrderId,
            ),
        }),
      ]);
    },
  });
}

export function useCreateMaintenanceRecordMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn:
      createMaintenanceRecordOnServer,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey:
            technicianQueryKeys.workOrders(),
        }),
        queryClient.invalidateQueries({
          queryKey:
            technicianQueryKeys.fleet(),
        }),
      ]);
    },
  });
}
