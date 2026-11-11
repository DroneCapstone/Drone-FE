/**
 * Admin-controlled NEW BATTERIES: uniquely identified units registered in a
 * demo-only, unassigned inventory. Physical manufacturer serials are optional.
 * No real supplier purchase, Hub transfer, or Backend mutation occurs here.
 * Records share Admin Battery Management's existing battery storage key: a
 * supplied unit moves to the Hub list without creating another Battery ID.
 */
import { getAdminBatteries } from './adminStore';
import type { AdminBattery } from '../types';
import './batteryLifecycle';

declare module '../types' {
  interface AdminBattery {
    replacementSupplyState?: 'AVAILABLE' | 'SUPPLIED';
    replacementSuppliedAt?: string;
    adminReceivedAt?: string;
  }
}

const BATTERY_KEY = 'droneoptai.admin.batteries.v2';
const EXPENSE_KEY = 'droneoptai.prototype.v1.expenses';
const REMOVAL_HISTORY_KEY = 'droneoptai.admin.new-batteries.removal-history.v1';

/** Demo reference values (VND) for supported battery models. Replace with a real
 * reference price catalogue if the backend later provides one. NOT bank charges. */
const DEMO_BATTERY_COST_VND: Record<string, number> = {
  'FC30 Battery Pack': 8_500_000,
  'TB65': 6_500_000,
};
export function getNewBatteryReferenceUnitCostVnd(model: string): number {
  return DEMO_BATTERY_COST_VND[model] ?? 0;
}

function nextAdminBatteryId(batteries: AdminBattery[]): string {
  // Never reuse a removed Battery ID: replacement/work-order references might
  // still point to it. No auto-generated manufacturer serials are involved.
  const allIds = [
    ...batteries.map((battery) => battery.id),
    ...getNewBatteryRemovalHistory().map((item) => item.batteryId),
  ];
  const max = allIds.reduce((value, id) => {
    const match = /^BAT-(\d+)$/.exec(id);
    return match ? Math.max(value, Number(match[1])) : value;
  }, 0);
  return `BAT-${String(max + 1).padStart(3, '0')}`;
}

export function getAvailableNewBatteries(model?: string): AdminBattery[] {
  return getAdminBatteries().filter((battery) =>
    battery.replacementSupplyState === 'AVAILABLE'
    && !battery.hubId && !battery.droneId && !battery.replacementRequestId
    && battery.administrativeStatus === 'ACTIVE'
    && battery.inspectionPending === true
    && (!model || battery.model === model),
  );
}

