/** Shared, browser-local prototype data for Admin and Technician.
 * Never changes operational API data or pretends to ship physical stock. */
import { getAdminDrones } from './adminStore';
import type { AdminAuditLog, AdminPayment, AdminRefund } from '../types';
import { adminPayments, adminRefunds } from '../data/adminData';

export type ReplacementKind = 'PART' | 'BATTERY';
export type ReplacementStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED';
export interface ReplacementRequest {
  id: string;
  type: ReplacementKind;
  hubId: string;
  droneId?: string;
  batteryId?: string;
  partId?: string;
  approvedPartId?: string; // Admin-selected compatible part, saved on approval.
  quantity: number;
  reason: string;
  technician: string;
  status: ReplacementStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminNote?: string;
  fulfilledAt?: string;
}
export interface SparePart {
  id: string;
  name: string;
  compatibleModels: string;
  unitCostVnd: number;
  active: boolean;
  quantity: number; // Single Admin-controlled quantity, never per Hub.
  /** Legacy prototype field, accepted only during one-way normalization. */
  stockByHub?: Record<string, number>;
}
export interface PrototypeActivity {
  id: string; at: string; actor: string; role: 'admin' | 'technician'; action: string; target: string; detail?: string;
}
const prefix = 'droneoptai.prototype.v1.';
const updated = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event('admin-data-updated')); };
function read<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(prefix + key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}
function write<T>(key: string, data: T) { localStorage.setItem(prefix + key, JSON.stringify(data)); updated(); }
/** Commit related browser-local data together; restore the previous values if a write fails. */
function writeTogether(entries: Array<[string, unknown]>) {
  const before = entries.map(([key]) => [key, localStorage.getItem(prefix + key)] as const);
  try {
    for (const [key, value] of entries) localStorage.setItem(prefix + key, JSON.stringify(value));
  } catch (error) {
    for (const [key, raw] of before) {
      try { if (raw === null) localStorage.removeItem(prefix + key); else localStorage.setItem(prefix + key, raw); } catch { /* no further recovery possible */ }
    }
    throw error;
  }
  updated();
}

/** Exactly the eight component categories used in the Admin prototype. */
export const CORE_SPARE_PART_CATEGORIES = [
  { code: 'PROP', name: 'Propeller', model: 'DJI FlyCart 30', quantity: 2 },
  { code: 'MOTOR', name: 'Motor', model: 'Matrice 350 RTK', quantity: 1 },
  { code: 'ESC', name: 'Electronic Speed Controller (ESC)', model: 'DJI FlyCart 30', quantity: 2 },
  { code: 'FC', name: 'Flight Controller', model: 'Matrice 350 RTK', quantity: 0 },
  { code: 'GPS', name: 'GPS/GNSS Module', model: 'Matrice 350 RTK', quantity: 1 },
  { code: 'COM', name: 'Communication Module', model: 'DJI FlyCart 30', quantity: 3 },
  { code: 'PDM', name: 'Power Distribution Module', model: 'DJI FlyCart 30', quantity: 0 },
  { code: 'PAY', name: 'Payload Release Mechanism', model: 'DJI FlyCart 30', quantity: 2 },
] as const;

const fallbackSpareParts = (): SparePart[] => CORE_SPARE_PART_CATEGORIES.map((item) => ({
  id: `PART-${item.code}`, name: item.name, compatibleModels: item.model,
  unitCostVnd: 0, active: true, quantity: item.quantity,
}));

/**
 * Old mock used a fictional quantity of 4 at every Hub. No Hub holds spare
 * parts in the agreed business flow. Preserve a single quantity (maximum
 * legacy Hub value rather than multiplying artificial demo inventories).
 * Real user-created Part IDs and request references remain unchanged.
 */
