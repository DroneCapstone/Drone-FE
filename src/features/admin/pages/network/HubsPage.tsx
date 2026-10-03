import { Edit3, Plus, Search, Warehouse, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AdminPageShell } from "../../components/AdminPageShell";
import { AdminStatusBadge } from "../../components/AdminStatusBadge";
import { HubDroneMap } from "../../components/HubDroneMap";
import { getAdminDrones, getAdminHubs, upsertAdminHub } from "../../services/adminStore";
import type { AdminHub } from "../../types";

const emptyHub: AdminHub = { id: "", name: "", code: "", area: "", address: "", latitude: 10.7769, longitude: 106.7009, status: "Active", capacity: 12, technicianIds: [], createdAt: "", updatedAt: "" };

export function HubsPage() {
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AdminHub | null>(null);
  useEffect(() => { const listener = () => setVersion((v) => v + 1); window.addEventListener("admin-data-updated", listener); return () => window.removeEventListener("admin-data-updated", listener); }, []);
  const hubs = useMemo(() => getAdminHubs(), [version]);
  const drones = useMemo(() => getAdminDrones(), [version]);
  const visible = hubs.filter((hub) => `${hub.name} ${hub.code} ${hub.area} ${hub.address}`.toLowerCase().includes(query.toLowerCase()));

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    const now = new Date().toISOString();
    const normalized: AdminHub = { ...editing, id: editing.id || `hub-${Date.now()}`, name: editing.name.trim(), code: editing.code.trim().toUpperCase(), createdAt: editing.createdAt || now, updatedAt: now };
    upsertAdminHub(normalized);
    setEditing(null);
  };

  return (
    <AdminPageShell title="Hub management" description="Create and edit hub master data, capacity and network availability. Drone/mission operational actions remain in Operator and Technician workflows." actions={<button type="button" onClick={() => setEditing({ ...emptyHub })} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-[12px] font-semibold text-white hover:bg-orange-600"><Plus size={15} />Create hub</button>}>
      <HubDroneMap hubs={hubs} drones={drones} />
      <div className="mt-5 overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-border)] p-4">
          <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2"><Search size={15} className="text-[var(--admin-muted)]" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search hub..." className="w-full bg-transparent text-[12px] outline-none" /></div>
          <span className="text-[11px] text-[var(--admin-muted)]">{visible.length} hubs</span>
        </div>
        <div className="overflow-x-auto admin-scrollbar">
          <table className="w-full min-w-[1000px] text-left text-[12px]"><thead className="bg-[var(--admin-surface-2)] text-[10px] uppercase tracking-wide text-[var(--admin-muted)]"><tr><th className="px-4 py-3">Hub</th><th className="px-4 py-3">Area</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Drones</th><th className="px-4 py-3">Capacity</th><th className="px-4 py-3">Technicians</th><th className="px-4 py-3">Coordinates</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-[var(--admin-border)]">{visible.map((hub) => { const droneCount = drones.filter((drone) => drone.hubId === hub.id).length; return <tr key={hub.id} className="hover:bg-[var(--admin-surface-2)]/50"><td className="px-4 py-3"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500/10 text-orange-500"><Warehouse size={15} /></span><div><strong className="block text-[var(--admin-text)]">{hub.name}</strong><span className="text-[10px] text-[var(--admin-muted)]">{hub.code}</span></div></div></td><td className="px-4 py-3"><span className="block">{hub.area}</span><span className="text-[10px] text-[var(--admin-muted)]">{hub.address}</span></td><td className="px-4 py-3"><AdminStatusBadge tone={hub.status === "Active" ? "success" : hub.status === "Maintenance" ? "warning" : "neutral"}>{hub.status}</AdminStatusBadge></td><td className="px-4 py-3 font-semibold">{droneCount}</td><td className="px-4 py-3">{hub.capacity}</td><td className="px-4 py-3">{hub.technicianIds.length}</td><td className="px-4 py-3 text-[11px] text-[var(--admin-muted)]">{hub.latitude.toFixed(4)}, {hub.longitude.toFixed(4)}</td><td className="px-4 py-3 text-right"><button type="button" onClick={() => setEditing({ ...hub })} className="inline-flex items-center gap-1.5 rounded-md border border-[var(--admin-border)] px-2.5 py-1.5 text-[11px] hover:border-orange-500/50 hover:text-orange-500"><Edit3 size={13} />Edit</button></td></tr>; })}</tbody>
          </table>
        </div>
      </div>
      {editing && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditing(null); }}><form onSubmit={save} className="w-full max-w-[620px] rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-2xl"><div className="flex items-center justify-between border-b border-[var(--admin-border)] px-5 py-4"><div><h2 className="text-[17px] font-semibold">{editing.id ? "Edit hub" : "Create hub"}</h2><p className="text-[11px] text-[var(--admin-muted)]">Admin master data</p></div><button type="button" onClick={() => setEditing(null)} className="p-2 text-[var(--admin-muted)]"><X size={18} /></button></div><div className="grid gap-4 p-5 sm:grid-cols-2">{[
        ["Hub name", "name", "Hub HCM-07"], ["Code", "code", "HCM-07"], ["Area", "area", "Thu Duc"], ["Address", "address", "Ho Chi Minh City"], ["Latitude", "latitude", "10.7769"], ["Longitude", "longitude", "106.7009"], ["Capacity", "capacity", "20"]
      ].map(([label, key, placeholder]) => <label key={key} className={key === "address" ? "sm:col-span-2" : ""}><span className="mb-1.5 block text-[11px] font-medium text-[var(--admin-muted)]">{label}</span><input required={key !== "address"} value={String(editing[key as keyof AdminHub] ?? "")} onChange={(e) => setEditing((current) => current ? ({ ...current, [key]: ["latitude", "longitude", "capacity"].includes(key) ? Number(e.target.value) : e.target.value }) : current)} placeholder={placeholder} className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2.5 text-[12px] outline-none focus:border-orange-500/60" /></label>)}<label><span className="mb-1.5 block text-[11px] font-medium text-[var(--admin-muted)]">Status</span><select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as AdminHub["status"] })} className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2.5 text-[12px]"><option>Active</option><option>Inactive</option><option>Maintenance</option></select></label></div><div className="flex justify-end gap-2 border-t border-[var(--admin-border)] px-5 py-4"><button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-[var(--admin-border)] px-4 py-2 text-[12px]">Cancel</button><button type="submit" className="rounded-lg bg-orange-500 px-4 py-2 text-[12px] font-semibold text-white">Save hub</button></div></form></div>}
    </AdminPageShell>
  );
}
