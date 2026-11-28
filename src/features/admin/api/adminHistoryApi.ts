import { adminOperationsApi, adminRequest, AdminApiError } from './adminOperationsApi';
import { adminLogsApi, type ActivityLogItem } from './adminLogsApi';
import type { HubCheckpoint } from '../../operator/api/missionApi';
export type RecordData = Record<string, unknown>;
export const record = (v: unknown): RecordData => v && typeof v === 'object' && !Array.isArray(v) ? v as RecordData : {};
export function text(v: RecordData, ...keys: string[]): string {
    for (const k of keys) {
        const x = v[k];
        if ((typeof x === 'string' || typeof x === 'number') && String(x).trim())
            return String(x).trim();
    }
    return '';
}
export function number(v: RecordData, ...keys: string[]): number | undefined {
    const x = text(v, ...keys);
    return x && Number.isFinite(Number(x)) ? Number(x) : undefined;
}
export function rows(v: unknown, keys: string[]): unknown[] {
    if (Array.isArray(v))
        return v;
    const r = record(v);
    for (const k of ['data', ...keys, 'items', 'results']) {
        if (Array.isArray(r[k]))
            return r[k] as unknown[];
        if (r[k] && typeof r[k] === 'object') {
            try {
                return rows(r[k], keys);
            }
            catch { /* try next documented envelope */ }
        }
    }
    throw new Error('Unable to read the returned records.');
}
const unwrap = (v: unknown) => record(record(v).data ?? v);
export const canonical = (v: string) => v.trim().toUpperCase().replace(/[\s-]+/g, '_');
const validTime = (v: string) => v && Number.isFinite(Date.parse(v)) ? v : '';
export interface RecordedLeg {
    id: string;
    from: string;
    to: string;
    status: string;
    battery: string;
    departed: string;
    arrived: string;
    startPct?: number;
    endPct?: number;
}
export interface HistoryMission {
    id: string;
    flightId?: string;
    drone: string;
    origin: string;
    destination: string;
    route: string;
    status: string;
    departed: string;
    arrived: string;
    orderIds: string[];
    legs: RecordedLeg[];
    raw: RecordData;
}
export function mapMission(v: unknown): HistoryMission {
    const r = unwrap(v);
    const status = canonical(text(r, 'status', 'mission_status'));
    const id = text(r, 'mission_id', 'missionId', 'id');
    if (!id)
        throw new Error('A mission has no identifier.');
    const list = r.legs_detail ?? r.legs ?? r.mission_legs;
    // Never substitute scheduled_route or predicted values for actual legs.
    const legs = (Array.isArray(list) ? list : []).map((x, i) => { const l = record(x); return { id: text(l, 'id', 'leg_id') || String(i + 1), from: text(l, 'from_hub_id', 'fromHubId', 'origin_hub_id'), to: text(l, 'to_hub_id', 'toHubId', 'destination_hub_id'), status: text(l, 'status'), battery: text(l, 'actual_battery_id', 'battery_id', 'batteryId'), departed: validTime(text(l, 'departed_at', 'departedAt')), arrived: validTime(text(l, 'arrived_at', 'arrivedAt')), startPct: number(l, 'actual_start_battery_pct', 'start_battery_pct'), endPct: number(l, 'actual_end_battery_pct', 'end_battery_pct') }; });
    const bundled = r.bundled_order_ids ?? r.bundledOrderIds;
    return { id, drone: text(r, 'drone_id', 'droneId'), origin: text(r, 'origin_hub_id', 'originHubId', 'from_hub_id'), destination: text(r, 'destination_hub_id', 'destinationHubId', 'to_hub_id'), route: text(r, 'route_string', 'route_path_string', 'route', 'route_name'), status: ['COMPLETED', 'MISSION_COMPLETED', 'ARRIVAL_COMPLETED'].includes(status) ? 'Completed' : ['FAILED', 'REJECTED'].includes(status) ? 'Failed' : ['FLYING', 'IN_PROGRESS', 'ACTIVE', 'ACTIVE_MISSION'].includes(status) ? 'Flying' : ['SCHEDULED', 'APPROVED', 'PENDING_APPROVAL', 'AWAITING_PAYMENT'].includes(status) ? 'Scheduled' : text(r, 'status') || 'Unknown', departed: validTime(text(r, 'departed_at', 'departedAt')), arrived: validTime(text(r, 'arrived_at', 'arrivedAt')), orderIds: [...new Set([text(r, 'order_id', 'orderId'), ...(Array.isArray(bundled) ? bundled.filter((x): x is string => typeof x === 'string') : [])].filter(Boolean))], legs, raw: r };
}
export const isHistory = (m: HistoryMission) => m.status === 'Completed' || (m.status === 'Failed' && Boolean(m.departed));
export const recordedLeg = (l: RecordedLeg) => Boolean(l.departed || l.arrived || canonical(l.status) === 'COMPLETED');
export const missionHubs = (m: HistoryMission) => [m.departed || m.status === 'Completed' ? m.origin : '', m.arrived || m.status === 'Completed' ? m.destination : '', ...m.legs.filter(recordedLeg).flatMap(l => [l.from, l.arrived || canonical(l.status) === 'COMPLETED' ? l.to : ''])].filter(Boolean);
export const missionBatteries = (m: HistoryMission) => m.legs.filter(recordedLeg).map(l => l.battery).filter(Boolean);
export async function listMissions(drone?: string): Promise<ReadWindow<HistoryMission>> {
    try {
        const payload = await adminRequest<unknown>('/missions/');
        const raw = rows(payload, ['missions']);
        const total = number(record(payload), 'total', 'total_count');
        return { items: raw.map(mapMission).filter(isHistory), partial: total !== undefined && total > raw.length };
    }
    catch (e) {
        if (!(e instanceof AdminApiError) || ![403, 404, 405].includes(e.status))
            throw e;
        // Existing Admin-only flight history is a limited fallback, not a fabricated mission list.
        const ids = drone ? [drone] : (await adminOperationsApi.drones()).map(d => d.id);
        const result = await limitedMap(ids, async (id) => { const response = await adminOperationsApi.droneFlights(id); if (!Array.isArray(response.flights))
            throw new Error('Unable to read flight history.'); return response.flights.flatMap(f => { const r = record(f), mission = text(r, 'mission_id'); if (!mission)
            return []; const m = mapMission({ ...r, id: mission, mission_id: mission, drone_id: text(r, 'drone_id') || id, departed_at: text(r, 'departed_at', 'departure') }); m.flightId = text(r, 'flight_id', 'id'); return isHistory(m) ? [m] : []; }); });
        const ok = result.filter((r): r is PromiseFulfilledResult<HistoryMission[]> => r.status === 'fulfilled');
        if (result.length && !ok.length)
            throw (result[0] as PromiseRejectedResult).reason;
        const unique = new Map<string, HistoryMission>();
        for (const r of ok)
            for (const m of r.value)
                if (!unique.has(m.id))
                    unique.set(m.id, m);
        return { items: [...unique.values()], partial: true };
    }
}
// Existing read endpoints from Operator. Admin uses its own authenticated request;
// authorization and system-wide scope must be granted by the server.
export async function getMission(id: string, flightId?: string) {
    let m: HistoryMission;
    try {
        m = mapMission(await adminRequest<unknown>(`/operator/missions/${encodeURIComponent(id)}`));
    }
    catch (e) {
        if (!flightId || !(e instanceof AdminApiError) || ![403, 404, 405].includes(e.status))
            throw e;
        const r = unwrap(await adminOperationsApi.flightDetail(flightId));
        if (text(r, 'mission_id') !== id)
            throw new Error('Mission identifier does not match.');
        m = mapMission({ ...r, departed_at: text(r, 'departed_at', 'departure') });
        m.flightId = flightId;
    }
    if (m.id !== id)
        throw new Error('Mission identifier does not match.');
    return m;
}
export async function missionIncidents(id: string) { return rows(await adminRequest<unknown>('/operator/missions/incidents'), ['incidents']).map(record).filter(r => text(r, 'mission_id', 'missionId') === id); }
export async function getCheckpoints(id: string): Promise<HubCheckpoint[]> {
    return rows(await adminRequest<unknown>(`/operator/missions/${encodeURIComponent(id)}/hub-checkpoints`), ['checkpoints', 'hub_checkpoints', 'hubCheckpoints']).map((x, i) => { const r = record(x); return { id: text(r, 'id', 'checkpoint_id') || String(i + 1), hubId: text(r, 'hub_id', 'hubId'), hubName: text(r, 'hub_name', 'hubName', 'name'), latitude: number(r, 'hub_latitude', 'hubLatitude'), longitude: number(r, 'hub_longitude', 'hubLongitude'), reachedAt: validTime(text(r, 'reached_at', 'arrived_at', 'created_at', 'timestamp', 'passed_at')) || undefined, sequence: number(r, 'sequence', 'sequence_no', 'checkpoint_order') ?? i + 1, raw: r }; });
}
export interface HistoryEvent {
    workOrder?: string;
    id: number;
    order: string;
    mission: string;
    drone: string;
    hub: string;
    actor: string;
    at: string;
    stage: string;
    photos: string[];
    checklist: unknown;
    note: string;
    details: RecordData;
}
const stages: Record<string, string> = { RECEIVE_PACKAGE: 'Package received', PACKAGE_RECEIVED: 'Package received', RECEIVED_AT_HUB: 'Package received', DISPATCH: 'Loaded onto drone', LOAD_PACKAGE: 'Loaded onto drone', PACKAGE_LOADED: 'Loaded onto drone', CHECK_OUT: 'Check-out', CHECKOUT: 'Check-out', CONFIRM_ARRIVAL: 'Check-in', CONFIRM_RELAY_ARRIVAL: 'Check-in', CHECK_IN: 'Check-in', CHECKIN: 'Check-in', UNLOAD_PACKAGE: 'Package unloaded', PACKAGE_UNLOADED: 'Package unloaded', RELOAD_PACKAGE: 'Package reloaded', BUNDLE_ORDERS: 'Orders bundled', ORDER_BUNDLING: 'Orders bundled', CONFIRM_PICKUP: 'Handed over', PACKAGE_PICKED_UP: 'Handed over', HANDOVER: 'Handed over', RECOVERY: 'Recovery', INCIDENT_RECOVERY: 'Recovery' };
export function imageUrls(r: RecordData): string[] {
    const inputs = [r.proof_image_url, r.photo_url, r.image_url, ...(Array.isArray(r.photo_urls) ? r.photo_urls : []), ...(Array.isArray(r.proof_image_urls) ? r.proof_image_urls : [])];
    return [...new Set(inputs.filter((x): x is string => typeof x === 'string').filter(x => { try {
            const u = new URL(x);
            return u.protocol === 'https:' || u.protocol === 'http:';
        }
        catch {
            return false;
        } }))];
}
export function packageEvent(log: ActivityLogItem): HistoryEvent | null {
    const r = record(log.details_json);
    const stage = stages[canonical(text(r, 'stage', 'event_type') || log.action)];
    const order = text(r, 'order_id') || (canonical(log.resource_type ?? '') === 'ORDER' ? log.resource_id ?? '' : '');
    if (!order || !stage || canonical(log.status) !== 'SUCCESS')
        return null;
    return { id: log.id, order, mission: text(r, 'mission_id'), drone: text(r, 'drone_id'), hub: text(r, 'hub_id'), actor: text(r, 'technician_name', 'technician_id') || log.user_email || log.user_id || '', at: validTime(log.created_at), stage, photos: imageUrls(r), checklist: r.checklist, note: text(r, 'note'), details: r };
}
export interface BatterySwap {
    id: number;
    mission: string;
    drone: string;
    hub: string;
    oldBattery: string;
    newBattery: string;
    oldPct?: number;
    newPct?: number;
    at: string;
    actor: string;
}
export function swapEvent(log: ActivityLogItem): BatterySwap | null {
    const r = record(log.details_json);
    const action = canonical(text(r, 'stage', 'event_type') || log.action);
    if (!['SWAP_BATTERY', 'BATTERY_SWAP', 'BATTERY_SWAPPED'].includes(action) || canonical(log.status) !== 'SUCCESS')
        return null;
    const oldBattery = text(r, 'removed_battery_id', 'old_battery_id', 'previous_battery_id'), newBattery = text(r, 'installed_battery_id', 'new_battery_id');
    if (!oldBattery || !newBattery)
        return null;
    return { id: log.id, mission: text(r, 'mission_id') || (canonical(log.resource_type ?? '') === 'MISSION' ? log.resource_id ?? '' : ''), drone: text(r, 'drone_id'), hub: text(r, 'hub_id'), oldBattery, newBattery, oldPct: number(r, 'removed_battery_pct', 'old_battery_pct'), newPct: number(r, 'installed_battery_pct', 'new_battery_pct'), at: validTime(log.created_at), actor: text(r, 'technician_name', 'technician_id') || log.user_email || log.user_id || '' };
}
export interface ReadWindow<T> {
    items: T[];
    partial: boolean;
}
// Cap history scan and expose truncation; never infer missing evidence from an empty page.
export async function readLogs(resourceType?: string, action?: string): Promise<ReadWindow<ActivityLogItem>> {
    const first = await adminLogsApi.activity({ page: 1, page_size: 50, resource_type: resourceType, action, status: 'success' });
    const size = first.page_size || 50, totalPages = Math.max(1, Math.ceil(first.total / size)), pages = Math.min(100, totalPages);
    const remaining = await limitedMap(Array.from({ length: pages - 1 }, (_, i) => i + 2), page => adminLogsApi.activity({ page, page_size: size, resource_type: resourceType, action, status: 'success' }));
    const unique = new Map(first.items.map(l => [l.id, l]));
    for (const result of remaining)
        if (result.status === 'fulfilled')
            for (const item of result.value.items)
                unique.set(item.id, item);
    return { items: [...unique.values()], partial: pages < totalPages || remaining.some(r => r.status === 'rejected') || unique.size < first.total };
}
export async function packageHistory() { const data = await readLogs('order'); return { items: data.items.map(packageEvent).filter((x): x is HistoryEvent => x !== null), partial: data.partial }; }
export async function swapHistory() { const results = await limitedMap(['SWAP_BATTERY', 'BATTERY_SWAP', 'BATTERY_SWAPPED', 'SWAP BATTERY'], a => readLogs(undefined, a)); const ok = results.filter((r): r is PromiseFulfilledResult<ReadWindow<ActivityLogItem>> => r.status === 'fulfilled'); if (!ok.length)
    throw (results[0] as PromiseRejectedResult).reason; const unique = new Map<number, BatterySwap>(); for (const r of ok)
    for (const log of r.value.items) {
        const s = swapEvent(log);
        if (s)
            unique.set(s.id, s);
    } return { items: [...unique.values()], partial: ok.length !== results.length || ok.some(r => r.value.partial) }; }
