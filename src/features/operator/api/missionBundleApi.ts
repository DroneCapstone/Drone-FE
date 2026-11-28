import { OperatorApiError, operatorApiRequest } from './orderApi';

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function unwrap(value: unknown): Record<string, unknown> {
  let current = asObject(value);
  for (let index = 0; index < 3 && current; index += 1) {
    const child = asObject(current.data) ?? asObject(current.result);
    if (!child) break;
    current = child;
  }
  return current ?? {};
}

function textValue(object: Record<string, unknown>, ...fields: string[]): string {
  for (const key of fields) {
    const value = object[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function finiteValue(object: Record<string, unknown>, ...fields: string[]): number | undefined {
  for (const key of fields) {
    const value = object[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return undefined;
}

/** Candidate discovery AFTER the primary Order has been analyzed and a route picked.
 * Candidate eligibility comes from BE; this endpoint alone does NOT validate the
 * resulting mission's energy/payload per leg or authorize multi-Order assignment. */
export interface PostAnalyzeBundleCandidatesInput {
  orderId: string;
  droneId: string;
  routeId: string;
}

export interface PostAnalyzeBundleCandidate {
  orderId: string;
  payloadKg?: number;
  originHubId?: string;
  destinationHubId?: string;
  deliveryMode?: string;
}

export interface PostAnalyzeBundleCandidates {
  candidates: PostAnalyzeBundleCandidate[];
}

export async function getPostAnalyzeBundleCandidatesApi(
  input: PostAnalyzeBundleCandidatesInput,
): Promise<PostAnalyzeBundleCandidates> {
  const response = await operatorApiRequest<unknown>('/operator/missions/bundle/candidates-post-analyze', {
    method: 'POST',
    body: JSON.stringify({ orderId: input.orderId, droneId: input.droneId, routeId: input.routeId }),
  });
  const root = unwrap(response);
  const rows = root.candidate_orders ?? root.candidateOrders ?? root.candidates;
  if (!Array.isArray(rows)) {
    throw new OperatorApiError('The post-analyze consolidation API did not return candidate_orders.', 502, response);
  }

  const seen = new Set<string>();
  const candidates: PostAnalyzeBundleCandidate[] = [];
  for (const row of rows) {
    const item = asObject(row);
    if (!item) continue;
    const candidateId = textValue(item, 'order_id', 'orderId', 'id');
    if (!candidateId || candidateId === input.orderId || seen.has(candidateId)) continue;
    seen.add(candidateId);
    candidates.push({
      orderId: candidateId,
      payloadKg: finiteValue(item, 'payload_kg', 'payloadKg'),
      originHubId: textValue(item, 'origin_hub_id', 'originHubId') || undefined,
      destinationHubId: textValue(item, 'destination_hub_id', 'destinationHubId') || undefined,
      deliveryMode: textValue(item, 'delivery_mode', 'deliveryMode') || undefined,
    });
  }
  return { candidates };
}
