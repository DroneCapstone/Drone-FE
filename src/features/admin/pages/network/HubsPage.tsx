import { MapPin, CircleCheck, Plane, BatteryCharging, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ActionButton } from "../../../../components/ui/ActionButton";
import { Dialog, DialogTitle } from "../../../../components/ui/Dialog";
import { AdminDialogContent as DialogContent } from "../../components/AdminDialogContent";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { AdminSummaryCard } from "../../components/AdminSummaryCard";
import { OperatorPanel } from "../../../operator/components/OperatorPanel";
import { AdminPageShell } from "../../components/AdminPageShell";
import { AdminToolbar } from "../../components/AdminToolbar";
import { HubDroneMap } from "../../components/HubDroneMap";
import { adminOperationsApi, apiError, type HubApi, type HubCreateApi } from '../../api/adminOperationsApi';
import { hubCreationPresets } from '../../data/hubCreationPresets';
import type { AdminDrone } from '../../types';
import type { AdminHub } from "../../types";
import { hubTone } from "../../utils/adminDisplay";

type HubCreateDraft = Omit<HubCreateApi, 'latitude' | 'longitude' | 'capacity'> & {
  latitude: string;
  longitude: string;
  capacity: string;
};

const emptyHubDraft: HubCreateDraft = {
  name: '', code: '', area: '', address: '', status: 'Active',
  latitude: '', longitude: '', capacity: '24',
};

function presetToDraft(preset: HubCreateApi): HubCreateDraft {
  return {
    ...preset,
    latitude: preset.latitude.toFixed(4),
    longitude: preset.longitude.toFixed(4),
    capacity: String(preset.capacity),
  };
}

