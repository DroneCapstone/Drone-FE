import { operatorApiRequest } from './orderApi';

/** Documented in Swagger: GET /api/v1/operator/dashboard. */
export function getOperatorDashboardApi(): Promise<unknown> {
  return operatorApiRequest<unknown>('/operator/dashboard');
}

/** Documented in Swagger: GET /api/v1/operator/ai_predictions/. */
export function listOperatorAiPredictionsApi(): Promise<unknown> {
  return operatorApiRequest<unknown>('/operator/ai_predictions/');
}

/** Swagger: GET /api/v1/ai/explain/{prediction_id}; response schema must be checked before rendering. */
export function getAiPredictionExplanationApi(predictionId: string): Promise<unknown> {
  const id = predictionId.trim();
  if (!id) return Promise.reject(new Error('Prediction ID is required.'));
  return operatorApiRequest<unknown>(`/ai/explain/${encodeURIComponent(id)}`);
}

/** Swagger: POST /api/v1/ai/energy. Use ONLY a payload matching the live OpenAPI schema. */
export function predictEnergyApi(payload: Record<string, unknown>): Promise<unknown> {
  return operatorApiRequest<unknown>('/ai/energy', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
