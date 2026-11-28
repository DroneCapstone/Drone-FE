import { adminOperationsApi, adminRequest } from './adminOperationsApi';
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
const unwrap = (v: unknown): RecordData => { const r = record(v); for (const k of ['data','result','mission','flight']) { if (Object.keys(record(r[k])).length) return unwrap(r[k]); } return r; };
export const canonical = (v: string) => v.trim().toUpperCase().replace(/[\s-]+/g, '_');
// Flight history uses DD/MM/YYYY, HH:mm; never let Date.parse interpret it as US dates.
export function validTime(v: string): string {
    const m = /^(\d{2})\/(\d{2})\/(\d{4}),?\s+(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(v);
    const value = m ? `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6] || '00'}+07:00` : v;
    return value && Number.isFinite(Date.parse(value)) ? value : '';
}
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
    return { id, flightId: text(r, 'flight_id') || undefined, drone: text(r, 'drone_id', 'droneId'), origin: text(r, 'origin_hub_id', 'originHubId', 'from_hub_id'), destination: text(r, 'destination_hub_id', 'destinationHubId', 'to_hub_id'), route: text(r, 'route_string', 'route_path_string', 'route', 'route_name'), status: ['COMPLETED', 'MISSION_COMPLETED', 'ARRIVAL_COMPLETED'].includes(status) ? 'Completed' : ['FAILED', 'REJECTED'].includes(status) ? 'Failed' : ['FLYING', 'IN_PROGRESS', 'ACTIVE', 'ACTIVE_MISSION'].includes(status) ? 'Flying' : ['SCHEDULED', 'APPROVED', 'PENDING_APPROVAL', 'AWAITING_PAYMENT'].includes(status) ? 'Scheduled' : text(r, 'status') || 'Unknown', departed: validTime(text(r, 'departed_at', 'departedAt', 'departure')), arrived: validTime(text(r, 'arrived_at', 'arrivedAt', 'arrival')), orderIds: [...new Set([text(r, 'order_id', 'orderId'), ...(Array.isArray(bundled) ? bundled.filter((x): x is string => typeof x === 'string') : [])].filter(Boolean))], legs, raw: r };
}
export const isHistory = (m: HistoryMission) => m.status === 'Completed' || (m.status === 'Failed' && Boolean(m.departed));
export const recordedLeg = (l: RecordedLeg) => Boolean(l.departed || l.arrived || canonical(l.status) === 'COMPLETED');
export const missionHubs = (m: HistoryMission) => [m.departed || m.status === 'Completed' ? m.origin : '', m.arrived || m.status === 'Completed' ? m.destination : '', ...m.legs.filter(recordedLeg).flatMap(l => [l.from, l.arrived || canonical(l.status) === 'COMPLETED' ? l.to : ''])].filter(Boolean);
export const missionBatteries = (m: HistoryMission) => [...new Set([text(m.raw, 'battery_id'), ...m.legs.filter(recordedLeg).map(l => l.battery)].filter(Boolean))];
/** Official global flight history; retain the distinct flight identifier for detail. */
export async function listMissions(drone?: string, enrich = false): Promise<ReadWindow<HistoryMission>> {
    const limit = 50, unique = new Map<string, HistoryMission>();
    let partial = false;
    for (let page = 0; page < 100; page++) {
        const payload = await adminRequest<unknown>(`/admin/fleet/flights?limit=${limit}&offset=${page * limit}`);
        const list = rows(payload, ['flights']);
        let added = 0;
        for (const item of list) {
            const m = mapMission(item);
            const key = m.flightId || m.id;
            if (!unique.has(key)) { unique.set(key, m); added++; }
        }
        if (!list.length) break;
        if (!added) { partial = true; break; }
        const total = number(record(payload), 'total', 'total_count') ?? number(unwrap(payload), 'total', 'total_count');
        if (total !== undefined ? unique.size >= total : list.length < limit) break;
        if (page === 99) partial = true;
    }
    let items = [...unique.values()].filter(m => isHistory(m) && (!drone || m.drone === drone));
    // Only load leg detail when a hub/battery filter needs it; avoid N+1 on the ordinary list.
    if (enrich) {
        const results = await limitedMap(items, m => getMission(m.id, m.flightId));
        items = items.map((m, i) => { const r = results[i]; if (r.status === 'fulfilled') return r.value; partial = true; return m; });
    }
    return { items, partial };
}
export async function getMission(id: string, flightId?: string): Promise<HistoryMission> {
    // Some links only carry mission_id. Resolve the flight ID from the global list.
    let resolved = flightId;
    if (!resolved) { try { resolved = (await listMissions()).items.find(m => m.id === id)?.flightId; } catch { /* mission detail can still be read through the authorized Operator endpoint */ } }
    const [flight, operator] = await Promise.allSettled([
        resolved ? adminOperationsApi.flightDetail(resolved) : Promise.resolve(null),
        adminRequest<unknown>(`/operator/missions/${encodeURIComponent(id)}`),
    ]);
    const f = flight.status === 'fulfilled' ? unwrap(flight.value) : {};
    const o = operator.status === 'fulfilled' ? unwrap(operator.value) : {};
    if (text(f, 'mission_id') && text(f, 'mission_id') !== id) throw new Error('Mission identifier does not match.');
    if (text(o, 'mission_id', 'id') && text(o, 'mission_id', 'id') !== id) throw new Error('Mission identifier does not match.');
    if (!Object.keys(f).length && !Object.keys(o).length) throw (operator.status === 'rejected' ? operator.reason : new Error('Flight details unavailable.'));
    const combined = { ...f, ...o, mission_id: id, flight_id: resolved || text(f, 'flight_id'),
        status: text(f,'status') || text(o,'status','mission_status'),
        duration_minutes: f.duration_minutes, energy_wh: f.energy_wh, payload_weight_kg: f.payload_weight_kg ?? o.payload_weight_kg,
        departed_at: text(o, 'departed_at', 'departedAt') || text(f, 'departure', 'departed_at'),
        arrived_at: text(o, 'arrived_at', 'arrivedAt') || text(f, 'arrival', 'arrived_at'),
        legs_detail: f.legs_detail ?? f.legs ?? f.mission_legs ?? o.legs_detail ?? o.legs ?? o.mission_legs,
    };
    return mapMission(combined);
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
const stages: Record<string, string> = { PACKAGE_RECEIVED_AT_ORIGIN_HUB: 'Package received', PACKAGE_LOADED_TO_DRONE: 'Loaded onto drone', PACKAGE_UNLOADED_FROM_DRONE: 'Package unloaded', CUSTOMER_PICKUP_CONFIRMED: 'Handed over', RECEIVE_PACKAGE: 'Package received', PACKAGE_RECEIVED: 'Package received', RECEIVED_AT_HUB: 'Package received', DISPATCH: 'Loaded onto drone', LOAD_PACKAGE: 'Loaded onto drone', PACKAGE_LOADED: 'Loaded onto drone', CHECK_OUT: 'Check-out', CHECKOUT: 'Check-out', CONFIRM_ARRIVAL: 'Check-in', CONFIRM_RELAY_ARRIVAL: 'Check-in', CHECK_IN: 'Check-in', CHECKIN: 'Check-in', UNLOAD_PACKAGE: 'Package unloaded', PACKAGE_UNLOADED: 'Package unloaded', RELOAD_PACKAGE: 'Package reloaded', BUNDLE_ORDERS: 'Orders bundled', ORDER_BUNDLING: 'Orders bundled', CONFIRM_PICKUP: 'Handed over', PACKAGE_PICKED_UP: 'Handed over', HANDOVER: 'Handed over', RECOVERY: 'Recovery', INCIDENT_RECOVERY: 'Recovery' };
export function imageUrls(r: RecordData): string[] {
    const inputs = [r.proof_image_url, r.photo_url, r.image_url, ...(Array.isArray(r.photo_urls) ? r.photo_urls : []), ...(Array.isArray(r.proof_image_urls) ? r.proof_image_urls : [])];
    return [...new Set(inputs.filter((x): x is string => typeof x === 'string').filter(x => { if (/^data:image\/(?:png|jpeg|jpg|webp|gif|avif);base64,[A-Za-z0-9+/]/i.test(x)) return true; try {
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
    return { id: log.id, order, mission: text(r, 'mission_id'), drone: text(r, 'drone_id'), hub: text(r, 'hub_id'), actor: text(r, 'technician_name', 'technician_id') || log.user_email || log.user_id || '', at: validTime(text(r,'recorded_at','timestamp') || log.created_at), stage, photos: imageUrls(r), checklist: r.checklist, note: text(r, 'note'), details: r };
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
    return { id: log.id, mission: text(r, 'mission_id') || (canonical(log.resource_type ?? '') === 'MISSION' ? log.resource_id ?? '' : ''), drone: text(r, 'drone_id'), hub: text(r, 'hub_id'), oldBattery, newBattery, oldPct: number(r, 'battery_pct_before', 'removed_battery_pct', 'old_battery_pct'), newPct: number(r, 'battery_pct_after', 'installed_battery_pct', 'new_battery_pct'), at: validTime(text(r, 'timestamp', 'recorded_at') || log.created_at), actor: text(r, 'technician_name', 'technician_id') || log.user_email || log.user_id || '' };
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
/** The document exposes per-order proof, not a global proof-image endpoint.
 * Use logs for the index; request actual proof only on detail / selected mission. */
export async function packageHistory() { const data = await readLogs('order'); return { items: data.items.map(packageEvent).filter((x): x is HistoryEvent => x !== null), partial: data.partial }; }
export async function orderProofHistory(id: string): Promise<ReadWindow<HistoryEvent>> {
    const payload = await adminRequest<unknown>(`/admin/orders/${encodeURIComponent(id)}/proof-images`);
    const list = rows(payload, ['proof_images', 'order_proof_images', 'proof_images_json']);
    return { items: list.map((item, i) => { const r = record(item); const stage = text(r, 'stage'); return { id: i + 1, order: id, mission: text(r,'mission_id'), drone: text(r,'drone_id'), hub: text(r,'hub_id'), actor: text(r,'technician_name','technician_id'), at: validTime(text(r,'recorded_at','timestamp')), stage: stages[canonical(stage)] || stage || 'Handling evidence', photos: imageUrls(r), checklist: r.checklist, note: text(r,'note'), details: r }; }), partial: false };
}
export async function missionProofHistory(ids: string[]): Promise<ReadWindow<HistoryEvent>> {
    if (!ids.length) return {items: [], partial: true};
    const results = await limitedMap([...new Set(ids)], orderProofHistory);
    const ok = results.filter((r): r is PromiseFulfilledResult<ReadWindow<HistoryEvent>> => r.status === 'fulfilled');
    if (!ok.length) throw (results[0] as PromiseRejectedResult).reason;
    return { items: ok.flatMap(r => r.value.items).map((e,i) => ({...e,id:i+1})), partial: ok.length !== results.length || ok.some(r => r.value.partial) };
}
export function mapSwap(r: RecordData, i: number): BatterySwap | null {
    if (!['SWAP','BATTERY_SWAPPED','SWAP_BATTERY','BATTERY_SWAP'].includes(canonical(text(r,'action','stage')))) return null;
    const oldBattery = text(r,'removed_battery_id'), newBattery = text(r,'installed_battery_id');
    if (!oldBattery || !newBattery) return null;
    return { id: number(r,'id') ?? i+1, mission: text(r,'mission_id'), drone: text(r,'drone_id'), hub: text(r,'hub_id'), oldBattery, newBattery, oldPct: number(r,'battery_pct_before'), newPct: number(r,'battery_pct_after'), at: validTime(text(r,'recorded_at','timestamp')), actor: text(r,'technician_name','technician_id') };
}
export function dedupSwaps(items: BatterySwap[]): BatterySwap[] {
    const unique = new Map<string,BatterySwap>();
    for (const s of items) {
        // The same event is logged against both batteries with the same timestamp.
        const key = s.at ? JSON.stringify([s.drone,s.oldBattery,s.newBattery,Date.parse(s.at)]) : `id:${s.id}`;
        const previous = unique.get(key);
        unique.set(key, previous ? {...previous, mission: previous.mission || s.mission, hub: previous.hub || s.hub, actor: previous.actor || s.actor, oldPct: previous.oldPct ?? s.oldPct, newPct: previous.newPct ?? s.newPct} : s);
    }
    return [...unique.values()].map((s,i)=>({...s,id:i+1}));
}
export async function droneBatteryHistory(drone: string): Promise<ReadWindow<BatterySwap>> {
    const payload = await adminRequest<unknown>(`/admin/fleet/drones/${encodeURIComponent(drone)}/battery-history`);
    const list = rows(payload,['history','battery_history']);
    const total = number(record(payload),'total','total_count') ?? number(unwrap(payload),'total','total_count');
    return { items: dedupSwaps(list.map((v,i)=>mapSwap({...record(v),drone_id: text(record(v),'drone_id') || drone},i)).filter((v): v is BatterySwap => v !== null)), partial: total !== undefined && total > list.length };
}
export async function batteryUsageHistory(battery: string): Promise<ReadWindow<RecordData>> {
    const payload = await adminRequest<unknown>(`/admin/fleet/batteries/${encodeURIComponent(battery)}/history`);
    const list = rows(payload,['history','battery_history']).map(record);
    const total = number(record(payload),'total','total_count') ?? number(unwrap(payload),'total','total_count');
    return {items:list,partial:total !== undefined && total > list.length};
}
export async function swapHistory(drone?: string, battery?: string): Promise<ReadWindow<BatterySwap>> {
    if (drone) return droneBatteryHistory(drone);
    if (battery) {
        const usage = await batteryUsageHistory(battery);
        const ids = [...new Set(usage.items.map(r=>text(r,'drone_id')).filter(Boolean))];
        const results = await limitedMap(ids,droneBatteryHistory);
        const ok = results.filter((r): r is PromiseFulfilledResult<ReadWindow<BatterySwap>>=>r.status==='fulfilled');
        if (results.length && !ok.length) throw (results[0] as PromiseRejectedResult).reason;
        return {items:dedupSwaps(ok.flatMap(r=>r.value.items).filter(s=>s.oldBattery===battery||s.newBattery===battery)),partial:usage.partial||ok.length!==results.length||ok.some(r=>r.value.partial)||usage.items.some(r=>canonical(text(r,'action'))==='BATTERY_SWAPPED'&&!text(r,'drone_id'))};
    }
    // No global swap endpoint is documented; use the indexed audit events for the fleet-wide view.
    const data = await readLogs('battery','BATTERY_SWAPPED');
    return {items:dedupSwaps(data.items.map(swapEvent).filter((s): s is BatterySwap=>s!==null)),partial:data.partial};
}
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
export function mapWork(v: unknown, drone = ''): HistoryWork { const r = unwrap(v); return { id: text(r, 'id', 'work_order_id'), drone: text(r, 'drone_id') || drone, hub: text(r, 'hub_id'), code: text(r, 'work_order_code', 'code', 'id', 'work_order_id'), status: text(r, 'status'), source: text(r, 'source', 'alert_source', 'trigger_type'), issue: text(r, 'issue', 'issue_description'), technician: text(r, 'technician_name', 'assigned_technician_name', 'assigned_to', 'technician_id'), updated: text(r, 'updated_at', 'created_at'), raw: r }; }
export async function limitedMap<T, R>(values: T[], fn: (v: T) => Promise<R>, workers = 4): Promise<PromiseSettledResult<R>[]> { const result: PromiseSettledResult<R>[] = []; let i = 0; await Promise.all(Array.from({ length: Math.min(workers, values.length) }, async () => { while (i < values.length) {
    const n = i++;
    try {
        result[n] = { status: 'fulfilled', value: await fn(values[n]) };
    }
    catch (reason) {
        result[n] = { status: 'rejected', reason };
    }
} })); return result; }
// No fleet-wide work-order list is documented. Never fan out to every drone here.
export async function workHistory(drone: string): Promise<ReadWindow<HistoryWork>> {
    if (!drone) throw new Error('Select a drone to load work orders.');
    const items = (await adminOperationsApi.droneWorkOrders(drone)).map(w => mapWork(w, drone)).filter(w => w.id);
    return { items, partial: false };
}
export async function workHistoryDrones() {
    const drones = await adminOperationsApi.drones();
    const rank = (status: string) => /maintenance|repair|inspection|incident/i.test(status) ? 0 : 1;
    return [...new Map(drones.filter(d => d.id).map(d => [d.id, d])).values()]
        .sort((a,b) => rank(a.status || '') - rank(b.status || '') || a.id.localeCompare(b.id));
}
export async function workDetail(id: string) { const w = mapWork(await adminOperationsApi.workOrderDetail(id)); if (w.id !== id)
    throw new Error('Work order identifier does not match.'); return w; }
export async function maintenanceDue() { const result = await adminOperationsApi.maintenanceDue(); return rows(result, ['drones']).map(record); }

/** Dedicated audit endpoint: single-image fields and typed proof arrays are both supported. */
export async function workEvidenceHistory(id: string): Promise<ReadWindow<HistoryEvent> & { audit: RecordData }> {
    const audit = unwrap(await adminRequest<unknown>(`/admin/fleet/work-orders/${encodeURIComponent(id)}/proof-images`));
    if (!Object.keys(audit).some(k=>['work_order_id','proof_images','parts_replaced_images','proof_image_url','parts_replaced_proof_url','inspection_items','status_logs'].includes(k))) throw new Error('Unable to read work order evidence.');
    if (text(audit,'work_order_id') && text(audit,'work_order_id') !== id) throw new Error('Work order identifier does not match.');
    const items: HistoryEvent[] = [];
    const labels: Record<string,string> = { BEFORE:'Before maintenance', DURING:'During maintenance', AFTER:'After maintenance', PARTS_REPLACED:'Replacement parts', INCIDENT_RECOVERY:'Recovery' };
    function add(v: unknown, fallback: string) {
        const r = typeof v === 'string' ? {proof_image_url:v} : record(v);
        const photos = imageUrls(r);
        if (!photos.length) return;
        const type = canonical(text(r,'type','stage'));
        const stage = labels[type] || fallback;
        items.push({id:items.length+1,workOrder:id,order:'',mission:text(r,'mission_id'),drone:text(audit,'drone_id'),hub:text(r,'hub_id')||text(audit,'hub_id'),actor:text(r,'technician_id','technician_name'),at:validTime(text(r,'recorded_at','timestamp')),stage,photos,checklist:null,note:text(r,'description','note'),details:r});
    }
    for (const v of Array.isArray(audit.proof_images) ? audit.proof_images : []) add(v,'Maintenance evidence');
    for (const v of Array.isArray(audit.parts_replaced_images) ? audit.parts_replaced_images : []) add(v,'Replacement parts');
    if (!items.some(e=>e.stage!=='Replacement parts')) add(audit.proof_image_url,'Maintenance evidence');
    if (!items.some(e=>e.stage==='Replacement parts')) add(audit.parts_replaced_proof_url,'Replacement parts');
    return {items,partial:false,audit};
}
