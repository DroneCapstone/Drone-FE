import { Link } from "react-router-dom";
import { MapPin, Plane, Plus, Minus, LocateFixed, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import "./HubDroneMap.css";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { OperatorPanel } from "../../operator/components/OperatorPanel";
import type { AdminDrone, AdminHub } from "../types";
import { droneTone, hubTone } from "../utils/adminDisplay";

maplibregl.setWorkerUrl(maplibreWorkerUrl);

type MapStyleChoice = "default" | "streets" | "satellite";

const MAPTILER_KEY = (import.meta.env.VITE_MAPTILER_API_KEY ?? "").trim();
const FALLBACK_CENTER: [number, number] = [106.7009, 10.7769];
const EXCLUDED_HUB_CODES = new Set(["HCM-04"]);

function mapStyleUrl(choice: MapStyleChoice) {
  const styleId = choice === "satellite" ? "hybrid-v4" : choice === "streets" ? "streets-v4" : "dataviz-v4-light";
  return `https://api.maptiler.com/maps/${styleId}/style.json?key=${encodeURIComponent(MAPTILER_KEY)}`;
}

function makeHubMarker(hub: AdminHub, droneCount: number, selected: boolean) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `admin-hub-network-marker${selected ? " is-selected" : ""}${hub.status !== "ACTIVE" ? " is-inactive" : ""}`;
  button.setAttribute("aria-label", `${hub.name}, ${droneCount} drones`);

  const pin = document.createElement("span");
  pin.className = "admin-hub-network-marker__pin";
  pin.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 21s-6-5.4-6-10a6 6 0 1 1 12 0c0 4.6-6 10-6 10Z"></path>
      <circle cx="12" cy="11" r="2.5"></circle>
    </svg>
  `;

  const label = document.createElement("span");
  label.className = "admin-hub-network-marker__label";
  label.innerHTML = `${hub.code} <span>· ${droneCount}</span>`;

  button.append(pin, label);
  return button;
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
  const [selectedHubId, setSelectedHubId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminHub["status"]>("all");
  const [mapStyle, setMapStyle] = useState<MapStyleChoice>("default");
  const [mapReady, setMapReady] = useState(false);

  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const visibleHubsRef = useRef<AdminHub[]>([]);

  const visibleHubs = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return hubs.filter((hub) => {
      if (EXCLUDED_HUB_CODES.has(hub.code)) return false;
      if (statusFilter !== "all" && hub.status !== statusFilter) return false;
      if (!keyword) return true;
      return `${hub.name} ${hub.code} ${hub.area} ${hub.address}`.toLowerCase().includes(keyword);
    });
  }, [hubs, query, statusFilter]);

  useEffect(() => {
    visibleHubsRef.current = visibleHubs;
    if (!selectedHubId || !visibleHubs.some((hub) => hub.id === selectedHubId)) {
      setSelectedHubId(visibleHubs[0]?.id ?? "");
    }
  }, [selectedHubId, visibleHubs]);

  const selectedHub = visibleHubs.find((hub) => hub.id === selectedHubId) ?? visibleHubs[0] ?? null;
  const selectedDrones = useMemo(
    () => (selectedHub ? drones.filter((drone) => drone.hubId === selectedHub.id) : []),
    [drones, selectedHub],
  );

  const fitVisibleHubs = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!visibleHubs.length) {
      map.flyTo({ center: FALLBACK_CENTER, zoom: 10, duration: 700 });
      return;
    }
    const bounds = new maplibregl.LngLatBounds();
    visibleHubs.forEach((hub) => bounds.extend([hub.longitude, hub.latitude]));
    map.fitBounds(bounds, { padding: 64, maxZoom: 13.4, duration: 700 });
  }, [visibleHubs]);

  const handleSelectHub = useCallback(
    (hub: AdminHub) => {
      setSelectedHubId(hub.id);
      onSelectHub?.(hub);
      const map = mapRef.current;
      if (map) {
        map.easeTo({ center: [hub.longitude, hub.latitude], zoom: Math.max(map.getZoom(), 12.6), duration: 500 });
      }
    },
    [onSelectHub],
  );

  useEffect(() => {
    if (!hostRef.current || mapRef.current || !MAPTILER_KEY) return;

    const map = new maplibregl.Map({
      container: hostRef.current,
      style: mapStyleUrl(mapStyle),
      center: FALLBACK_CENTER,
      zoom: 10,
      minZoom: 9,
      maxZoom: 18,
      attributionControl: false,
      cooperativeGestures: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;

    const onLoad = () => {
      setMapReady(true);
      const seeded = visibleHubsRef.current;
      if (seeded.length) {
        const bounds = new maplibregl.LngLatBounds();
        seeded.forEach((hub) => bounds.extend([hub.longitude, hub.latitude]));
        map.fitBounds(bounds, { padding: 64, maxZoom: 13.4, duration: 0 });
      }
    };
    map.on("load", onLoad);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !MAPTILER_KEY) return;
    setMapReady(false);
    map.setStyle(mapStyleUrl(mapStyle));
    map.once("style.load", () => setMapReady(true));
  }, [mapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    visibleHubs.forEach((hub) => {
      const hubDrones = drones.filter((drone) => drone.hubId === hub.id);
      const element = makeHubMarker(hub, hubDrones.length, selectedHub?.id === hub.id);
      element.addEventListener("click", () => handleSelectHub(hub));
      const marker = new maplibregl.Marker({ element, anchor: "bottom" })
        .setLngLat([hub.longitude, hub.latitude])
        .addTo(map);
      markersRef.current.set(hub.id, marker);
    });
  }, [drones, handleSelectHub, mapReady, selectedHub?.id, visibleHubs]);

  useEffect(() => {
    if (!mapReady) return;
    fitVisibleHubs();
  }, [fitVisibleHubs, mapReady, visibleHubs.length]);

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setMapStyle("default");
    window.requestAnimationFrame(() => fitVisibleHubs());
  };

  return (
    <OperatorPanel title="Hub network map" eyebrow="NETWORK MAP">
      <div className="admin-hub-network-map">
        <div className="admin-hub-network-map__toolbar">
          <div className="admin-hub-network-map__search">
            <MapPin size={16} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search hub ID or area..."
              aria-label="Search hub"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            aria-label="Filter hub status"
          >
            <option value="all">All hubs</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <select
            value={mapStyle}
            onChange={(event) => setMapStyle(event.target.value as MapStyleChoice)}
            aria-label="Map type"
          >
            <option value="default">Default map</option>
            <option value="streets">Streets</option>
            <option value="satellite">Satellite</option>
          </select>

          <div className="admin-hub-network-map__controls">
            <button type="button" onClick={() => mapRef.current?.zoomIn({ duration: 250 })} aria-label="Zoom in" title="Zoom in">
              <Plus size={16} />
            </button>
            <button type="button" onClick={() => mapRef.current?.zoomOut({ duration: 250 })} aria-label="Zoom out" title="Zoom out">
              <Minus size={16} />
            </button>
            <button type="button" onClick={fitVisibleHubs} aria-label="Fit all visible hubs" title="Fit all visible hubs">
              <LocateFixed size={16} />
            </button>
            <button type="button" onClick={resetFilters} aria-label="Reset map filters" title="Reset map filters">
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        <div className="admin-hub-network-map__body">
          <div className="admin-hub-network-map__map-panel">
            {MAPTILER_KEY ? (
              <div ref={hostRef} className="admin-hub-network-map__canvas" />
            ) : (
              <div className="admin-hub-network-map__canvas admin-hub-network-map__canvas--empty">
                <p>Map is unavailable because VITE_MAPTILER_API_KEY is not configured.</p>
              </div>
            )}
            {!visibleHubs.length ? (
              <div className="admin-hub-network-map__empty-state">No hubs match the current filters.</div>
            ) : null}
          </div>

          <aside className="admin-hub-network-map__detail">
            {selectedHub ? (
              <>
                <div className="admin-hub-network-map__detail-header">
                  <div>
                    <span className="admin-hub-network-map__eyebrow">SELECTED HUB</span>
                    <h3>{selectedHub.name}</h3>
                  </div>
                  <StatusBadge tone={hubTone(selectedHub.status)}>{selectedHub.status}</StatusBadge>
                </div>

                <div className="admin-hub-network-map__address-row">
                  <MapPin size={15} aria-hidden="true" />
                  <span>{selectedHub.address}</span>
                </div>

                <div className="admin-hub-network-map__stats">
                  <div>
                    <span>Assigned drones</span>
                    <strong>{selectedDrones.length}</strong>
                  </div>
                  <div>
                    <span>Hub capacity</span>
                    <strong>{selectedHub.capacity} <small>slots</small></strong>
                  </div>
                </div>

                <div className="admin-hub-network-map__list-header">
                  <strong>Assigned drones</strong>
                  <span>{selectedDrones.length} drones</span>
                </div>

                <div className="admin-hub-network-map__drone-list">
                  {selectedDrones.length ? (
                    selectedDrones.map((drone) => (
                      <div key={drone.id} className="admin-hub-network-map__drone-item">
                        <span className="admin-hub-network-map__drone-icon" aria-hidden="true">
                          <Plane size={14} />
                        </span>
                        <div className="admin-hub-network-map__drone-copy">
                          <strong>{drone.id}</strong>
                          <div>{drone.name}</div>
                          <small>{drone.model}</small>
                        </div>
                        <div className="admin-hub-network-map__drone-meta">
                          <StatusBadge tone={drone.isActive ? droneTone(drone.status) : "neutral"}>
                            {drone.isActive ? drone.status.replaceAll("_", " ") : "INACTIVE"}
                          </StatusBadge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="admin-hub-network-map__empty-copy">No drones assigned to this hub.</p>
                  )}
                </div>

                <Link className="admin-hub-network-map__detail-link" to={`/admin/network/hubs/${selectedHub.id}`}>
                  View Hub Detail
                </Link>
              </>
            ) : (
              <p className="admin-hub-network-map__empty-copy">Select a hub to view its details.</p>
            )}
          </aside>
        </div>
      </div>
    </OperatorPanel>
  );
}
