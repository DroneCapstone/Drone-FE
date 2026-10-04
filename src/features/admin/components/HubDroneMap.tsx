import { MapPin, Plane } from "lucide-react";
import { useMemo, useState } from "react";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { OperatorPanel } from "../../operator/components/OperatorPanel";
import type { AdminDrone, AdminHub } from "../types";
import { droneTone, hubTone } from "../utils/adminDisplay";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function dotClass(status: AdminDrone["status"], isActive: boolean) {
  if (!isActive) return "bg-zinc-500";
  if (status === "AVAILABLE") return "bg-emerald-500";
  if (status === "MAINTENANCE") return "bg-amber-500";
  return "bg-sky-500";
}

export function HubDroneMap({
  hubs,
  drones,
  onSelectHub,
}: {
  hubs: AdminHub[];
  drones: AdminDrone[];
  onSelectHub?: (hub: AdminHub) => void;
}) {
  const [selectedHubId, setSelectedHubId] = useState(hubs[0]?.id ?? "");

  const bounds = useMemo(() => {
    if (!hubs.length) {
      return { minLat: 10.7, maxLat: 10.9, minLng: 106.56, maxLng: 106.81 };
    }
    const lats = hubs.map((hub) => hub.latitude);
    const lngs = hubs.map((hub) => hub.longitude);
    return {
      minLat: Math.min(...lats) - 0.03,
      maxLat: Math.max(...lats) + 0.03,
      minLng: Math.min(...lngs) - 0.03,
      maxLng: Math.max(...lngs) + 0.03,
    };
  }, [hubs]);

  const selected = hubs.find((hub) => hub.id === selectedHubId) ?? hubs[0];
  const selectedDrones = selected ? drones.filter((drone) => drone.hubId === selected.id) : [];

  const selectHub = (hub: AdminHub) => {
    setSelectedHubId(hub.id);
    onSelectHub?.(hub);
  };

  return (
    <OperatorPanel title="Hub & drone distribution" eyebrow="NETWORK MAP">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Select a hub to see the drones currently assigned to that hub.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-orange-500" />Hub</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Available</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-amber-500" />Maintenance</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-sky-500" />In flight</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-zinc-500" />Inactive</span>
        </div>
      </div>

      <div className="grid overflow-hidden rounded-xl border border-border bg-background lg:grid-cols-[minmax(0,1fr)_320px]">
        <div
          className="relative min-h-[430px] overflow-hidden"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(148,163,184,.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,.08) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-500/[0.03] via-transparent to-sky-500/[0.03]" />

          {hubs.map((hub) => {
            const left = clamp(
              ((hub.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 84 + 8,
              8,
              92,
            );
            const top = clamp(
              (1 - (hub.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 76 + 10,
              10,
              86,
            );
            const hubDrones = drones.filter((drone) => drone.hubId === hub.id);
            const isSelected = selected?.id === hub.id;

            return (
              <button
                key={hub.id}
                type="button"
                onClick={() => selectHub(hub)}
                className="group absolute -translate-x-1/2 -translate-y-1/2 text-left"
                style={{ left: `${left}%`, top: `${top}%` }}
                aria-label={`${hub.name}, ${hubDrones.length} drones`}
              >
                <span
                  className={`relative grid h-11 w-11 place-items-center rounded-full border bg-card shadow-sm transition ${
                    isSelected
                      ? "scale-110 border-orange-500 ring-4 ring-orange-500/10"
                      : "border-border group-hover:border-orange-500/60"
                  }`}
                >
                  <MapPin size={18} className={hub.status === "ACTIVE" ? "text-orange-500" : "text-muted-foreground"} />

                  {hubDrones.map((drone, index) => {
                    const angle = (index / Math.max(hubDrones.length, 1)) * Math.PI * 2;
                    const radius = 34 + (index % 2) * 8;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    return (
                      <i
                        key={drone.id}
                        title={`${drone.id} · ${drone.status}${drone.isActive ? "" : " · inactive"}`}
                        className={`absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full border-2 border-card ${dotClass(
                          drone.status,
                          drone.isActive,
                        )}`}
                        style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
                      />
                    );
                  })}
                </span>

                <span className="absolute left-1/2 top-[56px] -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium shadow-sm">
                  {hub.code} <span className="text-muted-foreground">· {hubDrones.length}</span>
                </span>
              </button>
            );
          })}

          {!hubs.length ? (
            <div className="grid min-h-[430px] place-items-center text-sm text-muted-foreground">
              No hub coordinates available.
            </div>
          ) : null}
        </div>

        <aside className="border-t border-border bg-card p-5 lg:border-l lg:border-t-0">
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="eyebrow">SELECTED HUB</span>
                  <h3 className="mt-1 truncate text-base font-semibold">{selected.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{selected.code} · {selected.area}</p>
                </div>
                <StatusBadge tone={hubTone(selected.status)}>{selected.status}</StatusBadge>
              </div>

              <p className="mt-3 text-sm leading-6 text-muted-foreground">{selected.address}</p>

              <div className="my-5 grid grid-cols-2 gap-3 border-y border-border py-4">
                <div>
                  <small className="text-xs text-muted-foreground">Drones at hub</small>
                  <strong className="mt-1 block text-2xl">{selectedDrones.length}</strong>
                </div>
                <div>
                  <small className="text-xs text-muted-foreground">Hub capacity</small>
                  <strong className="mt-1 block text-2xl">{selected.capacity}</strong>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="eyebrow">DRONES AT THIS HUB</span>
                <span className="text-xs text-muted-foreground">{selectedDrones.length}</span>
              </div>

              <div className="mt-2 max-h-[220px] space-y-1 overflow-y-auto pr-1">
                {selectedDrones.map((drone) => (
                  <div key={drone.id} className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-background">
                      <Plane size={15} className={drone.isActive ? "text-foreground" : "text-muted-foreground"} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-sm">{drone.id} · {drone.name}</strong>
                      <small className="text-xs text-muted-foreground">{drone.model} · {drone.batteryPct}% battery</small>
                    </div>
                    <StatusBadge tone={drone.isActive ? droneTone(drone.status) : "neutral"}>
                      {drone.isActive ? drone.status : "INACTIVE"}
                    </StatusBadge>
                  </div>
                ))}
                {!selectedDrones.length ? <p className="py-4 text-sm text-muted-foreground">No drones assigned to this hub.</p> : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No hubs available.</p>
          )}
        </aside>
      </div>
    </OperatorPanel>
  );
}
