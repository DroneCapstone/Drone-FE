import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { ActionButton } from "../../../../components/ui/ActionButton";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { OperatorPanel } from "../../../operator/components/OperatorPanel";
import { AdminPageShell } from "../../components/AdminPageShell";
import { getAdminDrones, getAdminHubs, upsertAdminDrone } from "../../services/adminStore";
import { droneTone } from "../../utils/adminDisplay";

export function DroneDetailPage() {
  const { droneId } = useParams();
  const initial = getAdminDrones().find((item) => item.id === droneId);
  const [drone, setDrone] = useState(initial);
  const [saved, setSaved] = useState(false);
  if (!drone) return <Navigate to="/admin/network/drones" replace />;
  const hubs = getAdminHubs();
  const hubName = hubs.find((hub) => hub.id === drone.hubId)?.name ?? "—";

  const save = () => {
    upsertAdminDrone({ ...drone, updatedAt: new Date().toISOString() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const toggleActive = () => {
    if (drone.status === "IN_FLIGHT" && drone.isActive) return;
    const next = { ...drone, isActive: !drone.isActive, updatedAt: new Date().toISOString() };
    setDrone(next);
    upsertAdminDrone(next);
  };

  return (
    <AdminPageShell title={drone.id} description={`${drone.model} · ${hubName}`} actions={<ActionButton variant={drone.isActive ? "danger" : "secondary"} onClick={toggleActive} disabled={drone.status === "IN_FLIGHT" && drone.isActive}>{drone.isActive ? "Deactivate" : "Activate"}</ActionButton>}>
      <div className="detail-grid">
        <OperatorPanel title="Current state" eyebrow="READ ONLY STATUS">
          <div className="detail-list">
            <span><small>Operational status</small><StatusBadge tone={droneTone(drone.status)}>{drone.status.replace("_", " ")}</StatusBadge></span>
            <span><small>Administrative state</small><StatusBadge tone={drone.isActive ? "success" : "neutral"}>{drone.isActive ? "ACTIVE" : "INACTIVE"}</StatusBadge></span>
            <span><small>Battery level</small><strong>{drone.batteryPct}%</strong></span>
            <span><small>Installed battery</small><strong>{drone.installedBatteryId ?? "—"}</strong></span>
          </div>
        </OperatorPanel>
        <OperatorPanel title="Maintenance" eyebrow="TECHNICIAN OWNED">
          <div className="detail-list">
            <span><small>Last maintenance</small><strong>{drone.lastMaintenanceAt ? new Date(drone.lastMaintenanceAt).toLocaleString("en-GB") : "—"}</strong></span>
            <span><small>Next maintenance</small><strong>{drone.nextMaintenanceAt ? new Date(drone.nextMaintenanceAt).toLocaleString("en-GB") : "—"}</strong></span>
          </div>
        </OperatorPanel>
      </div>

      <OperatorPanel title="Drone master data" eyebrow="ADMIN EDITABLE">
        <div className="fields two">
          <label><span>Drone name</span><input value={drone.name} onChange={(e) => setDrone({ ...drone, name: e.target.value })} /></label>
          <label><span>Model</span><input value={drone.model} onChange={(e) => setDrone({ ...drone, model: e.target.value })} /></label>
          <label><span>Serial number</span><input value={drone.serialNumber} onChange={(e) => setDrone({ ...drone, serialNumber: e.target.value })} /></label>
          <label><span>Maximum payload (kg)</span><input type="number" min={0} step="0.1" value={drone.maxPayloadKg} onChange={(e) => setDrone({ ...drone, maxPayloadKg: Number(e.target.value) })} /></label>
          <label><span>Assigned hub</span><select value={drone.hubId} onChange={(e) => setDrone({ ...drone, hubId: e.target.value })} disabled={drone.status === "IN_FLIGHT"}>{hubs.map((hub) => <option value={hub.id} key={hub.id}>{hub.name}</option>)}</select></label>
        </div>
        <div className="form-actions"><span className="text-sm text-[var(--green)]">{saved ? "Changes saved." : ""}</span><ActionButton onClick={save}>Save changes</ActionButton></div>
      </OperatorPanel>
    </AdminPageShell>
  );
}
