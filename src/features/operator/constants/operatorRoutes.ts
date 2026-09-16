export const missionTabs = [
  { label: 'All missions', path: '/operator/missions/all' },
  { label: 'Create mission', path: '/operator/missions/create' },
  { label: 'Mission detail', path: '/operator/missions/detail' },
  { label: 'Approval queue', path: '/operator/missions/approvals' },
];

export const operationTabs = [
  { label: 'Live tracking', path: '/operator/operations/live' },
  { label: 'Telemetry', path: '/operator/operations/telemetry' },
  { label: 'Incidents', path: '/operator/operations/incidents' },
];

export const aiTabs = [
  { label: 'Prediction', path: '/operator/ai/prediction' },
  { label: 'Explainability', path: '/operator/ai/explainability' },
  { label: 'Recommendation', path: '/operator/ai/recommendation' },
  { label: 'What-if simulation', path: '/operator/ai/simulation' },
];

export const sectionTitles: Record<string, [string, string]> = {
  dashboard: ['Mission Control', 'Live overview of today’s flight operations'],
  missions: ['Missions', 'Plan, review, and control every mission lifecycle'],
  operations: ['Flight Operations', 'Monitor live aircraft, telemetry, and incidents'],
  ai: ['AI Decision Center', 'Transparent predictions and operational recommendations'],
  analytics: ['Operational Analytics', 'Measure performance across fleet, routes, and time'],
  reports: ['Reports', 'Generate and export audit-ready operational reports'],
  notifications: ['Notifications', 'Prioritized updates from your active operation'],
  profile: ['Operator Profile', 'Account, access, and console preferences'],
};
