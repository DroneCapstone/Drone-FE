import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { customerApi } from "../services/customerApi";

const MAPTILER_KEY = (import.meta.env.VITE_MAPTILER_API_KEY ?? "").trim();
const STYLE_URL = `https://api.maptiler.com/maps/streets-v4-dark/style.json?key=${encodeURIComponent(MAPTILER_KEY)}`;
const POSITION_POLL_MS = 4000;
const ROUTE_POLL_MS = 15000;
const MAX_FAILURES = 3;
const MOVE_MS = 1000;

type LngLat = [number, number];
type LivePosition = Awaited<ReturnType<typeof customerApi.getLivePosition>>;
interface RouteData {
  origin: LngLat | null;
  destination: LngLat | null;
  planned: LngLat[];
  trail: LngLat[];
  deliveryStatus: string;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const pt = (p: unknown): LngLat | null => {
  const o = p as { latitude?: unknown; longitude?: unknown } | null | undefined;
  const lat = num(o?.latitude);
  const lng = num(o?.longitude);
  return lat !== null && lng !== null ? [lng, lat] : null;
};
const pts = (list: unknown): LngLat[] =>
  Array.isArray(list) ? list.map(pt).filter((p): p is LngLat => p !== null) : [];

function parseRoute(raw: unknown): RouteData {
  const r = (raw ?? {}) as Record<string, unknown>;
  const origin = pt(r.origin);
  const destination = pt(r.destination);
  const legs = Array.isArray(r.legs) ? (r.legs as Array<Record<string, unknown>>) : [];
  const planned: LngLat[] = [];
  if (origin) planned.push(origin);
  for (const leg of legs) {
    const to = pt(leg.to_hub);
    if (to) planned.push(to);
  }
  if (destination) {
    const last = planned[planned.length - 1];
    if (!last || last[0] !== destination[0] || last[1] !== destination[1]) planned.push(destination);
  }
  const trail = pts(r.trail);
  return {
    origin,
    destination,
    planned,
    trail: trail.length ? trail : pts(r.travelled_path),
    deliveryStatus: String(r.delivery_status ?? ""),
  };
}

function formatEta(sec: number | null): string {
  if (sec === null || sec < 0) return "--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function setLine(map: MapLibreMap, id: string, coords: LngLat[], color: string, dashed: boolean) {
  const data: GeoJSON.Feature = {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: coords.length >= 2 ? coords : [] },
  };
  const src = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
  if (src) {
    src.setData(data);
    return;
  }
  map.addSource(id, { type: "geojson", data });
  map.addLayer({
    id,
    type: "line",
    source: id,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": color, "line-width": 4, ...(dashed ? { "line-dasharray": [2, 2], "line-opacity": 0.7 } : {}) },
  });
}

function dot(color: string, label: string) {
  const el = document.createElement("div");
  el.title = label;
  el.style.cssText = `width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 0 0 3px rgba(0,0,0,.35)`;
  return el;
}

