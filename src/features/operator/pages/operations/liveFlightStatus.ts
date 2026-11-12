import type { LiveTrackingDrone } from '../../api/missionApi';
import type { Mission } from '../../types/operator';

export type FlightStatusTone = 'success' | 'warning' | 'danger' | 'neutral';
export type FlightStatusKey =
  | 'completed' | 'failed' | 'disconnected' | 'relay' | 'awaiting-swap'
  | 'swapping' | 'ready-to-depart' | 'destination' | 'continuing'
  | 'in-flight' | 'scheduled' | 'flying' | 'unknown';

export interface LiveFlightStatus {
  key: FlightStatusKey;
  label: string;
  tone: FlightStatusTone;
  detail?: string;
}

function hubLabel(hubId: string, hubNames: ReadonlyMap<string, string>): string {
  return hubNames.get(hubId) || (hubId ? `Hub ${hubId}` : 'Relay hub');
}

/**
 * Resolve flight progress from authoritative BE Mission/Leg statuses.
 * Do not infer landing, battery swapping, or completion from GPS speed/altitude
 * or from a checkpoint that may have been recorded before takeoff on a later leg.
 */
export function resolveLiveFlightStatus(
  aircraft: LiveTrackingDrone,
  mission: Mission | undefined,
  hubNames: ReadonlyMap<string, string>,
): LiveFlightStatus {
  const rawMissionStatus = aircraft.missionStatusRaw?.trim().toUpperCase().replace(/[\s-]+/g, '_');
  const status = mission?.status;
  if (status === 'Completed' || (!status && ['COMPLETED', 'MISSION_COMPLETED', 'ARRIVAL_COMPLETED'].includes(rawMissionStatus ?? ''))) {
    return { key: 'completed', label: 'Completed', tone: 'success', detail: 'Mission completed' };
  }
  if (status === 'Failed' || (!status && rawMissionStatus === 'FAILED')) {
    return { key: 'failed', label: 'Failed', tone: 'danger', detail: 'Mission failed' };
  }
  const failsafe = aircraft.failsafeStatus?.toUpperCase();
  if (failsafe === 'DISCONNECTED') {
    return { key: 'disconnected', label: 'Disconnected', tone: 'danger', detail: 'Telemetry connection lost' };
  }
  if (status === 'Scheduled' || (!status && rawMissionStatus === 'SCHEDULED')) {
    return { key: 'scheduled', label: 'Scheduled', tone: 'neutral' };
  }

  if (mission?.status === 'Flying') {
    // DISPATCH is a positioning leg, not a relay at which Technician swaps a battery.
    const legs = (mission.legs ?? []).filter(leg => !leg.isDispatch);
    const inProgressIndex = legs.findIndex(leg => leg.status === 'In Progress');
    if (inProgressIndex >= 0) {
      return inProgressIndex > 0
        ? { key: 'continuing', label: 'Continuing Flight', tone: 'success', detail: `Leg ${inProgressIndex + 1} of ${legs.length}` }
        : { key: 'in-flight', label: 'In Flight', tone: 'success' };
    }

    const lastCompletedIndex = legs.reduce((latest, leg, index) => leg.status === 'Completed' ? index : latest, -1);
    if (lastCompletedIndex === legs.length - 1 && legs.length > 0) {
      return { key: 'destination', label: 'Arrived at Destination', tone: 'warning', detail: 'Awaiting mission completion confirmation' };
    }
    if (lastCompletedIndex >= 0 && lastCompletedIndex < legs.length - 1) {
      const previous = legs[lastCompletedIndex];
      const next = legs[lastCompletedIndex + 1];
      const isRelay = Boolean(
        previous.toHubId && previous.toHubId === next.fromHubId &&
        (mission.relayHubIds ?? []).includes(previous.toHubId) &&
        next.status === 'Pending' &&
        legs.slice(lastCompletedIndex + 1).every(leg => leg.status === 'Pending'),
      );
      if (isRelay) {
        const detail = `${hubLabel(previous.toHubId, hubNames)} · Awaiting next leg`;
        // These labels require an EXPLICIT battery-swap status from BE; arriving
        // at an intermediate Hub alone does not prove a swap has begun.
        const swap = aircraft.batterySwapStatus?.trim().toUpperCase().replace(/[\s-]+/g, '_');
        if (swap === 'IN_PROGRESS' || swap === 'SWAPPING') {
          return { key: 'swapping', label: 'Battery Swap in Progress', tone: 'warning', detail };
        }
        if (swap === 'PENDING' || swap === 'AWAITING' || swap === 'AWAITING_SWAP') {
          return { key: 'awaiting-swap', label: 'Awaiting Battery Swap', tone: 'warning', detail };
        }
        if (swap === 'COMPLETED' || swap === 'DONE') {
          return { key: 'ready-to-depart', label: 'Ready for Next Leg', tone: 'success', detail };
        }
        return { key: 'relay', label: 'At Relay Hub', tone: 'warning', detail };
      }
    }
    // Preserve the backend Mission's Flying label, but do not invent a leg state.
    return { key: 'flying', label: 'Flying', tone: 'neutral' };
  }
  if (rawMissionStatus === 'FLYING' || rawMissionStatus === 'IN_FLIGHT') {
    return { key: 'in-flight', label: 'In Flight', tone: 'success' };
  }
  if (rawMissionStatus === 'IN_PROGRESS') {
    return { key: 'flying', label: 'Flying', tone: 'neutral' };
  }
  return { key: 'unknown', label: 'Checking Status', tone: 'neutral' };
}
