import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  getMissionTelemetryApi,
  type MissionTelemetryPoint,
  type LiveTrackingDrone,
} from '../../api/missionApi';
import {
  useLiveTrackingQuery,
  useMissionHubCheckpointsQuery,
  useMissionHubsQuery,
} from '../../hooks/useMissionQueries';
import { operatorQueryKeys } from '../../query/queryKeys';
import aeroLinkLiveHtml from './aerolink-live.html?raw';
import './digital-twin-live.css';

const EMPTY_DRONES: LiveTrackingDrone[] = [];

type LiveBridgeMessage =
  | { type: 'DRONEOPTAI_3D_READY' }
  | { type: 'DRONEOPTAI_3D_SELECT'; missionId: string }
  | { type: 'DRONEOPTAI_3D_NAVIGATE'; path: string };

/**
 * Original AERO-LINK HTML / CSS / Three.js is intentionally preserved in the
 * sandboxed iframe for pixel-level UI fidelity. The parent owns authentication,
 * React Query, Backend polling and safety / domain separation.
 */
export function LiveTrackingPage() {
  const navigate = useNavigate();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [frameReady, setFrameReady] = useState(false);
  const [selectedMissionId, setSelectedMissionId] = useState('');
  const liveQuery = useLiveTrackingQuery(); // every 4 seconds
  const hubsQuery = useMissionHubsQuery();  // once (React Query cache)
  const drones = liveQuery.data ?? EMPTY_DRONES;

  const missionIds = useMemo(
    () => Array.from(new Set(drones.map((d) => d.missionId).filter(Boolean))),
    [drones],
  );

  // API telemetry points arrive oldest -> newest, so fetch up to the documented
  // 5000 max then retain the most recent 200 rather than the FIRST 200.
  const trailQueries = useQueries({
    queries: missionIds.map((missionId) => ({
      queryKey: [...operatorQueryKeys.missionTelemetry(missionId), '3d-trail'] as const,
      queryFn: () => getMissionTelemetryApi(missionId, { limit: 5000 }),
      refetchInterval: 8_000,
      staleTime: 4_000,
      refetchIntervalInBackground: true,
    })),
  });
  const trailUpdates = trailQueries.map((query) => query.dataUpdatedAt).join(':');
  const checkpointQuery = useMissionHubCheckpointsQuery(selectedMissionId);

  useEffect(() => {
    if (selectedMissionId && !missionIds.includes(selectedMissionId)) {
      setSelectedMissionId(missionIds[0] ?? '');
    }
  }, [missionIds, selectedMissionId]);

  useEffect(() => {
    const handler = (event: MessageEvent<LiveBridgeMessage>) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      const message = event.data;
      if (!message || typeof message !== 'object') return;
      if (message.type === 'DRONEOPTAI_3D_READY') {
        setFrameReady(true);
      } else if (message.type === 'DRONEOPTAI_3D_SELECT' && typeof message.missionId === 'string') {
        // Only allow selecting missions returned by the actual Backend snapshot.
        if (missionIds.includes(message.missionId)) setSelectedMissionId(message.missionId);
      } else if (message.type === 'DRONEOPTAI_3D_NAVIGATE') {
        if (message.path === '/operator/dashboard' || message.path === '/operator/missions/all') {
          navigate(message.path);
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [missionIds, navigate]);

  useEffect(() => {
    const targetWindow = frameRef.current?.contentWindow;
    if (!frameReady || !targetWindow) return;
    const trails: Record<string, Array<{ latitude: number; longitude: number; altitude: number }>> = {};
    const lastEnergyWh: Record<string, number | undefined> = {};
    missionIds.forEach((missionId, i) => {
      const history = (trailQueries[i]?.data ?? []) as MissionTelemetryPoint[];
      lastEnergyWh[missionId] = history.length ? history[history.length - 1].energyConsumedWh : undefined;
      trails[missionId] = history
        .filter((p) => p.latitude !== undefined && p.longitude !== undefined)
        .slice(-200)
        .map((point) => ({
          latitude: point.latitude as number,
          longitude: point.longitude as number,
          altitude: point.altitudeM ?? 0,
        }));
    });
    targetWindow.postMessage({
      type: 'DRONEOPTAI_3D_SNAPSHOT',
      hubs: (hubsQuery.data ?? []).map((hub) => ({
        id: hub.id, code: hub.code, name: hub.name,
        latitude: hub.latitude, longitude: hub.longitude,
      })),
      drones: drones.map((drone) => ({
        id: drone.id,
        missionId: drone.missionId,
        latitude: drone.latitude,
        longitude: drone.longitude,
        altitude: drone.altitudeM,
        speed: drone.speedKmh,
        batteryVoltage: drone.batteryVoltage,
        energyConsumedWh: lastEnergyWh[drone.missionId],
        lastUpdated: drone.lastUpdated,
        checkpointsPassed: drone.checkpointsPassed,
        weather: drone.weather,
      })),
      trails,
      checkpoints: (checkpointQuery.data ?? []).map((checkpoint) => ({
        hubId: checkpoint.hubId,
        hubName: checkpoint.hubName,
        sequence: checkpoint.sequence,
        passedAt: checkpoint.reachedAt,
      })),
      error: liveQuery.error instanceof Error
        ? liveQuery.error.message
        : hubsQuery.error instanceof Error
          ? hubsQuery.error.message
          : '',
    }, '*'); // required for sandboxed about:srcdoc (opaque origin)
  // trailUpdates captures each refetch without depending on unstable useQueries array identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameReady, hubsQuery.data, hubsQuery.error, liveQuery.data, liveQuery.error,
      liveQuery.dataUpdatedAt, checkpointQuery.data, selectedMissionId, missionIds, trailUpdates]);

  return (
    <section className="digital-twin-live-page" aria-label="DroneOptAI AERO-LINK 3D Live Tracking">
      <iframe
        ref={frameRef}
        title="DroneOptAI AERO-LINK 3D Live Tracking"
        className="digital-twin-live-frame"
        srcDoc={aeroLinkLiveHtml}
        sandbox="allow-scripts"
        onLoad={() => setFrameReady(true)}
      />
      <noscript>The 3D tracking screen requires JavaScript.</noscript>
    </section>
  );
}