export async function alertHistory() { return readLogs('maintenance_alert'); }
export interface HistoryWork {
    id: string;
    drone: string;
    hub: string;
    code: string;
    status: string;
    source: string;
    issue: string;
    technician: string;
    updated: string;
    raw: RecordData;
}
export function mapWork(v: unknown, drone = ''): HistoryWork { const r = unwrap(v); return { id: text(r, 'id', 'work_order_id'), drone: text(r, 'drone_id') || drone, hub: text(r, 'hub_id'), code: text(r, 'work_order_code', 'code', 'id'), status: text(r, 'status'), source: text(r, 'source', 'alert_source', 'trigger_type'), issue: text(r, 'issue', 'issue_description'), technician: text(r, 'technician_name', 'assigned_technician_name', 'assigned_to', 'technician_id'), updated: text(r, 'updated_at', 'created_at'), raw: r }; }
export async function limitedMap<T, R>(values: T[], fn: (v: T) => Promise<R>, workers = 4): Promise<PromiseSettledResult<R>[]> { const result: PromiseSettledResult<R>[] = []; let i = 0; await Promise.all(Array.from({ length: Math.min(workers, values.length) }, async () => { while (i < values.length) {
    const n = i++;
    try {
        result[n] = { status: 'fulfilled', value: await fn(values[n]) };
    }
    catch (reason) {
        result[n] = { status: 'rejected', reason };
    }
} })); return result; }
export async function workHistory(drone?: string): Promise<ReadWindow<HistoryWork>> { const ids = drone ? [drone] : (await adminOperationsApi.drones()).map(d => d.id); const results = await limitedMap(ids, async (id) => (await adminOperationsApi.droneWorkOrders(id)).map(w => mapWork(w, id))); const ok = results.filter((r): r is PromiseFulfilledResult<HistoryWork[]> => r.status === 'fulfilled'); if (results.length && !ok.length)
    throw (results[0] as PromiseRejectedResult).reason; return { items: ok.flatMap(r => r.value).filter(w => w.id), partial: results.some(r => r.status === 'rejected') }; }