export function getSpareParts(): SparePart[] {
  const defaults = fallbackSpareParts();
  const saved = read('parts', defaults);
  if (!Array.isArray(saved)) return defaults;
  return saved.map((part) => {
    const legacy = part.stockByHub;
    const legacyQty = legacy && typeof legacy === 'object'
      ? Math.max(0, ...Object.values(legacy).map((n) => Number(n) || 0)) : 0;
    const demo = defaults.find((item) => item.id === part.id);
    const quantity = Number.isInteger(part.quantity) && part.quantity >= 0 ? part.quantity : legacyQty;
    const { stockByHub: _legacyStock, ...rest } = part;
    void _legacyStock;
    return {
      ...rest,
      compatibleModels: part.compatibleModels === 'Model-specific' && demo
        ? demo.compatibleModels : part.compatibleModels,
      quantity,
    };
  });
}

/** Demo-only reference unit values in VND, NOT supplier quotes or bank payouts. */
const DEMO_PART_COST_VND: Record<string, number> = {
  'PART-PROP': 200_000,
  'PART-MOTOR': 3_500_000,
  'PART-ESC': 1_800_000,
  'PART-FC': 4_500_000,
  'PART-GPS': 1_600_000,
  'PART-COM': 1_200_000,
  'PART-PDM': 1_300_000,
  'PART-PAY': 2_500_000,
};

/** Configured price wins; built-in core parts have a clearly demo-only fallback. */
export function getSparePartReferenceUnitCostVnd(part: SparePart): number {
  if (Number.isSafeInteger(part.unitCostVnd) && part.unitCostVnd > 0) return part.unitCostVnd;
  return DEMO_PART_COST_VND[part.id] ?? 0;
}

