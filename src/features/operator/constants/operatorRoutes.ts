// export const orderTabs = [
//   { label: 'All orders', path: '/operator/orders/all' },
//   { label: 'Ready for planning', path: '/operator/orders/ready' },
// ];

// export const missionTabs = [
//   { label: 'All flight missions', path: '/operator/missions/all' },
// ];

// export const fleetHubTabs = [
//   { label: 'Drone availability', path: '/operator/fleet-hubs/drones' },
//   { label: 'Hub network', path: '/operator/fleet-hubs/hubs' },
// ];

// export const operationTabs = [
//   { label: 'Live tracking', path: '/operator/operations/live' },
//   { label: 'Telemetry', path: '/operator/operations/telemetry' },
//   { label: 'Incidents', path: '/operator/operations/incidents' },
// ];

// export const aiTabs = [
//   { label: 'Mission analysis', path: '/operator/ai/mission-analysis' },
//   { label: 'Scenario simulation', path: '/operator/ai/simulation' },
//   { label: 'Model insights', path: '/operator/ai/model-insights' },
// ];

// export const sectionTitles: Record<string, [string, string]> = {
//   dashboard: ['Mission Control', 'Live overview of today’s delivery operations'],
//   orders: ['Orders', 'Prioritize customer deliveries and create missions only when planning opens'],
//   missions: ['Flight Missions', 'Assign, dispatch, monitor, and recover drone delivery missions'],
//   fleet: ['Fleet & Network', 'Coordinate drones, Hub-to-Hub handoff, and temporary package pickup'],
//   operations: ['Flight Operations', 'Monitor live aircraft, telemetry, and incidents'],
//   ai: ['AI Decision Center', 'Deep analysis, explainability, simulation, and model monitoring'],
//   analytics: ['Operational Analytics', 'Measure performance across fleet, routes, and time'],

//   // REPORT FEATURE DISABLED — retained for future re-enable.
//   // reports: ['Reports', 'Generate and export audit-ready operational reports'],

//   notifications: ['Notifications', 'Prioritized updates from your active operation'],
//   profile: ['Operator Profile', 'Account, access, and console preferences'],
// };

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
];

export const operationTabs = [
  { label: 'Live tracking', path: '/operator/operations/live' },
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