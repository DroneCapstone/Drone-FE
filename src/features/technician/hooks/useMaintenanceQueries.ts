import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  refreshMaintenanceAlertsFromApi,
  syncMaintenanceAlertsOnServer,
} from "../utils/maintenanceAlertStorage";

import {
  createMaintenanceRecordOnServer,
  createWorkOrderOnServer,
  deleteWorkOrderOnServer,
  fetchWorkOrderFromApi,
  fetchWorkOrderLogsFromApi,
  refreshMaintenanceRecordsFromApi,
  refreshWorkOrdersFromApi,
  type WorkOrder,
  updateWorkOrderInspectionOnServer,
  updateWorkOrderOnServer,
} from "../utils/maintenanceStorage";

import {
  acknowledgeMaintenanceAlertApi,
  getMaintenanceAlertsHistoryApi,
  createMaintenanceScheduleApi,
  getDroneMaintenanceSchedulesApi,
  getMaintenanceAlertApi,
  getMaintenanceSchedulesApi,
  syncBatteryOverdueAlertsApi,
} from "../api/maintenanceApi";

import {
  technicianQueryKeys,
} from "./queryKeys";

export function useMaintenanceAlertsQuery() {
  return useQuery({
    queryKey:
      technicianQueryKeys.maintenanceAlerts(),
    queryFn:
      refreshMaintenanceAlertsFromApi,
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
  });
}


export function useMaintenanceAlertsHistoryQuery(enabled = true) {
  return useQuery({
    queryKey: technicianQueryKeys.maintenanceAlertsHistory(),
    queryFn: getMaintenanceAlertsHistoryApi,
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useAcknowledgeMaintenanceAlertMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => acknowledgeMaintenanceAlertApi(alertId),
    onSuccess: (_result, alertId) => {
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.maintenanceAlerts() }),
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.maintenanceAlertsHistory() }),
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.maintenanceAlert(alertId) }),
      ]);
    },
  });
}

export function useMaintenanceAlertQuery(
  alertId?: string,
) {
  return useQuery({
    queryKey:
      technicianQueryKeys.maintenanceAlert(
        alertId ?? "missing",
      ),
    queryFn: () =>
      getMaintenanceAlertApi(
        alertId as string,
      ),
    enabled: Boolean(alertId),
  });
}

export function useWorkOrderLogsQuery(
  workOrderId?: string,
) {
  return useQuery({
    queryKey:
      technicianQueryKeys.workOrderLogs(
        workOrderId ?? "missing",
      ),
    queryFn: () =>
      fetchWorkOrderLogsFromApi(
        workOrderId as string,
      ),
    enabled: Boolean(workOrderId),
  });
}

export function useMaintenanceRecordsQuery(
  droneId?: string,
) {
  return useQuery({
    queryKey:
      technicianQueryKeys.maintenanceRecords(
        droneId ?? "missing",
      ),
    queryFn: () =>
      refreshMaintenanceRecordsFromApi(
        droneId as string,
      ),
    enabled: Boolean(droneId),
  });
}

export function useMaintenanceSchedulesQuery() {
  return useQuery({
    queryKey:
      technicianQueryKeys.maintenanceSchedules(),
    queryFn: getMaintenanceSchedulesApi,
    staleTime: 60_000,
  });
}

export function useDroneMaintenanceSchedulesQuery(
  droneId?: string,
) {
  return useQuery({
    queryKey:
      technicianQueryKeys.droneMaintenanceSchedules(
        droneId ?? "missing",
      ),
    queryFn: () =>
      getDroneMaintenanceSchedulesApi(
        droneId as string,
      ),
    enabled: Boolean(droneId),
    staleTime: 60_000,
  });
}

export function useCreateMaintenanceScheduleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      payload: Record<string, unknown>,
    ) => createMaintenanceScheduleApi(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey:
          technicianQueryKeys.maintenanceSchedules(),
      }),
  });
}

export function useDeleteWorkOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workOrderId: string) =>
      deleteWorkOrderOnServer(workOrderId),
    onSuccess: (_result, workOrderId) => {
      queryClient.setQueryData<WorkOrder[]>(technicianQueryKeys.workOrders(),
        (current) => current?.filter((order) => order.id !== workOrderId));
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.workOrders() }),
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.maintenanceAlerts() }),
      ]);
    },
  });
}

export function useSyncBatteryOverdueAlertsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncBatteryOverdueAlertsApi,
    onSuccess: () => {
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.maintenanceAlerts() }),
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.batteries() }),
      ]);
    },
  });
}

export function useCreateWorkOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWorkOrderOnServer,
    onSuccess: () => {
      // A successful POST is authoritative, even if subsequent GET fails.
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.workOrders() }),
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.maintenanceAlerts() }),
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.fleet() }),
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.batteries() }),
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
    onSuccess: (_result, variables) => {
      const issue = variables.payload.issue_description;
      if (typeof issue === "string") {
        queryClient.setQueryData<WorkOrder[]>(technicianQueryKeys.workOrders(),
          (current) => current?.map((order) => order.id === variables.workOrderId
            ? { ...order, title: issue }
            : order));
      }
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.workOrders() }),
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.workOrder(variables.workOrderId) }),
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
      updateWorkOrderInspectionOnServer(workOrderId, payload),
    onSuccess: (_result, variables) => {
      // Refresh related screens in the background. A refetch failure must
      // not override a successful inspection PATCH response.
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.workOrders() }),
        queryClient.invalidateQueries({
          queryKey: technicianQueryKeys.workOrder(variables.workOrderId),
        }),
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.fleet() }),
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.batteries() }),
        queryClient.invalidateQueries({ queryKey: technicianQueryKeys.maintenanceAlerts() }),
      ]);
    },
  });
}

export function useCreateMaintenanceRecordMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn:
      createMaintenanceRecordOnServer,
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: technicianQueryKeys.workOrders(),
        }),
        queryClient.invalidateQueries({
          queryKey: technicianQueryKeys.fleet(),
        }),
        queryClient.invalidateQueries({
          queryKey: technicianQueryKeys.maintenanceRecords(variables.droneId),
        }),
        queryClient.invalidateQueries({
          queryKey: technicianQueryKeys.droneMaintenance(variables.droneId),
        }),
      ]);
    },
  });
}
