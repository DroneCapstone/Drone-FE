import { useEffect, useState } from 'react';
import { adminOperationsApi, apiError, type HubApi, type HubDetailApi } from '../api/adminOperationsApi';
import { AdminSelect } from './AdminSelect';

export const isTechnicianRole = (role: unknown): boolean =>
  typeof role === 'string' && role.trim().toLowerCase() === 'technician';
export const activeHub = (hub: HubApi) => hub.status?.trim().toUpperCase() === 'ACTIVE';

type HubData = { hubs: HubApi[]; currentHubId: number | null; availableHubIds: number[] };
type HubResult = { key: string; data: HubData | null; error: string };

function assignedIds(hub: HubDetailApi): string[] | null {
  const hasList = Array.isArray(hub.assigned_technicians);
  const hasSingle = hub.assigned_technician === null || !!hub.assigned_technician;
  if (!hasList && !hasSingle) return null;
  return [...new Set([
    ...(hub.assigned_technicians ?? []).map(person => person.id),
    ...(hub.assigned_technician ? [hub.assigned_technician.id] : []),
  ])];
}

function staffingCount(hub: HubApi): number | null {
  const count = hub.technicians_count ?? hub.technicians;
  return typeof count === 'number' && Number.isInteger(count) && count >= 0 ? count : null;
}

// Only offer a Hub if its staffing can be verified. Never guess that an
// unknown count is zero. For Edit, resolve the actual assignment by user ID.
export async function loadTechnicianHub(technicianId?: string, active = true): Promise<HubData> {
  const hubs = await adminOperationsApi.hubs();
  const details = await Promise.all(hubs.map(async hub => {
    if (!technicianId && (!activeHub(hub) || staffingCount(hub) !== null)) return null;
    return adminOperationsApi.hub(hub.id);
  }));
  const matches = technicianId ? details.filter((hub): hub is HubDetailApi =>
    hub !== null && (assignedIds(hub) ?? []).includes(technicianId)) : [];
  if (matches.length > 1) throw new Error('Multiple hub assignments found for this technician.');
  const currentHubId = matches[0]?.id ?? null;
  if (technicianId && currentHubId === null) {
    if (active) {
      const unassigned = await adminOperationsApi.techniciansUnassigned();
      if (!unassigned.some(person => person.id === technicianId)) throw new Error('Unable to verify the current hub assignment.');
    } else if (details.some(hub => hub === null || assignedIds(hub) === null)) {
      throw new Error('Unable to verify the current hub assignment.');
    }
  }
  const availableHubIds = hubs.filter((hub, index) => {
    if (!activeHub(hub)) return false;
    const detail = details[index];
    const ids = detail ? assignedIds(detail) : null;
    const count = (detail ? staffingCount(detail) : null) ?? staffingCount(hub);
    // A positive count or a known assigned ID means this hub is occupied.
    if ((ids?.length ?? 0) > 0 || (count !== null && count > 0)) return false;
    return ids !== null || count === 0;
  }).map(hub => hub.id);
  return { hubs, currentHubId, availableHubIds };
}

export function canChooseTechnicianHub(data: HubData | null, value: string): boolean {
  if (!data || !value) return false;
  return data.hubs.some(hub => String(hub.id) === value &&
    (hub.id === data.currentHubId || data.availableHubIds.includes(hub.id)));
}

export function useTechnicianHub(enabled: boolean, technicianId?: string, active = true, revision = 0) {
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<HubResult | null>(null);
  const key = `${technicianId ?? 'new'}:${active}:${revision}:${retry}`;
  const current = enabled && result?.key === key ? result : null;
  useEffect(() => {
    if (!enabled) { setResult(null); return; }
    let live = true;
    loadTechnicianHub(technicianId, active).then(data => {
      if (live) setResult({ key, data, error: '' });
    }).catch(cause => {
      if (live) setResult({ key, data: null, error: apiError(cause) });
    });
    return () => { live = false; };
  }, [enabled, technicianId, active, key]);
  return { data: current?.data ?? null, error: current?.error ?? '', loading: enabled && !current, retry: () => setRetry(n => n + 1) };
}

export async function saveTechnicianHub(technicianId: string, current: number | null, destination: number | null) {
  if (current === destination) return;
  if (current === null && destination !== null) await adminOperationsApi.assignTechnician(destination, technicianId);
  else if (current !== null && destination === null) await adminOperationsApi.unassignTechnician(current, technicianId);
  else if (current !== null && destination !== null) await adminOperationsApi.transferTechnician(current, technicianId, destination);
}

export function AdminTechnicianHubField({ state, value, onChange, required = false, disabled = false, wide = false }: {
  state: ReturnType<typeof useTechnicianHub>; value: string; onChange: (value: string) => void; required?: boolean; disabled?: boolean; wide?: boolean;
}) {
  const hubs = state.data?.hubs ?? [];
  const current = state.data?.currentHubId ?? null;
  const choices = hubs.filter(hub => hub.id === current || state.data?.availableHubIds.includes(hub.id));
  return <div data-admin-technician-hub="true" className={wide ? "wide min-w-0" : "min-w-0"} style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, width: '100%' }}>
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span>Assigned Hub {required && <b aria-hidden="true">*</b>}</span>
      <AdminSelect aria-label="Assigned Hub" value={value} required={required} disabled={disabled || !state.data} className="w-full" onChange={event => onChange(event.target.value)}>
        <option value="">{state.loading ? 'Loading hubs...' : state.error ? 'Unable to load hubs' : required ? (choices.length ? 'Select Hub' : 'No available hubs') : 'Unassigned'}</option>
        {choices.map(hub => <option key={hub.id} value={String(hub.id)}>{hub.name}</option>)}
      </AdminSelect>
    </label>
    {state.error && <p className="admin-ud-error" role="alert">{state.error} <button type="button" className="text-button" disabled={disabled} onClick={state.retry}>Retry</button></p>}
    {state.data && state.data.availableHubIds.length === 0 && current === null && <p className="admin-ud-helper">No available hubs.</p>}
  </div>;
}
