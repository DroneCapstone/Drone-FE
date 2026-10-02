import {
  useQuery,
} from "@tanstack/react-query";

import {
  getTechnicianAuthApi,
} from "../api/authApi";

import {
  getTechnicianUsersApi,
} from "../api/userApi";

import {
  getTechnicianAiPredictionsApi,
} from "../api/aiPredictionsApi";

import {
  technicianQueryKeys,
} from "./queryKeys";

export function useTechnicianAuthQuery() {
  return useQuery({
    queryKey:
      technicianQueryKeys.technicianAuth(),
    queryFn: getTechnicianAuthApi,
    staleTime: 60_000,
  });
}

export function useTechnicianUsersQuery() {
  return useQuery({
    queryKey:
      technicianQueryKeys.technicianUsers(),
    queryFn: getTechnicianUsersApi,
    staleTime: 60_000,
  });
}

export function useTechnicianAiPredictionsQuery() {
  return useQuery({
    queryKey:
      technicianQueryKeys.aiPredictions(),
    queryFn:
      getTechnicianAiPredictionsApi,
    staleTime: 30_000,
  });
}
