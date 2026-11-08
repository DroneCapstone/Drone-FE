import { useEffect, useMemo, useState } from "react";
import { Plane, CircleCheck, Wrench, RadioTower } from "lucide-react";
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
import { getAdminDrones, getAdminHubs, upsertAdminDrone } from "../../services/adminStore";
import type { AdminDrone } from "../../types";
import { droneTone } from "../../utils/adminDisplay";

function newDrone(hubId: string, template?: AdminDrone): AdminDrone {
  const now = new Date().toISOString();
  return {
    id: '', name: '', displayId: '', model: template?.model ?? '', serialNumber: '', hubId,
    // A newly received physical drone is not automatically cleared for missions.
    status: 'MAINTENANCE', isActive: false, batteryPct: 0,
    maxPayloadKg: template?.maxPayloadKg ?? 0,
    createdAt: now, updatedAt: now,
  };
}

export function DronesPage() {
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [active, setActive] = useState("all");
  const [hub, setHub] = useState("all");
  const [creating, setCreating] = useState<AdminDrone | null>(null);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    const listener = () => setVersion((value) => value + 1);
    window.addEventListener("admin-data-updated", listener);
    return () => window.removeEventListener("admin-data-updated", listener);
  }, []);

  const drones = useMemo(() => getAdminDrones(), [version]);
  const hubs = getAdminHubs();
  const activeHubs = hubs.filter((hub) => hub.status === 'ACTIVE');
  const templates = Array.from(new Map(drones.map((drone) => [drone.model, drone])).values()).sort((a, b) => a.model.localeCompare(b.model));
  const visible = drones.filter((drone) => {
    const matchesQuery = `${drone.id} ${drone.name} ${drone.model} ${drone.serialNumber}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === "all" || drone.status === status) && (active === "all" || String(drone.isActive) === active) && (hub === "all" || drone.hubId === hub);
  });
  const hubName = (id: string) => hubs.find((item) => item.id === id)?.name ?? "—";

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!creating) return;
    try {
      const current = getAdminDrones();
      const template = current.find((drone) => drone.model === creating.model);
      const serial = creating.serialNumber.trim();
      const hub = getAdminHubs().find((item) => item.id === creating.hubId && item.status === 'ACTIVE');
      if (!template) throw new Error('Select an existing supported drone model.');
      if (!serial) throw new Error('Enter the physical drone serial number.');
      if (current.some((drone) => drone.serialNumber.trim().toLowerCase() === serial.toLowerCase()))
        throw new Error('This serial number already exists.');
      if (!hub) throw new Error('Choose an active Hub.');
      if (current.filter((drone) => drone.hubId === hub.id).length >= hub.capacity)
        throw new Error('Selected Hub has reached drone capacity.');
      const maxId = current.reduce((maximum, drone) => {
        const match = /^DR-(\d+)$/.exec(drone.id);
        return match ? Math.max(maximum, Number(match[1])) : maximum;
      }, 0);
      const id = `DR-${String(maxId + 1).padStart(3, '0')}`;
      const now = new Date().toISOString();
      upsertAdminDrone({ ...creating, id, name: creating.name.trim() || id,
        model: template.model, serialNumber: serial, hubId: hub.id,
        displayId: String(maxId + 1).padStart(2, '0'),
        maxPayloadKg: template.maxPayloadKg,
        status: 'MAINTENANCE', isActive: false, batteryPct: 0,
        installedBatteryId: undefined, createdAt: now, updatedAt: now });
      setCreateError('');
      setCreating(null);
    } catch (cause) { setCreateError(cause instanceof Error ? cause.message : 'Could not add drone.'); }
  };
  const openAdd = () => {
    setCreateError('');
    setCreating(newDrone(activeHubs[0]?.id ?? '', templates[0]));
  };

  return (
    <AdminPageShell title="Drones" description="Add physical drones from supported models and manage administrative availability." actions={<ActionButton icon="plus" onClick={openAdd}>Add drone</ActionButton>}>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminSummaryCard label="Total drones" value={drones.length} note="Registered assets" icon={Plane} />
        <AdminSummaryCard label="Available" value={drones.filter((d) => d.status === "AVAILABLE" && d.isActive).length} note="Before eligibility checks" icon={CircleCheck} />
        <AdminSummaryCard label="Maintenance" value={drones.filter((d) => d.status === "MAINTENANCE").length} note="Unavailable for missions" icon={Wrench} />
        <AdminSummaryCard label="In flight" value={drones.filter((d) => d.status === "IN_FLIGHT").length} note="Cannot be deactivated" icon={RadioTower} />
      </div>

      <OperatorPanel className="flush-panel">
        <AdminToolbar searchValue={query} onSearchChange={setQuery} placeholder="Search drone, model or serial…" filters={<>
          <select value={hub} onChange={(e) => setHub(e.target.value)}><option value="all">All hubs</option>{hubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All status</option><option value="AVAILABLE">Available</option><option value="MAINTENANCE">Maintenance</option><option value="IN_FLIGHT">In flight</option></select>
          <select value={active} onChange={(e) => setActive(e.target.value)}><option value="all">All admin state</option><option value="true">Active</option><option value="false">Inactive</option></select>
        </>} meta={`${visible.length} of ${drones.length} drones`} />
        <div className="table-wrap">
          <table>
            <thead><tr><th>Drone</th><th>Model</th><th>Hub</th><th>Battery</th><th>Status</th><th>Admin state</th><th>Payload</th><th>Action</th></tr></thead>
            <tbody>{visible.map((drone) => <tr key={drone.id}>
              <td><strong>{drone.id}</strong><small>{drone.name}</small></td>
              <td><strong>{drone.model}</strong><small>{drone.serialNumber}</small></td>
              <td>{hubName(drone.hubId)}</td>
              <td><div className="battery-cell"><span><i style={{ width: `${drone.batteryPct}%` }} /></span>{drone.batteryPct}%</div></td>
              <td><StatusBadge tone={droneTone(drone.status)}>{drone.status.replace("_", " ")}</StatusBadge></td>
              <td><StatusBadge tone={drone.isActive ? "success" : "neutral"}>{drone.isActive ? "ACTIVE" : "INACTIVE"}</StatusBadge></td>
              <td>{drone.maxPayloadKg} kg</td>
              <td><Link className="text-button" to={`/admin/network/drones/${drone.id}`}>View</Link></td>
            </tr>)}</tbody>
          </table>
        </div>
      </OperatorPanel>

      <Dialog open={Boolean(creating)} onOpenChange={(open) => !open && setCreating(null)}>
        {creating ? <DialogContent><form onSubmit={save}>
          <div className="border-b border-border p-5"><DialogTitle className="text-lg font-semibold">Add drone</DialogTitle><p className="mt-1 text-sm text-muted-foreground">Add an existing physical drone. Choose a supported model; its ID is generated automatically. Drone stays inactive for technical onboarding.</p></div>
          <div className="fields two p-5">
            <label><span>Drone name</span><input placeholder="CX-21" value={creating.name} onChange={(e) => setCreating({ ...creating, name: e.target.value })} /></label>
            <label><span>Model</span><select required value={creating.model} onChange={(e) => { const template = templates.find((drone) => drone.model === e.target.value); setCreating({ ...creating, model: e.target.value, maxPayloadKg: template?.maxPayloadKg ?? 0 }); }}>
              {templates.map((template) => <option key={template.model} value={template.model}>{template.model}</option>)}
            </select></label>
            <label><span>Serial number</span><input required value={creating.serialNumber} onChange={(e) => setCreating({ ...creating, serialNumber: e.target.value })} /></label>
            <label><span>Maximum payload (kg) · from model</span><input readOnly value={creating.maxPayloadKg || ""} /></label>
            <label><span>Home hub</span><select required value={creating.hubId} onChange={(e) => setCreating({ ...creating, hubId: e.target.value })}>{activeHubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
          </div>
          {createError && <p role="alert" className="mx-5 mt-2 text-sm text-red-500">{createError}</p>}
          <div className="form-actions border-t border-border p-5"><ActionButton variant="secondary" onClick={() => setCreating(null)}>Cancel</ActionButton><ActionButton type="submit">Add drone</ActionButton></div>
        </form></DialogContent> : null}
      </Dialog>
    </AdminPageShell>
  );
}
