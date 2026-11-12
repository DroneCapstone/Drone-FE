import type { Mission } from '../types/operator';

/**
 * Operator flight-history rules:
 * - Scheduled / Flying: not historical flights (use Live Tracking for flying).
 * - Completed: retain the mission in history, even if its telemetry is missing.
 * - Failed: retain only if the drone physically departed.
 * - Only four Mission statuses exist: Scheduled, Flying, Completed, Failed.
 *
 * start_time/end_time belong to the mission lifecycle and must not be treated
 * as physical departure/arrival events. Otherwise Scheduled/pre-flight
 * records can show invented durations and misleading playback availability.
 */
const validTimestamp = (value?: string): value is string =>
  Boolean(value && Number.isFinite(Date.parse(value)));

/** Timestamp of confirmed physical departure, NOT planned/mission start. */
export function recordedFlightStart(mission: Mission): string | undefined {
  if (mission.status !== 'Completed' && mission.status !== 'Failed') return undefined;
  return validTimestamp(mission.flightDepartedAt) ? mission.flightDepartedAt : undefined;
}

/** Timestamp of confirmed physical arrival, NOT generic mission end. */
export function recordedFlightEnd(mission: Mission): string | undefined {
  if (mission.status !== 'Completed' && mission.status !== 'Failed') return undefined;
  return validTimestamp(mission.flightArrivedAt) ? mission.flightArrivedAt : undefined;
}

/** Completed remains visible even if the BE has no GPS recording yet. */
export function isFlightHistoryRecord(mission: Mission): boolean {
  if (mission.status === 'Completed') return true;
  return mission.status === 'Failed' && Boolean(recordedFlightStart(mission));
}

/** A Replay button also requires >=2 timestamped GPS points, checked separately. */
export function canReplayFlight(mission: Mission): boolean {
  if (mission.status === 'Completed') return true;
  return mission.status === 'Failed' && Boolean(recordedFlightStart(mission));
}
