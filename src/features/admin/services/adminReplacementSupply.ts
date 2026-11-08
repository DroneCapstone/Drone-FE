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

/** @deprecated Backward compatibility for historical two-step approval records; not used by Admin UI. */
export function approveReplacementRequest(requestId: string, adminNote: string) {
  const request = findRequest(requestId);
  if (request.status !== 'PENDING') throw new Error('Only new requests can be approved.');
  if (getAdminSupplyRecord(requestId)) throw new Error('This request already has an Admin supply decision.');
  if (!Number.isSafeInteger(request.quantity) || request.quantity < 1)
    throw new Error('Replacement quantity must be a positive whole number.');
  if (request.type === 'PART' && (!request.partId || !request.droneId))
    throw new Error('A spare part request requires a damaged component and Drone ID.');
  if (request.type === 'BATTERY' && !request.batteryId)
    throw new Error('A battery request requires the damaged Battery ID.');
  if (request.type === 'BATTERY' && request.quantity !== 1)
    throw new Error('Request one battery per replacement so every unit has its own Battery ID.');
  if (request.type === 'BATTERY' && !getAdminBatteries().some((battery) => battery.id === request.batteryId))
    throw new Error('The damaged Battery ID was not found. Verify it before approving.');
  if (request.type === 'BATTERY' && !getAdminHubs().some((hub) => hub.id === request.hubId && hub.status === 'ACTIVE'))
    throw new Error('The receiving Hub must be active before a replacement can be approved.');
  if (request.type === 'BATTERY' && getReplacementRequests().some((other) => other.id !== request.id
    && other.type === 'BATTERY' && other.batteryId === request.batteryId
    && (other.status === 'APPROVED' || other.status === 'FULFILLED' ||
      getAdminSupplyRecord(other.id)?.stage === 'AWAITING_SUPPLY')))
    throw new Error('Another approved replacement already exists for this damaged Battery ID.');
  const time = now();
  const record: AdminSupplyRecord = {
    requestId,
    stage: 'AWAITING_SUPPLY',
    reviewedBy: 'System Administrator', reviewedAt: time, adminNote: adminNote.trim(),
    events: [event('APPROVED', 'Replacement need approved; component/battery selection still required')],
  };
  const entries: Array<[string, unknown]> = [[SUPPLY_KEY, [record, ...readRecords()]]];
  if (request.type === 'BATTERY') {
    const batteries = getAdminBatteries();
    const damaged = batteries.find((battery) => battery.id === request.batteryId);
    if (damaged && damaged.administrativeStatus === 'ACTIVE') {
      damaged.operationalStatus = 'MAINTENANCE';
      damaged.retirementRecommended = true;
      damaged.retirementReason = 'TECHNICIAN_REPORTED_FAILURE';
      damaged.updatedAt = time;
      entries.push([BATTERY_KEY, batteries]);
    }
  }
  commit(entries);
  return record;
}

/** Reject only before supply. Preserve the reason, request history and an audit trail.
 * Existing legacy Awaiting Supply records can also be rejected as long as no
 * replacement battery has already been registered specifically for them.
 */
export function rejectReplacementRequest(requestId: string, reason: string) {
  const note = reason.trim();
  if (!note) throw new Error('Enter a reason for rejection.');
  if (note.length > 500) throw new Error('The rejection reason must be 500 characters or less.');
  const request = findRequest(requestId);
  if (request.status !== 'PENDING') throw new Error('Only replacement records awaiting supply can be rejected.');
  const records = readRecords();
  const existing = records.find((item) => item.requestId === requestId);
  if (existing && existing.stage !== 'AWAITING_SUPPLY')
    throw new Error('A supplied or closed replacement cannot be rejected.');
  if (existing?.registeredBatteryId)
    throw new Error(`Battery ${existing.registeredBatteryId} was already registered for this request. Resolve the battery allocation before rejecting.`);
  const stamp = now();
  const updatedRequests = getReplacementRequests().map((item) => item.id === requestId
    ? { ...item, status: 'REJECTED' as const, adminNote: note, reviewedAt: stamp, reviewedBy: 'System Administrator' }
    : item);
  const rejection = existing ?? {
    requestId, stage: 'REJECTED' as const, reviewedBy: 'System Administrator', reviewedAt: stamp,
    adminNote: note, events: [] as AdminSupplyEvent[],
  };
  rejection.stage = 'REJECTED';
  rejection.reviewedAt = stamp;
  rejection.reviewedBy = 'System Administrator';
  rejection.adminNote = note;
  rejection.events.push({ action: 'REJECTED', detail: note, by: 'System Administrator', at: stamp });
  if (!existing) records.unshift(rejection);
  commit([[REQUEST_KEY, updatedRequests], [SUPPLY_KEY, records]]);
  recordPrototypeActivity('admin', 'System Administrator', 'REJECT_REPLACEMENT', requestId, note);
}

