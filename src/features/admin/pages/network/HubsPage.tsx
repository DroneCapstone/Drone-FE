import { MapPin, CircleCheck, Plane, BatteryCharging } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { getAdminBatteries, getAdminDrones, getAdminHubs, upsertAdminHub } from "../../services/adminStore";
import type { AdminHub } from "../../types";
import { hubTone } from "../../utils/adminDisplay";

export function HubsPage() {
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<AdminHub | null>(null);

  useEffect(() => {
    const listener = () => setVersion((value) => value + 1);
    window.addEventListener("admin-data-updated", listener);
    return () => window.removeEventListener("admin-data-updated", listener);
  }, []);

  const hubs = useMemo(() => getAdminHubs(), [version]);
  const drones = useMemo(() => getAdminDrones(), [version]);
  const batteries = useMemo(() => getAdminBatteries(), [version]);
  const visible = hubs.filter((hub) => {
    const matchesQuery = `${hub.name} ${hub.code} ${hub.area} ${hub.address}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === "all" || hub.status === status);
  });

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    const now = new Date().toISOString();
    upsertAdminHub({
      ...editing,
      id: editing.id,
      code: editing.code.trim().toUpperCase(),
      name: editing.name.trim(),
      area: editing.area.trim(),
      address: editing.address.trim(),
      createdAt: editing.createdAt,
      updatedAt: now,
    });
    setEditing(null);
  };

  return (
    <AdminPageShell
      title="Hubs"
      description="Manage configured Hubs and their assigned assets."
    >
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminSummaryCard label="Total hubs" value={hubs.length} note="Registered hubs" icon={MapPin} />
        <AdminSummaryCard label="Active" value={hubs.filter((hub) => hub.status === "ACTIVE").length} note="Eligible for new planning" icon={CircleCheck} />
        <AdminSummaryCard label="Drones" value={drones.length} note="Registered drones" icon={Plane} />
        <AdminSummaryCard label="Batteries" value={batteries.filter((battery) => Boolean(battery.hubId)).length} note="Assigned to Hubs" icon={BatteryCharging} />
      </div>

      <HubDroneMap hubs={hubs} drones={drones} />

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
                  <td>{batteries.filter((battery) => battery.hubId === hub.id).length}</td>
                  <td>{hub.technicianIds.length}</td>
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
                <ActionButton type="submit">Save hub</ActionButton>
              </div>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </AdminPageShell>
  );
}
