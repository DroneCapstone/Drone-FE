import { OperatorTable, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/OperatorTable';
import { useEffect, useMemo, useRef, useState } from 'react';
import { OperatorLoadingState } from '../../components/OperatorLoadingState';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { OperatorPanel } from '../../components/OperatorPanel';
import type { LiveTrackingDrone, MissionTelemetryPoint } from '../../api/missionApi';
import { useIncidentsQuery, useLiveTrackingQuery, useMissionTelemetryQuery } from '../../hooks/useMissionQueries';
import { OperationPageShell } from './OperationPageShell';
import './telemetry-explorer.css';

type HealthFilter = 'All' | LiveTrackingDrone['health'];
const FILTERS: HealthFilter[] = ['All', 'Normal', 'Attention', 'Critical'];
const AIRCRAFT_PER_PAGE = 4;
const tones = { Normal: 'success', Attention: 'warning', Critical: 'danger' } as const;
const COMMON_FIELDS = new Set([
  'id', 'mission_id', 'missionId', 'recorded_at', 'timestamp', 'created_at', 'time',
  'latitude', 'lat', 'longitude', 'lng', 'lon', 'altitude', 'altitude_m', 'altitudeM',
  'speed', 'speed_kmh', 'speedKmh', 'speed_mps', 'speedMps',
  'battery_pct', 'batteryPct', 'battery', 'battery_level', 'battery_voltage', 'batteryVoltage',
  'energy_consumed_wh', 'energyConsumedWh', 'wind_speed', 'windSpeed',
  'failsafe_status', 'failsafeStatus',
  'signal', 'signal_pct', 'signalPct', 'signal_strength', 'signalStrength',
]);

function valueOrDash(value: unknown) {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? String(Number(value.toFixed(3))) : '—';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}
function metric(value: number | undefined, unit: string, decimals = 1) {
  return value !== undefined && Number.isFinite(value) ? `${value.toFixed(decimals)} ${unit}` : '—';
}
function battery(point: MissionTelemetryPoint) {
  if (point.batteryPct != null) return metric(point.batteryPct, '%');
  return metric(point.batteryVoltage, 'V', 2);
}
function recordedAt(timestamp: string) {
  if (!timestamp) return '—';
  const parsed = new Date(timestamp);
  return Number.isFinite(parsed.getTime()) ? parsed.toLocaleString('en-GB', { hour12: false }) : timestamp;
}
function columnLabel(field: string) {
  return field.replace(/^weather_/, 'Weather: ').replaceAll('_', ' ');
}

export function TelemetryPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('All');
  const [aircraftPage, setAircraftPage] = useState(1);
  const [clockTick, setClockTick] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setClockTick(t => t + 1), 5000); return () => window.clearInterval(timer); }, []);
  const logRef = useRef<HTMLDivElement>(null);
  const aircraftId = params.get('aircraft') ?? '';
  const explicitMissionId = params.get('missionId') ?? '';
  const { data: liveTrackingData, isLoading: liveLoading, isError: liveError, error: liveErrorDetail } = useLiveTrackingQuery();
  const { data: incidents = [] } = useIncidentsQuery();
  // This is the authoritative live-tracking snapshot. Keep incident/attention aircraft in it.
  const liveDrones = useMemo(() => {
    const seen = new Set<string>();
    return (liveTrackingData ?? []).filter(drone => {
      const key = drone.missionId || drone.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(drone => {
      const lastFix = drone.lastUpdated ? Date.parse(drone.lastUpdated) : Number.NaN;
      // Match Live Tracking's stale-telemetry classification, not a fabricated Mission status.
      if (drone.health === 'Normal' && Number.isFinite(lastFix) && Date.now() - lastFix > 10_000) {
        return { ...drone, health: 'Attention' as const, anomaly: 'Telemetry update delayed (>10 seconds)' };
      }
      return drone;
    });
  }, [liveTrackingData, clockTick]);
  const selectedDrone = liveDrones.find(drone => drone.missionId === explicitMissionId ||
    (!explicitMissionId && drone.id === aircraftId));
  const missionId = explicitMissionId || selectedDrone?.missionId || '';
  const { data: telemetryData, isLoading: telemetryLoading, isFetching: telemetryFetching, error: telemetryError } = useMissionTelemetryQuery(missionId);
  const points = useMemo(() => [...(telemetryData ?? [])].sort((a, b) => {
    const ta = Date.parse(a.recordedAt), tb = Date.parse(b.recordedAt);
    return Number.isFinite(ta) && Number.isFinite(tb) ? tb - ta : 0;
  }), [telemetryData]);

  const activeIncidents = useMemo(() => new Set(incidents.filter(incident =>
    !['resolved', 'closed', 'dismissed'].includes(incident.status.toLowerCase()),
  ).map(incident => incident.missionId).filter(Boolean)), [incidents]);
  const incidentByMission = useMemo(() => new Map(incidents.filter(i => i.missionId).map(i => [i.missionId, i])), [incidents]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return liveDrones.filter(drone => {
      if (healthFilter !== 'All' && drone.health !== healthFilter) return false;
      if (!term) return true;
      const incident = incidentByMission.get(drone.missionId);
      return [drone.id, drone.missionId, drone.orderId, drone.route, drone.anomaly, drone.incidentReason,
        incident?.title, incident?.description].some(value => (value ?? '').toLowerCase().includes(term));
    });
  }, [healthFilter, search, liveDrones, incidentByMission]);

  // Pagination is applied after search/filter so it always covers the full live aircraft list.
  const totalAircraftPages = Math.max(1, Math.ceil(filtered.length / AIRCRAFT_PER_PAGE));
  const displayedPage = Math.min(aircraftPage, totalAircraftPages);
  const firstAircraftIndex = (displayedPage - 1) * AIRCRAFT_PER_PAGE;
  const visibleAircraft = filtered.slice(firstAircraftIndex, firstAircraftIndex + AIRCRAFT_PER_PAGE);
  useEffect(() => { setAircraftPage(1); }, [search, healthFilter]);

  const extraColumns = useMemo(() => {
    const found = new Set<string>();
    points.forEach(point => Object.entries(point.raw).forEach(([key, value]) => {
      if (!COMMON_FIELDS.has(key) && value !== null && value !== undefined && value !== '') found.add(key);
    }));
    return [...found].sort();
  }, [points]);

  function selectAircraft(drone: LiveTrackingDrone) {
    setParams({ aircraft: drone.id, missionId: drone.missionId });
    window.requestAnimationFrame(() => logRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  }
  useEffect(() => {
    if (missionId && logRef.current && aircraftId) {
      // Keep deep links from Live Tracking focused on the logs rather than an empty selector.
      const target = logRef.current;
      window.requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    }
  // Only initial deep links should scroll automatically; polling must not steal focus.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <OperationPageShell active="/operator/operations/telemetry">
    <div className="telemetry-explorer">
      <div className="telemetry-topbar">
        <button className="telemetry-back" type="button" onClick={() => navigate('/operator/operations/live')}>
          <span aria-hidden="true">←</span> Back to Live tracking
        </button>
        <span className="telemetry-source">Live aircraft · Updated automatically</span>
      </div>

      <div className="telemetry-layout">
        <OperatorPanel className="telemetry-aircraft-panel">
          <div className="telemetry-list-title"><strong>Flying missions</strong><small>{filtered.length === 0
            ? `0 of ${liveDrones.length} aircraft`
            : `Showing ${firstAircraftIndex + 1}–${Math.min(firstAircraftIndex + AIRCRAFT_PER_PAGE, filtered.length)} of ${filtered.length} aircraft`}</small></div>
          <label className="telemetry-search">
            <Icon name="search" size={17} />
            <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search drone or Mission ID…" aria-label="Search active drone or mission" />
          </label>
          <div className="telemetry-health-tabs" role="group" aria-label="Filter aircraft by health">
            {FILTERS.map(item => <button key={item} type="button" className={healthFilter === item ? 'active' : ''} onClick={() => setHealthFilter(item)}>
              {item} <span>{item === 'All' ? liveDrones.length : liveDrones.filter(d => d.health === item).length}</span>
            </button>)}
          </div>
          {liveError && <p className="telemetry-error" role="alert">{liveErrorDetail instanceof Error ? liveErrorDetail.message : 'Cannot load active flights.'}</p>}
          {liveLoading ? <OperatorLoadingState label="Loading active aircraft…" compact /> : filtered.length === 0 ?
            <p className="telemetry-hint">{liveDrones.length ? 'No aircraft match your search or filter.' : 'No aircraft currently reported in Live Tracking.'}</p> :
            <div className="telemetry-aircraft-list">
              {visibleAircraft.map(drone => {
                const hasIncident = activeIncidents.has(drone.missionId) || Boolean(drone.incidentReason);
                return <button key={drone.missionId || drone.id} type="button"
                  className={`telemetry-aircraft-item ${missionId === drone.missionId ? 'selected' : ''}`}
                  onClick={() => selectAircraft(drone)}>
                  <div className="telemetry-aircraft-top"><strong>{drone.id}</strong><StatusBadge tone={tones[drone.health]}>{drone.health}</StatusBadge></div>
                  <small title={drone.missionId}>{drone.missionId || 'Mission ID unavailable'}</small>
                  {hasIncident && <span className="telemetry-incident-label" title={incidentByMission.get(drone.missionId)?.description || drone.incidentReason || undefined}><Icon name="alert" size={13} /> Incident · {incidentByMission.get(drone.missionId)?.title || drone.incidentReason || 'Active alert'}</span>}
                  {!hasIncident && drone.anomaly && <span className="telemetry-aircraft-note" title={drone.anomaly}>{drone.anomaly}</span>}
                  <span className="telemetry-open-log">View log <Icon name="chevron" size={13} /></span>
                </button>;
              })}
            </div>}
          {filtered.length > AIRCRAFT_PER_PAGE && <div className="telemetry-aircraft-pagination" aria-label="Aircraft list pages">
            <button type="button" disabled={displayedPage <= 1} onClick={() => setAircraftPage(displayedPage - 1)}>← Previous</button>
            <span>Page {displayedPage} of {totalAircraftPages}</span>
            <button type="button" disabled={displayedPage >= totalAircraftPages} onClick={() => setAircraftPage(displayedPage + 1)}>Next →</button>
          </div>}
        </OperatorPanel>

        <div className="telemetry-log-region" ref={logRef}>
          {!missionId ? <OperatorPanel className="telemetry-log-panel">
            <div className="telemetry-empty"><Icon name="chart" size={28} />
              <strong>Select an active flight</strong>
              <p>Choose a Drone or search for a Mission ID to view its recorded telemetry. Incidents are included in the live aircraft list.</p>
            </div>
          </OperatorPanel> : <OperatorPanel className="telemetry-log-panel">
            <div className="telemetry-log-heading">
              <div><small>MISSION TELEMETRY</small><h2>{missionId}</h2>
                <p>{selectedDrone?.id || aircraftId || 'Aircraft'}{selectedDrone?.route ? ` · ${selectedDrone.route}` : ''}</p>
              </div>
              <div className="telemetry-log-actions">
                <span className="telemetry-row-count">{points.length} records</span>
                <button type="button" className="telemetry-back" onClick={() => { setParams({}); setSearch(''); }}>
                  Clear selection
                </button>
              </div>
            </div>
            {selectedDrone && <div className="telemetry-log-status">
              <StatusBadge tone={tones[selectedDrone.health]}>{selectedDrone.health}</StatusBadge>
              {(activeIncidents.has(selectedDrone.missionId) || selectedDrone.incidentReason) && <span>Incident / anomaly recorded</span>}
              {telemetryFetching && !telemetryLoading && <small>Updating log…</small>}
            </div>}
            {telemetryLoading ? <OperatorLoadingState label="Loading telemetry records…" /> :
              telemetryError ? <div className="telemetry-error" role="alert">{telemetryError instanceof Error ? telemetryError.message : 'Unable to load telemetry.'}</div> :
              points.length === 0 ? <div className="telemetry-hint">No telemetry points recorded for this Mission yet.</div> :
              <div className="telemetry-table-scroll" role="region" aria-label="Telemetry logs" tabIndex={0}>
                <OperatorTable className="telemetry-table">
                  <TableHeader><TableRow>
                    <TableHead>Recorded</TableHead><TableHead>Position</TableHead><TableHead>Altitude</TableHead><TableHead>Speed</TableHead>
                    <TableHead>Battery</TableHead><TableHead>Energy</TableHead><TableHead>Wind</TableHead><TableHead>Failsafe</TableHead>
                    {extraColumns.map(key => <TableHead key={key}>{columnLabel(key)}</TableHead>)}
                  </TableRow></TableHeader>
                  <TableBody>{points.map((point, index) => <TableRow key={`${point.id}-${index}`}>
                    <TableCell>{recordedAt(point.recordedAt)}</TableCell>
                    <TableCell className="telemetry-position">{point.latitude !== undefined && point.longitude !== undefined ? `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}` : '—'}</TableCell>
                    <TableCell>{metric(point.altitudeM, 'm', 2)}</TableCell>
                    <TableCell>{metric(point.speedKmh, 'km/h', 1)}</TableCell>
                    <TableCell>{battery(point)}</TableCell>
                    <TableCell>{metric(point.energyConsumedWh, 'Wh', 2)}</TableCell>
                    <TableCell>{metric(point.windSpeed, 'm/s', 2)}</TableCell>
                    <TableCell>{valueOrDash(point.raw.failsafe_status ?? point.raw.failsafeStatus)}</TableCell>
                    {extraColumns.map(key => <TableCell key={key}>{valueOrDash(point.raw[key])}</TableCell>)}
                  </TableRow>)}</TableBody>
                </OperatorTable>
              </div>}
          </OperatorPanel>}
        </div>
      </div>
    </div>
  </OperationPageShell>;
}
