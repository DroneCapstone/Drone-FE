/** UI-only fixtures. Never sent to Backend and never used outside the local DEV preview. */
import type { HubCheckpoint, LiveTrackingDrone, MissionHubSummary } from '../../api/missionApi';

export const DEMO_HUBS: MissionHubSummary[] = [
  { id: 'demo-h1', code: 'DEMO-H1', name: 'Hub Quận 1 (demo)', latitude: 10.77690, longitude: 106.70090 },
  { id: 'demo-h2', code: 'DEMO-H2', name: 'Hub Quận 3 (demo)', latitude: 10.78275, longitude: 106.69080 },
  { id: 'demo-h3', code: 'DEMO-H3', name: 'Hub Quận 7 (demo)', latitude: 10.73250, longitude: 106.72180 },
  { id: 'demo-h4', code: 'DEMO-H4', name: 'Hub Bình Thạnh (demo)', latitude: 10.80160, longitude: 106.71550 },
  { id: 'demo-h5', code: 'DEMO-H5', name: 'Hub Thủ Đức (demo)', latitude: 10.83210, longitude: 106.75030 },
];

const PATHS = [
  { id: 'DRN-901', missionId: 'DEMO-MSN-01', health: 'Normal' as const, start: 0, end: 3, phase: 0.16, voltage: 23.5, speed: 13.2, altitude: 52.3 },
  { id: 'DRN-902', missionId: 'DEMO-MSN-02', health: 'Attention' as const, start: 1, end: 2, phase: 0.38, voltage: 22.4, speed: 11.7, altitude: 48.5 },
  { id: 'DRN-903', missionId: 'DEMO-MSN-03', health: 'Critical' as const, start: 4, end: 0, phase: 0.65, voltage: 20.9, speed: 10.8, altitude: 55.6 },
];

const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

export function createLiveTrackingDemo(tick: number): {
  drones: LiveTrackingDrone[];
  trails: Record<string, Array<{ latitude: number; longitude: number; altitude: number }>>;
  checkpoints: HubCheckpoint[];
} {
  const now = new Date().toISOString();
  const trails: Record<string, Array<{ latitude: number; longitude: number; altitude: number }>> = {};
  const drones = PATHS.map((p, index): LiveTrackingDrone => {
    const from = DEMO_HUBS[p.start];
    const to = DEMO_HUBS[p.end];
    const progress = (p.phase + tick * (0.007 + index * 0.001)) % 1;
    const latitude = lerp(from.latitude!, to.latitude!, progress);
    const longitude = lerp(from.longitude!, to.longitude!, progress);
    const altitude = p.altitude + Math.sin(tick * 0.16 + index) * 0.9;
    trails[p.missionId] = Array.from({ length: 25 }, (_, n) => {
      const t = Math.max(0, progress - 0.18 * (1 - n / 24));
      return {
        latitude: lerp(from.latitude!, to.latitude!, t),
        longitude: lerp(from.longitude!, to.longitude!, t),
        altitude,
      };
    });
    return {
      id: p.id,
      missionId: p.missionId,
      orderId: `DEMO-ORD-0${index + 1}`,
      route: `${from.code} → ${to.code}`,
      health: p.health,
      batteryVoltage: p.voltage,
      altitudeM: Number(altitude.toFixed(1)),
      speedKmh: p.speed, // The API has not defined the speed unit; show its raw demo value.
      latitude,
      longitude,
      mapPosition: '',
      lastUpdated: now,
      checkpointsPassed: progress > 0.5 ? 1 : 0,
      anomaly: index === 1 ? 'DEMO · Cần theo dõi gió mạnh' : index === 2 ? 'DEMO · Cảnh báo nguy hiểm' : undefined,
      aiAssessment: index === 0
        ? 'DEMO: Drone hoạt động bình thường; dữ liệu dùng để kiểm thử UI.'
        : index === 1
          ? 'DEMO: Operator cần theo dõi tình trạng drone. Không phải cảnh báo từ Backend.'
          : 'DEMO: Trạng thái Critical thử nghiệm. Không có sự cố hoặc cảnh báo thực.',
      incidentPolicy: index === 0 ? 'none' : 'monitor',
      weather: { temperature: 31.2, humidity: 78, windSpeed: 3.2, windDirection: 180, precipitation: 0 },
    };
  });
  // A visual-only checkpoint for the current demo route; no database record exists.
  const checkpoints: HubCheckpoint[] = [];
  return { drones, trails, checkpoints };
}
