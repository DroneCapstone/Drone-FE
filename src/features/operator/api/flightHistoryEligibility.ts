import type { Mission } from '../types/operator';

/**
 * Flight History is based on physical take-off/landing, not scheduled dates.
 * BE may populate start_time/end_time for scheduled missions in older data;
 * status takes priority over those timestamps for playback eligibility.
 */
const hasDate = (value?: string) => Boolean(value && Number.isFinite(Date.parse(value)));

/** Take-off timestamp usable as a historical flight event. */
export function recordedFlightStart(mission: Mission): string | undefined {
  if (mission.status === 'Scheduled') return undefined;
  // For cancelled/failed missions, a generic mission start is insufficient:
  // only an explicit physical departure can prove the drone actually flew.
  const value = mission.flightDepartedAt || (mission.status === 'Completed' ? mission.actualStartedAt : undefined);
  return hasDate(value) ? value : undefined;
}

/** Landing timestamp usable as a historical flight event. */
export function recordedFlightEnd(mission: Mission): string | undefined {
  if (mission.status === 'Scheduled' || mission.status === 'In Progress') return undefined;
  const value = mission.flightArrivedAt || (mission.status === 'Completed' ? mission.actualCompletedAt : undefined);
  return hasDate(value) ? value : undefined;
}

/** A completed mission is a history record even if BE omitted event timestamps. */
export function isFlightHistoryRecord(mission: Mission): boolean {
  if (mission.status === 'Scheduled') return false;
  if (mission.status === 'Completed') return true;
  // In Progress is handled by Live Tracking, not historical playback.
  if (mission.status === 'In Progress') return false;
  return Boolean(recordedFlightStart(mission));
}

/** Prevent a direct /history/:missionId URL from replaying scheduled/live missions. */
export function canReplayFlight(mission: Mission): boolean {
  if (mission.status === 'Completed') return true;
  return (mission.status === 'Failed' || mission.status === 'Cancelled') && Boolean(recordedFlightStart(mission));
}
