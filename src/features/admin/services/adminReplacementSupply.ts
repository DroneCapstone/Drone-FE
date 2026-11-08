/**
 * Admin-only supply follow-up for the Technician replacement-request prototype.
 * Compatible with the existing `droneoptai.prototype.v1.requests` and `.parts`
 * keys. No changes to the Technician app, backend, or Hub quantities.
 *
 * IMPORTANT: Approve is a business decision, NOT the act of supplying a part.
 * The shared Technician request remains PENDING until Admin confirms supply,
 * at which point it becomes APPROVED so Technician can Confirm Receipt.
 */
import { getAdminBatteries, getAdminDrones, getAdminHubs } from './adminStore';
import {
  getCompatiblePartsForRequest,
  getReplacementRequests,
  getSpareParts,
  reviewReplacement,
  type ReplacementRequest,
  type SparePart,
} from './prototypeWorkflow';
import type { AdminBattery } from '../types';
import './batteryLifecycle';
import { getAvailableNewBatteries, getNewBatteryReferenceUnitCostVnd } from './adminNewBatterySupply';

const PREFIX = 'droneoptai.prototype.v1.';
const SUPPLY_KEY = `${PREFIX}admin-supply-v2`;
const REQUEST_KEY = `${PREFIX}requests`;
const PART_KEY = `${PREFIX}parts`;
const BATTERY_KEY = 'droneoptai.admin.batteries.v2';
const EXPENSE_KEY = `${PREFIX}expenses`; 

export type AdminSupplyStage = 'AWAITING_SUPPLY' | 'SUPPLIED';
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

export type AdminEffectiveStatus = 'PENDING' | 'AWAITING_SUPPLY' | 'SUPPLIED' | 'RECEIVED' | 'REJECTED';
export function getAdminEffectiveStatus(request: ReplacementRequest): AdminEffectiveStatus {
  if (request.status === 'REJECTED') return 'REJECTED';
  if (request.status === 'FULFILLED') return 'RECEIVED';
  if (request.status === 'APPROVED') return 'SUPPLIED'; // Legacy approvals already deducted stock; never deduct again.
  const record = getAdminSupplyRecord(request.id);
  return record?.stage === 'AWAITING_SUPPLY' ? 'AWAITING_SUPPLY' : 'PENDING';
}

/** First step: record Admin's approval, without touching stock or Technician visibility. */
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

