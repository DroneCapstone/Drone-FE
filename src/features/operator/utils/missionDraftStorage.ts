import type { MissionDraft } from '../types/operator';

const STORAGE_KEY = 'droneoptai.operator.mission-draft.v2';

export function loadMissionDraft(orderId: string): MissionDraft | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const draft = JSON.parse(raw) as MissionDraft;
    return draft.orderId === orderId ? draft : undefined;
  } catch {
    return undefined;
  }
}

export function saveMissionDraft(draft: Omit<MissionDraft, 'updatedAt'>) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }));
}

export function updateMissionDraftRoute(orderId: string, selectedRouteId: string) {
  const draft = loadMissionDraft(orderId);
  if (!draft) return;
  saveMissionDraft({ ...draft, selectedRouteId });
}

export function clearMissionDraft(orderId?: string) {
  if (!orderId) {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  const draft = loadMissionDraft(orderId);
  if (draft) sessionStorage.removeItem(STORAGE_KEY);
}
