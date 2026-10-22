import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
// Vite bundles the MapLibre v6 worker as a self-contained asset.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { Map as MapLibreMap, Marker, Popup } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { LiveTrackingDrone, MissionHubSummary, MissionTelemetryPoint } from '../../api/missionApi';
import './live-maptiler.css';

// Must be set before constructing the first Map (including React Strict Mode remounts).
maplibregl.setWorkerUrl(maplibreWorkerUrl);

export interface LiveMapTilerHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fitAll: () => void;
  togglePitch: () => void;
  focus: (missionId: string) => void;
}

type Props = {
  hubs: MissionHubSummary[];
  drones: LiveTrackingDrone[];
  histories: Record<string, MissionTelemetryPoint[]>;
  selectedMissionId?: string;
  onSelectMission: (missionId: string) => void;
};

type Point = [number, number];
type MovingMarker = {
  marker: Marker;
  element: HTMLElement;
  popup: Popup;
  /** Most recent accepted real GPS fix; do not confuse with animated position. */
  position: Point;
  lastFixAt?: number;
  frame?: number;
};
const GPS_INTERVAL_MS = 3000;
const INITIAL_CENTER: Point = [106.78, 10.83];
const MAPTILER_KEY = (import.meta.env.VITE_MAPTILER_API_KEY ?? '').trim();
const MAP_STYLE = (theme: 'dark' | 'light') =>
  `https://api.maptiler.com/maps/${theme === 'dark' ? 'dataviz-v4-dark' : 'dataviz-v4-light'}/style.json?key=${encodeURIComponent(MAPTILER_KEY)}`;
const themeNow = (): 'dark' | 'light' => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
const asPoint = (longitude?: number, latitude?: number): Point | null => {
  if (typeof longitude !== 'number' || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return null;
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || Math.abs(latitude) > 90) return null;
  return [longitude, latitude];
};

const OLD_DRONE_SVG = `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 12h8M10 12v4h4v-4M7 8 4 5M17 8l3-3M7 16l-3 3M17 16l3 3"/><circle cx="6" cy="8" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="6" cy="16" r="2"/><circle cx="18" cy="16" r="2"/></svg>`;

function createPopup(title: string, lines: Array<[string, string]>): HTMLElement {
  const container = document.createElement('div');
  container.className = 'live-geo-popup-content';
  const heading = document.createElement('strong');
  heading.textContent = title;
  container.append(heading);
  for (const [label, value] of lines) {
    const line = document.createElement('div');
    const key = document.createElement('span');
    key.textContent = label;
    const val = document.createElement('b');
    val.textContent = value;
    line.append(key, val);
    container.append(line);
  }
  return container;
}

function getLine(h: MissionTelemetryPoint[]): Point[] {
  return [...h]
    .sort((a, b) => Date.parse(a.recordedAt || '0') - Date.parse(b.recordedAt || '0'))
    .map(p => asPoint(p.longitude, p.latitude))
    .filter((p): p is Point => p !== null);
}

function emptyCollection() {
  return {type: 'FeatureCollection' as const, features: [] as Array<{
    type: 'Feature'; properties: Record<string, string>; geometry: {type: 'LineString'; coordinates: Point[]};
  }>};
}

function drawTrails(map: MapLibreMap, histories: Props['histories'], selectedMissionId?: string) {
  const data = emptyCollection();
  for (const [missionId, history] of Object.entries(histories)) {
    const coordinates = getLine(history);
    if (coordinates.length < 2) continue;
    data.features.push({ type: 'Feature', properties: {selected: String(missionId === selectedMissionId)}, geometry: {type: 'LineString', coordinates} });
  }
  if (!map.getSource('droneoptai-trails')) {
    map.addSource('droneoptai-trails', {type: 'geojson', data});
  } else {
    (map.getSource('droneoptai-trails') as maplibregl.GeoJSONSource).setData(data);
  }
  if (!map.getLayer('droneoptai-trails')) {
    map.addLayer({id:'droneoptai-trails',type:'line',source:'droneoptai-trails',
      layout: {'line-cap':'round','line-join':'round'},
      paint: {'line-color':['case',['==',['get','selected'],'true'],'#fb923c','#38bdf8'],
        'line-opacity':['case',['==',['get','selected'],'true'],0.94,0.38],
        'line-width':['case',['==',['get','selected'],'true'],4.5,2.5]}});
  }
}

