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
  updateWorkOrderInspectionOnServer,
  updateWorkOrderOnServer,
} from "../utils/maintenanceStorage";

import {
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey:
          technicianQueryKeys.workOrders(),
      });
    },
  });
}

export function useSyncBatteryOverdueAlertsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncBatteryOverdueAlertsApi,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey:
            technicianQueryKeys.maintenanceAlerts(),
        }),
        queryClient.invalidateQueries({
          queryKey:
            technicianQueryKeys.batteries(),
        }),
      ]);
    },
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
