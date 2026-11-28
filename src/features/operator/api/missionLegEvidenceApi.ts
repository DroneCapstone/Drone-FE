import { operatorApiRequest } from './orderApi';
import type { Mission } from '../types/operator';

export type LegEvidenceStage = 'check-in' | 'loaded' | 'check-out' | 'received' | 'unloaded';
export interface LegEvidence {
  stage: LegEvidenceStage;
  orderId: string;
  url: string;
  recordedAt: string;
  recordedBy: string;
}
export interface LegEvidenceResult { items: LegEvidence[]; partial: boolean; }
type Data = Record<string, unknown>;
const record = (v: unknown): Data => v && typeof v === 'object' && !Array.isArray(v) ? v as Data : {};
function text(r: Data, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if ((typeof v === 'string' || typeof v === 'number') && String(v).trim()) return String(v).trim();
  }
  return '';
}
function rows(value: unknown, missionId: string): unknown[] {
  if (Array.isArray(value)) return value;
  const r = record(value);
  if (text(r, 'mission_id') && text(r, 'mission_id') !== missionId) throw new Error('Mission identifier does not match.');
  for (const key of ['data', 'proof_images', 'order_proof_images', 'proof_images_json', 'items', 'results']) {
    if (r[key] && typeof r[key] === 'object') return rows(r[key], missionId);
  }
  throw new Error('Unable to read proof image records.');
}
function validTime(value: string) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}),?\s+(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  const t = m ? `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6] || '00'}+07:00` : value;
  return t && Number.isFinite(Date.parse(t)) ? t : '';
}
function imageUrls(r: Data): string[] {
  return [...new Set([r.proof_image_url, r.photo_url, r.image_url,
    ...(Array.isArray(r.photo_urls) ? r.photo_urls : []),
    ...(Array.isArray(r.proof_image_urls) ? r.proof_image_urls : [])].filter((v): v is string => {
    if (typeof v !== 'string') return false;
    if (/^data:image\/(?:png|jpeg|jpg|webp|gif|avif);base64,[A-Za-z0-9+/]/i.test(v)) return true;
    try { return ['http:', 'https:'].includes(new URL(v).protocol); } catch { return false; }
  }))];
}
export function missionEvidenceOrderIds(mission: Mission): string[] {
  return [...new Set([mission.orderId, ...(mission.bundledOrderIds ?? [])].filter(Boolean))].sort();
}
/** Group relay arrival, package loading and departure under the incoming leg.
 * The mission endpoint contains all orders, including relay-bundled orders.
 * At a repeated hub, require an unambiguous leg reference. */
export function mapLegEvidence(payload: unknown, mission: Mission, legIndex: number): LegEvidence[] {
  const legs = mission.legs ?? [];
  const leg = legs[legIndex];
  if (!leg?.toHubId || leg.isDispatch) return [];
  const final = legIndex === legs.length - 1 && leg.toHubId === mission.destinationHubId;
  const repeatedHub = legs.filter(l => l.toHubId === leg.toHubId).length > 1;
  return rows(payload, mission.id).flatMap(item => {
    const r = record(item);
    if (text(r, 'mission_id') !== mission.id || text(r, 'hub_id') !== leg.toHubId) return [];
    const raw = text(r, 'stage').toUpperCase().replace(/[\s-]+/g, '_');
    let stage: LegEvidenceStage;
    if (!final && raw === 'DRONE_CHECKIN_RELAY') stage = 'check-in';
    else if (!final && raw === 'DRONE_CHECKOUT_RELAY') stage = 'check-out';
    else if (!final && raw === 'PACKAGE_LOADED_TO_DRONE') stage = 'loaded';
    // The destination arrival photo is recorded as package unloading by the BE.
    // Use the existing Drone received section, without duplicating the same photo.
    else if (final && raw === 'PACKAGE_UNLOADED_FROM_DRONE') stage = 'received';
    else return []; // Never show customer pickup or origin receipt images here.

    const arrivalLeg = text(r, 'arrival_leg_id', 'incoming_leg_id');
    const eventLeg = text(r, 'leg_id', 'mission_leg_id');
    if (arrivalLeg) {
      if (arrivalLeg !== leg.id) return [];
    } else if (eventLeg) {
      // Checkout/loading may reference the incoming or the next outgoing leg.
      const departing = stage === 'check-out' || stage === 'loaded';
      const candidates = legs.flatMap((l, i) => l.toHubId === leg.toHubId &&
        (l.id === eventLeg || (departing && legs[i + 1]?.fromHubId === l.toHubId && legs[i + 1]?.id === eventLeg)) ? [i] : []);
      if (candidates.length !== 1 || candidates[0] !== legIndex) return [];
    } else if (repeatedHub && !final) return [];

    // Preserve the actual order ID for package photos, including bundled orders.
    // Drone check-in/out photos are mission-level and do not need an order label.
    const orderId = stage === 'loaded' || stage === 'received' ? text(r, 'order_id') : '';
    return imageUrls(r).map(url => ({stage, orderId, url,
      recordedAt: validTime(text(r, 'recorded_at', 'timestamp')), recordedBy: text(r, 'technician_name', 'technician_id')}));
  });
}

export async function getMissionLegEvidence(mission: Mission, legIndex: number, signal?: AbortSignal): Promise<LegEvidenceResult> {
  // A single mission-scoped request replaces the old per-order requests.
  const payload = await operatorApiRequest<unknown>(`/operator/missions/${encodeURIComponent(mission.id)}/proof-images`, {signal});
  const unique = new Map<string, LegEvidence>();
  for (const item of mapLegEvidence(payload, mission, legIndex)) {
    const key = JSON.stringify([item.stage, item.orderId, item.url, item.recordedAt]);
    if (!unique.has(key)) unique.set(key, item);
  }
  const stageOrder: Record<LegEvidenceStage, number> = {'check-in': 0, received: 0, unloaded: 1, loaded: 2, 'check-out': 3};
  return {items: [...unique.values()].sort((a,b) => stageOrder[a.stage] - stageOrder[b.stage] || (Date.parse(a.recordedAt) || 0) - (Date.parse(b.recordedAt) || 0)),
    partial: false};
}
