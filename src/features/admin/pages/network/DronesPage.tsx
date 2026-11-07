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

function newDrone(hubId = ""): AdminDrone {
  const now = new Date().toISOString();
  return {
    id: "",
    name: "",
    displayId: "",
    model: "",
    serialNumber: "",
    hubId,
    status: "AVAILABLE",
    isActive: true,
    batteryPct: 100,
    maxPayloadKg: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function DronesPage() {
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [active, setActive] = useState("all");
  const [hub, setHub] = useState("all");
  const [creating, setCreating] = useState<AdminDrone | null>(null);

  useEffect(() => {
    const listener = () => setVersion((value) => value + 1);
    window.addEventListener("admin-data-updated", listener);
    return () => window.removeEventListener("admin-data-updated", listener);
  }, []);

  const drones = useMemo(() => getAdminDrones(), [version]);
  const hubs = getAdminHubs();
  const visible = drones.filter((drone) => {
    const matchesQuery = `${drone.id} ${drone.name} ${drone.model} ${drone.serialNumber}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === "all" || drone.status === status) && (active === "all" || String(drone.isActive) === active) && (hub === "all" || drone.hubId === hub);
  });
  const hubName = (id: string) => hubs.find((item) => item.id === id)?.name ?? "—";

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!creating) return;
    const now = new Date().toISOString();
    const id = creating.id.trim().toUpperCase();
    upsertAdminDrone({ ...creating, id, name: creating.name.trim() || id, displayId: id.replace(/\D/g, "").slice(-2), status: "AVAILABLE", createdAt: now, updatedAt: now });
    setCreating(null);
  };

  return (
    <AdminPageShell title="Drones" description="Register drone master data and control administrative availability. Operational status remains read-only for Admin." actions={<ActionButton icon="plus" onClick={() => setCreating(newDrone(hubs[0]?.id))}>Register drone</ActionButton>}>
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
          <div className="border-b border-border p-5"><DialogTitle className="text-lg font-semibold">Register drone</DialogTitle><p className="mt-1 text-sm text-muted-foreground">New drones start as AVAILABLE and active.</p></div>
          <div className="fields two p-5">
            <label><span>Drone code</span><input required placeholder="DR-021" value={creating.id} onChange={(e) => setCreating({ ...creating, id: e.target.value })} /></label>
            <label><span>Drone name</span><input placeholder="CX-21" value={creating.name} onChange={(e) => setCreating({ ...creating, name: e.target.value })} /></label>
            <label><span>Model</span><input required value={creating.model} onChange={(e) => setCreating({ ...creating, model: e.target.value })} /></label>
            <label><span>Serial number</span><input required value={creating.serialNumber} onChange={(e) => setCreating({ ...creating, serialNumber: e.target.value })} /></label>
            <label><span>Maximum payload (kg)</span><input required min={0} step="0.1" type="number" value={creating.maxPayloadKg || ""} onChange={(e) => setCreating({ ...creating, maxPayloadKg: Number(e.target.value) })} /></label>
            <label><span>Home hub</span><select required value={creating.hubId} onChange={(e) => setCreating({ ...creating, hubId: e.target.value })}>{hubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
          </div>
          <div className="form-actions border-t border-border p-5"><ActionButton variant="secondary" onClick={() => setCreating(null)}>Cancel</ActionButton><ActionButton type="submit">Register drone</ActionButton></div>
        </form></DialogContent> : null}
      </Dialog>
    </AdminPageShell>
  );
}