export function HubsPage() {
  const [hubs, setHubs] = useState<AdminHub[]>([]);
  const [drones, setDrones] = useState<AdminDrone[]>([]);
  const [batteriesCount, setBatteriesCount] = useState(0);
  const [counts, setCounts] = useState<Record<string, { technicians: number; batteries: number }>>({});
  const [summary, setSummary] = useState<{ total_hubs: number; active_hubs: number; total_drones: number; total_batteries: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<AdminHub | null>(null);
  const [creating, setCreating] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newHub, setNewHub] = useState<HubCreateDraft>({ ...emptyHubDraft });

  function asHub(item: HubApi): AdminHub {
    return {
      id: String(item.id), name: item.name, code: item.code ?? String(item.id),
      area: item.area ?? '', address: item.address ?? '',
      latitude: item.latitude ?? Number.NaN, longitude: item.longitude ?? Number.NaN,
      status: (item.status?.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE') as AdminHub['status'],
      capacity: item.capacity ?? 0, technicianIds: [],
      createdAt: item.created_at ?? '', updatedAt: item.updated_at ?? '',
    };
  }
  async function refresh() {
    setLoading(true);
    try {
      const [h, d, b, kpi] = await Promise.all([
        adminOperationsApi.hubs(), adminOperationsApi.drones(),
        adminOperationsApi.batteries(), adminOperationsApi.hubSummary(),
      ]);
      setHubs(h.map(asHub));
      setCounts(Object.fromEntries(h.map((item) => [String(item.id), {
        technicians: item.technicians_count ?? item.technicians ?? 0,
        batteries: item.batteries_count ?? item.batteries ?? 0,
      }])));
      setDrones(d.map((item) => ({
        id: item.id, name: item.name, displayId: item.id, model: item.model,
        serialNumber: item.serial_number, hubId: item.hub_id == null ? '' : String(item.hub_id),
        status: (item.status.toUpperCase() === 'AVAILABLE' ? 'AVAILABLE' : item.status.toUpperCase() === 'IN FLIGHT' ? 'IN_FLIGHT' : 'MAINTENANCE') as AdminDrone['status'],
        isActive: item.admin_state.toUpperCase() === 'ACTIVE', batteryPct: item.battery_level_pct ?? 0,
        maxPayloadKg: item.payload_capacity_kg, createdAt: '', updatedAt: '',
      })));
      setBatteriesCount(b.filter((item) => item.current_hub_id != null).length);
      setSummary(kpi);
      setError('');
    } catch (cause) { setError(apiError(cause)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);

  const visible = hubs.filter((hub) => {
    const matchesQuery = `${hub.name} ${hub.code} ${hub.area} ${hub.address}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === "all" || hub.status === status);
  });

  function openCreate() {
    setNewHub({ ...emptyHubDraft });
    setCreateError('');
    setNotice('');
    setCreating(true);
  }

  const createHub = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createSaving) return;

    const code = newHub.code.trim();
    const name = newHub.name.trim();
    const address = newHub.address.trim();
    const latitude = newHub.latitude.trim() ? Number(newHub.latitude) : Number.NaN;
    const longitude = newHub.longitude.trim() ? Number(newHub.longitude) : Number.NaN;
    const capacity = newHub.capacity.trim() ? Number(newHub.capacity) : Number.NaN;

    if (!code || !name || !address) {
      setCreateError('Hub code, name, and address are required.');
      return;
    }
    if (hubs.some((hub) => hub.code.trim().toLowerCase() === code.toLowerCase())) {
      setCreateError(`Hub code ${code} already exists. Select another code or edit the existing Hub.`);
      return;
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setCreateError('Latitude must be between -90 and 90; longitude must be between -180 and 180.');
      return;
    }
    if (!Number.isSafeInteger(capacity) || capacity < 1) {
      setCreateError('Capacity must be a positive whole number.');
      return;
    }

    setCreateSaving(true);
    setCreateError('');
    try {
      // Each click creates ONE Hub on the Backend; guide presets never auto-post.
      await adminOperationsApi.createHub({
        code, name, address, area: newHub.area.trim(), capacity,
        latitude, longitude, status: newHub.status,
      });
      setCreating(false);
      setNotice(`Hub ${name} (${code}) created in Backend. Supply compatible batteries before testing relay routes.`);
      // Existing refresh reloads cards, map and Hub list from Backend.
      void refresh();
    } catch (cause) {
      setCreateError(apiError(cause));
    } finally {
      setCreateSaving(false);
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing || saving) return;
    if (!Number.isFinite(editing.latitude) || !Number.isFinite(editing.longitude)) { setError('Enter valid hub coordinates.'); return; }
    setSaving(true); setError('');
    try {
      await adminOperationsApi.updateHub(Number(editing.id), {
        name: editing.name.trim(), code: editing.code.trim(), area: editing.area.trim(),
        address: editing.address.trim(), status: editing.status === 'ACTIVE' ? 'Active' : 'Inactive',
        latitude: editing.latitude, longitude: editing.longitude, capacity: editing.capacity,
      });
      setEditing(null);
      setNotice('Hub updated in Backend.');
      await refresh();
    } catch (cause) { setError(apiError(cause)); }
    finally { setSaving(false); }
  };

  return (
    <AdminPageShell
      title="Hubs"
      description="Manage configured Hubs and their assigned assets."
      actions={<ActionButton onClick={openCreate}><Plus size={16} aria-hidden="true" /> Create hub</ActionButton>}
    >
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminSummaryCard label="Total hubs" value={summary?.total_hubs ?? hubs.length} note="Registered hubs" icon={MapPin} />
        <AdminSummaryCard label="Active" value={summary?.active_hubs ?? hubs.filter((hub) => hub.status === "ACTIVE").length} note="Eligible for new planning" icon={CircleCheck} />
        <AdminSummaryCard label="Drones" value={summary?.total_drones ?? drones.length} note="Registered drones" icon={Plane} />
        <AdminSummaryCard label="Batteries" value={summary?.total_batteries ?? batteriesCount} note="Assigned to Hubs" icon={BatteryCharging} />
      </div>

      {error && <p role="alert" className="mb-3 text-sm text-red-500">{error} <button type="button" className="text-button" onClick={() => void refresh()}>Retry</button></p>}
      {notice && <p role="status" className="mb-3 text-sm text-green-600">{notice}</p>}
      {loading && <p className="mb-3 text-sm text-muted-foreground">Loading Hubs from Backend…</p>}
      <HubDroneMap hubs={hubs.filter((h) => Number.isFinite(h.latitude) && Number.isFinite(h.longitude))} drones={drones} />

      <OperatorPanel className="flush-panel">
        <AdminToolbar
          searchValue={query}
          onSearchChange={setQuery}
          placeholder="Search hub name, code, area or address…"
          filters={
            <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Hub status filter">
              <option value="all">All status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          }
          meta={`${visible.length} of ${hubs.length} hubs`}
        />
        <div className="table-wrap">
          <table>
            <thead><tr><th>Hub</th><th>Area</th><th>Status</th><th>Drones</th><th>Batteries</th><th>Technicians</th><th>Action</th></tr></thead>
            <tbody>
              {visible.map((hub) => (
                <tr key={hub.id}>
                  <td><strong>{hub.name}</strong><small>{hub.code}</small></td>
                  <td><strong>{hub.area}</strong><small>{hub.address}</small></td>
                  <td><StatusBadge tone={hubTone(hub.status)}>{hub.status}</StatusBadge></td>
                  <td>{drones.filter((drone) => drone.hubId === hub.id).length}</td>
                  <td>{counts[hub.id]?.batteries ?? 0}</td>
                  <td>{counts[hub.id]?.technicians ?? 0}</td>
                  <td>
                    <div className="flex gap-2">
                      <Link className="text-button" to={`/admin/network/hubs/${hub.id}`}>View</Link>
                      <button className="text-button" type="button" onClick={() => setEditing({ ...hub })}>Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </OperatorPanel>

      <Dialog open={creating} onOpenChange={(open) => { if (!open && !createSaving) setCreating(false); }}>
        {creating ? (
          <DialogContent>
            <form onSubmit={createHub}>
              <div className="border-b border-border p-5">
                <DialogTitle className="text-lg font-semibold">Create hub</DialogTitle>
              </div>
              <div className="fields two max-h-[65vh] overflow-y-auto p-5">
                <label className="sm:col-span-2">
                  <span>Use a hub from the guide (optional)</span>
                  <select
                    value={hubCreationPresets.some((preset) => preset.code === newHub.code) ? newHub.code : ''}
                    onChange={(event) => {
                      const preset = hubCreationPresets.find((item) => item.code === event.target.value);
                      setNewHub(preset ? presetToDraft(preset) : { ...emptyHubDraft });
                      setCreateError('');
                    }}
                  >
                    <option value="">Enter hub details manually</option>
                    {hubCreationPresets.map((preset) => (
                      <option key={preset.code} value={preset.code} disabled={hubs.some((hub) => hub.code.toLowerCase() === preset.code.toLowerCase())}>
                        {preset.name} ({preset.code})
                      </option>
                    ))}
                  </select>
                </label>
                <label><span>Hub name</span><input required value={newHub.name} onChange={(event) => setNewHub((current) => ({ ...current, name: event.target.value }))} /></label>
                <label><span>Hub code</span><input required value={newHub.code} onChange={(event) => setNewHub((current) => ({ ...current, code: event.target.value }))} /></label>
                <label><span>Area (optional)</span><input value={newHub.area} onChange={(event) => setNewHub((current) => ({ ...current, area: event.target.value }))} /></label>
                <label><span>Status</span><select value={newHub.status} onChange={(event) => setNewHub((current) => ({ ...current, status: event.target.value as HubCreateApi['status'] }))}><option value="Active">Active</option><option value="Inactive">Inactive</option></select></label>
                <label className="sm:col-span-2"><span>Address</span><input required value={newHub.address} onChange={(event) => setNewHub((current) => ({ ...current, address: event.target.value }))} /></label>
                <label><span>Latitude</span><input required type="number" min={-90} max={90} step="any" value={newHub.latitude} onChange={(event) => setNewHub((current) => ({ ...current, latitude: event.target.value }))} /></label>
                <label><span>Longitude</span><input required type="number" min={-180} max={180} step="any" value={newHub.longitude} onChange={(event) => setNewHub((current) => ({ ...current, longitude: event.target.value }))} /></label>
                <label className="sm:col-span-2"><span>Capacity (drone slots)</span><input required type="number" min={1} step={1} value={newHub.capacity} onChange={(event) => setNewHub((current) => ({ ...current, capacity: event.target.value }))} /></label>
                <p className="sm:col-span-2 text-xs text-muted-foreground">New Hubs need compatible, charged batteries before Dijkstra can use them as relay stops. Creating a Hub does not automatically supply batteries.</p>
                {createError && <p role="alert" className="sm:col-span-2 text-sm text-red-500">{createError}</p>}
              </div>
              <div className="form-actions border-t border-border p-5">
                <ActionButton variant="secondary" onClick={() => setCreating(false)} disabled={createSaving}>Cancel</ActionButton>
                <ActionButton type="submit" disabled={createSaving}>{createSaving ? 'Creating…' : 'Create hub'}</ActionButton>
              </div>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        {editing ? (
          <DialogContent>
            <form onSubmit={save}>
              <div className="border-b border-border p-5">
                <DialogTitle className="text-lg font-semibold">Edit hub</DialogTitle>
                {/* <p className="mt-1 text-sm text-muted-foreground">Hub master data and administrative availability.</p> */}
              </div>
              <div className="fields two p-5">
                <label><span>Hub name</span><input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
                <label><span>Hub code</span><input required value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} /></label>
                <label><span>Area</span><input required value={editing.area} onChange={(e) => setEditing({ ...editing, area: e.target.value })} /></label>
                <label><span>Status</span><select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as AdminHub["status"] })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
                <label className="sm:col-span-2"><span>Address</span><input required value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></label>
                <label><span>Latitude</span><input required type="number" min={-90} max={90} step="any" value={editing.latitude} onChange={(e) => setEditing({ ...editing, latitude: Number(e.target.value) })} /></label>
                <label><span>Longitude</span><input required type="number" min={-180} max={180} step="any" value={editing.longitude} onChange={(e) => setEditing({ ...editing, longitude: Number(e.target.value) })} /></label>
              </div>
              <div className="form-actions border-t border-border p-5">
                <ActionButton variant="secondary" onClick={() => setEditing(null)}>Cancel</ActionButton>
                <ActionButton type="submit" disabled={saving}>{saving ? "Saving…" : "Save hub"}</ActionButton>
              </div>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </AdminPageShell>
  );
}