function readExpenses(): unknown[] {
  try {
    const value = JSON.parse(localStorage.getItem(EXPENSE_KEY) ?? '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}
function commit(entries: Array<[string, unknown]>) {
  const originals = entries.map(([key]) => [key, localStorage.getItem(key)] as const);
  try {
    for (const [key, value] of entries) localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    originals.forEach(([key, value]) => {
      try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch { /* storage unavailable */ }
    });
    throw error;
  }
  window.dispatchEvent(new Event('admin-data-updated'));
}

/**
 * Demo-only registration: Add Quantity of a battery MODEL, not one record per
 * manufacturer serial. Each unit still receives a unique internal Battery ID.
 * Optional serials are supplied one per line in creation order; remaining units
 * keep an empty serialNumber ("not provided") rather than a fictitious serial.
 *
 * Writes units and exactly one reference acquisition cost per registration
 * batch with localStorage rollback on write errors. No Backend API is called.
 */
export function registerAdminNewBatteries(
  model: string,
  quantity: number,
  serialNumbers: string[] = [],
): AdminBattery[] {
  const batteries = getAdminBatteries();
  const template = batteries.find((battery) => battery.model === model);
  if (!template) throw new Error('Choose an existing supported battery model.');
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 30)
    throw new Error('Quantity must be a whole number between 1 and 30.');

  const provided = serialNumbers.map((serial) => serial.trim());
  while (provided.length && !provided[provided.length - 1]) provided.pop();
  if (provided.length > quantity)
    throw new Error('The number of serial lines cannot exceed Quantity.');
  const normalized = provided.filter(Boolean).map((serial) => serial.toLocaleLowerCase());
  if (new Set(normalized).size !== normalized.length)
    throw new Error('Duplicate serial numbers in this batch.');
  const existingSerials = new Set(batteries.map((battery) => battery.serialNumber.trim().toLocaleLowerCase()).filter(Boolean));
  if (normalized.some((serial) => existingSerials.has(serial)))
    throw new Error('A serial number is already registered in the system.');

  const unitPrice = getNewBatteryReferenceUnitCostVnd(model);
  if (!Number.isSafeInteger(unitPrice) || unitPrice <= 0 || !Number.isSafeInteger(unitPrice * quantity))
    throw new Error('Configure a valid reference unit price for this battery model first.');

  const date = new Date().toISOString();
  const working = [...batteries];
  const created: AdminBattery[] = [];
  for (let index = 0; index < quantity; index++) {
    const battery: AdminBattery = {
      id: nextAdminBatteryId(working), model,
      serialNumber: provided[index] ?? '', // Empty is intentional; serial is optional.
      hubId: '', // Not assigned to a Hub until Admin explicitly supplies the unit.
      operationalStatus: 'MAINTENANCE', administrativeStatus: 'ACTIVE',
      inspectionPending: true, replacementSupplyState: 'AVAILABLE',
      adminReceivedAt: date, chargeLevelPct: 0, // Unknown until technical check.
      designCapacityMah: template.designCapacityMah,
      designEnergyWh: template.designEnergyWh,
      fullChargeCapacityMah: template.designCapacityMah,
      sohPct: 100, cycleCount: 0, maxCycles: template.maxCycles,
      physicalCondition: 'NORMAL', retirementRecommended: false,
      createdAt: date, updatedAt: date,
    };
    working.push(battery);
    created.push(battery);
  }
  const total = unitPrice * quantity;
  const expense = {
    id: `EXP-NEW-BAT-${created[0].id}-${Date.now()}`,
    date, category: 'BATTERY', amountVnd: total, recordType: 'RECORDED',
    sourceId: created.map((battery) => battery.id).join(', '),
    quantity, unitCostVnd: unitPrice,
    description: `Recorded acquisition: ${quantity} new ${model} batteries (${created.map((battery) => battery.id).join(', ')}) at ${unitPrice} VND/unit; no bank payment`,
  };
  commit([
    [BATTERY_KEY, [...created, ...batteries]],
    [EXPENSE_KEY, [expense, ...readExpenses()]],
  ]);
  return created;
}

/**
 * Seed optional, clearly fictional New Batteries demo rows once in an empty
 * New Batteries collection. Existing Admin-owned units and Hub batteries are
 * never changed or replaced. The 8 demo units span two supported models.
 */
const NEW_BATTERIES_DEMO_KEY = 'droneoptai.admin.new-batteries.demo-v1';
export function seedNewBatteriesDemo(): number {
  if (localStorage.getItem(NEW_BATTERIES_DEMO_KEY) !== null) return 0;
  const all = getAdminBatteries();
  if (all.some((battery) => battery.replacementSupplyState === 'AVAILABLE')) {
    localStorage.setItem(NEW_BATTERIES_DEMO_KEY, 'true');
    return 0;
  }

  const templates = new Map(all.map((battery) => [battery.model, battery]));
  const sampleModels = ['FC30 Battery Pack', 'FC30 Battery Pack', 'TB65',
    'FC30 Battery Pack', 'TB65', 'FC30 Battery Pack', 'TB65', 'FC30 Battery Pack'];
  const created: AdminBattery[] = [];
  const working = [...all];
  const knownSerials = new Set(all.map((battery) => battery.serialNumber.toLowerCase()));

  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  // 5 records this week, 3 in the previous week for useful demo summaries.
  const offsets = [0, 1, 2, 3, 4, -2, -3, -4];
  const todayOffset = (new Date().getDay() + 6) % 7;
  for (let i = 0; i < sampleModels.length; i++) {
    const model = sampleModels[i];
    const template = templates.get(model);
    if (!template) continue;
    const id = nextAdminBatteryId(working);
    const serial = `${model === 'TB65' ? 'TB65' : 'FC30'}-DEMO-${id}`;
    if (knownSerials.has(serial.toLowerCase())) continue;
    const date = new Date(monday);
    date.setDate(date.getDate() + (i < 5 ? Math.min(offsets[i], todayOffset) : offsets[i]));
    date.setHours(9 + (i % 4), 15 + (i * 5 % 45), 0, 0);
    const timestamp = date.toISOString();
    const battery: AdminBattery = {
      id, model, serialNumber: serial, hubId: '',
      operationalStatus: 'MAINTENANCE', administrativeStatus: 'ACTIVE',
      inspectionPending: true, replacementSupplyState: 'AVAILABLE',
      adminReceivedAt: timestamp, chargeLevelPct: 0,
      designCapacityMah: template.designCapacityMah,
      designEnergyWh: template.designEnergyWh,
      fullChargeCapacityMah: template.designCapacityMah,
      sohPct: 100, cycleCount: 0, maxCycles: template.maxCycles,
      physicalCondition: 'NORMAL', retirementRecommended: false,
      createdAt: timestamp, updatedAt: timestamp,
    };
    knownSerials.add(serial.toLowerCase());
    working.push(battery);
    created.push(battery);
  }
  commit([[BATTERY_KEY, [...created, ...all]], [NEW_BATTERIES_DEMO_KEY, true]]);
  return created.length;
}

/** Edit identification only; a supplied or assigned battery cannot be changed here. */
export function editAvailableNewBattery(id: string, model: string, serial: string): void {
  const items = getAdminBatteries();
  const target = getAvailableNewBatteries().find((battery) => battery.id === id);
  if (!target) throw new Error('Only new batteries not yet supplied can be edited.');
  const template = items.find((battery) => battery.model === model);
  if (!template) throw new Error('Choose a supported battery model.');
  const cleaned = serial.trim();
  if (cleaned && items.some((battery) => battery.id !== id && battery.serialNumber.trim().toLowerCase() === cleaned.toLowerCase()))
    throw new Error('This serial number is already registered.');
  const updated = items.map((battery) => battery.id !== id ? battery : {
    ...battery, model, serialNumber: cleaned,
    designCapacityMah: template.designCapacityMah, designEnergyWh: template.designEnergyWh,
    fullChargeCapacityMah: template.designCapacityMah, maxCycles: template.maxCycles,
    updatedAt: new Date().toISOString(),
  });
  commit([[BATTERY_KEY, updated]]);
}

/** Removal history is kept separately so a deleted battery cannot silently disappear. */
export interface RemovedNewBatteryRecord {
  batteryId: string;
  model: string;
  serialNumber: string;
  reason: string;
  removedAt: string;
  removedBy: string;
}
export function getNewBatteryRemovalHistory(): RemovedNewBatteryRecord[] {
  try {
    const data = JSON.parse(localStorage.getItem(REMOVAL_HISTORY_KEY) ?? '[]');
    return Array.isArray(data) ? data as RemovedNewBatteryRecord[] : [];
  } catch { return []; }
}

/** Remove only an Admin-unassigned new battery; require and record a reason. */
export function removeAvailableNewBattery(id: string, reason: string): void {
  const trimmed = reason?.trim();
  if (!trimmed) throw new Error('Reason for removal is required.');
  if (trimmed.length > 500) throw new Error('Reason for removal must be 500 characters or less.');
  const target = getAvailableNewBatteries().find((battery) => battery.id === id);
  if (!target) throw new Error('Only new batteries not yet supplied can be removed.');
  const removal: RemovedNewBatteryRecord = {
    batteryId: target.id,
    model: target.model,
    serialNumber: target.serialNumber,
    reason: trimmed,
    removedAt: new Date().toISOString(),
    removedBy: 'System Administrator',
  };
  commit([
    [BATTERY_KEY, getAdminBatteries().filter((battery) => battery.id !== id)],
    [REMOVAL_HISTORY_KEY, [removal, ...getNewBatteryRemovalHistory()]],
  ]);
}
