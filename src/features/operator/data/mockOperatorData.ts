import type { Mission } from '../types/operator';

const isoFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const mission = (
  values: Omit<Mission, 'createdAt' | 'tone' | 'eta'> & { tone?: Mission['tone']; eta?: string; createdAt?: string },
): Mission => ({
  ...values,
  tone:
    values.tone ??
    (values.status === 'Completed'
      ? 'success'
      : values.status === 'Failed'
        ? 'danger'
        : values.status === 'In Progress'
          ? 'success'
          : 'info'),
  eta: values.eta ?? timeLabel(values.estimatedArrivalAt),
  createdAt: values.createdAt ?? isoFromNow(-120),
});

export const missions: Mission[] = [
  mission({
    id: 'MSN-3103', orderId: 'ORD-1103', type: 'Delivery', name: 'Delivery ORD-1103',
    droneId: 'DR-001', drone: 'CX-09', originHubId: 'HUB-HCM-02', destinationHubId: 'HUB-HCM-03', routeId: 'R-12', route: 'R-12 Energy Saver',
    status: 'Scheduled', plannedStartAt: isoFromNow(10), estimatedArrivalAt: isoFromNow(41),
    predictedDurationMin: 31, estimatedEnergyWh: 21.8, batteryConsumptionPct: 21, confidencePct: 93, risk: 'Low', battery: 65,
  }),
  mission({
    id: 'MSN-3104', orderId: 'ORD-1104', type: 'Delivery', name: 'Delivery ORD-1104',
    droneId: 'DR-004', drone: 'AX-17', originHubId: 'HUB-HCM-01', destinationHubId: 'HUB-HCM-02', routeId: 'R-04', route: 'R-04 Coastal',
    status: 'In Progress', plannedStartAt: isoFromNow(-18), actualStartedAt: isoFromNow(-14), estimatedArrivalAt: isoFromNow(14),
    predictedDurationMin: 28, estimatedEnergyWh: 24.6, batteryConsumptionPct: 24, confidencePct: 91, risk: 'Low', battery: 72,
  }),
  mission({
    id: 'MSN-3105', orderId: 'ORD-1105', type: 'Delivery', name: 'Delivery ORD-1105',
    droneId: 'DR-002', drone: 'CX-12', originHubId: 'HUB-HCM-02', destinationHubId: 'HUB-HCM-01', routeId: 'R-12', route: 'R-12 Energy Saver',
    status: 'Completed', plannedStartAt: isoFromNow(-135), actualStartedAt: isoFromNow(-130), actualCompletedAt: isoFromNow(-99), estimatedArrivalAt: isoFromNow(-99),
    predictedDurationMin: 31, estimatedEnergyWh: 21.8, batteryConsumptionPct: 21, confidencePct: 93, risk: 'Low', battery: 43,
  }),
  mission({
    id: 'MSN-3106', orderId: 'ORD-1106', type: 'Delivery', name: 'Delivery ORD-1106',
    droneId: 'DR-006', drone: 'MX-22', originHubId: 'HUB-HCM-01', destinationHubId: 'HUB-HCM-03', routeId: 'R-04', route: 'R-04 Coastal',
    status: 'Completed', plannedStartAt: isoFromNow(-330), actualStartedAt: isoFromNow(-326), actualCompletedAt: isoFromNow(-298), estimatedArrivalAt: isoFromNow(-298),
    predictedDurationMin: 28, estimatedEnergyWh: 24.6, batteryConsumptionPct: 24, confidencePct: 91, risk: 'Low', battery: 24,
  }),
  mission({
    id: 'MSN-3107', orderId: 'ORD-1107', type: 'Delivery', name: 'Delivery ORD-1107',
    droneId: 'DR-008', drone: 'AX-26', originHubId: 'HUB-HCM-03', destinationHubId: 'HUB-HCM-02', routeId: 'R-08', route: 'R-08 Urban',
    status: 'Completed', plannedStartAt: isoFromNow(-350), actualStartedAt: isoFromNow(-346), actualCompletedAt: isoFromNow(-321), estimatedArrivalAt: isoFromNow(-321),
    predictedDurationMin: 25, estimatedEnergyWh: 28.1, batteryConsumptionPct: 29, confidencePct: 88, risk: 'Medium', battery: 44,
  }),
  mission({
    id: 'MSN-3108', orderId: 'ORD-1108', type: 'Delivery', name: 'Delivery ORD-1108',
    droneId: 'DR-005', drone: 'NX-08', originHubId: 'HUB-HCM-01', destinationHubId: 'HUB-HCM-02', routeId: 'R-12', route: 'R-12 Energy Saver',
    status: 'Completed', plannedStartAt: isoFromNow(-410), actualStartedAt: isoFromNow(-405), actualCompletedAt: isoFromNow(-374), estimatedArrivalAt: isoFromNow(-374),
    predictedDurationMin: 31, estimatedEnergyWh: 21.8, batteryConsumptionPct: 21, confidencePct: 93, risk: 'Low', battery: 49,
  }),
  mission({
    id: 'MSN-3109', orderId: 'ORD-1109', type: 'Delivery', name: 'Delivery ORD-1109',
    droneId: 'DR-001', drone: 'CX-09', originHubId: 'HUB-HCM-02', destinationHubId: 'HUB-HCM-03', routeId: 'R-04', route: 'R-04 Coastal',
    status: 'Completed', plannedStartAt: isoFromNow(-500), actualStartedAt: isoFromNow(-496), actualCompletedAt: isoFromNow(-468), estimatedArrivalAt: isoFromNow(-468),
    predictedDurationMin: 28, estimatedEnergyWh: 24.6, batteryConsumptionPct: 24, confidencePct: 91, risk: 'Low', battery: 58,
  }),
  mission({
    id: 'MSN-3110', orderId: 'ORD-1110', type: 'Delivery', name: 'Delivery ORD-1110',
    droneId: 'DR-007', drone: 'CX-21', originHubId: 'HUB-HCM-03', destinationHubId: 'HUB-HCM-01', routeId: 'R-08', route: 'R-08 Urban',
    status: 'In Progress', scheduleState: 'Delayed', plannedStartAt: isoFromNow(-24), actualStartedAt: isoFromNow(-20), estimatedArrivalAt: isoFromNow(8),
    predictedDurationMin: 25, estimatedEnergyWh: 28.1, batteryConsumptionPct: 29, confidencePct: 88, risk: 'Medium', battery: 52,
    assignmentHistory: [
      { droneId: 'DR-009', droneName: 'CX-31', replacedAt: isoFromNow(-15), reason: 'Serious battery anomaly escalated to Technical Incident' },
    ],
  }),
  mission({
    id: 'MSN-3111', orderId: 'ORD-1111', type: 'Delivery', name: 'Delivery ORD-1111',
    droneId: 'DR-008', drone: 'AX-26', originHubId: 'HUB-HCM-03', destinationHubId: 'HUB-HCM-01', routeId: 'R-12', route: 'R-12 Energy Saver',
    status: 'Completed', plannedStartAt: isoFromNow(-390), actualStartedAt: isoFromNow(-386), actualCompletedAt: isoFromNow(-355), estimatedArrivalAt: isoFromNow(-355),
    predictedDurationMin: 31, estimatedEnergyWh: 21.8, batteryConsumptionPct: 21, confidencePct: 93, risk: 'Low', battery: 51,
  }),
  mission({
    id: 'MSN-3112', orderId: 'ORD-1112', type: 'Delivery', name: 'Delivery ORD-1112',
    droneId: 'DR-003', drone: 'AX-04', originHubId: 'HUB-HCM-02', destinationHubId: 'HUB-HCM-01', routeId: 'R-04', route: 'R-04 Coastal',
    status: 'Failed', plannedStartAt: isoFromNow(-450), estimatedArrivalAt: isoFromNow(-422),
    predictedDurationMin: 28, estimatedEnergyWh: 24.6, batteryConsumptionPct: 24, confidencePct: 91, risk: 'Low', battery: 92,
  }),
  mission({
    id: 'MSN-3116', orderId: 'ORD-1116', type: 'Delivery', name: 'Delivery ORD-1116',
    droneId: 'DR-002', drone: 'CX-12', originHubId: 'HUB-HCM-02', destinationHubId: 'HUB-HCM-01', routeId: 'R-12', route: 'R-12 Energy Saver',
    status: 'In Progress', plannedStartAt: isoFromNow(-12), actualStartedAt: isoFromNow(-9), estimatedArrivalAt: isoFromNow(22),
    predictedDurationMin: 31, estimatedEnergyWh: 21.8, batteryConsumptionPct: 21, confidencePct: 93, risk: 'Low', battery: 79,
  }),
  mission({
    id: 'MSN-3117', orderId: 'ORD-1117', type: 'Delivery', name: 'Delivery ORD-1117',
    droneId: 'DR-005', drone: 'NX-08', originHubId: 'HUB-HCM-01', destinationHubId: 'HUB-HCM-03', routeId: 'R-04', route: 'R-04 Coastal',
    status: 'In Progress', plannedStartAt: isoFromNow(-17), actualStartedAt: isoFromNow(-15), estimatedArrivalAt: isoFromNow(13),
    predictedDurationMin: 28, estimatedEnergyWh: 24.6, batteryConsumptionPct: 24, confidencePct: 91, risk: 'Low', battery: 76,
  }),
  mission({
    id: 'MSN-3118', orderId: 'ORD-1118', type: 'Delivery', name: 'Delivery ORD-1118',
    droneId: 'DR-008', drone: 'AX-26', originHubId: 'HUB-HCM-03', destinationHubId: 'HUB-HCM-02', routeId: 'R-08', route: 'R-08 Urban',
    status: 'In Progress', plannedStartAt: isoFromNow(-10), actualStartedAt: isoFromNow(-7), estimatedArrivalAt: isoFromNow(18),
    predictedDurationMin: 25, estimatedEnergyWh: 28.1, batteryConsumptionPct: 29, confidencePct: 88, risk: 'Medium', battery: 71,
  }),
];
