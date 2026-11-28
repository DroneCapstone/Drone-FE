import type { MissionSelectionJustifications } from '../types/operator';

type Kind = keyof MissionSelectionJustifications;
export const justificationKey = (...parts: string[]) => JSON.stringify(parts);

// Basic input quality only; does not establish whether an explanation is true.
export function isValidJustification(value: string): boolean {
  const text = value.trim();
  const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const meaningful = words.filter(word => /\p{L}/u.test(word) && word.length > 1 && !/^(.)\1+$/u.test(word));
  return text.length >= 30 && text.length <= 2000 && new Set(meaningful).size >= 5;
}

export function needsResourceJustification(selectedId: string, autoId: string | undefined, manual: boolean): boolean {
  return Boolean(selectedId && (autoId ? selectedId !== autoId : manual));
}

export function getJustification(state: MissionSelectionJustifications, kind: Kind, key: string): string {
  const entry = state?.[kind];
  return entry?.key === key && typeof entry.reason === 'string' ? entry.reason : '';
}

export function putJustification(state: MissionSelectionJustifications, kind: Kind, key: string, reason: string): MissionSelectionJustifications {
  return { ...state, [kind]: { key, reason } };
}