export function getMatchingPartOptions(request: ReplacementRequest): SparePart[] {
  return request.type === 'PART' ? getCompatiblePartsForRequest(request) : [];
}

/** Generate a unique ID from the existing Admin battery list (BAT-001, BAT-017, ...). */
export function nextAdminBatteryId(batteries = getAdminBatteries()): string {
  const max = batteries.reduce((current, battery) => {
    const match = /^BAT-(\d+)$/.exec(battery.id);
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);
  let next = max + 1;
  while (batteries.some((battery) => battery.id === `BAT-${String(next).padStart(3, '0')}`)) next++;
  return `BAT-${String(next).padStart(3, '0')}`;
}

/** Register a brand-new, uninspected battery for one already-approved replacement.
  * The model and receiving Hub always come from the reported damaged battery/request.
  * No existing Battery ID is eligible for reuse in this flow.
  */
export function registerNewReplacementBattery(requestId: string, serialNumber: string, paidUnitCostVnd?: number): AdminBattery {
  const request = findRequest(requestId);
  const records = readRecords();
  const record = records.find((item) => item.requestId === requestId);
  if (request.type !== 'BATTERY' || request.quantity !== 1 || !request.batteryId)
    throw new Error('A replacement must reference exactly one damaged Battery ID.');
  if (request.status !== 'PENDING' || record?.stage !== 'AWAITING_SUPPLY')
    throw new Error('Approve this battery replacement request before registration.');
  if (record.registeredBatteryId)
    throw new Error(`A new battery (${record.registeredBatteryId}) is already registered for this request.`);
  const damaged = getAdminBatteries().find((battery) => battery.id === request.batteryId);
  if (!damaged) throw new Error('The damaged Battery ID does not exist in Admin Battery Management.');
  if (!getAdminHubs().some((hub) => hub.id === request.hubId && hub.status === 'ACTIVE'))
    throw new Error('The receiving Hub does not exist.');
  const serial = serialNumber.trim();
  if (!serial) throw new Error('Enter the serial number printed on the new physical battery.');
  if (paidUnitCostVnd !== undefined && (!Number.isFinite(paidUnitCostVnd) || paidUnitCostVnd <= 0))
    throw new Error('A paid battery must have a positive actual purchase price.');
  const batteries = getAdminBatteries();
  if (batteries.some((battery) => battery.serialNumber.trim().toLowerCase() === serial.toLowerCase()))
    throw new Error('This serial number is already registered.');
  const time = now();
  const created: AdminBattery = {
    id: nextAdminBatteryId(batteries), model: damaged.model, serialNumber: serial,
    hubId: request.hubId, chargeLevelPct: 100, operationalStatus: 'MAINTENANCE',
    administrativeStatus: 'ACTIVE', designCapacityMah: damaged.designCapacityMah,
    designEnergyWh: damaged.designEnergyWh, fullChargeCapacityMah: damaged.designCapacityMah,
    sohPct: 100, cycleCount: 0, maxCycles: damaged.maxCycles,
    physicalCondition: 'NORMAL', retirementRecommended: false,
    inspectionPending: true, replacementRequestId: request.id,
    createdAt: time, updatedAt: time,
  };
  record.registeredBatteryId = created.id;
  record.events.push(event('REGISTERED', `${created.id} created for Hub ${request.hubId} · ${damaged.model}; awaiting Technician inspection`));
  const entries: Array<[string, unknown]> = [[BATTERY_KEY, [created, ...batteries]], [SUPPLY_KEY, records]];
  if (paidUnitCostVnd !== undefined) {
    let expenses: unknown[] = [];
    try { const parsed = JSON.parse(requireLocal().getItem(EXPENSE_KEY) ?? '[]'); if (Array.isArray(parsed)) expenses = parsed; } catch { /* initial demo expense list */ }
    entries.push([EXPENSE_KEY, [{
      id: `EXP-BAT-${created.id}-${Date.now()}`, date: time, category: 'BATTERY',
      amountVnd: paidUnitCostVnd, description: `Paid new battery ${created.id} (${damaged.model}) for request ${request.id}`,
    }, ...expenses]]);
  }
  commit(entries);
  return created;
}

/** Replacement can use only an unused NEW battery controlled by Admin.
  * It must NOT be a battery already assigned to a Hub or installed on a drone.
  * Legacy requests with an already-registered Battery ID are still supported.
  */
export function getMatchingBatteryOptions(request: ReplacementRequest): AdminBattery[] {
  if (request.type !== 'BATTERY' || request.quantity !== 1) return [];
  const damaged = getAdminBatteries().find((battery) => battery.id === request.batteryId);
  if (!damaged) return [];
  const options = getAvailableNewBatteries(damaged.model);
  const linkedId = getAdminSupplyRecord(request.id)?.registeredBatteryId;
  const legacy = linkedId ? getAdminBatteries().find((battery) => battery.id === linkedId) : undefined;
  if (legacy && legacy.model === damaged.model && legacy.hubId === request.hubId
    && legacy.replacementRequestId === request.id && legacy.inspectionPending
    && legacy.administrativeStatus === 'ACTIVE' && legacy.operationalStatus === 'MAINTENANCE'
    && !legacy.droneId && !options.some((battery) => battery.id === legacy.id)) {
    options.push(legacy);
  }
  // A request-specific battery registered by an earlier prototype must be
  // supplied as that same ID; never leave it orphaned and supply another unit.
  if (legacy && options.some((battery) => battery.id === legacy.id)) return [legacy];
  return options;
}

/** Simple direct registration in Admin Battery Management (not tied to a replacement). */
export function registerStandaloneBattery(model: string, hubId: string, serialNumber: string): AdminBattery {
  const batteries = getAdminBatteries();
  const template = batteries.find((battery) => battery.model === model);
  if (!template) throw new Error('Choose a supported battery model already registered in the system.');
  if (!getAdminHubs().some((hub) => hub.id === hubId && hub.status === 'ACTIVE')) throw new Error('Select an active Hub.');
  const serial = serialNumber.trim();
  if (!serial) throw new Error('New battery serial number is required.');
  if (batteries.some((battery) => battery.serialNumber.trim().toLowerCase() === serial.toLowerCase()))
    throw new Error('Serial number already exists.');
  const stamp = now();
  const battery: AdminBattery = {
    id: nextAdminBatteryId(batteries), model, serialNumber: serial, hubId,
    chargeLevelPct: 100, operationalStatus: 'MAINTENANCE', administrativeStatus: 'ACTIVE',
    designCapacityMah: template.designCapacityMah, designEnergyWh: template.designEnergyWh,
    fullChargeCapacityMah: template.designCapacityMah, sohPct: 100, cycleCount: 0,
    maxCycles: template.maxCycles, physicalCondition: 'NORMAL', retirementRecommended: false,
    inspectionPending: true, createdAt: stamp, updatedAt: stamp,
  };
  commit([[BATTERY_KEY, [battery, ...batteries]]]);
  return battery;
}

/** Admin mirrors a Technician technical report; no separate receipt stage is required.
  * This is a demo action: it does not assert the Administrator performed inspection.
  */
export function recordBatteryInspectionResult(batteryId: string, passed: boolean, technicianReport: string) {
  const batteries = getAdminBatteries();
  const battery = batteries.find((item) => item.id === batteryId);
  if (!battery || !battery.inspectionPending)
    throw new Error('Only a new battery pending inspection can receive this result.');
  const request = battery.replacementRequestId ? findRequest(battery.replacementRequestId) : undefined;
  if (request && request.status !== 'APPROVED' && request.status !== 'FULFILLED')
    throw new Error('Replacement must be supplied before the Technician verification result can be recorded.');
  const record = request ? getAdminSupplyRecord(request.id) : undefined;
  if (request && (record?.selectedBatteryId !== batteryId || record.stage !== 'SUPPLIED'))
    throw new Error('This new battery was not supplied for the linked request.');
  if (!technicianReport.trim()) throw new Error('Enter the Technician inspection report/reference.');
  // Admin mirrors a Technician technical check outcome, not a BMS assessment.
  if (battery.administrativeStatus === 'RETIRED')
    throw new Error('A retired battery cannot be marked Ready.');
  battery.operationalStatus = passed ? 'READY' : 'MAINTENANCE';
  battery.inspectionPending = !passed; // Failed checks remain blocked pending a new review.
  battery.inspectionNote = technicianReport.trim();
  battery.inspectionCheckedAt = now();
  battery.updatedAt = now();
  const records = readRecords();
  const updatedRecord = request ? records.find((item) => item.requestId === request.id) : undefined;
  if (updatedRecord) updatedRecord.events.push(event(passed ? 'INSPECTION_PASSED' : 'INSPECTION_FAILED', technicianReport.trim()));
  commit(updatedRecord ? [[BATTERY_KEY, batteries], [SUPPLY_KEY, records]] : [[BATTERY_KEY, batteries]]);
  return battery;
}

/** One Admin action: choose the item, validate compatibility/quantity, and supply once.
 * A previous prototype may have already created an AWAITING_SUPPLY record;
 * retain it, but do not require a separate Approve action for new requests.
 */
export function supplyApprovedReplacement(requestId: string, selectedItemId: string) {
  const request = findRequest(requestId);
  if (request.status !== 'PENDING')
    throw new Error('This replacement has already been supplied or closed.');
  if (!Number.isSafeInteger(request.quantity) || request.quantity < 1)
    throw new Error('Replacement quantity must be a positive whole number.');
  if (!selectedItemId) throw new Error('Select a replacement part or battery first.');

  const records = readRecords();
  const existing = records.find((item) => item.requestId === requestId);
  if (existing && existing.stage !== 'AWAITING_SUPPLY')
    throw new Error('This replacement has already been supplied.');
  const stamp = now();
  const record: AdminSupplyRecord = existing ?? {
    requestId, stage: 'AWAITING_SUPPLY',
    reviewedBy: 'System Administrator', reviewedAt: stamp, adminNote: '', events: [],
  };

  const updated: ReplacementRequest = {
    ...request, status: 'APPROVED', // Shared prototype flag: Technician may now Confirm Receipt.
    reviewedAt: stamp, reviewedBy: 'System Administrator',
    adminNote: record.adminNote,
  };
  const parts = request.type === 'PART' ? getSpareParts() : undefined;
  let batteryUpdates: AdminBattery[] | undefined;
  if (request.type === 'PART') {
    if (!request.partId || !request.droneId)
      throw new Error('A spare part replacement needs a valid component and Drone ID.');
    const matched = getMatchingPartOptions(request).find((part) => part.id === selectedItemId);
    const chosen = parts?.find((part) => part.id === selectedItemId);
    if (!matched || !chosen?.active)
      throw new Error('The selected spare part is missing, inactive, or incompatible with the drone.');
    if (chosen.quantity < request.quantity)
      throw new Error(`Insufficient quantity: ${chosen.quantity} available, ${request.quantity} required.`);
    chosen.quantity -= request.quantity;
    updated.approvedPartId = chosen.id;
    record.selectedPartId = chosen.id;
  } else {
    if (!request.batteryId || request.quantity !== 1)
      throw new Error('Battery replacements require exactly one damaged Battery ID.');
    const hubs = getAdminHubs();
    if (!hubs.some((hub) => hub.id === request.hubId && hub.status === 'ACTIVE'))
      throw new Error('The receiving Hub must be active.');
    if (getReplacementRequests().some((other) => other.id !== request.id
        && other.type === 'BATTERY' && other.batteryId === request.batteryId
        && (other.status === 'APPROVED' || other.status === 'FULFILLED')))
      throw new Error('This damaged battery already has another supplied replacement.');
    const batteries = getAdminBatteries();
    const damaged = batteries.find((battery) => battery.id === request.batteryId);
    if (!damaged) throw new Error('Damaged Battery ID was not found.');
    const chosen = batteries.find((battery) => battery.id === selectedItemId);
    if (!chosen || !getMatchingBatteryOptions(request).some((battery) => battery.id === selectedItemId))
      throw new Error('Choose a new, unassigned battery with the matching model.');
    if (chosen.replacementSupplyState === 'AVAILABLE') {
      chosen.hubId = request.hubId;
      chosen.replacementRequestId = request.id;
      chosen.replacementSupplyState = 'SUPPLIED';
      chosen.replacementSuppliedAt = stamp;
      chosen.firstAssignedAt = chosen.firstAssignedAt ?? stamp;
      chosen.updatedAt = stamp;
    } else if (!(record.registeredBatteryId === chosen.id && chosen.replacementRequestId === request.id)) {
      throw new Error('This battery has already been assigned to another Hub/request.');
    }
    // Administrative lifecycle is blocked until Technician receives and verifies the new battery.
    if (damaged.administrativeStatus === 'ACTIVE') {
      damaged.operationalStatus = 'MAINTENANCE';
      damaged.retirementRecommended = true;
      damaged.retirementReason = 'TECHNICIAN_REPORTED_FAILURE';
      damaged.updatedAt = stamp;
    }
    record.selectedBatteryId = selectedItemId;
    batteryUpdates = batteries;
  }
  record.stage = 'SUPPLIED';
  record.suppliedAt = stamp;
  record.events.push(event('SUPPLIED', `${selectedItemId} × ${request.quantity} assigned for Technician receipt`));
  if (!existing) records.unshift(record);
  const requests = getReplacementRequests().map((item) => item.id === requestId ? updated : item);
  const entries: Array<[string, unknown]> = [[REQUEST_KEY, requests], [SUPPLY_KEY, records]];
  if (parts) entries.unshift([PART_KEY, parts]);
  if (batteryUpdates) entries.unshift([BATTERY_KEY, batteryUpdates]);
  commit(entries);
  return record;
}

/** Informational activity trail, read-only from the Technician report. */
export function getAdminSupplyTimeline(request: ReplacementRequest): AdminSupplyEvent[] {
  const record = getAdminSupplyRecord(request.id);
  const events: AdminSupplyEvent[] = [{
    action: 'REQUESTED', detail: request.reason,
    by: request.technician, at: request.createdAt
  }];
  if (record) events.push(...record.events);
  else if (request.reviewedAt) events.push({
    action: request.status === 'REJECTED' ? 'REJECTED' : 'REVIEWED (LEGACY)',
    detail: request.adminNote ?? '', by: request.reviewedBy ?? 'Admin', at: request.reviewedAt
  });
  if (request.status === 'FULFILLED' && request.fulfilledAt)
    events.push({ action: 'RECEIVED', detail: 'Technician confirmed receipt', by: request.technician, at: request.fulfilledAt });
  return events.sort((a, b) => a.at.localeCompare(b.at));
}

export function getRequestDroneModel(request: ReplacementRequest) {
  return getAdminDrones().find((drone) => drone.id === request.droneId)?.model;
}

/** Admin-issued replacement events shown on Hub Detail (NOT a Hub stock ledger).
  * The same Battery ID is visible in Assigned Batteries after supply.
  * Older demo records may lack an exact issued Battery ID: make that explicit.
  */
export interface HubSupplyHistoryEntry {
  requestId: string;
  type: 'PART' | 'BATTERY';
  itemId: string;
  itemName: string;
  droneId?: string;
  quantity: number;
  issuedAt: string;
  historicReceipt: boolean;
}
export function getHubSupplyHistory(hubId: string): HubSupplyHistoryEntry[] {
  const supplyRecords = readRecords();
  const batteries = getAdminBatteries();
  const parts = getSpareParts();
  return getReplacementRequests()
    .filter((request) => request.hubId === hubId && (request.status === 'APPROVED' || request.status === 'FULFILLED'))
    .map((request): HubSupplyHistoryEntry => {
      const supply = supplyRecords.find((record) => record.requestId === request.id);
      const id = request.type === 'PART'
        ? (supply?.selectedPartId ?? request.approvedPartId ?? request.partId ?? '')
        : (supply?.selectedBatteryId ?? batteries.find((battery) => battery.replacementRequestId === request.id)?.id ?? '');
      const item = request.type === 'PART'
        ? parts.find((part) => part.id === id)?.name ?? 'Spare part'
        : id ? batteries.find((battery) => battery.id === id)?.model ?? 'Battery' : 'Battery replacement (legacy)';
      return {
        requestId: request.id, type: request.type, itemId: id,
        itemName: item, droneId: request.droneId,
        quantity: request.quantity, issuedAt: supply?.suppliedAt ?? request.reviewedAt ?? request.createdAt,
        historicReceipt: request.status === 'FULFILLED',
      };
    })
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}