export async function workDetail(id: string) { const w = mapWork(await adminOperationsApi.workOrderDetail(id)); if (w.id !== id)
    throw new Error('Work order identifier does not match.'); return w; }
export async function maintenanceDue() { const result = await adminOperationsApi.maintenanceDue(); return rows(result, ['drones']).map(record); }

/** Recorded work-order image events; never infer stages or upload times from the order status. */
export async function workEvidenceHistory(id: string): Promise<ReadWindow<HistoryEvent>> {
  const data = await readLogs('work_order');
  const items: HistoryEvent[] = [];
  for (const log of data.items) {
    const r = record(log.details_json);
    if ((text(r,'work_order_id') || log.resource_id) !== id || canonical(log.status) !== 'SUCCESS') continue;
    const photos = imageUrls(r);
    if (!photos.length) continue;
    const stage = canonical(text(r,'stage','event_type') || log.action);
    const labels: Record<string,string> = {BEFORE_MAINTENANCE:'Before maintenance',DURING_MAINTENANCE:'During maintenance',AFTER_MAINTENANCE:'After maintenance',BEFORE_REPAIR:'Before repair',AFTER_REPAIR:'After repair',INSPECTION:'Inspection',INCIDENT_RECOVERY:'Recovery'};
    items.push({id:log.id,workOrder:id,order:'',mission:text(r,'mission_id'),drone:text(r,'drone_id'),hub:text(r,'hub_id'),actor:text(r,'technician_name','technician_id')||log.user_email||log.user_id||'',at:validTime(log.created_at),stage:labels[stage]||'Maintenance evidence',photos,checklist:r.checklist,note:text(r,'note'),details:r});
  }
  return {items,partial:data.partial};
}
