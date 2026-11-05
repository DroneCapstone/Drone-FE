import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Boxes, MapPin, UsersRound } from "lucide-react";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { AdminPageShell } from "../../components/AdminPageShell";
import { getAdminBatteries, getAdminDrones, getAdminHubs, getAdminUsers } from "../../services/adminStore";
import { hubTone } from "../../utils/adminDisplay";
import "./HubDetailPage.css";

/** Administrative Hub overview. The technician and asset statuses are read-only. */
export function HubDetailPage() {
  const { hubId } = useParams();
  const [selectedAsset, setSelectedAsset] = useState<"drones" | "batteries">("drones");
  const [, setVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setVersion((previous) => previous + 1);
    window.addEventListener("admin-data-updated", refresh);
    return () => window.removeEventListener("admin-data-updated", refresh);
  }, []);

  const hub = getAdminHubs().find((item) => item.id === hubId);
  if (!hub) return <Navigate to="/admin/network/hubs" replace />;

  const drones = getAdminDrones().filter((drone) => drone.hubId === hub.id);
  const batteries = getAdminBatteries().filter((battery) => battery.hubId === hub.id);
  const technician = getAdminUsers().find((user) => user.role === "technician" && user.hubId === hub.id);
  const updatedAt = new Date(hub.updatedAt);
  const updatedText = Number.isNaN(updatedAt.getTime()) ? "—" : updatedAt.toLocaleString("en-GB");
  const items = selectedAsset === "drones" ? drones : batteries;

  return (
    <AdminPageShell
      title={hub.name}
      breadcrumbLabel="Hubs"
      description=""
      actions={<StatusBadge tone={hubTone(hub.status)}>{hub.status}</StatusBadge>}
    >
      <div className="admin-hub-detail">
        <section className="admin-hub-section" aria-labelledby="admin-hub-info-heading">
          <h2 className="admin-hub-section-title" id="admin-hub-info-heading">
            <MapPin size={17} strokeWidth={1.9} aria-hidden="true" />
            Hub information
          </h2>

          <div className="admin-hub-info-grid">
            <div className="admin-hub-info-column">
              <div className="admin-hub-info-row">
                <span className="admin-hub-info-label">Address</span>
                <strong>{hub.address}</strong>
              </div>
              <div className="admin-hub-info-row">
                <span className="admin-hub-info-label">Capacity</span>
                <strong>{hub.capacity} drone slots</strong>
              </div>
            </div>
            <div className="admin-hub-info-column">
              <div className="admin-hub-info-row">
                <span className="admin-hub-info-label">Coordinates</span>
                <strong>{hub.latitude.toFixed(4)}, {hub.longitude.toFixed(4)}</strong>
              </div>
              <div className="admin-hub-info-row">
                <span className="admin-hub-info-label">Last updated</span>
                <strong>{updatedText}</strong>
              </div>
            </div>
          </div>

          <div className="admin-hub-technician-row">
            <UsersRound size={17} strokeWidth={1.9} aria-hidden="true" />
            <span className="admin-hub-technician-label">Assigned technician</span>
            <div className="admin-hub-technician-person">
              {technician ? (
                <>
                  <strong>{technician.fullName}</strong>
                  <span className="admin-hub-technician-separator" aria-hidden="true">·</span>
                  <span className="admin-hub-technician-email">{technician.email}</span>
                </>
              ) : (
                <span className="admin-hub-technician-email">Not assigned</span>
              )}
            </div>
          </div>
        </section>

        <section className="admin-hub-section" aria-labelledby="admin-hub-assets-heading">
          <div className="admin-hub-assets-header">
            <h2 className="admin-hub-section-title" id="admin-hub-assets-heading">
              <Boxes size={17} strokeWidth={1.9} aria-hidden="true" />
              Assigned assets
            </h2>
            <div className="admin-hub-switch" role="tablist" aria-label="Assigned asset type">
              <span
                className={`admin-hub-switch-indicator${selectedAsset === "batteries" ? " is-right" : ""}`}
                aria-hidden="true"
              />
              <button
                type="button"
                role="tab"
                id="admin-hub-drones-tab"
                aria-selected={selectedAsset === "drones"}
                aria-controls="admin-hub-assets-panel"
                tabIndex={selectedAsset === "drones" ? 0 : -1}
                className={selectedAsset === "drones" ? "is-active" : ""}
                onClick={() => setSelectedAsset("drones")}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                    event.preventDefault();
                    setSelectedAsset("batteries");
                    document.getElementById("admin-hub-batteries-tab")?.focus();
                  }
                }}
              >Drones ({drones.length})</button>
              <button
                type="button"
                role="tab"
                id="admin-hub-batteries-tab"
                aria-selected={selectedAsset === "batteries"}
                aria-controls="admin-hub-assets-panel"
                tabIndex={selectedAsset === "batteries" ? 0 : -1}
                className={selectedAsset === "batteries" ? "is-active" : ""}
                onClick={() => setSelectedAsset("batteries")}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                    event.preventDefault();
                    setSelectedAsset("drones");
                    document.getElementById("admin-hub-drones-tab")?.focus();
                  }
                }}
              >Batteries ({batteries.length})</button>
            </div>
          </div>

          <div
            key={selectedAsset}
            className="admin-hub-assets-table-wrap"
            id="admin-hub-assets-panel"
            role="tabpanel"
            aria-labelledby={selectedAsset === "drones" ? "admin-hub-drones-tab" : "admin-hub-batteries-tab"}
            tabIndex={0}
          >
            <table className="admin-hub-assets-table">
              <thead>
                <tr>
                  <th scope="col">Asset ID</th>
                  <th scope="col">Model</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedAsset === "drones"
                  ? drones.map((drone) => (
                    <tr key={drone.id}>
                      <td className="admin-hub-asset-id">{drone.id}</td>
                      <td>{drone.model}</td>
                      <td>{drone.status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</td>
                      <td><Link to={`/admin/network/drones/${encodeURIComponent(drone.id)}`}>View</Link></td>
                    </tr>
                  ))
                  : batteries.map((battery) => (
                    <tr key={battery.id}>
                      <td className="admin-hub-asset-id">{battery.id}</td>
                      <td>{battery.model}</td>
                      <td>{battery.operationalStatus.toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</td>
                      <td><Link to={`/admin/network/batteries/${encodeURIComponent(battery.id)}`}>View</Link></td>
                    </tr>
                  ))}
                {items.length === 0 && (
                  <tr><td colSpan={4} className="admin-hub-assets-empty">No {selectedAsset} assigned to this hub.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="admin-hub-assets-footer">
            Showing {items.length} of {items.length} {selectedAsset}
          </div>
        </section>
      </div>
    </AdminPageShell>
  );
}