/** Reject is still handled by the existing Technician-visible workflow. */
export function rejectReplacementRequest(requestId: string, reason: string) {
  if (!reason.trim()) throw new Error('Enter a reason for rejection.');
  if (getAdminSupplyRecord(requestId)) throw new Error('This request was already approved.');
  reviewReplacement(requestId, 'REJECTED', reason, 'System Administrator');
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
export function registerNewReplacementBattery(requestId: string, serialNumber: string): AdminBattery {
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
  const unitPrice = getNewBatteryReferenceUnitCostVnd(damaged.model);
  if (!Number.isSafeInteger(unitPrice) || unitPrice <= 0)
    throw new Error('Configure a reference price for this battery model before registration.');
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
  let expenses: unknown[] = [];
  try { const parsed = JSON.parse(requireLocal().getItem(EXPENSE_KEY) ?? '[]'); if (Array.isArray(parsed)) expenses = parsed; } catch { /* initial demo expense list */ }
  entries.push([EXPENSE_KEY, [{
    id: `EXP-BAT-${created.id}-${Date.now()}`, date: time, category: 'BATTERY',
    amountVnd: unitPrice, recordType: 'RECORDED', sourceId: created.id,
    quantity: 1, unitCostVnd: unitPrice,
    description: `Recorded acquisition: new battery ${created.id} (${damaged.model}) for request ${request.id}; no bank payment`,
  }, ...expenses]]);
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

/** Admin records the result supplied by Technician after physical receipt/check.
 * This is a demo action: it does not assert the Administrator performed inspection.
 */
export function recordBatteryInspectionResult(batteryId: string, passed: boolean, technicianReport: string) {
  const batteries = getAdminBatteries();
  const battery = batteries.find((item) => item.id === batteryId);
  if (!battery || !battery.inspectionPending)
    throw new Error('Only a new battery pending inspection can receive this result.');
  const request = battery.replacementRequestId ? findRequest(battery.replacementRequestId) : undefined;
  if (request && request.status !== 'FULFILLED')
    throw new Error('Technician must confirm receipt before inspection result can be recorded.');
  const record = request ? getAdminSupplyRecord(request.id) : undefined;
  if (request && (record?.selectedBatteryId !== batteryId || record.stage !== 'SUPPLIED'))
    throw new Error('This new battery was not supplied for the linked request.');
  if (!technicianReport.trim()) throw new Error('Enter the Technician inspection report/reference.');
  // Admin records the Technician's basic receipt/check outcome, not a BMS assessment.
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

/** Second step: confirm the selected part/battery; only here is it actually supplied. */
export function supplyApprovedReplacement(requestId: string, selectedItemId: string) {
  const request = findRequest(requestId);
  const records = readRecords();
  const record = records.find((item) => item.requestId === requestId);
  if (!record || record.stage !== 'AWAITING_SUPPLY' || request.status !== 'PENDING')
    throw new Error('This request has not been approved for supply, or it has already been supplied.');
  if (!selectedItemId) throw new Error('Select a replacement part or battery first.');
  const time = now();
  const updated: ReplacementRequest = {
    ...request, status: 'APPROVED', reviewedAt: record.reviewedAt,
    reviewedBy: record.reviewedBy, adminNote: record.adminNote,
  };
  const parts = request.type === 'PART' ? getSpareParts() : undefined;
  let batteryUpdates: AdminBattery[] | undefined;
  if (request.type === 'PART') {
    const matched = getMatchingPartOptions(request).find((part) => part.id === selectedItemId);
    const selected = parts?.find((part) => part.id === selectedItemId);
    if (!matched || !selected?.active)
      throw new Error('The selected part is missing, inactive or incompatible with this drone.');
    if (selected.quantity < request.quantity)
      throw new Error(`Insufficient quantity: ${selected.quantity} available, ${request.quantity} needed. Create the compatible SKU or add quantity in Spare Parts.`);
    selected.quantity -= request.quantity;
    updated.approvedPartId = selected.id;
    record.selectedPartId = selected.id;
  } else {
    if (request.quantity !== 1)
      throw new Error('Each battery is tracked by a unique Battery ID; please request one battery per request.');
    const batteries = getAdminBatteries();
    const chosen = batteries.find((battery) => battery.id === selectedItemId);
    if (!chosen || !getMatchingBatteryOptions(request).some((battery) => battery.id === selectedItemId))
      throw new Error('Choose an available NEW battery with the correct model from Replacement Supplies.');
    // A previously unassigned Admin-owned battery is now supplied to the Hub.
    // This is an UPDATE of the same Battery ID, not creation of another one.
    if (chosen.replacementSupplyState === 'AVAILABLE') {
      chosen.hubId = request.hubId;
      chosen.replacementRequestId = request.id;
      chosen.replacementSupplyState = 'SUPPLIED';
      chosen.replacementSuppliedAt = time;
      chosen.updatedAt = time;
    } else if (!(record.registeredBatteryId === chosen.id && chosen.replacementRequestId === request.id)) {
      throw new Error('This battery has already been allocated to another Hub or request.');
    }
    record.selectedBatteryId = selectedItemId;
    batteryUpdates = batteries;
  }
  record.stage = 'SUPPLIED';
  record.suppliedAt = time;
  record.events.push(event('SUPPLIED', `${selectedItemId} × ${request.quantity} assigned for Technician receipt`));
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
  const events: AdminSupplyEvent[] = [{ action: 'REQUESTED', detail: request.reason,
    by: request.technician, at: request.createdAt }];
  if (record) events.push(...record.events);
  else if (request.reviewedAt) events.push({ action: request.status === 'REJECTED' ? 'REJECTED' : 'REVIEWED (LEGACY)',
    detail: request.adminNote ?? '', by: request.reviewedBy ?? 'Admin', at: request.reviewedAt });
  if (request.status === 'FULFILLED' && request.fulfilledAt)
    events.push({ action: 'RECEIVED', detail: 'Technician confirmed receipt', by: request.technician, at: request.fulfilledAt });
  return events.sort((a, b) => a.at.localeCompare(b.at));
}

export function getRequestDroneModel(request: ReplacementRequest) {
  return getAdminDrones().find((drone) => drone.id === request.droneId)?.model;
}
