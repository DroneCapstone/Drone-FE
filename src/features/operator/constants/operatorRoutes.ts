export const orderTabs = [
  { label: 'All orders', path: '/operator/orders/all' },
  { label: 'Ready for planning', path: '/operator/orders/ready' },
];

export const missionTabs = [
  { label: 'All flight missions', path: '/operator/missions/all' },
];

export const fleetHubTabs = [
  { label: 'Drone', path: '/operator/fleet-hubs/drones' },
  { label: 'Hub network', path: '/operator/fleet-hubs/hubs' },
  { label: 'Battery', path: '/operator/fleet-hubs/batteries' },
];

export const operationTabs = [
  { label: 'Live tracking', path: '/operator/operations/live' },
  { label: 'Flight history', path: '/operator/operations/history' },
  { label: 'Telemetry', path: '/operator/operations/telemetry' },
  { label: 'Incidents', path: '/operator/operations/incidents' },
];

export const aiTabs = [
  { label: 'Mission analysis', path: '/operator/ai/mission-analysis' },
  { label: 'Scenario simulation', path: '/operator/ai/simulation' },
  { label: 'Model insights', path: '/operator/ai/model-insights' },
];

export const sectionTitles: Record<string, [string, string]> = {
  dashboard: ['Mission Control', ''],
  orders: ['Orders', ''],
  missions: ['Flight Missions', ''],
  fleet: ['Fleet & Network', ''],
  operations: ['Flight Operations', ''],
  ai: ['AI Decision Center', ''],
  analytics: ['Operational Analytics', ''],

  // REPORT FEATURE DISABLED — retained for future re-enable.
  // reports: ['Reports', ''],

  notifications: ['Notifications', ''],
  profile: ['Operator Profile', ''],
};