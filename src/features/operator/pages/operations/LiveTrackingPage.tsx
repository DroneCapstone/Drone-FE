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
import aeroLinkLiveHtml from './aerolink-live.html?raw';
import './digital-twin-live.css';
import { createLiveTrackingDemo, DEMO_HUBS } from './liveTrackingDemo';

import { OperationPageShell } from './OperationPageShell';
import './operations-enhanced.css';

type LiveBridgeMessage =
  | { type: 'DRONEOPTAI_3D_READY' }
  | { type: 'DRONEOPTAI_3D_SELECT'; missionId: string }
  | { type: 'DRONEOPTAI_3D_ESCAPE' }
  | { type: 'DRONEOPTAI_3D_ERROR'; message?: string };

const STALE_THRESHOLD_MS = 10_000;
const isTelemetryStale = (timestamp?: string) => {
  if (!timestamp) return true;
  const parsed = Date.parse(timestamp);
  return !Number.isFinite(parsed) || Date.now() - parsed > STALE_THRESHOLD_MS;
};
const valueOrDash = (value?: number, unit = '') =>
  value !== undefined && Number.isFinite(value) ? `${value}${unit}` : '—';

type LiveDroneHealth = LiveTrackingDrone['health'];

function formatBattery(drone: LiveTrackingDrone) {
  if (drone.battery !== undefined) return `${drone.battery}%`;
  if (drone.batteryVoltage !== undefined) return `${drone.batteryVoltage} V`;
  return '—';
}
type HealthFilter = 'All' | LiveDroneHealth;

const FILTERS: HealthFilter[] = ['All', 'Critical', 'Attention', 'Normal'];

const healthPriority: Record<LiveDroneHealth, number> = {
  Critical: 0,
  Attention: 1,
  Normal: 2,
};

const healthTone: Record<LiveDroneHealth, 'danger' | 'warning' | 'success'> = {
  Critical: 'danger',
  Attention: 'warning',
  Normal: 'success',
};

