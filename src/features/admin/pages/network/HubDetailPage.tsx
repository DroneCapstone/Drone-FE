import { Navigate, useParams } from "react-router-dom";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { OperatorPanel } from "../../../operator/components/OperatorPanel";
import { AdminPageShell } from "../../components/AdminPageShell";
import { getAdminBatteries, getAdminDrones, getAdminHubs, getAdminUsers } from "../../services/adminStore";
import { hubTone } from "../../utils/adminDisplay";

export function HubDetailPage() {
  const { hubId } = useParams();
  const hub = getAdminHubs().find((item) => item.id === hubId);
  if (!hub) return <Navigate to="/admin/network/hubs" replace />;
  const drones = getAdminDrones().filter((drone) => drone.hubId === hub.id);
  const batteries = getAdminBatteries().filter((battery) => battery.hubId === hub.id);
  const technicians = getAdminUsers().filter((user) => user.role === "technician" && user.hubId === hub.id);

  return (
    <AdminPageShell title={hub.name} description={`${hub.code} · ${hub.area}`}>
      <div className="detail-grid">
        <OperatorPanel title="Hub information" eyebrow="MASTER DATA">
          <div className="detail-list">
            <span><small>Status</small><StatusBadge tone={hubTone(hub.status)}>{hub.status}</StatusBadge></span>
            <span><small>Address</small><strong>{hub.address}</strong></span>
            <span><small>Coordinates</small><strong>{hub.latitude.toFixed(4)}, {hub.longitude.toFixed(4)}</strong></span>
            <span><small>Capacity</small><strong>{hub.capacity} drone slots</strong></span>
            <span><small>Updated</small><strong>{new Date(hub.updatedAt).toLocaleString("en-GB")}</strong></span>
          </div>
        </OperatorPanel>
        <OperatorPanel title="Asset summary" eyebrow="READ ONLY">
          <div className="detail-list">
            <span><small>Drones</small><strong>{drones.length}</strong></span>
            <span><small>Batteries</small><strong>{batteries.length}</strong></span>
            <span><small>Technicians</small><strong>{technicians.length}</strong></span>
          </div>
        </OperatorPanel>
      </div>

      <div className="dashboard-grid lower">
        <OperatorPanel title="Assigned technicians" eyebrow="USER MANAGEMENT">
          <div className="list-stack">
            {technicians.length ? technicians.map((tech) => <span key={tech.id}><strong>{tech.fullName}</strong><small>{tech.email}</small></span>) : <p className="operator-empty-state">No technician assigned.</p>}
          </div>
        </OperatorPanel>
        <OperatorPanel title="Current assets" eyebrow="HUB INVENTORY">
          <div className="detail-list">
            <span><small>Available drones</small><strong>{drones.filter((d) => d.status === "AVAILABLE" && d.isActive).length}</strong></span>
            <span><small>Maintenance drones</small><strong>{drones.filter((d) => d.status === "MAINTENANCE").length}</strong></span>
            <span><small>Ready batteries</small><strong>{batteries.filter((b) => b.operationalStatus === "READY").length}</strong></span>
          </div>
        </OperatorPanel>
      </div>
    </AdminPageShell>
  );
}