export const LiveMapTiler = forwardRef<LiveMapTilerHandle, Props>(function LiveMapTiler({hubs,drones,histories,selectedMissionId,onSelectMission}, ref) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const hubsRef = useRef(new Map<string, Marker>());
  const dronesRef = useRef(new Map<string, MovingMarker>());
  const stateRef = useRef({hubs,drones,histories,selectedMissionId,onSelectMission});
  stateRef.current = {hubs,drones,histories,selectedMissionId,onSelectMission};
  const followRef = useRef<string | null>(null);
  // Prevent setStyle being repeated when the theme attribute changes to the same value.
  const appliedThemeRef = useRef<'dark' | 'light'>(themeNow());
  const [ready,setReady] = useState(false);
  const [error,setError] = useState('');
  const [isFollowing,setIsFollowing] = useState(false);
  const [showHubs,setShowHubs] = useState(true);
  const [showTrails,setShowTrails] = useState(true);
  const [showWeather,setShowWeather] = useState(true);
  const [viewLabel,setViewLabel] = useState('Expanded Ho Chi Minh City');

  function fitAll() {
    const map = mapRef.current;
    if (!map) return;
    followRef.current = null;
    setIsFollowing(false);
    const bounds = new maplibregl.LngLatBounds();
    let count = 0;
    for (const h of stateRef.current.hubs) { const pt=asPoint(h.longitude,h.latitude);if(pt){bounds.extend(pt);count++;}}
    for (const d of stateRef.current.drones) { const pt=asPoint(d.longitude,d.latitude);if(pt){bounds.extend(pt);count++;}}
    if (count > 0) map.fitBounds(bounds,{padding:75,maxZoom:13,duration:900});
    else map.flyTo({center:INITIAL_CENTER,zoom:8,duration:800});
    setViewLabel('Hub network');
  }
  function focus(missionId:string) {
    const map = mapRef.current;
    const drone = stateRef.current.drones.find(d=>d.missionId===missionId);
    const point = drone && asPoint(drone.longitude,drone.latitude);
    if (!map || !point) return;
    // Follow the displayed marker's current animated location rather than
    // jumping ahead to the latest fix while an animation is in progress.
    const displayed = dronesRef.current.get(missionId)?.marker.getLngLat().toArray() as Point | undefined;
    followRef.current = missionId;
    setIsFollowing(true);
    setViewLabel(`Following ${drone.id}`);
    // Follow needs a readable zoom immediately: continuous map.jumpTo() calls
    // from the GPS animation would otherwise cancel an in-progress easeTo zoom.
    // Zoom 16 makes the 15-25 m GPS steps clearly visible (~7-11 px in HCMC).
    map.jumpTo({center:displayed ?? point,zoom:Math.max(map.getZoom(),16),pitch:45});
  }
  useImperativeHandle(ref,()=>({
    zoomIn:()=>mapRef.current?.zoomIn({duration:350}),
    zoomOut:()=>mapRef.current?.zoomOut({duration:350}),
    fitAll,
    focus,
    togglePitch:()=>{const m=mapRef.current;if(m)m.easeTo({pitch:m.getPitch()>15?0:50,bearing:m.getBearing(),duration:400});},
  }));

  useEffect(()=>{
    if(!host.current || !MAPTILER_KEY) return;
    let disposed=false;
    let map:MapLibreMap;
    try {
      map=new maplibregl.Map({
        container:host.current,
        style:MAP_STYLE(appliedThemeRef.current),
        center:INITIAL_CENTER,
        zoom:8,
        minZoom:5,
        maxZoom:20,
        pitch:0,
        maxPitch:65,
        attributionControl:false,
        cooperativeGestures:false,
        canvasContextAttributes: { antialias: true },
      });
      map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');
      map.dragRotate.enable();
      map.touchZoomRotate.enableRotation();
      map.scrollZoom.enable();
      mapRef.current=map;
      // The expanded city's geographic extent is broad; it is not a new administrative-boundary polygon.
      map.fitBounds([[106.05,8.55],[108.25,11.55]],{padding:24,duration:0});
      map.on('load',()=>{if(!disposed){setReady(true);setError('');}});
      map.on('error',(e)=>{if(!disposed && e.error){
        const message = String(e.error.message||'');
        if (/401|403|unauthoriz|forbidden|api key|network|fetch|style|tile/i.test(message))
          setError('Unable to load the map. Check the MapTiler API key, Allowed HTTP Origins and your Internet connection.');
      }});
    } catch(e){setError(e instanceof Error?e.message:'Unable to initialize the map.');return;}
    const resizeObserver = new ResizeObserver(()=>{ if(!disposed)map.resize(); });
    resizeObserver.observe(host.current);
    const themeObserver = new MutationObserver(()=>{
      const current = mapRef.current;
      const nextTheme = themeNow();
      if (!current || nextTheme === appliedThemeRef.current) return;
      appliedThemeRef.current = nextTheme;
      // Changing the style discards custom GeoJSON layers. The style.load
      // listener below recreates them with the latest telemetry.
      current.setStyle(MAP_STYLE(nextTheme));
    });
    themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    return()=>{
      disposed=true;
      themeObserver.disconnect();
      resizeObserver.disconnect();
      for(const m of hubsRef.current.values())m.remove();
      hubsRef.current.clear();
      for(const m of dronesRef.current.values()){if(m.frame)cancelAnimationFrame(m.frame);m.marker.remove();}
      dronesRef.current.clear();
      map.remove();
      mapRef.current=null;
    };
  },[]);

  useEffect(()=>{
    if(!ready || !mapRef.current)return;
    const map=mapRef.current;
    function sync() {
      // style.load fires after the new style can accept custom layers.
      // No isStyleLoaded() gate: that check can still be false while tiles load.
      try {
        drawTrails(map, stateRef.current.histories, stateRef.current.selectedMissionId);
        if (map.getLayer('droneoptai-trails')) {
          map.setLayoutProperty('droneoptai-trails', 'visibility', showTrails ? 'visible' : 'none');
        }
      } catch (error) {
        console.warn('Unable to update flight trails:', error);
      }
    }
    if (map.isStyleLoaded()) sync();
    map.on('style.load',sync);
    return () => {
      map.off('style.load', sync);
    };
  },[ready,histories,selectedMissionId,showTrails]);
  useEffect(()=>{
    if(!ready || !mapRef.current)return;
    const map=mapRef.current;
    const current=new Set<string>();
    for (const hub of hubs) {
      const point=asPoint(hub.longitude,hub.latitude);
      if(!point)continue;
      current.add(hub.id);
      let marker=hubsRef.current.get(hub.id);
      if (!marker) {
        const elem = document.createElement('div');
        elem.className = 'live-geo-hub';
        const badge = document.createElement('span');
        badge.className = 'live-geo-hub-badge';
        badge.textContent = 'H';
        const label = document.createElement('span');
        label.className = 'live-geo-hub-label';
        elem.append(badge, label);

        const popup = new maplibregl.Popup({closeButton:false,offset:22});
        marker = new maplibregl.Marker({element:elem,anchor:'center'})
          .setLngLat(point).setPopup(popup).addTo(map);
        hubsRef.current.set(hub.id, marker);
        // Listeners are installed once, and always access the current popup.
        const ownMarker = marker;
        elem.addEventListener('mouseenter', () => {
          const p = ownMarker.getPopup();
          if (p) p.setLngLat(ownMarker.getLngLat()).addTo(map);
        });
        elem.addEventListener('mouseleave', () => ownMarker.getPopup()?.remove());
      }
      marker.setLngLat(point);
      const element = marker.getElement();
      element.style.display = showHubs ? '' : 'none';
      const label = element.querySelector('.live-geo-hub-label');
      if (label) label.textContent = hub.code || hub.name;
      marker.getPopup()?.setDOMContent(createPopup(hub.name, [
        ['Hub', hub.code || hub.id],
        ['Position', `${point[1].toFixed(5)}, ${point[0].toFixed(5)}`],
      ]));
    }
    for(const [id,marker] of hubsRef.current){if(!current.has(id)){marker.remove();hubsRef.current.delete(id);}}
  },[hubs,ready,showHubs]);

  useEffect(()=>{
    if(!ready || !mapRef.current)return;
    const map=mapRef.current;
    const active=new Set<string>();
    for(const drone of drones){
      const pt=asPoint(drone.longitude,drone.latitude);
      if(!pt)continue;
      const id=drone.missionId||drone.id;
      active.add(id);
      let moving=dronesRef.current.get(id);
      if(!moving){
        const element=document.createElement('button');element.type='button';
        element.className='live-geo-drone';element.title=`Follow ${drone.id}`;
        const body=document.createElement('span');body.className='live-geo-drone-symbol';body.innerHTML=OLD_DRONE_SVG;
        const text=document.createElement('span');text.className='live-geo-drone-label';
        element.append(body,text);
        element.addEventListener('click',(evt)=>{
          evt.preventDefault();evt.stopPropagation();
          stateRef.current.onSelectMission(id);
          focus(id);
        });
        const popup=new maplibregl.Popup({closeButton:false,offset:23});
        const marker=new maplibregl.Marker({element,anchor:'center'}).setLngLat(pt).setPopup(popup).addTo(map);
        element.addEventListener('mouseenter',()=>popup.setLngLat(marker.getLngLat()).addTo(map));
        element.addEventListener('mouseleave',()=>popup.remove());
        const initialFixAt = drone.lastUpdated ? Date.parse(drone.lastUpdated) : NaN;
        moving={marker,element,popup,position:pt,lastFixAt:Number.isFinite(initialFixAt)?initialFixAt:undefined};
        dronesRef.current.set(id,moving);
      }
      moving.element.className=`live-geo-drone health-${drone.health.toLowerCase()} ${selectedMissionId===id?'selected':''}`;
      const droneLabel = moving.element.querySelector('.live-geo-drone-label');
      if (droneLabel) droneLabel.textContent = drone.id;
      moving.popup.setDOMContent(createPopup(drone.id,[
        ['Mission',drone.missionId],['Status',drone.health],['Altitude',drone.altitudeM!=null?`${drone.altitudeM.toFixed(1)} m`:'—'],
        ['Battery',drone.batteryVoltage!=null?`${drone.batteryVoltage.toFixed(2)} V`:'—'],
        ['Updated',drone.lastUpdated?new Date(drone.lastUpdated).toLocaleTimeString('en-GB'):'—'],
      ]));
      moving.popup.setLngLat(moving.marker.getLngLat());
      const parsedFixAt = drone.lastUpdated ? Date.parse(drone.lastUpdated) : NaN;
      const fixAt = Number.isFinite(parsedFixAt) ? parsedFixAt : undefined;
      const outOfOrder = fixAt !== undefined && moving.lastFixAt !== undefined && fixAt < moving.lastFixAt;
      // Diagnostic: this proves which GPS actually reaches the map component.
      // Keep this DEV-only; do not log bearer tokens or the complete response.
      if (import.meta.env.DEV && selectedMissionId === id) {
        console.info('[DroneOptAI MAP GPS]', {
          missionId: id,
          latestLat: pt[1], latestLng: pt[0],
          markerLat: moving.marker.getLngLat().lat,
          markerLng: moving.marker.getLngLat().lng,
          changed: moving.position[0] !== pt[0] || moving.position[1] !== pt[1],
          outOfOrder,
          lastUpdated: drone.lastUpdated,
          zoom: Number(map.getZoom().toFixed(1)),
        });
      }
      if (outOfOrder) continue;
      if (moving.position[0] !== pt[0] || moving.position[1] !== pt[1]) {
        if (moving.frame !== undefined) cancelAnimationFrame(moving.frame);
        const start: Point = moving.marker.getLngLat().toArray() as Point;
        // A timestamp older than 10 seconds still describes a real received GPS
        // point. The operator UI keeps its existing "Telemetry update delayed"
        // warning, but we should NOT suppress animation merely because BE timestamps
        // are older than the browser wall clock (e.g. delayed flight replay).
        // Interpolate only between two genuinely different GPS fixes.
        const longGap = fixAt !== undefined && moving.lastFixAt !== undefined &&
          fixAt - moving.lastFixAt > 30_000;
        const latRadians = ((start[1] + pt[1]) / 2) * Math.PI / 180;
        const jumpMeters = Math.hypot(
          (pt[0] - start[0]) * 111_320 * Math.cos(latRadians),
          (pt[1] - start[1]) * 111_320,
        );
        // GPS jumps over 2 km in one refresh should not be visualized as a
        // normal 3-second flight, even if the BE timestamp appears up to date.
        const abnormalJump = jumpMeters > 2_000;
        moving.position = pt;
        moving.lastFixAt = fixAt;
        if (import.meta.env.DEV) {
          console.info('[DroneOptAI GPS]', { missionId: id, drone: drone.id,
            previous: start, received: pt, lastUpdated: drone.lastUpdated,
            jumpMeters: Math.round(jumpMeters),
            movement: longGap || abnormalJump ? 'SNAP (gap / GPS jump)' : 'ANIMATE 3s' });
        }
        if (longGap || abnormalJump) {
          moving.marker.setLngLat(pt);
          moving.popup.setLngLat(pt);
          if (followRef.current === id) map.jumpTo({center:pt});
          moving.frame = undefined;
          continue;
        }
        const begin = performance.now();
        const animate = (now: number) => {
          // Constant-speed interpolation between consecutive BE fixes (~3 s).
          const t = Math.min(1, (now - begin) / GPS_INTERVAL_MS);
          const next: Point = [
            start[0] + (pt[0] - start[0]) * t,
            start[1] + (pt[1] - start[1]) * t,
          ];
          moving!.marker.setLngLat(next);
          if (moving!.popup.isOpen()) moving!.popup.setLngLat(next);
          if (followRef.current === id) map.jumpTo({center:next});
          if (t < 1) moving!.frame = requestAnimationFrame(animate);
          else moving!.frame = undefined;
        };
        moving.frame = requestAnimationFrame(animate);
      } else if (fixAt !== undefined && (moving.lastFixAt === undefined || fixAt > moving.lastFixAt)) {
        // A fresh timestamp with unchanged GPS means the aircraft stayed put.
        moving.lastFixAt = fixAt;
      }
    }
    for(const [id,moving] of dronesRef.current){if(!active.has(id)){
      if(moving.frame)cancelAnimationFrame(moving.frame);
      moving.marker.remove();dronesRef.current.delete(id);
      if(followRef.current===id){followRef.current=null;setIsFollowing(false);}
    }}
  },[drones,selectedMissionId,ready]);

  const selected = drones.find(d=>d.missionId===selectedMissionId);
  return <div className="live-geo-shell">
    <div ref={host} className="live-geo-map" role="application" aria-label="Live geographic drone map of Ho Chi Minh City" />
    {!MAPTILER_KEY&&<div className="live-geo-error">MapTiler API key is not configured. Add VITE_MAPTILER_API_KEY to .env.local and restart Vite.</div>}
    {error&&<div className="live-geo-error" role="alert">{error}</div>}
    <div className="live-geo-badge">{viewLabel}</div>
    <div className="live-geo-controls">
      <button type="button" onClick={()=>{followRef.current=null;setIsFollowing(false);mapRef.current?.fitBounds([[106.05,8.55],[108.25,11.55]],{padding:24,duration:900});setViewLabel('Expanded Ho Chi Minh City');}}>Entire city</button>
      <button type="button" onClick={fitAll}>Hub network</button>
      {isFollowing&&<button type="button" onClick={()=>{followRef.current=null;setIsFollowing(false);setViewLabel('Hub network');}}>Stop following</button>}
    </div>
    {showWeather&&selected&&<div className="live-geo-weather">
      <strong>Observed weather · selected aircraft</strong>
      <span>{selected.id}</span>
      <div><span>Temperature</span><b>{selected.weather?.temperature!==undefined?`${selected.weather.temperature.toFixed(1)}°C`:'—'}</b></div>
      <div><span>Wind</span><b>{selected.weather?.windSpeed!==undefined?`${selected.weather.windSpeed.toFixed(1)}`:'—'}</b></div>
      <div><span>Humidity</span><b>{selected.weather?.humidity!==undefined?`${selected.weather.humidity.toFixed(0)}%`:'—'}</b></div>
      <div><span>Wind direction</span><b>{selected.weather?.windDirection!==undefined?`${Math.round(selected.weather.windDirection)}°`:'—'}</b></div>
      <small>Weather at aircraft location, not district-wide conditions.</small>
    </div>}
    <div className="live-geo-layers" role="group" aria-label="Map layers">
      <button type="button" aria-pressed={showHubs} onClick={()=>setShowHubs(v=>!v)} className={showHubs?'active':''}>Hubs</button>
      <button type="button" aria-pressed={showTrails} onClick={()=>setShowTrails(v=>!v)} className={showTrails?'active':''}>Flight trails</button>
      <button type="button" aria-pressed={showWeather} onClick={()=>setShowWeather(v=>!v)} className={showWeather?'active':''}>Weather</button>
    </div>
    <div className="live-geo-hint">Scroll to zoom · Drag to pan · Right-drag to rotate / tilt</div>
  </div>;
});
