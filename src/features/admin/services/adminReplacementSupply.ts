/**
 * Admin-side supply flow for shared Technician replacement-request prototype.
 * New PENDING requests can be supplied directly after selection and validation.
 * The legacy approveReplacementRequest helper remains for older records.
 * APPROVED means supplied; FULFILLED means Technician receipt confirmed.
 * Compatible with the existing browser-local requests and parts storage.
 */
import { getAdminBatteries, getAdminDrones, getAdminHubs } from './adminStore';
import {
  getCompatiblePartsForRequest,
  getReplacementRequests,
  getSpareParts,
  recordPrototypeActivity,
  type ReplacementRequest,
  type SparePart,
} from './prototypeWorkflow';
import type { AdminBattery } from '../types';
import './batteryLifecycle';
import { getAvailableNewBatteries } from './adminNewBatterySupply';

const PREFIX = 'droneoptai.prototype.v1.';
const SUPPLY_KEY = `${PREFIX}admin-supply-v2`;
const REQUEST_KEY = `${PREFIX}requests`;
const PART_KEY = `${PREFIX}parts`;
const BATTERY_KEY = 'droneoptai.admin.batteries.v2';
const EXPENSE_KEY = `${PREFIX}expenses`;

export type AdminSupplyStage = 'AWAITING_SUPPLY' | 'SUPPLIED' | 'REJECTED';
export interface AdminSupplyEvent {
  action: string;
  detail: string;
  by: string;
  at: string;
}
export interface AdminSupplyRecord {
  requestId: string;
  stage: AdminSupplyStage;
  reviewedBy: string;
  reviewedAt: string;
  adminNote: string;
  selectedPartId?: string;
  selectedBatteryId?: string;
  registeredBatteryId?: string; // Newly registered for this request; no existing battery selection.
  suppliedAt?: string;
  events: AdminSupplyEvent[];
}

function now() { return new Date().toISOString(); }
function requireLocal() {
  if (typeof localStorage === 'undefined') throw new Error('Browser storage is unavailable.');
  return localStorage;
}
function readRecords(): AdminSupplyRecord[] {
  try {
    const parsed = JSON.parse(requireLocal().getItem(SUPPLY_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
export function getAdminSupplyRecords() { return readRecords(); }
export function getAdminSupplyRecord(id: string): AdminSupplyRecord | undefined {
  return readRecords().find((record) => record.requestId === id);
}
function event(action: string, detail: string): AdminSupplyEvent {
  return { action, detail, by: 'System Administrator', at: now() };
}
function changed() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('admin-data-updated'));
}
/** Write related shared prototype entries with rollback if an individual storage write fails. */
function commit(entries: Array<[string, unknown]>) {
  const storage = requireLocal();
  const previous = entries.map(([key]) => [key, storage.getItem(key)] as const);
  try {
    for (const [key, value] of entries) storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    for (const [key, raw] of previous) {
      try { raw === null ? storage.removeItem(key) : storage.setItem(key, raw); } catch { /* storage may be disabled */ }
    }
    throw error;
  }
  changed();
}
function findRequest(id: string): ReplacementRequest {
  const request = getReplacementRequests().find((item) => item.id === id);
  if (!request) throw new Error('Replacement request not found.');
  return request;
}

export type AdminEffectiveStatus = 'AWAITING_SUPPLY' | 'SUPPLIED' | 'RECEIVED' | 'REJECTED';
export function getAdminEffectiveStatus(request: ReplacementRequest): AdminEffectiveStatus {
  if (request.status === 'REJECTED') return 'REJECTED';
  if (request.status === 'FULFILLED') return 'RECEIVED';
  if (request.status === 'APPROVED') return 'SUPPLIED'; // Shared Technician receipt stage; stock was deducted at Confirm Supply.
  return 'AWAITING_SUPPLY'; // PENDING is the legacy Technician-internal status, not an Admin approval step.
}
