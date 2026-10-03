import { MapPin, Plane } from "lucide-react";
import { useMemo, useState } from "react";
import type { AdminDrone, AdminHub } from "../types";
import { AdminStatusBadge } from "./AdminStatusBadge";

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }

export function HubDroneMap({ hubs, drones, onSelectHub }: { hubs: AdminHub[]; drones: AdminDrone[]; onSelectHub?: (hub: AdminHub) => void }) {
  const [selectedHubId, setSelectedHubId] = useState(hubs[0]?.id ?? "");
  const bounds = useMemo(() => {
    const lats = hubs.map((hub) => hub.latitude);
    const lngs = hubs.map((hub) => hub.longitude);
    return {
      minLat: Math.min(...lats, 10.70) - 0.03,
      maxLat: Math.max(...lats, 10.90) + 0.03,
      minLng: Math.min(...lngs, 106.56) - 0.03,
      maxLng: Math.max(...lngs, 106.81) + 0.03,
    };
  }, [hubs]);
  const selected = hubs.find((hub) => hub.id === selectedHubId) ?? hubs[0];
  const selectHub = (hub: AdminHub) => { setSelectedHubId(hub.id); onSelectHub?.(hub); };

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-border)] px-4 py-3">
        <div><h3 className="text-[14px] font-semibold text-[var(--admin-text)]">Hub & drone distribution</h3><p className="mt-0.5 text-[11px] text-[var(--admin-muted)]">Each hub is a main point; small dots represent drones currently assigned to that hub.</p></div>
        <div className="flex items-center gap-3 text-[11px] text-[var(--admin-muted)]"><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-orange-500" />Hub</span><span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Serviceable</span><span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-red-500" />Maintenance</span></div>
      </div>
      <div className="grid lg:grid-cols-[1fr_260px]">
        <div className="admin-map-grid relative min-h-[420px] overflow-hidden bg-[var(--admin-bg)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_40%,rgba(237,116,46,0.10),transparent_38%)]" />
          {hubs.map((hub) => {
            const left = clamp(((hub.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 88 + 6, 6, 94);
            const top = clamp((1 - (hub.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 78 + 8, 8, 86);
            const hubDrones = drones.filter((drone) => drone.hubId === hub.id);
            const isSelected = selected?.id === hub.id;
            return (
              <button key={hub.id} type="button" onClick={() => selectHub(hub)} className="group absolute -translate-x-1/2 -translate-y-1/2 text-left" style={{ left: `${left}%`, top: `${top}%` }}>
                <span className={`relative grid h-10 w-10 place-items-center rounded-full border-2 shadow-lg transition-transform group-hover:scale-110 ${isSelected ? "border-orange-300 bg-orange-500 text-white" : hub.status === "Active" ? "border-orange-500 bg-[#17191d] text-orange-500" : "border-amber-500 bg-[#17191d] text-amber-500"}`}><MapPin size={17} />
                  {hubDrones.map((drone, index) => {
                    const angle = (index / Math.max(hubDrones.length, 1)) * Math.PI * 2;
                    const radius = 29 + (index % 2) * 7;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    return <i key={drone.id} title={`${drone.id} · ${drone.operationalStatus}`} className={`absolute h-2 w-2 rounded-full border border-[#0b0d10] ${drone.technicalStatus === "Serviceable" ? "bg-emerald-500" : "bg-red-500"}`} style={{ transform: `translate(${x}px, ${y}px)` }} />;
                  })}
                </span>
                <span className="absolute left-1/2 top-[48px] -translate-x-1/2 whitespace-nowrap rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)]/95 px-2 py-1 text-[10px] font-semibold text-[var(--admin-text)] shadow">{hub.code} · {hubDrones.length}</span>
              </button>
            );
          })}
        </div>
        <aside className="border-t border-[var(--admin-border)] p-4 lg:border-l lg:border-t-0">
          {selected ? <>
            <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] uppercase tracking-[0.14em] text-[var(--admin-muted)]">Selected hub</p><h4 className="mt-1 text-[17px] font-semibold text-[var(--admin-text)]">{selected.name}</h4></div><AdminStatusBadge tone={selected.status === "Active" ? "success" : selected.status === "Maintenance" ? "warning" : "neutral"}>{selected.status}</AdminStatusBadge></div>
            <p className="mt-2 text-[12px] leading-5 text-[var(--admin-muted)]">{selected.address}</p>
            <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-lg bg-[var(--admin-surface-2)] p-3"><span className="text-[10px] text-[var(--admin-muted)]">Drones</span><strong className="mt-1 block text-xl text-[var(--admin-text)]">{drones.filter((drone) => drone.hubId === selected.id).length}</strong></div><div className="rounded-lg bg-[var(--admin-surface-2)] p-3"><span className="text-[10px] text-[var(--admin-muted)]">Capacity</span><strong className="mt-1 block text-xl text-[var(--admin-text)]">{selected.capacity}</strong></div></div>
            <div className="mt-4 space-y-2">{drones.filter((drone) => drone.hubId === selected.id).map((drone) => <div key={drone.id} className="flex items-center gap-2 rounded-lg border border-[var(--admin-border)] px-3 py-2"><Plane size={14} className={drone.technicalStatus === "Serviceable" ? "text-emerald-500" : "text-red-500"} /><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-semibold text-[var(--admin-text)]">{drone.id} · {drone.model}</p><p className="text-[10px] text-[var(--admin-muted)]">{drone.operationalStatus} · {drone.batteryPct}%</p></div></div>)}</div>
          </> : <p className="text-[12px] text-[var(--admin-muted)]">No hubs available.</p>}
        </aside>
      </div>
    </div>
  );
}
