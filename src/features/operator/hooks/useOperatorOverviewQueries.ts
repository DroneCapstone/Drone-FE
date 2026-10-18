import { useMutation, useQuery } from '@tanstack/react-query';
import { getOperatorDashboardApi, listOperatorAiPredictionsApi, getAiPredictionExplanationApi, predictEnergyApi } from '../api/operatorOverviewApi';
import { operatorQueryKeys } from '../query/queryKeys';

/** Read-only. UI mapping should wait for the documented response schema. */
export function useOperatorDashboardQuery() {
  return useQuery({
    queryKey: operatorQueryKeys.operatorDashboard(),
    queryFn: getOperatorDashboardApi,
    staleTime: 15_000,
  });
}

export function useOperatorAiPredictionsQuery() {
  return useQuery({
    queryKey: operatorQueryKeys.operatorAiPredictions(),
    queryFn: listOperatorAiPredictionsApi,
    staleTime: 30_000,
  });
}

export function useOperatorAiExplanationQuery(predictionId: string) {
  return useQuery({
    queryKey: operatorQueryKeys.aiExplanation(predictionId),
    queryFn: () => getAiPredictionExplanationApi(predictionId),
    enabled: Boolean(predictionId.trim()),
  });
}

/** Call only with the verified Swagger /ai/energy request payload. */
export function useEnergyPredictionMutation() {
  return useMutation({ mutationFn: predictEnergyApi });
}