export default function CustomerLiveMap({ orderId, active }: { orderId: string; active: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<{ origin?: Marker; dest?: Marker; drone?: Marker }>({});
  const animRef = useRef<number>(0);
  const fittedRef = useRef(false);
  const routeRef = useRef<RouteData | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [route, setRoute] = useState<RouteData | null>(null);
  const [live, setLive] = useState<LivePosition | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);

  const status = route?.deliveryStatus.toLowerCase() ?? "";
  // Backend codes: DELIVERED, ARRIVED_AT_HUB (final); IN_DELIVERY is still in flight.
  const finished = /^(delivered|arrived_at_hub)$/.test(status) || /^(mission[ _])?completed$/i.test((live?.mission_status ?? "").trim());
  const flying = !!live?.is_flying;
  const dispatched = flying || finished || !!live?.mission_id;
  const showMap = !loaded || dispatched;

  // Create map once.
  useEffect(() => {
    if (!active || !MAPTILER_KEY || !showMap || !host.current) return;
    const map = new maplibregl.Map({ container: host.current, style: STYLE_URL, center: [106.78, 10.83], zoom: 9 });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => setMapReady(true));
    map.on("error", (e) => {
      if (/401|403|unauthoriz|forbidden|api key/i.test(String(e.error?.message ?? "")))
        setMapError("Unable to load the map. Check the MapTiler API key and allowed origins.");
    });
    const markers = markersRef.current;
    return () => {
      cancelAnimationFrame(animRef.current);
      markers.origin?.remove();
      markers.dest?.remove();
      markers.drone?.remove();
      markersRef.current = {};
      map.remove();
      mapRef.current = null;
      fittedRef.current = false;
      setMapReady(false);
    };
  }, [active, showMap]);

  const loadRoute = useCallback(async () => {
    try {
      const next = parseRoute(await customerApi.getOrderTracking(orderId));
      routeRef.current = next;
      setRoute(next);
    } catch {
      /* keep last route */
    }
  }, [orderId]);

  // Initial fetch of route + position.
  useEffect(() => {
    if (!active) return;
    let stop = false;
    (async () => {
      await loadRoute();
      try {
        const p = await customerApi.getLivePosition(orderId);
        if (!stop) setLive(p);
      } catch {
        /* handled by polling */
      }
      if (!stop) setLoaded(true);
    })();
    return () => {
      stop = true;
    };
  }, [active, orderId, loadRoute]);

  // Polling while flying.
  useEffect(() => {
    if (!active || !flying) return;
    let stop = false;
    let failures = 0;
    let posTimer: number | undefined;
    let routeTimer: number | undefined;
    const visible = () => document.visibilityState === "visible";
    const tickPos = async () => {
      if (stop) return;
      if (visible()) {
        try {
          const p = await customerApi.getLivePosition(orderId);
          if (stop) return;
          failures = 0;
          setLive(p);
          if (!p.is_flying) {
            void loadRoute();
            return;
          }
        } catch {
          failures += 1;
          if (failures >= MAX_FAILURES) {
            setGaveUp(true);
            return;
          }
        }
      }
      posTimer = window.setTimeout(tickPos, POSITION_POLL_MS);
    };
    const tickRoute = async () => {
      if (stop) return;
      if (visible()) await loadRoute();
      if (!stop) routeTimer = window.setTimeout(tickRoute, ROUTE_POLL_MS);
    };
    const onVisible = () => {
      if (visible() && !stop && !gaveUp) {
        window.clearTimeout(posTimer);
        void tickPos();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    posTimer = window.setTimeout(tickPos, POSITION_POLL_MS);
    routeTimer = window.setTimeout(tickRoute, ROUTE_POLL_MS);
    return () => {
      stop = true;
      window.clearTimeout(posTimer);
      window.clearTimeout(routeTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, flying, orderId, loadRoute, gaveUp]);

  // Draw route, hubs, trail.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !route) return;
    const m = markersRef.current;
    if (route.origin) {
      if (!m.origin) m.origin = new maplibregl.Marker({ element: dot("#22c55e", "Origin hub") }).setLngLat(route.origin).addTo(map);
      else m.origin.setLngLat(route.origin);
    }
    if (route.destination) {
      if (!m.dest) m.dest = new maplibregl.Marker({ element: dot("#ef4444", "Destination") }).setLngLat(route.destination).addTo(map);
      else m.dest.setLngLat(route.destination);
    }
    setLine(map, "customer-route", route.planned, "#9ca3af", true);
    setLine(map, "customer-trail", route.trail, "#f97316", false);
    if (!fittedRef.current) {
      const b = new maplibregl.LngLatBounds();
      let n = 0;
      for (const p of [...route.planned, ...route.trail]) {
        b.extend(p);
        n++;
      }
      if (n > 0) {
        map.fitBounds(b, { padding: 50, maxZoom: 15, duration: 0 });
        fittedRef.current = true;
      }
    }
  }, [route, mapReady]);

  // Move drone marker smoothly.
  useEffect(() => {
    const map = mapRef.current;
    const lat = num(live?.latitude);
    const lng = num(live?.longitude);
    if (!map || !mapReady || lat === null || lng === null || finished) return;
    const target: LngLat = [lng, lat];
    const m = markersRef.current;
    if (!m.drone) {
      const el = dot("#f97316", "Drone");
      el.style.width = "18px";
      el.style.height = "18px";
      m.drone = new maplibregl.Marker({ element: el }).setLngLat(target).addTo(map);
      if (!fittedRef.current) {
        map.easeTo({ center: target, zoom: 13, duration: 0 });
      } else {
        const b = new maplibregl.LngLatBounds(target, target);
        for (const p of routeRef.current?.planned ?? []) b.extend(p);
        map.fitBounds(b, { padding: 50, maxZoom: 15, duration: 0 });
      }
      return;
    }
    const from = m.drone.getLngLat();
    const start = performance.now();
    cancelAnimationFrame(animRef.current);
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / MOVE_MS);
      m.drone?.setLngLat([from.lng + (target[0] - from.lng) * t, from.lat + (target[1] - from.lat) * t]);
      if (t < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
  }, [live, mapReady, finished]);

  if (!active) return null;

  const box = "rounded-2xl border border-white/[0.10] bg-[#161217]/95 p-5 sm:p-6";
  const label = (
    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-500">Live tracking</p>
  );

  if (!MAPTILER_KEY)
    return (
      <section className={box}>
        {label}
        <p className="mt-3 text-sm text-white/60">Map unavailable: MapTiler key is not configured.</p>
      </section>
    );

  if (!showMap)
    return (
      <section className={box}>
        {label}
        <p className="mt-3 text-sm text-white/60">Live map will appear when your drone takes off.</p>
      </section>
    );

  const speedKmh = num(live?.speed_mps) !== null ? ((live!.speed_mps as number) * 3.6).toFixed(0) : "--";
  const alt = num(live?.altitude_m) !== null ? `${Math.round(live!.altitude_m as number)} m` : "--";
  const battery = num(live?.battery_pct) !== null ? `${Math.round(live!.battery_pct as number)}%` : "--";
  const updated = live?.last_update ? new Date(live.last_update).toLocaleTimeString() : "--";

  return (
    <section className={box}>
      {label}
      <div className="relative mt-4 h-[320px] overflow-hidden rounded-xl border border-white/[0.08]">
        <div ref={host} className="h-full w-full" />
        {mapError && (
          <p className="absolute inset-x-3 top-3 rounded-lg bg-black/70 p-2 text-xs text-amber-200">{mapError}</p>
        )}
      </div>
      {finished ? (
        <p className="mt-3 text-sm text-white/60">Delivery complete. Final route shown.</p>
      ) : (
        <>
          <p className="mt-3 text-sm font-semibold text-white">{live?.status_label ?? "Waiting for position"}</p>
          <dl className="mt-2 grid grid-cols-2 gap-3 text-xs text-white/60 sm:grid-cols-5">
            <div><dt>Speed</dt><dd className="text-white">{speedKmh} km/h</dd></div>
            <div><dt>Altitude</dt><dd className="text-white">{alt}</dd></div>
            <div><dt>Battery</dt><dd className="text-white">{battery}</dd></div>
            <div><dt>ETA</dt><dd className="text-white">{formatEta(num(live?.eta_sec))}</dd></div>
            <div><dt>Updated</dt><dd className="text-white">{updated}</dd></div>
          </dl>
          {gaveUp && (
            <p className="mt-2 text-xs text-amber-200">Live updates paused. Refresh the page to retry.</p>
          )}
        </>
      )}
    </section>
  );
}
