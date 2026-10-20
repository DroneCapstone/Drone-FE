import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { OperatorPanel } from '../../components/OperatorPanel';
import { getMissionTelemetryApi, type LiveTrackingDrone, type MissionTelemetryPoint } from '../../api/missionApi';
import { useLiveTrackingQuery, useMissionHubsQuery, useMissionHubCheckpointsQuery } from '../../hooks/useMissionQueries';
import { operatorQueryKeys } from '../../query/queryKeys';
import mapHtml from './operator-live-map.html?raw';
import { OperationPageShell } from './OperationPageShell';
import './operations-enhanced.css';
import './digital-twin-live.css';

type Health = LiveTrackingDrone['health'];
type Filter = 'All' | Health;
type BridgeEvent = {type: string; missionId?: string; message?: string};
type LogEvent = {key: string; time: string; missionId: string; droneId: string; level: Health; message: string};
const FILTERS: Filter[] = ['All', 'Critical', 'Attention', 'Normal'];
const STALE_MS = 10_000;
const priority: Record<Health, number> = {Critical:0, Attention:1, Normal:2};
const healthTone: Record<Health, 'danger' | 'warning' | 'success'> = {Critical:'danger', Attention:'warning', Normal:'success'};
function stale(timestamp?: string) {
  if (!timestamp) return false; // Unknown timestamps must not fabricate a link-loss condition.
  const ms=Date.parse(timestamp);
  return Number.isFinite(ms) && Date.now()-ms>STALE_MS;
}
function formatBattery(drone: LiveTrackingDrone){
  if (drone.battery!==undefined) return `${drone.battery}%`;
  return drone.batteryVoltage!==undefined?`${drone.batteryVoltage.toFixed(2)} V`:'—';
}
function measure(value?:number,unit=''){return value!==undefined&&Number.isFinite(value)?`${value.toFixed(2)}${unit}`:'—';}
function eventTime(value:string){const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleTimeString('en-GB',{hour12:false}):'—';}
function bearing(from:MissionTelemetryPoint,to:MissionTelemetryPoint):number|undefined{
  if(from.latitude===undefined||from.longitude===undefined||to.latitude===undefined||to.longitude===undefined)return undefined;
  const a=from.latitude*Math.PI/180,b=to.latitude*Math.PI/180,delta=(to.longitude-from.longitude)*Math.PI/180;
  const y=Math.sin(delta)*Math.cos(b);
  const x=Math.cos(a)*Math.sin(b)-Math.sin(a)*Math.cos(b)*Math.cos(delta);
  if(Math.abs(x)+Math.abs(y)<1e-10)return undefined;
  return (Math.atan2(y,x)*180/Math.PI+360)%360;
}

