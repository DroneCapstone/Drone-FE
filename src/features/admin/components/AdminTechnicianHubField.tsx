import { useEffect, useState } from 'react';
import { adminOperationsApi, apiError, type HubApi } from '../api/adminOperationsApi';
import { AdminSelect } from './AdminSelect';

export const activeHub = (hub: HubApi) => hub.status?.toUpperCase() === 'ACTIVE';

type HubData = { hubs: HubApi[]; currentHubId: number | null };
type HubResult = { key: string; data: HubData | null; error: string };

// The user API does not document hub_id. Resolve assignment from actual Hub
// detail responses, rather than guessing from a technician's name or email.
export async function loadTechnicianHub(technicianId?: string, active = true): Promise<HubData> {
  const hubs = await adminOperationsApi.hubs();
  if (!technicianId) return { hubs, currentHubId: null };
  const details = await Promise.all(hubs.map(hub => adminOperationsApi.hub(hub.id)));
  const matches = details.filter(hub => (hub.assigned_technicians ?? (hub.assigned_technician ? [hub.assigned_technician] : [])).some(person => person.id === technicianId));
  if (matches.length > 1) throw new Error('Multiple hub assignments found for this technician.');
  if (matches.length === 1) return { hubs, currentHubId: matches[0].id };
  if (active) {
    const unassigned = await adminOperationsApi.techniciansUnassigned();
    if (!unassigned.some(person => person.id === technicianId)) throw new Error('Unable to verify the current hub assignment.');
  } else if (details.some(hub => !Array.isArray(hub.assigned_technicians) && !('assigned_technician' in hub))) {
    throw new Error('Unable to verify the current hub assignment.');
  }
  return { hubs, currentHubId: null };
}

export function useTechnicianHub(enabled: boolean, technicianId?: string, active = true, revision = 0) {
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<HubResult | null>(null);
  const key = `${technicianId ?? 'new'}:${active}:${revision}:${retry}`;
  const current = enabled && result?.key === key ? result : null;
  useEffect(() => {
    if (!enabled) return;
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

export function AdminTechnicianHubField({ state, value, onChange, required = false, disabled = false }: {
  state: ReturnType<typeof useTechnicianHub>; value: string; onChange: (value: string) => void; required?: boolean; disabled?: boolean;
}) {
  const hubs = state.data?.hubs ?? [];
  const current = state.data?.currentHubId ?? null;
  const choices = hubs.filter(hub => activeHub(hub) || hub.id === current);
  return <div className="min-w-0">
    <label><span>Assigned Hub {required && <b aria-hidden="true">*</b>}</span>
      <AdminSelect aria-label="Assigned Hub" value={value} required={required} disabled={disabled || !state.data} onChange={event => onChange(event.target.value)}>
        <option value="">{state.loading ? 'Loading hubs...' : state.error ? 'Unavailable' : required ? 'Select Hub' : 'Unassigned'}</option>
        {choices.map(hub => <option key={hub.id} value={String(hub.id)}>{hub.name}</option>)}
      </AdminSelect>
    </label>
    {state.error && <p className="admin-ud-error" role="alert">{state.error} <button type="button" className="text-button" disabled={disabled} onClick={state.retry}>Retry</button></p>}
    {state.data && choices.length === 0 && <p className="admin-ud-helper">No active hubs available.</p>}
  </div>;
}
