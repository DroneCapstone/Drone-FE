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
  missionId: string;
  orderId: string;
  destinationHub: string;
  distanceKm?: number;
  flightTimeMin?: number;
  batteryStartPct?: number;
  batteryEndPct?: number;
  status: string;
  completedAt?: string;
};

// Missing numeric fields are unknown, not zero. Do not invent flight metrics.
function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function mapFlightHistory(value: unknown): DroneFlightHistoryRow | null {
  if (!isRecord(value)) return null;
  const missionId = pickString(value, ["mission_id"], "").trim();
  if (!missionId) return null;

  return {
    missionId,
    orderId: pickString(value, ["order_id"], "—"),
    destinationHub: pickString(value, ["destination_hub"], "—"),
    distanceKm: optionalNumber(value.distance_km),
    flightTimeMin: optionalNumber(value.flight_time_min),
    batteryStartPct: optionalNumber(value.battery_start_pct),
    batteryEndPct: optionalNumber(value.battery_end_pct),
    status: pickString(value, ["status"], "—"),
    completedAt: pickString(value, ["completed_at"], "") || undefined,
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