function recordedAcquisitionForParts(part: SparePart, count: number): PrototypeExpense {
  const unitPrice = getSparePartReferenceUnitCostVnd(part);
  if (!Number.isSafeInteger(unitPrice) || unitPrice <= 0 || !Number.isSafeInteger(unitPrice * count)) {
    throw new Error('Configure a positive reference unit price before receiving spare parts.');
  }
  return {
    id: `EXP-PART-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    date: new Date().toISOString(), category: 'SPARE_PART',
    amountVnd: count * unitPrice, recordType: 'RECORDED',
    sourceId: part.id, quantity: count, unitCostVnd: unitPrice,
    description: `Recorded acquisition: ${count} × ${part.name} (${part.id}) at ${unitPrice} VND/unit; no bank payment`,
  };
}

function verifyPart(part: SparePart) {
  if (!part.id.trim() || !part.name.trim() || !part.compatibleModels.trim())
    throw new Error('Part ID, component and drone model are required.');
  if (!/^PART-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(part.id))
    throw new Error('Part ID must use PART-... with uppercase letters, numbers and hyphens.');
  if (!Number.isInteger(part.quantity) || part.quantity < 0)
    throw new Error('Quantity must be a non-negative whole number.');
  if (!Number.isFinite(part.unitCostVnd) || part.unitCostVnd < 0)
    throw new Error('Reference cost must be zero or greater.');
}

/** Create a SKU with initial quantity, or update its metadata without modifying quantity. */
export function saveSparePart(part: SparePart) {
  const normalized: SparePart = {
    ...part, id: part.id.trim().toUpperCase(), name: part.name.trim(),
    compatibleModels: part.compatibleModels.trim(),
  };
  delete normalized.stockByHub;
  verifyPart(normalized);
  const items = getSpareParts();
  const index = items.findIndex((item) => item.id === normalized.id);
  if (index >= 0 && items[index].quantity !== normalized.quantity)
    throw new Error('Use Add quantity to increase available parts. Quantity cannot be edited here.');
  if (items.some((item) => item.id !== normalized.id
    && item.name.toLowerCase() === normalized.name.toLowerCase()
    && item.compatibleModels.toLowerCase() === normalized.compatibleModels.toLowerCase()))
    throw new Error('This component and compatible model already exist. Use Add quantity instead.');
  const acquisition = index < 0 && normalized.quantity > 0 ? recordedAcquisitionForParts(normalized, normalized.quantity) : null;
  if (index >= 0) items[index] = normalized; else items.unshift(normalized);
  const entries: Array<[string, unknown]> = [['parts', items]];
  if (acquisition) entries.push(['expenses', [acquisition, ...getPrototypeExpenses()]]);
  writeTogether(entries);
  recordPrototypeActivity('admin', 'Admin', index >= 0 ? 'UPDATE_PART' : 'CREATE_PART', normalized.id);
}

/** Add new available units to an existing SKU; never create a duplicate part. */
export function addSparePartQuantity(id: string, added: number) {
  if (!Number.isSafeInteger(added) || added <= 0) throw new Error('Enter a positive whole number of units.');
  const parts = getSpareParts(); const part = parts.find((item) => item.id === id);
  if (!part || !part.active) throw new Error('Only an active spare part can receive additional quantity.');
  const acquisition = recordedAcquisitionForParts(part, added);
  part.quantity += added;
  const entries: Array<[string, unknown]> = [['parts', parts]];
  entries.push(['expenses', [acquisition, ...getPrototypeExpenses()]]);
  writeTogether(entries);
  recordPrototypeActivity('admin', 'Admin', 'ADD_PART_QUANTITY', id, `+${added}; available ${part.quantity}`);
}

function normalizedModel(value: string) { return value.trim().toLowerCase().replace(/\s+/g, ' '); }
/** Supply only a part of the requested component category compatible with the damaged drone. */
export function getCompatiblePartsForRequest(request: ReplacementRequest, parts = getSpareParts()): SparePart[] {
  if (request.type !== 'PART' || !request.droneId) return [];
  const original = parts.find((p) => p.id === request.partId);
  const drone = getAdminDrones().find((d) => d.id === request.droneId);
  if (!original || !drone) return [];
  const targetModel = normalizedModel(drone.model);
  return parts.filter((part) => part.active && normalizedModel(part.name) === normalizedModel(original.name)
    && part.compatibleModels.split(/[,;\n]/).some((m) => normalizedModel(m) === targetModel));
}
/**
 * Approval examples for a fresh Admin/Technician prototype.
 * References (hub / drone / battery / technician / part) match the Admin seed catalog.
 * Fixed IDs allow a one-time, non-destructive merge into existing browser data.
 * These are fictional demonstration records; they are not Backend work orders.
 */
function demoReplacementRequests(): ReplacementRequest[] {
  return [
    {
      id: 'REQ-DEMO-001', type: 'PART', partId: 'PART-MOTOR', droneId: 'DR-003',
      hubId: 'hub-01', quantity: 1, technician: 'Tran An Technician',
      reason: 'Motor overheats and vibrates during the maintenance inspection; replacement is required.',
      status: 'PENDING', createdAt: '2026-11-03T08:40:00+07:00',
    },
    {
      id: 'REQ-DEMO-002', type: 'PART', partId: 'PART-PROP', droneId: 'DR-010',
      hubId: 'hub-06', quantity: 2, technician: 'Do Minh Technician',
      reason: 'Two propellers have visible cracks after inspection; request safe replacement parts.',
      status: 'PENDING', createdAt: '2026-11-03T09:15:00+07:00',
    },
    {
      id: 'REQ-DEMO-003', type: 'BATTERY', batteryId: 'BAT-010', droneId: 'DR-010',
      hubId: 'hub-06', quantity: 1, technician: 'Do Minh Technician',
      reason: 'Battery health is below the operating threshold and the drone is under maintenance.',
      status: 'PENDING', createdAt: '2026-11-03T09:50:00+07:00',
    },
    {
      id: 'REQ-DEMO-004', type: 'BATTERY', batteryId: 'BAT-003', droneId: 'DR-003',
      hubId: 'hub-01', quantity: 1, technician: 'Tran An Technician',
      reason: 'Battery shows unstable voltage readings during the preflight maintenance check.',
      status: 'PENDING', createdAt: '2026-11-03T10:25:00+07:00',
    },
    {
      id: 'REQ-DEMO-005', type: 'PART', partId: 'PART-GPS', droneId: 'DR-003',
      hubId: 'hub-01', quantity: 1, technician: 'Tran An Technician',
      reason: 'GPS/GNSS module intermittently loses its signal during the diagnostic test.',
      status: 'APPROVED', createdAt: '2026-11-02T08:20:00+07:00',
      reviewedAt: '2026-11-02T10:05:00+07:00', reviewedBy: 'System Administrator',
      adminNote: 'Replacement authorized; awaiting delivery and Technician confirmation.',
    },
    {
      id: 'REQ-DEMO-006', type: 'BATTERY', batteryId: 'BAT-012',
      hubId: 'hub-02', quantity: 1, technician: 'Le Vy Technician',
      reason: 'Battery pack failed the cell-voltage balance check during storage inspection.',
      status: 'APPROVED', createdAt: '2026-11-02T09:10:00+07:00',
      reviewedAt: '2026-11-02T14:30:00+07:00', reviewedBy: 'System Administrator',
      adminNote: 'One replacement battery approved for Hub HCM-02.',
    },
    {
      id: 'REQ-DEMO-007', type: 'PART', partId: 'PART-ESC', droneId: 'DR-010',
      hubId: 'hub-06', quantity: 1, technician: 'Do Minh Technician',
      reason: 'Electronic speed controller failed diagnostics and must be replaced.',
      status: 'FULFILLED', createdAt: '2026-10-30T08:00:00+07:00',
      reviewedAt: '2026-10-30T10:30:00+07:00', reviewedBy: 'System Administrator',
      adminNote: 'Replacement ESC supplied to Hub HCM-06.',
      fulfilledAt: '2026-11-01T15:10:00+07:00',
    },
    {
      id: 'REQ-DEMO-008', type: 'BATTERY', batteryId: 'BAT-015',
      hubId: 'hub-06', quantity: 1, technician: 'Do Minh Technician',
      reason: 'Damaged battery was retired; a new battery is required for the Hub stock.',
      status: 'FULFILLED', createdAt: '2026-10-29T08:25:00+07:00',
      reviewedAt: '2026-10-29T14:20:00+07:00', reviewedBy: 'System Administrator',
      adminNote: 'Replacement battery approved and delivered.',
      fulfilledAt: '2026-10-31T11:35:00+07:00',
    },
    {
      id: 'REQ-DEMO-009', type: 'PART', partId: 'PART-FC', droneId: 'DR-003',
      hubId: 'hub-01', quantity: 1, technician: 'Tran An Technician',
      reason: 'Request to replace the flight controller after an intermittent sensor warning.',
      status: 'REJECTED', createdAt: '2026-10-31T09:05:00+07:00',
      reviewedAt: '2026-10-31T11:45:00+07:00', reviewedBy: 'System Administrator',
      adminNote: 'Run the calibration and diagnostic tests before replacing the flight controller.',
    },
    {
      id: 'REQ-DEMO-010', type: 'BATTERY', batteryId: 'BAT-007', droneId: 'DR-007',
      hubId: 'hub-03', quantity: 1, technician: 'Pham Khoa Technician',
      reason: 'Requested replacement following a low-charge observation during inspection.',
      status: 'REJECTED', createdAt: '2026-10-30T13:10:00+07:00',
      reviewedAt: '2026-10-31T09:30:00+07:00', reviewedBy: 'System Administrator',
      adminNote: 'No damage confirmed. Recharge and inspect the existing battery first.',
    },
  ];
}

/**
 * Seed once per browser profile, preserving every real/prototype request the user made.
 * Do not use write() here: this getter can run during a React render and must not
 * dispatch an update event synchronously while the component is rendering.
 */
export function getReplacementRequests(): ReplacementRequest[] {
  const current = read('requests', [] as ReplacementRequest[]);
  try {
    const marker = `${prefix}approval-demo-seeded-v1`;
    if (localStorage.getItem(marker) === '1') return current;

    const seen = new Set(current.map((request) => request.id));
    const examples = demoReplacementRequests().filter((request) => !seen.has(request.id));
    const seeded = [...current, ...examples].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    localStorage.setItem(`${prefix}requests`, JSON.stringify(seeded));
    localStorage.setItem(marker, '1');
    return seeded;
  } catch {
    // For environments without localStorage, still show examples without changing anything.
    return current.length ? current : demoReplacementRequests();
  }
}

export function submitReplacement(input: Omit<ReplacementRequest, 'id' | 'createdAt' | 'status'>): ReplacementRequest {
  if (!input.reason.trim() || !input.hubId || input.quantity < 1 || !Number.isInteger(input.quantity)) throw new Error('Hub, reason and valid quantity are required.');
  if (input.type === 'PART' && (!input.partId || !getSpareParts().some(p => p.id === input.partId && p.active))) throw new Error('Choose an active spare part.');
  if (input.type === 'BATTERY' && !input.batteryId) throw new Error('Select a battery needing replacement.');
  const item: ReplacementRequest = { ...input, id: `REQ-${Date.now()}-${Math.floor(Math.random() * 10000)}`, createdAt: new Date().toISOString(), status: 'PENDING' };
  write('requests', [item, ...getReplacementRequests()]); recordPrototypeActivity('technician', input.technician, 'REQUEST_REPLACEMENT', item.id);
  return item;
}
export function reviewReplacement(
  id: string, decision: 'APPROVED' | 'REJECTED', note: string, actor = 'Admin', selectedPartId?: string,
) {
  const items = getReplacementRequests(); const item = items.find((request) => request.id === id);
  if (!item || item.status !== 'PENDING') throw new Error('Only pending requests can be reviewed.');
  if (decision === 'REJECTED' && !note.trim()) throw new Error('A rejection reason is required.');
  let parts: SparePart[] | undefined;
  if (decision === 'APPROVED' && item.type === 'PART') {
    parts = getSpareParts();
    const compatible = getCompatiblePartsForRequest(item, parts);
    const selected = compatible.find((part) => part.id === (selectedPartId || item.partId));
    if (!selected) throw new Error('Choose a matching active component and drone model. Missing Drone ID or compatibility information must be corrected before approval.');
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new Error('Invalid replacement quantity.');
    if (selected.quantity < item.quantity)
      throw new Error(`Insufficient quantity for ${selected.id}: ${selected.quantity} available, ${item.quantity} required. Add quantity in Spare Parts before approval.`);
    selected.quantity -= item.quantity; // Decrement exactly once, at Admin approval.
    item.approvedPartId = selected.id;
  }
  item.status = decision; item.adminNote = note.trim();
  item.reviewedAt = new Date().toISOString(); item.reviewedBy = actor;
  if (parts) writeTogether([['parts', parts], ['requests', items]]);
  else write('requests', items); // Battery workflow remains unchanged.
  recordPrototypeActivity('admin', actor, decision === 'APPROVED' ? 'APPROVE_REPLACEMENT' : 'REJECT_REPLACEMENT', id,
    item.approvedPartId ? `Supplied ${item.approvedPartId} × ${item.quantity}; ${note.trim()}` : note.trim());
}
export function confirmReplacementReceipt(id: string, technician = 'Technician') {
  const items = getReplacementRequests(); const item = items.find(r => r.id === id);
  if (!item || item.status !== 'APPROVED') throw new Error('Only approved requests can be received.');
  // Already debited at approval. Receipt only changes the request status.
  item.status = 'FULFILLED'; item.fulfilledAt = new Date().toISOString();
  write('requests', items); recordPrototypeActivity('technician', technician, 'CONFIRM_RECEIPT', id);
}
export function getPrototypeActivity(): PrototypeActivity[] { return read('activity', [] as PrototypeActivity[]); }
export function recordPrototypeActivity(role: 'admin' | 'technician', actor: string, action: string, target: string, detail = '') {
  const a: PrototypeActivity = { id: `LOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`, at: new Date().toISOString(), actor, role, action, target, detail };
  write('activity', [a, ...getPrototypeActivity()].slice(0, 500));
}
export function getPrototypeAudit(): AdminAuditLog[] { return getPrototypeActivity().map(a => ({ id: a.id, actor: a.actor, role: a.role, action: a.action, entityType: a.action.includes('USER') ? 'User' : a.action.includes('REFUND') ? 'Payment' : a.action.includes('PART') ? 'Spare Part' : 'Replacement', entityId: a.target, result: 'SUCCESS', afterValue: a.detail, occurredAt: a.at })); }
export function getPrototypePayments(): AdminPayment[] {
  // Fallback fixtures are illustrative only. Do not claim they are real PayOS receipts.
  const sample = adminPayments.map((payment) => ({
    ...payment, paymentMethod: 'Demo sample (not PayOS)',
    providerReference: payment.providerReference ? `DEMO-${payment.providerReference}` : undefined,
  }));
  return read('payments', sample);
}
export function getPrototypeRefunds(): AdminRefund[] { return read('refunds', adminRefunds); }
export function executePrototypeRefund(paymentId: string, reason: string) {
  const payments = getPrototypePayments(); const payment = payments.find(p => p.id === paymentId);
  if (!payment || !payment.refundable || payment.status !== 'PAID') throw new Error('Only eligible paid transactions can be refunded.');
  const now = new Date().toISOString(); payment.status = 'REFUNDED'; payment.refundable = false; payment.refundedAt = now;
  payment.refundBlockReason = 'Already refunded (demo)';
  const existing = getPrototypeRefunds();
  if (existing.some((refund) => refund.paymentId === payment.id && refund.status === 'COMPLETED')) {
    throw new Error('This payment has already been refunded in the demo ledger.');
  }
  const nextRefunds = [{
    id: `REF-DEMO-${Date.now()}`, paymentId: payment.id, orderId: payment.orderId,
    customerName: payment.customerName, amountVnd: payment.amountVnd,
    reason: reason.trim() || 'Simulated full refund', status: 'COMPLETED' as const,
    requestedAt: now, processedAt: now,
  }, ...existing];
  // The two browser-local records advance together; never imply PayOS transferred money.
  writeTogether([['payments', payments], ['refunds', nextRefunds]]);
  recordPrototypeActivity('admin', 'Admin', 'ISSUE_REFUND', payment.id);
}
export function getUserActivity(userId: string) { return getPrototypeActivity().filter(a => a.target === userId); }

export interface PrototypeExpense {
  id: string;
  date: string;
  category: 'DRONE' | 'BATTERY' | 'SPARE_PART' | 'OTHER';
  amountVnd: number;
  description: string;
  hubId?: string;
  /** RECORDED is an internal reference expense, not an actual bank disbursement. */
  recordType?: 'RECORDED';
  sourceId?: string;
  quantity?: number;
  unitCostVnd?: number;
}
export function getPrototypeExpenses(): PrototypeExpense[] { return read('expenses', [] as PrototypeExpense[]); }
export function addPrototypeExpense(expense: Omit<PrototypeExpense, 'id' | 'date'>) {
  if (!expense.description.trim() || !Number.isFinite(expense.amountVnd) || expense.amountVnd <= 0) throw new Error('Enter an expense description and a positive amount.');
  const item: PrototypeExpense = { ...expense, id: `EXP-${Date.now()}`, date: new Date().toISOString() };
  write('expenses', [item, ...getPrototypeExpenses()]); recordPrototypeActivity('admin', 'Admin', 'RECORD_EXPENSE', item.id, expense.description);
}