export function LiveTrackingPage(){
  const navigate=useNavigate();
  const {data:rawDrones,isLoading,error,dataUpdatedAt}=useLiveTrackingQuery();
  const hubsQuery=useMissionHubsQuery();
  const [clockTick,setClockTick]=useState(0);
  useEffect(()=>{const id=window.setInterval(()=>setClockTick(v=>v+1),5000);return()=>window.clearInterval(id);},[]);
  const liveDrone=useMemo(()=>(rawDrones??[]).map(drone=>{
    if(drone.health!=='Normal'||!stale(drone.lastUpdated))return drone;
    return {...drone,health:'Attention' as const,anomaly:'Telemetry update delayed (>10 seconds)',incidentPolicy:'monitor' as const};
  // clockTick keeps stale telemetry status current even if API stops returning new data.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }),[rawDrones,dataUpdatedAt,clockTick]);
  const [selectedDroneId,setSelectedDroneId]=useState('');
  const [filter,setFilter]=useState<Filter>('All');
  const [logFilter,setLogFilter]=useState<'all'|'selected'>('all');
  const [isMapExpanded,setMapExpanded]=useState(false);
  const [frameReady,setFrameReady]=useState(false);
  const [mapError,setMapError]=useState('');
  const iframe=useRef<HTMLIFrameElement>(null);
  const detailRef=useRef<HTMLDivElement>(null);
  const sortedDrone=useMemo(()=>[...liveDrone].sort((a,b)=>priority[a.health]-priority[b.health]||a.id.localeCompare(b.id)),[liveDrone]);
  const selectedDrone=liveDrone.find(drone=>drone.id===selectedDroneId)??liveDrone[0];
  const filteredDrone=filter==='All'?sortedDrone:sortedDrone.filter(drone=>drone.health===filter);
  const missionIds=useMemo(()=>Array.from(new Set(liveDrone.map(drone=>drone.missionId).filter(Boolean))),[liveDrone]);
  const trailsQuery=useQueries({queries:missionIds.map(id=>({
    queryKey:[...operatorQueryKeys.missionTelemetry(id),'live-3d-trail',200] as const,
    queryFn:()=>getMissionTelemetryApi(id,{limit:200}),refetchInterval:8000,staleTime:3000,
  }))});
  const trailsKey=trailsQuery.map(item=>item.dataUpdatedAt).join(':');
  const checkpointQuery=useMissionHubCheckpointsQuery(selectedDrone?.missionId??'');
  useEffect(()=>{
    if(!selectedDroneId&&liveDrone[0])setSelectedDroneId(liveDrone[0].id);
    else if(selectedDroneId&&!liveDrone.some(d=>d.id===selectedDroneId))setSelectedDroneId(liveDrone[0]?.id??'');
  },[selectedDroneId,liveDrone]);
  const histories=useMemo(()=>{
    const out:Record<string,MissionTelemetryPoint[]>={};
    missionIds.forEach((id,i)=>{out[id]=(trailsQuery[i]?.data??[]) as MissionTelemetryPoint[];});
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[missionIds,trailsKey]);
  const logEvents=useMemo(()=>{
    const events:LogEvent[]=[];
    liveDrone.forEach(drone=>{
      const history=histories[drone.missionId]??[];
      history.slice(-12).forEach(p=>{
        if(p.recordedAt)events.push({key:`${drone.missionId}:telemetry:${p.id}`,time:p.recordedAt,missionId:drone.missionId,droneId:drone.id,level:'Normal',message:`Telemetry received · ${measure(p.altitudeM,' m')} altitude · ${measure(p.batteryVoltage,' V')}`});
      });
      if(stale(drone.lastUpdated))events.push({key:`${drone.missionId}:stale`,time:drone.lastUpdated??'',missionId:drone.missionId,droneId:drone.id,level:'Attention',message:'Telemetry update delayed (>10 seconds)'});
    });
    const id=selectedDrone?.missionId;
    if(id) (checkpointQuery.data??[]).forEach(c=>{
      if(c.reachedAt)events.push({key:`${id}:checkpoint:${c.id}`,time:c.reachedAt,missionId:id,droneId:selectedDrone.id,level:'Normal',message:`Checkpoint ${c.sequence} passed · ${c.hubName}`});
    });
    return events.sort((a,b)=>Date.parse(b.time)-Date.parse(a.time)).slice(0,70);
  },[liveDrone,histories,checkpointQuery.data,selectedDrone]);
  const visibleLogs=logFilter==='selected'&&selectedDrone?logEvents.filter(e=>e.missionId===selectedDrone.missionId):logEvents;
  const selectedHistory=selectedDrone?histories[selectedDrone.missionId]??[]:[];
  const heading=selectedHistory.length>1?bearing(selectedHistory[selectedHistory.length-2],selectedHistory[selectedHistory.length-1]):undefined;
  function command(type:string,extra:Record<string,unknown>={}){if(frameReady)iframe.current?.contentWindow?.postMessage({type,...extra},'*');}
  useEffect(()=>{
    const receive=(e:MessageEvent<BridgeEvent>)=>{
      if(e.source!==iframe.current?.contentWindow||!e.data)return;
      if(e.data.type==='DRONEOPTAI_3D_READY'){setFrameReady(true);setMapError('');}
      if(e.data.type==='DRONEOPTAI_3D_ERROR')setMapError(e.data.message||'Unable to initialize the 3D map.');
      if(e.data.type==='DRONEOPTAI_3D_SELECT'&&e.data.missionId){
        const matching=liveDrone.find(drone=>drone.missionId===e.data.missionId);
        if(matching){setSelectedDroneId(matching.id);window.requestAnimationFrame(()=>detailRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'}));}
      }
    };
    window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);
  },[liveDrone]);
  // The Operator's existing theme toggle controls the page. No separate map toggle.
  useEffect(()=>{
    if(!frameReady)return;
    const sync=()=>command('DRONEOPTAI_3D_THEME',{theme:document.documentElement.dataset.theme==='dark'?'dark':'light'});
    sync();const watcher=new MutationObserver(sync);watcher.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});return()=>watcher.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[frameReady]);
  useEffect(()=>{
    if(!frameReady)return;
    const trails:Record<string,Array<{latitude:number;longitude:number;altitude:number}>>={};
    const energy:Record<string,number|undefined>={};
    missionIds.forEach(id=>{
      const history=histories[id]??[];
      energy[id]=history.at(-1)?.energyConsumedWh;
      trails[id]=history.filter(p=>p.latitude!==undefined&&p.longitude!==undefined).map(p=>({latitude:p.latitude!,longitude:p.longitude!,altitude:p.altitudeM??0}));
    });
    iframe.current?.contentWindow?.postMessage({type:'DRONEOPTAI_3D_SNAPSHOT',
      hubs:(hubsQuery.data??[]).map(h=>({id:h.id,code:h.code??h.name,name:h.name,latitude:h.latitude,longitude:h.longitude})),
      drones:liveDrone.map(d=>({id:d.id,missionId:d.missionId,health:d.health,route:d.route,latitude:d.latitude,longitude:d.longitude,
        altitude:d.altitudeM,speed:d.speedKmh,batteryVoltage:d.batteryVoltage,energyConsumedWh:energy[d.missionId],checkpointsPassed:d.checkpointsPassed,lastUpdated:d.lastUpdated,weather:d.weather})),
      trails,checkpoints:(checkpointQuery.data??[]).map(c=>({hubId:c.hubId,sequence:c.sequence,passedAt:c.reachedAt})),selectedMissionId:selectedDrone?.missionId??'',
    },'*');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[frameReady,liveDrone,hubsQuery.data,checkpointQuery.data,histories,selectedDrone?.missionId]);
  // The first aircraft is highlighted on load, not auto-followed; the user chooses when to follow.
  function followFromAircraftList(aircraft: LiveTrackingDrone) {
    setSelectedDroneId(aircraft.id);
    command('DRONEOPTAI_3D_FOCUS',{missionId:aircraft.missionId});
  }
  useEffect(()=>{if(frameReady||mapError)return;const id=window.setTimeout(()=>setMapError('3D map is not ready. Check WebGL or CDN errors in the browser console.'),10000);return()=>clearTimeout(id);},[frameReady,mapError]);
  useEffect(()=>{if(!isMapExpanded)return;const handle=(e:KeyboardEvent)=>{if(e.key==='Escape')setMapExpanded(false);};window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle);},[isMapExpanded]);
  const filterCount=(value:Filter)=>value==='All'?liveDrone.length:liveDrone.filter(d=>d.health===value).length;
  const handleFilterChange=(next:Filter)=>{setFilter(next);if(next!=='All'&&selectedDrone?.health!==next){const found=sortedDrone.find(d=>d.health===next);if(found)followFromAircraftList(found);}};
  const openIncident=()=>{if(selectedDrone?.alertId)navigate(`/operator/operations/incidents?create=1&alertId=${selectedDrone.alertId}`);};
  return <OperationPageShell active="/operator/operations/live">
    <div className="live-ops-layout">
      <div className="live-ops-main">
        <OperatorPanel className={`live-map-panel live-ops-map-panel ${isMapExpanded?'live-ops-map-expanded':''}`}>
          <div className="live-3d-toolbar">
            <div className="live-3d-title"><span className="live-3d-status"><i className="live-3d-dot"/> LIVE 3D</span><strong>Drone Fleet Map</strong><small>{liveDrone.length} aircraft flying · updates every 4s</small></div>
            <div className="live-3d-tools" aria-label="Map controls">
              <button type="button" title="Zoom in" aria-label="Zoom in" onClick={()=>command('DRONEOPTAI_3D_ZOOM',{direction:'in'})}><Icon name="plus" size={17}/></button>
              <button type="button" title="Zoom out" aria-label="Zoom out" onClick={()=>command('DRONEOPTAI_3D_ZOOM',{direction:'out'})}>−</button>
              <button type="button" title="Fit all hubs and aircraft" aria-label="Fit all hubs and aircraft" onClick={()=>command('DRONEOPTAI_3D_FIT')}><Icon name="pin" size={17}/></button>
              <button type="button" title="Toggle top and angled views" aria-label="Toggle top and angled views" onClick={()=>command('DRONEOPTAI_3D_CAMERA',{mode:'top'})}><Icon name="radar" size={17}/></button>
              <button type="button" title={isMapExpanded?'Exit fullscreen (Esc)':'Expand map'} aria-label={isMapExpanded?'Exit fullscreen':'Expand map'} onClick={()=>setMapExpanded(x=>!x)}><Icon name={isMapExpanded?'collapse':'eye'} size={17}/></button>
            </div>
          </div>
          <div className="live-3d-stage">
            <iframe ref={iframe} className="live-3d-iframe" title="DroneOptAI live tracking map" srcDoc={mapHtml} sandbox="allow-scripts"/>
            {isLoading&&<div className="live-3d-overlay">Loading live tracking…</div>}
            {error&&<div className="live-3d-api-error" role="alert">Live tracking request failed: {error instanceof Error?error.message:'Unknown API error'}</div>}
            {!isLoading&&!error&&liveDrone.length===0&&<div className="live-3d-empty">No aircraft in flight · Awaiting Technician dispatch</div>}
            {mapError&&<div className="live-3d-init-error" role="alert">{mapError}</div>}
            </div>
        </OperatorPanel>
        <div ref={detailRef}>
          {selectedDrone?<OperatorPanel className="live-selection-panel">
            <div className="live-selection-head">
              <div className="live-selection-id"><span className={`live-selection-icon health-${selectedDrone.health.toLowerCase()}`}><Icon name="drone" size={19}/></span><div><div className="live-selection-title"><strong>{selectedDrone.id}</strong><StatusBadge tone={healthTone[selectedDrone.health]}>{selectedDrone.health}</StatusBadge></div><small>{selectedDrone.orderId?`Delivery ${selectedDrone.orderId} · `:''}{selectedDrone.route}</small></div></div>
              <div className="live-selection-metrics">
                <span><Icon name="battery" size={16}/><strong>{formatBattery(selectedDrone)}</strong><small>Battery</small></span>
                <span><Icon name="radar" size={16}/><strong>{selectedDrone.signal===undefined?'—':`${selectedDrone.signal}%`}</strong><small>Signal</small></span>
                <span><Icon name="pin" size={16}/><strong>{measure(selectedDrone.altitudeM,' m')}</strong><small>Altitude</small></span>
                <span><Icon name="speed" size={16}/><strong>{measure(selectedDrone.speedKmh)}</strong><small>Speed</small></span>
              </div>
            </div>
            <div className={`live-ai-assessment health-${selectedDrone.health.toLowerCase()}`}>
              <div><strong>AI assessment</strong><p>{selectedDrone.aiAssessment}</p>{selectedDrone.incidentReason&&<small>{selectedDrone.incidentReason}</small>}</div>
              <div className="live-ai-actions"><ActionButton variant="secondary" onClick={()=>navigate(`/operator/operations/telemetry?aircraft=${selectedDrone.id}&missionId=${selectedDrone.missionId}`)}>View telemetry</ActionButton>
                {selectedDrone.incidentPolicy==='recommended'&&selectedDrone.alertId?<ActionButton onClick={openIncident}>Create incident</ActionButton>:selectedDrone.health==='Normal'?<span className="live-incident-state">No active anomaly</span>:<span className="live-incident-state">Continue monitoring</span>}
              </div>
            </div>
          </OperatorPanel>:<OperatorPanel className="live-selection-panel"><div className="operator-empty-state">Select an aircraft in flight to view details.</div></OperatorPanel>}
        </div>
        <div className="live-ops-bottom">
          <OperatorPanel className="live-events-panel">
            <div className="live-events-head"><div><strong>LIVE OPERATIONS LOG</strong><small>Recorded telemetry and checkpoint events</small></div>
              <div className="live-events-filters"><button type="button" className={logFilter==='all'?'active':''} onClick={()=>setLogFilter('all')}>All</button><button type="button" className={logFilter==='selected'?'active':''} onClick={()=>setLogFilter('selected')}>Selected</button></div></div>
            <div className="live-events-scroll" aria-live="polite">
              {!visibleLogs.length?<p className="live-events-empty">No recorded events yet.</p>:visibleLogs.map(e=><div key={e.key} className={`live-events-entry level-${e.level.toLowerCase()}`}><time>{eventTime(e.time)}</time><strong>{e.droneId}</strong><span>{e.message}</span></div>)}
            </div>
          </OperatorPanel>
          <OperatorPanel className="live-route-panel"><div className="live-route-title">FLIGHT FOLLOW-UP</div>
            <div className="live-route-metric"><small>AIRCRAFT</small><strong>{selectedDrone?.id??'—'}</strong></div>
            <div className="live-route-metric"><small>MISSION</small><strong title={selectedDrone?.missionId}>{selectedDrone?.missionId??'—'}</strong></div>
            <div className="live-route-metric"><small>HEADING (GPS)</small><strong>{heading!==undefined?`${Math.round(heading)}°`:'—'}</strong></div>
            <div className="live-route-metric"><small>CHECKPOINTS</small><strong>{selectedDrone?.checkpointsPassed??'—'}</strong></div>
            <p>Heading is calculated from consecutive GPS coordinates. Click an aircraft to follow it on the map.</p>
          </OperatorPanel>
        </div>
      </div>
        <aside className="flight-rail live-aircraft-rail">
          <div className="rail-head live-aircraft-head">
            <strong>Live aircraft</strong>
            <button type="button" aria-label="Filter aircraft"><Icon name="filter" /></button>
          </div>

          <div className="live-health-filters" role="group" aria-label="Drone health filter">
            {FILTERS.map((item) => (
              <button
                type="button"
                key={item}
                className={filter === item ? 'active' : ''}
                onClick={() => handleFilterChange(item)}
              >
                {item !== 'All' && <i className={`health-dot health-${item.toLowerCase()}`} />}
                {item} ({filterCount(item)})
              </button>
            ))}
          </div>

          <div className="live-aircraft-list">
            {!filteredDrone.length && <div className="operator-empty-state">No aircraft match the selected filter.</div>}
            {filteredDrone.map((aircraft) => {
              const isSelected = selectedDrone?.id === aircraft.id;
              const healthClass = aircraft.health.toLowerCase();

              return (
                <button
                  type="button"
                  key={aircraft.id}
                  className={`live-aircraft-card health-${healthClass} ${isSelected ? 'selected' : ''}`}
                  onClick={() => followFromAircraftList(aircraft)}
                >
                  <span className="live-aircraft-card-icon"><Icon name="drone" size={18} /></span>
                  <span className="live-aircraft-card-main">
                    <span className="live-aircraft-card-title">
                      <strong>{aircraft.id}</strong>
                      <StatusBadge tone={healthTone[aircraft.health]}>{aircraft.health}</StatusBadge>
                    </span>
                    <small>{aircraft.orderId ? `Delivery ${aircraft.orderId}` : `Mission ${aircraft.missionId || '—'}`}</small>
                    <small>{aircraft.route}</small>
                    <em className="live-aircraft-state">
                      {aircraft.anomaly ? `${aircraft.anomaly}${aircraft.anomalyDuration ? ` · ${aircraft.anomalyDuration}` : ''}` : 'Operating normally'}
                    </em>
                  </span>
                  <span className="live-aircraft-card-metrics">
                    <span><Icon name="battery" size={14} />{formatBattery(aircraft)}</span>
                    <span><Icon name="radar" size={14} />{aircraft.signal !== undefined ? `${aircraft.signal}%` : '—'}</span>
                    <Icon name="chevron" size={15} />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="live-aircraft-footer">
            <span>Showing {filteredDrone.length} of {liveDrone.length} aircraft</span>
          </div>
        </aside>
    </div>
  </OperationPageShell>;
}
