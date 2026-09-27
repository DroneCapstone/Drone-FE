export type LiveDroneHealth = 'Normal' | 'Attention' | 'Critical';
export type IncidentPolicy = 'none' | 'monitor' | 'recommended';

export interface LiveDrone {
  id: string;
  missionId: string;
  orderId: string;
  route: string;
  health: LiveDroneHealth;
  alertId?: string;
  anomaly?: string;
  anomalyDuration?: string;
  battery: number;
  signal: number;
  altitudeM: number;
  speedKmh: number;
  detectedAt?: string;
  aiAssessment: string;
  incidentPolicy: IncidentPolicy;
  incidentReason?: string;
  mapPosition: string;
}

export const liveDrone: LiveDrone[] = [
  {
    id: 'AX-09',
    missionId: 'MSN-3109',
    orderId: 'ORD-1111',
    route: 'R-03 Valley',
    health: 'Critical',
    alertId: 'ALT-3109',
    anomaly: 'High motor temperature',
    anomalyDuration: '2m 18s',
    battery: 52,
    signal: 71,
    altitudeM: 116,
    speedKmh: 34,
    detectedAt: '14:32:18',
    aiAssessment:
      'Motor 2 temperature remains above the safe threshold and has not recovered. Technical inspection is recommended after landing.',
    incidentPolicy: 'recommended',
    incidentReason: 'Persistent thermal anomaly with component-risk indicators.',
    mapPosition: 'pos-1',
  },
  {
    id: 'NX-03',
    missionId: 'MSN-3108',
    orderId: 'ORD-1108',
    route: 'R-04 Coastal',
    health: 'Critical',
    alertId: 'ALT-3108',
    anomaly: 'Flight-control deviation',
    anomalyDuration: '46s',
    battery: 31,
    signal: 58,
    altitudeM: 109,
    speedKmh: 28,
    detectedAt: '14:29:42',
    aiAssessment:
      'Drone has remained outside the expected corridor despite a recovery command. Continue operational recovery and log a technical incident if instability persists.',
    incidentPolicy: 'recommended',
    incidentReason: 'Persistent route deviation with control-response anomaly.',
    mapPosition: 'pos-2',
  },
  {
    id: 'NX-08',
    missionId: 'MSN-3103',
    orderId: 'ORD-1103',
    route: 'R-12 Energy Saver',
    health: 'Attention',
    alertId: 'ALT-3103',
    anomaly: 'Signal instability',
    anomalyDuration: '12s',
    battery: 23,
    signal: 42,
    altitudeM: 122,
    speedKmh: 32,
    detectedAt: '14:31:58',
    aiAssessment:
      'Telemetry briefly degraded near a known weak-coverage area. Signal has recovered and no flight-control anomaly is present. Continue monitoring.',
    incidentPolicy: 'monitor',
    incidentReason: 'Short-lived connectivity anomaly; incident criteria not met.',
    mapPosition: 'pos-3',
  },
  {
    id: 'AX-17',
    missionId: 'MSN-3104',
    orderId: 'ORD-1104',
    route: 'R-04 Coastal',
    health: 'Attention',
    alertId: 'ALT-3104',
    anomaly: 'Battery discharge anomaly',
    anomalyDuration: '38s',
    battery: 65,
    signal: 78,
    altitudeM: 120,
    speedKmh: 36,
    detectedAt: '14:31:22',
    aiAssessment:
      'Battery discharge is about 18% faster than predicted, but reserve remains safe. Flight can continue while the trend is monitored.',
    incidentPolicy: 'monitor',
    incidentReason: 'Anomaly is not yet persistent enough for technician escalation.',
    mapPosition: 'pos-4',
  },
  {
    id: 'AX-07',
    missionId: 'MSN-3107',
    orderId: 'ORD-1109',
    route: 'R-01 Metro',
    health: 'Attention',
    alertId: 'ALT-3107',
    anomaly: 'High wind exposure',
    anomalyDuration: '1m 04s',
    battery: 48,
    signal: 66,
    altitudeM: 104,
    speedKmh: 30,
    detectedAt: '14:30:31',
    aiAssessment:
      'Crosswind is above the route baseline but remains within the aircraft operating envelope. No technical fault is indicated.',
    incidentPolicy: 'monitor',
    incidentReason: 'Environmental risk, not a technician fault.',
    mapPosition: 'pos-5',
  },
  {
    id: 'MX-22',
    missionId: 'MSN-3106',
    orderId: 'ORD-1106',
    route: 'R-04 Coastal',
    health: 'Normal',
    battery: 88,
    signal: 92,
    altitudeM: 118,
    speedKmh: 35,
    aiAssessment: 'Drone is operating within expected telemetry and route bounds.',
    incidentPolicy: 'none',
    mapPosition: 'pos-6',
  },
  {
    id: 'CX-11',
    missionId: 'MSN-3105',
    orderId: 'ORD-1105',
    route: 'R-12 Energy Saver',
    health: 'Normal',
    battery: 76,
    signal: 85,
    altitudeM: 114,
    speedKmh: 33,
    aiAssessment: 'Drone is operating within expected telemetry and route bounds.',
    incidentPolicy: 'none',
    mapPosition: 'pos-7',
  },
  {
    id: 'AX-04',
    missionId: 'MSN-3110',
    orderId: 'ORD-1110',
    route: 'R-01 Metro',
    health: 'Normal',
    battery: 91,
    signal: 87,
    altitudeM: 101,
    speedKmh: 31,
    aiAssessment: 'Drone is operating within expected telemetry and route bounds.',
    incidentPolicy: 'none',
    mapPosition: 'pos-8',
  },
  {
    id: 'MX-11',
    missionId: 'MSN-3112',
    orderId: 'ORD-1112',
    route: 'R-08 Urban',
    health: 'Normal',
    battery: 82,
    signal: 90,
    altitudeM: 108,
    speedKmh: 29,
    aiAssessment: 'Drone is operating within expected telemetry and route bounds.',
    incidentPolicy: 'none',
    mapPosition: 'pos-9',
  },
  {
    id: 'CX-10',
    missionId: 'MSN-3113',
    orderId: 'ORD-1113',
    route: 'R-02 River',
    health: 'Normal',
    battery: 73,
    signal: 89,
    altitudeM: 111,
    speedKmh: 34,
    aiAssessment: 'Drone is operating within expected telemetry and route bounds.',
    incidentPolicy: 'none',
    mapPosition: 'pos-10',
  },
  {
    id: 'AX-12',
    missionId: 'MSN-3114',
    orderId: 'ORD-1114',
    route: 'R-17 Express',
    health: 'Normal',
    battery: 84,
    signal: 94,
    altitudeM: 126,
    speedKmh: 39,
    aiAssessment: 'Drone is operating within expected telemetry and route bounds.',
    incidentPolicy: 'none',
    mapPosition: 'pos-11',
  },
  {
    id: 'AX-06',
    missionId: 'MSN-3115',
    orderId: 'ORD-1115',
    route: 'R-03 Valley',
    health: 'Normal',
    battery: 79,
    signal: 86,
    altitudeM: 107,
    speedKmh: 30,
    aiAssessment: 'Drone is operating within expected telemetry and route bounds.',
    incidentPolicy: 'none',
    mapPosition: 'pos-12',
  },
];

export const healthPriority: Record<LiveDroneHealth, number> = {
  Critical: 0,
  Attention: 1,
  Normal: 2,
};

export const healthTone = {
  Critical: 'danger',
  Attention: 'warning',
  Normal: 'success',
} as const;
