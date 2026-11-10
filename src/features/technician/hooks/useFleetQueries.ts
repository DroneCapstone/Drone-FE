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

import { getDroneFlightHistoryApi } from "../api/fleetApi";
import { isRecord, pickString, unwrapList } from "../api/httpClient";

import {
  technicianQueryKeys,
} from "./queryKeys";

export type DroneFlightHistoryRow = {
  id: string;
  orderId: string;
  route: string;
  departedAt: string;
  arrivedAt: string;
  status: string;
};

function mapFlightHistory(value: unknown): DroneFlightHistoryRow | null {
  if (!isRecord(value)) return null;
  const id = pickString(value, ["mission_id", "mission_code", "flight_id", "id"], "");
  if (!id) return null;
  const origin = pickString(value, ["origin_hub_name", "origin_hub_id", "from_hub_id"], "");
  const destination = pickString(value, ["destination_hub_name", "destination_hub_id", "to_hub_id"], "");
  return {
    id,
    orderId: pickString(value, ["order_id"], "—"),
    route: origin || destination ? `${origin || "—"} → ${destination || "—"}` : "—",
    departedAt: pickString(value, ["departed_at", "departure_time", "started_at", "start_time"], ""),
    arrivedAt: pickString(value, ["arrived_at", "arrival_confirmed_at", "end_time", "completed_at"], ""),
    status: pickString(value, ["mission_state", "status", "flight_status"], "—"),
  };
}

export function useDroneFlightHistoryQuery(droneId?: string, enabled = true) {
  return useQuery({
    queryKey: technicianQueryKeys.droneFlights(droneId ?? "missing"),
    queryFn: async () => unwrapList(await getDroneFlightHistoryApi(droneId as string))
      .map(mapFlightHistory)
      .filter((item): item is DroneFlightHistoryRow => item !== null),
    enabled: Boolean(droneId) && enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useFleetQuery() {
  return useQuery({
    queryKey: technicianQueryKeys.fleet(),
    queryFn: refreshFleetFromApi,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
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