export function LiveTrackingPage() {
  const navigate = useNavigate();
  const [demoMode, setDemoMode] = useState(false);
  const [demoTick, setDemoTick] = useState(0);
  const demoSnapshot = useMemo(() => createLiveTrackingDemo(demoTick), [demoTick]);
  useEffect(() => {
    if (!demoMode) return;
    const timer = window.setInterval(() => setDemoTick((tick) => tick + 1), 1_000);
    return () => window.clearInterval(timer);
  }, [demoMode]);
  const {
    data: liveTrackingData,
    isLoading,
    error,
    dataUpdatedAt: liveTrackingDataUpdatedAt,
  } = useLiveTrackingQuery();
  const apiDrones = useMemo(() => (liveTrackingData ?? []).map((drone) => {
    // Backend explicitly declared Critical/Attention takes precedence. A stale
    // telemetry packet is Attention, never an invented flight emergency.
    if (!isTelemetryStale(drone.lastUpdated) || drone.health !== 'Normal') return drone;
    return {
      ...drone,
      health: 'Attention' as const,
      anomaly: 'Telemetry chưa cập nhật (>10 giây)',
      incidentPolicy: 'monitor' as const,
    };
  }), [liveTrackingData, liveTrackingDataUpdatedAt]);
  const liveDrone = demoMode ? demoSnapshot.drones : apiDrones;
  const hubsQuery = useMissionHubsQuery();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const [frameReady, setFrameReady] = useState(false);
  const [mapInitError, setMapInitError] = useState('');
  useEffect(() => {
    if (frameReady || mapInitError) return;
    const timer = window.setTimeout(() => setMapInitError('Bản đồ 3D chưa khởi tạo. Kiểm tra Three.js, OrbitControls và WebGL trong Console (F12).'), 9_000);
    return () => window.clearTimeout(timer);
  }, [frameReady, mapInitError]);
  const [isMapExpanded, setMapExpanded] = useState(false);

  const missionIds = useMemo(() => demoMode ? [] : Array.from(new Set(liveDrone.map((d) => d.missionId).filter(Boolean))), [liveDrone, demoMode]);
  const trailsQuery = useQueries({
    queries: missionIds.map((missionId) => ({
      queryKey: [...operatorQueryKeys.missionTelemetry(missionId), '3d-trail'] as const,
      queryFn: () => getMissionTelemetryApi(missionId, { limit: 5000 }),
      refetchInterval: 8_000,
      staleTime: 4_000,
    })),
  });
  const trailUpdateKey = trailsQuery.map((query) => query.dataUpdatedAt).join(':');

  const [filter, setFilter] = useState<HealthFilter>('All');
  const [selectedDroneId, setSelectedDroneId] = useState('');

  useEffect(() => {
    if (!selectedDroneId && liveDrone[0]) {
      setSelectedDroneId(liveDrone[0].id);
      return;
    }

    if (selectedDroneId && !liveDrone.some((aircraft) => aircraft.id === selectedDroneId)) {
      setSelectedDroneId(liveDrone[0]?.id ?? '');
    }
  }, [liveDrone, selectedDroneId]);

  const sortedDrone = useMemo(
    () =>
      [...liveDrone].sort((a, b) => {
        const healthDiff = healthPriority[a.health] - healthPriority[b.health];
        if (healthDiff !== 0) return healthDiff;
        return a.id.localeCompare(b.id);
      }),
    [liveDrone],
  );

  const filteredDrone = useMemo(
    () =>
      filter === 'All'
        ? sortedDrone
        : sortedDrone.filter((aircraft) => aircraft.health === filter),
    [filter, sortedDrone],
  );

  const selectedDrone = liveDrone.find((aircraft) => aircraft.id === selectedDroneId) ?? liveDrone[0];
  const checkpointQuery = useMissionHubCheckpointsQuery(demoMode ? '' : (selectedDrone?.missionId ?? ''));

  const sendMapCommand = (type: string, extra: Record<string, unknown> = {}) => {
    if (!frameReady) return;
    frameRef.current?.contentWindow?.postMessage({ type, ...extra }, '*');
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent<LiveBridgeMessage>) => {
      if (event.source !== frameRef.current?.contentWindow || !event.data) return;
      if (event.data.type === 'DRONEOPTAI_3D_READY') {
        setMapInitError('');
        setFrameReady(true);
      } else if (event.data.type === 'DRONEOPTAI_3D_ERROR') {
        setMapInitError(event.data.message || 'Không thể khởi tạo bản đồ 3D.');
      } else if (event.data.type === 'DRONEOPTAI_3D_SELECT' && typeof event.data.missionId === 'string') {
        const found = liveDrone.find((drone) => drone.missionId === event.data.missionId);
        if (found) {
          setSelectedDroneId(found.id);
          window.requestAnimationFrame(() => detailRef.current?.scrollIntoView({behavior:'smooth', block:'nearest'}));
        }
      } else if (event.data.type === 'DRONEOPTAI_3D_ESCAPE') {
        setMapExpanded(false);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [liveDrone]);

  useEffect(() => {
    if (!frameReady) return;
    const trails: Record<string, Array<{ latitude: number; longitude: number; altitude: number }>> = {};
    const energy: Record<string, number | undefined> = {};
    missionIds.forEach((missionId, i) => {
      const history = (trailsQuery[i]?.data ?? []) as MissionTelemetryPoint[];
      energy[missionId] = history.at(-1)?.energyConsumedWh;
      trails[missionId] = history.filter((p) => p.latitude !== undefined && p.longitude !== undefined)
        .slice(-200).map((p) => ({ latitude: p.latitude!, longitude: p.longitude!, altitude: p.altitudeM ?? 0 }));
    });
    frameRef.current?.contentWindow?.postMessage({
      type: 'DRONEOPTAI_3D_SNAPSHOT',
      hubs: (demoMode ? DEMO_HUBS : (hubsQuery.data ?? [])).map((hub) => ({
        id: hub.id, code: hub.code, name: hub.name,
        latitude: hub.latitude, longitude: hub.longitude,
      })),
      drones: liveDrone.map((drone) => ({
        id: drone.id, missionId: drone.missionId, orderId: drone.orderId,
        route: drone.route, health: drone.health, anomaly: drone.anomaly,
        latitude: drone.latitude, longitude: drone.longitude,
        altitude: drone.altitudeM, speed: drone.speedKmh,
        batteryVoltage: drone.batteryVoltage, energyConsumedWh: energy[drone.missionId],
        lastUpdated: drone.lastUpdated, checkpointsPassed: drone.checkpointsPassed,
        weather: drone.weather,
      })),
      trails: demoMode ? demoSnapshot.trails : trails,
      checkpoints: (demoMode ? demoSnapshot.checkpoints : (checkpointQuery.data ?? [])).map((point) => ({
        hubId: point.hubId, hubName: point.hubName,
        sequence: point.sequence, passedAt: point.reachedAt,
      })),
      selectedMissionId: selectedDrone?.missionId ?? '',
      error: demoMode ? '' : error instanceof Error ? error.message : hubsQuery.error instanceof Error ? hubsQuery.error.message : '',
    }, '*');
    // Capture new telemetry snapshots without rerender feedback loops from useQueries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameReady, liveTrackingDataUpdatedAt, hubsQuery.data, hubsQuery.error, demoMode, demoSnapshot,
      liveDrone, missionIds, trailUpdateKey, checkpointQuery.data, selectedDrone?.missionId, error]);

  // Sidebar selection should focus the corresponding marker without having to
  // click the map. The iframe ignores redundant focus commands.
  useEffect(() => {
    if (frameReady && selectedDrone?.missionId) {
      sendMapCommand('DRONEOPTAI_3D_FOCUS', { missionId: selectedDrone.missionId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameReady, selectedDrone?.missionId]);

  useEffect(() => {
    if (!isMapExpanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMapExpanded(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMapExpanded]);

  const filterCount = (value: HealthFilter) =>
    value === 'All'
      ? liveDrone.length
      : liveDrone.filter((aircraft) => aircraft.health === value).length;

  const handleFilterChange = (nextFilter: HealthFilter) => {
    setFilter(nextFilter);

    if (nextFilter === 'All' || !selectedDrone) return;

    if (selectedDrone.health !== nextFilter) {
      const firstMatching = sortedDrone.find(
        (aircraft) => aircraft.health === nextFilter,
      );

      if (firstMatching) setSelectedDroneId(firstMatching.id);
    }
  };

  const openIncident = () => {
    if (demoMode || !selectedDrone?.alertId) return;

    navigate(
      `/operator/operations/incidents?create=1&alertId=${selectedDrone.alertId}`,
    );
  };

  return (
    <OperationPageShell active="/operator/operations/live">
      <div className="live-ops-layout">
        <div className="live-ops-main">
          <OperatorPanel className={`live-map-panel live-ops-map-panel ${isMapExpanded ? 'live-ops-map-expanded' : ''}`}>
            <div className="live-3d-toolbar">
              <div className="live-3d-title">
                <span className="live-3d-status"><i className="live-3d-dot"/> {demoMode ? 'DEMO 3D' : 'LIVE 3D'}</span>
                <strong>Drone Fleet Map</strong>
                <small>{demoMode ? `${liveDrone.length} drone thử nghiệm · không dùng dữ liệu Backend` : `${liveDrone.length} drone đang bay · cập nhật mỗi 4 giây`}</small>
              </div>
              <div className="live-3d-tools" aria-label="3D map controls">
                {import.meta.env.DEV && (
                  <button
                    type="button"
                    className={`live-demo-toggle ${demoMode ? 'is-active' : ''}`}
                    aria-pressed={demoMode}
                    title="Bật/tắt dữ liệu thử nghiệm chỉ trên máy local, không gọi lệnh điều khiển drone"
                    onClick={() => { setDemoMode((value) => !value); setDemoTick(0); setSelectedDroneId(''); }}
                  >{demoMode ? 'Demo: ON' : 'Try Demo'}</button>
                )}
                <button type="button" title="Zoom in" aria-label="Zoom in" onClick={() => sendMapCommand('DRONEOPTAI_3D_ZOOM', { direction: 'in' })}><Icon name="plus" size={17}/></button>
                <button type="button" title="Zoom out" aria-label="Zoom out" onClick={() => sendMapCommand('DRONEOPTAI_3D_ZOOM', { direction: 'out' })}><span>−</span></button>
                <button type="button" title="Fit all hubs and drones" aria-label="Fit all hubs and drones" onClick={() => sendMapCommand('DRONEOPTAI_3D_FIT')}><Icon name="pin" size={17}/></button>
                <button type="button" title="Follow selected drone" aria-label="Follow selected drone" onClick={() => sendMapCommand('DRONEOPTAI_3D_CAMERA', { mode: 'follow' })}><Icon name="eye" size={17}/></button>
                <button type="button" title="Top view" aria-label="Switch to top view" onClick={() => sendMapCommand('DRONEOPTAI_3D_CAMERA', { mode: 'top' })}><Icon name="radar" size={17}/></button>
                <button type="button" title={isMapExpanded ? 'Exit fullscreen (Esc)' : 'Expand map'} aria-label={isMapExpanded ? 'Exit fullscreen' : 'Expand map'} onClick={() => setMapExpanded((v) => !v)}><Icon name={isMapExpanded ? 'collapse' : 'eye'} size={17}/></button>
              </div>
            </div>
            <div className="live-3d-stage">
              <iframe
                ref={frameRef}
                className="live-3d-iframe"
                title="DroneOptAI AERO-LINK live 3D map"
                srcDoc={aeroLinkLiveHtml}
                sandbox="allow-scripts"
              />
              {!demoMode && isLoading && <div className="live-3d-overlay">Đang tải dữ liệu Live Tracking…</div>}
              {!demoMode && error && <div className="live-3d-api-error" role="alert">Không cập nhật được Live Tracking: {error instanceof Error ? error.message : 'API error'}</div>}
              {!demoMode && !isLoading && !error && liveDrone.length === 0 && <div className="live-3d-empty">Không có drone đang bay · Chờ Technician Dispatch mission</div>}
              {mapInitError && <div className="live-3d-init-error" role="alert">{mapInitError}</div>}
              {demoMode && <div className="live-3d-demo-banner">DEMO MODE · Dữ liệu minh họa, không phải chuyến bay thực</div>}
              <div className="live-3d-legend">
                <span><i className="health-dot health-normal"/> Normal</span>
                <span><i className="health-dot health-attention"/> Attention</span>
                <span><i className="health-dot health-critical"/> Critical</span>
              </div>
            </div>
          </OperatorPanel>

          <div ref={detailRef}>
          {selectedDrone ? <OperatorPanel className="live-selection-panel">
            <div className="live-selection-head">
              <div className="live-selection-id">
                <span className={`live-selection-icon health-${selectedDrone.health.toLowerCase()}`}>
                  <Icon name="drone" size={19} />
                </span>

                <div>
                  <div className="live-selection-title">
                    <strong>{selectedDrone.id}</strong>
                    <StatusBadge tone={healthTone[selectedDrone.health]}>{selectedDrone.health}</StatusBadge>
                  </div>
                  <small>{selectedDrone.orderId ? `Delivery ${selectedDrone.orderId} · ` : ''}{selectedDrone.route}</small>
                </div>
              </div>

              <div className="live-selection-metrics">
                <span><Icon name="battery" size={16} /><strong>{formatBattery(selectedDrone)}</strong><small>Battery</small></span>
                <span><Icon name="radar" size={16} /><strong>{selectedDrone.signal !== undefined ? `${selectedDrone.signal}%` : '—'}</strong><small>Signal</small></span>
                <span><Icon name="pin" size={16} /><strong>{valueOrDash(selectedDrone.altitudeM, ' m')}</strong><small>Altitude</small></span>
                <span><Icon name="speed" size={16} /><strong>{valueOrDash(selectedDrone.speedKmh)}</strong><small>Speed</small></span>
              </div>
            </div>

            <div className={`live-ai-assessment health-${selectedDrone.health.toLowerCase()}`}>
              <div>
                <strong>AI assessment</strong>
                <p>{selectedDrone.aiAssessment}</p>
                {selectedDrone.incidentReason && <small>{selectedDrone.incidentReason}</small>}
              </div>

              <div className="live-ai-actions">
                <ActionButton
                  variant="secondary"
                  disabled={demoMode}
                  title={demoMode ? 'Telemetry thử nghiệm chỉ hiển thị tại Live Tracking' : 'Xem telemetry chuyến bay'}
                  onClick={() => { if (!demoMode) navigate(`/operator/operations/telemetry?aircraft=${selectedDrone.id}&missionId=${selectedDrone.missionId}`); }}
                >
                  View telemetry
                </ActionButton>

                {selectedDrone.incidentPolicy === 'recommended' && selectedDrone.alertId ? (
                  <ActionButton onClick={openIncident}>Create incident</ActionButton>
                ) : selectedDrone.health === 'Normal' ? (
                  <span className="live-incident-state">No active anomaly</span>
                ) : (
                  <span className="live-incident-state">Continue monitoring</span>
                )}
              </div>
            </div>
          </OperatorPanel> : <OperatorPanel className="live-selection-panel"><div className="operator-empty-state">Chọn một drone đang Flying để xem chi tiết.</div></OperatorPanel>}
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
            {!filteredDrone.length && <div className="operator-empty-state">Không có drone phù hợp bộ lọc.</div>}
            {filteredDrone.map((aircraft) => {
              const isSelected = selectedDrone?.id === aircraft.id;
              const healthClass = aircraft.health.toLowerCase();

              return (
                <button
                  type="button"
                  key={aircraft.id}
                  className={`live-aircraft-card health-${healthClass} ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedDroneId(aircraft.id)}
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
    </OperationPageShell>
  );
}
