import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getMyProfileApi,
  updateMyProfileApi,
} from "../api/profileApi";

import {
  technicianQueryKeys,
} from "./queryKeys";

export function useTechnicianProfileQuery() {
  return useQuery({
    queryKey:
      technicianQueryKeys.profile(),
    queryFn: getMyProfileApi,
    staleTime: 60_000,
  });
}

export function useUpdateTechnicianProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      payload: Record<string, unknown>,
    ) =>
      updateMyProfileApi(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey:
          technicianQueryKeys.profile(),
      }),
  });
}
