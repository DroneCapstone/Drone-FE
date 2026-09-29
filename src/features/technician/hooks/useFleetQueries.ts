import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  fetchDroneDetailFromApi,
  refreshFleetFromApi,
  updateDroneStatusOnServer,
  type DroneStatus,
} from "../utils/fleetStorage";

import {
  refreshDroneMaintenanceHistoryFromApi,
} from "../utils/maintenanceStorage";

import {
  technicianQueryKeys,
} from "./queryKeys";

export function useFleetQuery() {
  return useQuery({
    queryKey: technicianQueryKeys.fleet(),
    queryFn: refreshFleetFromApi,
  });
}

export function useDroneDetailQuery(
  droneId?: string,
) {
  return useQuery({
    queryKey: technicianQueryKeys.drone(
      droneId ?? "missing",
    ),
    queryFn: () =>
      fetchDroneDetailFromApi(
        droneId as string,
      ),
    enabled: Boolean(droneId),
  });
}

export function useDroneMaintenanceHistoryQuery(
  droneId?: string,
) {
  return useQuery({
    queryKey:
      technicianQueryKeys.droneMaintenance(
        droneId ?? "missing",
      ),
    queryFn: () =>
      refreshDroneMaintenanceHistoryFromApi(
        droneId as string,
      ),
    enabled: Boolean(droneId),
  });
}

export function useUpdateDroneStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      droneId,
      status,
    }: {
      droneId: string;
      status: DroneStatus;
    }) =>
      updateDroneStatusOnServer(
        droneId,
        status,
      ),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey:
            technicianQueryKeys.fleet(),
        }),
        queryClient.invalidateQueries({
          queryKey:
            technicianQueryKeys.drone(
              variables.droneId,
            ),
        }),
      ]);
    },
  });
}
