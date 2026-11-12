import { OperatorApiError, operatorApiRequest } from './orderApi';

/** Pre-analyze bundle API contracts; request field names match Swagger. */
export interface BundleCandidateOrder {
  orderId: string;
  payloadKg: number;
  originHubId?: string;
  destinationHubId?: string;
  deliveryMode?: string;
}

export interface PreAnalyzeBundleCandidates {
  candidates: BundleCandidateOrder[];
}

export interface ValidateMissionBundleInput {
  /** Primary order FIRST, followed by any additionally selected orders. */
  orderIds: string[];
  droneId?: string;
}

export interface MissionBundleValidation {
  isValid: boolean;
  totalPayloadKg?: number;
  remainingCapacityKg?: number;
  message: string;
}

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

/** Only Backend candidates are selectable; never synthesize candidates from the Order list. */
export async function getPreAnalyzeBundleCandidatesApi(orderId: string): Promise<PreAnalyzeBundleCandidates> {
  const response = await operatorApiRequest<unknown>('/operator/missions/bundle/candidates-pre-analyze', {
    method: 'POST',
    body: JSON.stringify({ orderId }),
  });
  const root = unwrap(response);
  const rows = root.candidate_orders ?? root.candidateOrders;
  if (!Array.isArray(rows)) {
    throw new OperatorApiError('The consolidation API did not return candidate_orders.', 502, response);
  }

  const seen = new Set<string>();
  const candidates: BundleCandidateOrder[] = [];
  for (const row of rows) {
    const item = asObject(row);
    if (!item) continue;
    const candidateId = textValue(item, 'order_id', 'orderId', 'id');
    const payloadKg = finiteValue(item, 'payload_kg', 'payloadKg');
    if (!candidateId || candidateId === orderId || seen.has(candidateId) || payloadKg === undefined) continue;
    seen.add(candidateId);
    candidates.push({
      orderId: candidateId,
      payloadKg,
      originHubId: textValue(item, 'origin_hub_id', 'originHubId') || undefined,
      destinationHubId: textValue(item, 'destination_hub_id', 'destinationHubId') || undefined,
      deliveryMode: textValue(item, 'delivery_mode', 'deliveryMode') || undefined,
    });
  }
  return { candidates };
}

/** BE is authoritative for route compatibility, planning readiness and drone capacity. */
export async function validateMissionBundleApi(input: ValidateMissionBundleInput): Promise<MissionBundleValidation> {
  const response = await operatorApiRequest<unknown>('/operator/missions/bundle/validate-pre-analyze', {
    method: 'POST',
    body: JSON.stringify({
      orderIds: input.orderIds,
      ...(input.droneId ? { droneId: input.droneId } : {}),
    }),
  });
  const root = unwrap(response);
  const value = root.is_valid ?? root.isValid;
  if (typeof value !== 'boolean') {
    throw new OperatorApiError('The consolidation validation API did not return is_valid.', 502, response);
  }
  return {
    isValid: value,
    totalPayloadKg: finiteValue(root, 'total_payload_kg', 'totalPayloadKg'),
    remainingCapacityKg: finiteValue(root, 'remaining_capacity_kg', 'remainingCapacityKg'),
    message: textValue(root, 'message', 'reason', 'detail'),
  };
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
