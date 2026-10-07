import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ActionButton } from "../../../../components/ui/ActionButton";
import { Dialog, DialogContent, DialogTitle } from "../../../../components/ui/Dialog";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { MetricCard } from "../../../operator/components/MetricCard";
import { OperatorPanel } from "../../../operator/components/OperatorPanel";
import { AdminPageShell } from "../../components/AdminPageShell";
import { AdminToolbar } from "../../components/AdminToolbar";
import { getAdminBatteries, getAdminHubs, upsertAdminBattery } from "../../services/adminStore";
import type { AdminBattery } from "../../types";
import { batteryHealthTone, batteryOperationalTone } from "../../utils/adminDisplay";

function newBattery(hubId = ""): AdminBattery {
  const now = new Date().toISOString();
  return {
    id: "",
    model: "",
    serialNumber: "",
    hubId,
    chargeLevelPct: 100,
    operationalStatus: "READY",
    administrativeStatus: "ACTIVE",
    designCapacityMah: 0,
    designEnergyWh: 0,
    fullChargeCapacityMah: 0,
    sohPct: 100,
    cycleCount: 0,
    maxCycles: 400,
    physicalCondition: "NORMAL",
    retirementRecommended: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function BatteriesPage() {
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState("");
  const [operational, setOperational] = useState("all");
  const [adminStatus, setAdminStatus] = useState("all");
  const [review, setReview] = useState("all");
  const [creating, setCreating] = useState<AdminBattery | null>(null);

  useEffect(() => {
    const listener = () => setVersion((value) => value + 1);
    window.addEventListener("admin-data-updated", listener);
    return () => window.removeEventListener("admin-data-updated", listener);
  }, []);

  const batteries = useMemo(() => getAdminBatteries(), [version]);
  const hubs = getAdminHubs();
  const visible = batteries.filter((battery) => {
    const matchesQuery = `${battery.id} ${battery.model} ${battery.serialNumber}`.toLowerCase().includes(query.toLowerCase());
    const matchesReview = review === "all" || String(battery.retirementRecommended) === review;
    return matchesQuery && matchesReview && (operational === "all" || battery.operationalStatus === operational) && (adminStatus === "all" || battery.administrativeStatus === adminStatus);
  });
  const hubName = (id: string) => hubs.find((hub) => hub.id === id)?.name ?? "—";

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!creating) return;
    const now = new Date().toISOString();
    const designCapacityMah = creating.designCapacityMah;
    upsertAdminBattery({
      ...creating,
      id: creating.id.trim().toUpperCase(),
      fullChargeCapacityMah: designCapacityMah,
      sohPct: 100,
      cycleCount: 0,
      operationalStatus: "READY",
      administrativeStatus: "ACTIVE",
      retirementRecommended: false,
      createdAt: now,
      updatedAt: now,
    });
    setCreating(null);
  };

  return (
    <AdminPageShell title="Batteries" description="Manage battery identity and lifecycle while monitoring SOH, cycle count, cell balance and retirement recommendations." actions={<ActionButton icon="plus" onClick={() => setCreating(newBattery(hubs[0]?.id))}>Register battery</ActionButton>}>
      <div className="metric-grid">
        <MetricCard label="Active batteries" value={String(batteries.filter((b) => b.administrativeStatus === "ACTIVE").length)} delta="Fleet" tone="success" note="Not retired" />
        <MetricCard label="Ready" value={String(batteries.filter((b) => b.operationalStatus === "READY" && b.administrativeStatus === "ACTIVE").length)} delta="Operational" tone="success" note="Technician-managed state" />
        <MetricCard label="Health review" value={String(batteries.filter((b) => b.retirementRecommended && b.administrativeStatus === "ACTIVE").length)} delta="Attention" tone="warning" note="Retirement recommended" />
        <MetricCard label="Retired" value={String(batteries.filter((b) => b.administrativeStatus === "RETIRED").length)} delta="Lifecycle" tone="neutral" note="Blocked from operation" />
      </div>

      <OperatorPanel className="flush-panel">
        <AdminToolbar searchValue={query} onSearchChange={setQuery} placeholder="Search battery ID, model or serial…" filters={<>
          <select value={operational} onChange={(e) => setOperational(e.target.value)}><option value="all">All operational</option><option value="READY">Ready</option><option value="CHARGING">Charging</option><option value="INSTALLED">Installed</option><option value="MAINTENANCE">Maintenance</option></select>
          <select value={adminStatus} onChange={(e) => setAdminStatus(e.target.value)}><option value="all">All lifecycle</option><option value="ACTIVE">Active</option><option value="RETIRED">Retired</option></select>
          <select value={review} onChange={(e) => setReview(e.target.value)}><option value="all">All health</option><option value="true">Retirement review</option><option value="false">No review</option></select>
        </>} meta={`${visible.length} of ${batteries.length} batteries`} />
        <div className="table-wrap">
          <table>
            <thead><tr><th>Battery</th><th>Hub / Drone</th><th>Charge</th><th>SOH</th><th>Cycles</th><th>Cell Δ</th><th>Status</th><th>Lifecycle</th><th>Action</th></tr></thead>
            <tbody>{visible.map((battery) => <tr key={battery.id}>
              <td><strong>{battery.id}</strong><small>{battery.model}</small></td>
              <td><strong>{hubName(battery.hubId)}</strong><small>{battery.droneId ?? "Hub inventory"}</small></td>
              <td><div className="battery-cell"><span><i style={{ width: `${battery.chargeLevelPct}%` }} /></span>{battery.chargeLevelPct}%</div></td>
              <td><StatusBadge tone={batteryHealthTone(battery.sohPct)}>{battery.sohPct}%</StatusBadge></td>
              <td>{battery.cycleCount} / {battery.maxCycles}</td>
              <td>{battery.maxCellVoltageDelta != null ? `${battery.maxCellVoltageDelta.toFixed(3)} V` : "—"}</td>
              <td><StatusBadge tone={batteryOperationalTone(battery.operationalStatus)}>{battery.operationalStatus}</StatusBadge></td>
              <td>{battery.administrativeStatus === "RETIRED" ? <StatusBadge tone="neutral">RETIRED</StatusBadge> : battery.retirementRecommended ? <StatusBadge tone="warning">REVIEW</StatusBadge> : <StatusBadge tone="success">ACTIVE</StatusBadge>}</td>
              <td><Link className="text-button" to={`/admin/network/batteries/${battery.id}`}>View health</Link></td>
            </tr>)}</tbody>
          </table>
        </div>
      </OperatorPanel>

      <Dialog open={Boolean(creating)} onOpenChange={(open) => !open && setCreating(null)}>
        {creating ? <DialogContent><form onSubmit={save}>
          <div className="border-b border-border p-5"><DialogTitle className="text-lg font-semibold">Register battery</DialogTitle><p className="mt-1 text-sm text-muted-foreground">Health metrics should come from BMS/System after registration.</p></div>
          <div className="fields two p-5">
            <label><span>Battery ID</span><input required placeholder="BAT-021" value={creating.id} onChange={(e) => setCreating({ ...creating, id: e.target.value })} /></label>
            <label><span>Model</span><input required value={creating.model} onChange={(e) => setCreating({ ...creating, model: e.target.value })} /></label>
            <label><span>Serial number</span><input required value={creating.serialNumber} onChange={(e) => setCreating({ ...creating, serialNumber: e.target.value })} /></label>
            <label><span>Initial hub</span><select value={creating.hubId} onChange={(e) => setCreating({ ...creating, hubId: e.target.value })}>{hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name}</option>)}</select></label>
            <label><span>Design capacity (mAh)</span><input required min={1} type="number" value={creating.designCapacityMah || ""} onChange={(e) => setCreating({ ...creating, designCapacityMah: Number(e.target.value) })} /></label>
            <label><span>Design energy (Wh)</span><input required min={1} step="0.1" type="number" value={creating.designEnergyWh || ""} onChange={(e) => setCreating({ ...creating, designEnergyWh: Number(e.target.value) })} /></label>
            <label><span>Maximum cycles</span><input required min={1} type="number" value={creating.maxCycles} onChange={(e) => setCreating({ ...creating, maxCycles: Number(e.target.value) })} /></label>
          </div>
          <div className="form-actions border-t border-border p-5"><ActionButton variant="secondary" onClick={() => setCreating(null)}>Cancel</ActionButton><ActionButton type="submit">Register battery</ActionButton></div>
        </form></DialogContent> : null}
      </Dialog>
    </AdminPageShell>
  );
}
