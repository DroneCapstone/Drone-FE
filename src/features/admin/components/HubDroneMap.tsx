import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Plane, RotateCcw, Search } from "lucide-react";
import type { AdminDrone, AdminHub } from "../types";
import "./HubDroneMap.css";

/**
 * Administrative overview (not a live tracking map).
 * Hub locations use the stored latitude/longitude. The street drawing is a
 * schematic background only; it is NOT a georeferenced street-tile layer.
 */
const HIDDEN_DEMO_HUB_CODE = "HCM-04";

const statusLabel: Record<AdminDrone["status"], string> = {
  AVAILABLE: "Available",
  MAINTENANCE: "Maintenance",
  IN_FLIGHT: "In flight",
};

function validCoordinates(hub: AdminHub) {
  return Number.isFinite(hub.latitude) && Number.isFinite(hub.longitude)
    && Math.abs(hub.latitude) <= 90 && Math.abs(hub.longitude) <= 180;
}

function getBounds(hubs: AdminHub[]) {
  const valid = hubs.filter(validCoordinates);
  if (!valid.length) return null;
  const lats = valid.map((hub) => hub.latitude);
  const lngs = valid.map((hub) => hub.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latPadding = Math.max((maxLat - minLat) * 0.12, 0.015);
  const lngPadding = Math.max((maxLng - minLng) * 0.12, 0.015);
  return {
    minLat: minLat - latPadding,
    maxLat: maxLat + latPadding,
    minLng: minLng - lngPadding,
    maxLng: maxLng + lngPadding,
  };
}

function getPosition(hub: AdminHub, bounds: NonNullable<ReturnType<typeof getBounds>>) {
  const x = (hub.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng);
  const y = (bounds.maxLat - hub.latitude) / (bounds.maxLat - bounds.minLat);
  return {
    left: `${9 + Math.max(0, Math.min(1, x)) * 82}%`,
    top: `${10 + Math.max(0, Math.min(1, y)) * 73}%`,
  };
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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [selectedHubId, setSelectedHubId] = useState<string>("");

  // Hide the duplicate HCM-04 / Binh Thanh from the MAP only.
  // The original hub remains unchanged in Admin Store and Hubs table.
  const mapHubs = useMemo(
    () => hubs.filter((hub) => hub.code.toUpperCase() !== HIDDEN_DEMO_HUB_CODE),
    [hubs],
  );

  const visibleHubs = useMemo(() => {
    const text = query.trim().toLocaleLowerCase();
    return mapHubs.filter((hub) => {
      const matchesStatus = statusFilter === "ALL" || hub.status === statusFilter;
      const matchesSearch = !text || [hub.code, hub.name, hub.area, hub.address]
        .some((field) => field.toLocaleLowerCase().includes(text));
      return matchesStatus && matchesSearch;
    });
  }, [mapHubs, query, statusFilter]);

  const selected = visibleHubs.find((hub) => hub.id === selectedHubId) ?? visibleHubs[0];
  const selectedDrones = useMemo(
    () => selected ? drones.filter((drone) => drone.hubId === selected.id) : [],
    [drones, selected],
  );
  const bounds = useMemo(() => getBounds(mapHubs), [mapHubs]);
  const mapHubsWithCoordinates = visibleHubs.filter(validCoordinates);

  const selectHub = (hub: AdminHub) => {
    setSelectedHubId(hub.id);
    onSelectHub?.(hub);
  };

  const reset = () => {
    setQuery("");
    setStatusFilter("ALL");
    setSelectedHubId("");
  };

  return (
    <section className="admin-hub-network-map" aria-label="Hub network map">
      <div className="admin-hub-network-map__header">
        <span className="admin-hub-network-map__eyebrow">NETWORK MAP</span>
        <h2>Hub network map</h2>
        <p>Hub locations and assigned fleet overview</p>
      </div>

      <div className="admin-hub-network-map__card">
        <div className="admin-hub-network-map__toolbar">
          <label className="admin-hub-network-map__search">
            <Search size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="sr-only">Search hubs</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search hub ID or area..."
              aria-label="Search hub ID or area"
            />
          </label>
          <select
            aria-label="Filter hub status on map"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
          >
            <option value="ALL">All hubs</option>
            <option value="ACTIVE">Active hubs</option>
            <option value="INACTIVE">Inactive hubs</option>
          </select>
          <button type="button" className="admin-hub-network-map__reset" onClick={reset}>
            <RotateCcw size={14} aria-hidden="true" /> Reset
          </button>
        </div>

        <div className="admin-hub-network-map__columns">
          <div className="admin-hub-network-map__canvas" aria-label="Schematic map of registered hub coordinates">
            <svg className="admin-hub-network-map__terrain" viewBox="0 0 800 510" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <rect width="800" height="510" fill="#F1F3F3" />
              <path d="M650 -40C565 40 590 110 540 165S490 270 550 325 615 410 563 545" stroke="#E1EDF0" strokeWidth="82" fill="none" />
              <path d="M650 -40C565 40 590 110 540 165S490 270 550 325 615 410 563 545" stroke="#D8E8EC" strokeWidth="59" fill="none" />
              <g fill="#E7EBDF" opacity=".65">
                <path d="M42 38h115v89H42zM243 42h78v102h-78zM90 312h112v91H90zM346 365h90v87h-90zM675 127h105v140H675z" />
              </g>
              <g stroke="#FFFFFF" fill="none" strokeWidth="14" opacity=".96">
                <path d="M-30 83L300 180 600 155 825 78" />
                <path d="M-35 380L235 255 457 302 830 434" />
                <path d="M78 -30L210 212 260 520" />
                <path d="M385 -40L407 207 292 536" />
                <path d="M733 -30L682 174 755 539" />
                <path d="M-25 245L808 250" />
                <path d="M80 515L495 -30" />
              </g>
              <g stroke="#DCE1E3" fill="none" strokeWidth="1.5" opacity=".88">
                <path d="M-30 83L300 180 600 155 825 78" />
                <path d="M-35 380L235 255 457 302 830 434" />
                <path d="M78 -30L210 212 260 520" />
                <path d="M385 -40L407 207 292 536" />
                <path d="M733 -30L682 174 755 539" />
                <path d="M-25 245L808 250" />
                <path d="M80 515L495 -30" />
              </g>
              <g stroke="#FFFFFF" strokeWidth="5" opacity=".85" fill="none">
                <path d="M7 25L195 470M115 15L450 100M16 150L385 436M235 -20L56 500M335 -50L690 480M20 470L600 78M680 30L790 340M415 512L540 370" />
                <path d="M-10 310L445 28M102 101L760 360M405 19L700 492M176 490L385 84M-10 450L555 235" />
              </g>
              <g stroke="#E0E5E7" strokeWidth="2" opacity=".68" fill="none">
                <path d="M7 25L195 470M115 15L450 100M16 150L385 436M235 -20L56 500M335 -50L690 480M20 470L600 78M680 30L790 340M415 512L540 370" />
                <path d="M-10 310L445 28M102 101L760 360M405 19L700 492M176 490L385 84M-10 450L555 235" />
              </g>
            </svg>

            {/* <div className="admin-hub-network-map__canvas-note">Select a hub to view its assets</div> */}

            {bounds && mapHubsWithCoordinates.map((hub) => {
              const count = drones.filter((drone) => drone.hubId === hub.id).length;
              const isSelected = selected?.id === hub.id;
              return (
                <button
                  key={hub.id}
                  type="button"
                  className={`admin-hub-network-map__pin${isSelected ? " is-selected" : ""}${hub.status === "INACTIVE" ? " is-inactive" : ""}`}
                  style={getPosition(hub, bounds)}
                  aria-label={`${hub.name}, ${count} assigned drones, ${hub.status.toLowerCase()}`}
                  aria-pressed={isSelected}
                  onClick={() => selectHub(hub)}
                >
                  <span className="admin-hub-network-map__pin-circle">
                    <MapPin size={18} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <span className="admin-hub-network-map__pin-label">
                    {hub.code} <span>· {count}</span>
                  </span>
                </button>
              );
            })}

            {visibleHubs.length === 0 && (
              <div className="admin-hub-network-map__map-empty">No matching hubs found.</div>
            )}
            {visibleHubs.length > 0 && mapHubsWithCoordinates.length === 0 && (
              <div className="admin-hub-network-map__map-empty">No valid hub coordinates to display.</div>
            )}

            {/* <div className="admin-hub-network-map__map-footer">
              <span>Pin labels show assigned drone counts</span>
              <span>Schematic background</span>
            </div> */}
          </div>

          <aside className="admin-hub-network-map__aside">
            {selected ? (
              <>
                <div className="admin-hub-network-map__hub-heading">
                  <div className="admin-hub-network-map__hub-heading-text">
                    <span className="admin-hub-network-map__eyebrow">SELECTED HUB</span>
                    <h3>{selected.name}</h3>
                    <p>{selected.area}</p>
                  </div>
                  <span className={`admin-hub-network-map__status${selected.status === "INACTIVE" ? " is-inactive" : ""}`}>
                    {selected.status}
                  </span>
                </div>
                <div className="admin-hub-network-map__address">
                  <MapPin size={15} strokeWidth={1.9} aria-hidden="true" />
                  <span>{selected.address}</span>
                </div>

                <div className="admin-hub-network-map__metrics">
                  <div><span>Assigned drones</span><strong>{selectedDrones.length}</strong></div>
                  <div><span>Hub capacity</span><strong>{selected.capacity} <small>slots</small></strong></div>
                </div>

                <div className="admin-hub-network-map__list-heading">
                  <strong>Assigned drones</strong>
                  <span>{selectedDrones.length} drones</span>
                </div>
                <div className="admin-hub-network-map__drone-list">
                  {selectedDrones.length ? selectedDrones.map((drone) => (
                    <div className="admin-hub-network-map__drone" key={drone.id}>
                      <span className="admin-hub-network-map__drone-icon"><Plane size={15} strokeWidth={1.8} aria-hidden="true" /></span>
                      <div className="admin-hub-network-map__drone-copy">
                        <div className="admin-hub-network-map__drone-first-line">
                          <strong>{drone.id}</strong>
                          <span>{drone.isActive ? statusLabel[drone.status] : "Inactive"}</span>
                        </div>
                        <span className="admin-hub-network-map__drone-model">{drone.model}</span>
                      </div>
                    </div>
                  )) : (
                    <p className="admin-hub-network-map__drone-empty">No drones assigned to this hub.</p>
                  )}
                </div>
                <Link className="admin-hub-network-map__view-detail" to={`/admin/network/hubs/${encodeURIComponent(selected.id)}`}>
                  View Hub Detail
                </Link>
              </>
            ) : (
              <p className="admin-hub-network-map__aside-empty">No hubs match the current filters.</p>
            )}
          </aside>
        </div>
        {/* <div className="admin-hub-network-map__footnote">
          Hub positions are calculated from saved coordinates; the background is schematic and does not show live drone locations.
          <span> {visibleHubs.length} of {mapHubs.length} hubs shown</span>
        </div> */}
      </div>
    </section>
  );
}
