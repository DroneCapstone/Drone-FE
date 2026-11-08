import type { AdminBattery } from '../types';
import { getAdminDrones } from './adminStore';

/**
 * Admin tracks battery identity, ownership, and lifecycle only.
 * Technical diagnostics remain owned by Technician/BMS, not Admin.
 */
declare module '../types' {
  interface AdminBattery {
    inspectionPending?: boolean;
    inspectionNote?: string;
    inspectionCheckedAt?: string;
    replacementRequestId?: string;
  }
}

/** New batteries are usable only after receipt/check is confirmed. */
export function isBatteryReady(battery: AdminBattery): boolean {
  return battery.administrativeStatus === 'ACTIVE'
    && battery.operationalStatus === 'READY'
    && !battery.inspectionPending;
}

/** Admin can retire a disconnected battery with an explicitly recorded reason.
 * Do not infer retirement from SOH/cycle/cell statistics here. */
export function canRetireBattery(battery: AdminBattery): boolean {
  return battery.administrativeStatus === 'ACTIVE'
    && battery.operationalStatus !== 'INSTALLED'
    && !battery.droneId
    && !getAdminDrones().some((drone) => drone.installedBatteryId === battery.id)
    && !battery.inspectionPending;
}
