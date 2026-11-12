import type { OperatorNavItem } from '../features/operator/types/operator';

export const operatorNavigation: OperatorNavItem[] = [
  { label: 'Dashboard', path: '/operator/dashboard', icon: 'grid' },
  {
    label: 'Delivery Operations',
    path: '/operator/orders/all',
    icon: 'mission',
    children: [
      { label: 'Orders', path: '/operator/orders/all' },
      { label: 'Flight Missions', path: '/operator/missions/all' },
    ],
  },
  {
    label: 'Fleet & Network',
    path: '/operator/fleet-hubs/drones',
    icon: 'drone',
    children: [
      { label: 'Drone availability', path: '/operator/fleet-hubs/drones' },
      { label: 'Hub network', path: '/operator/fleet-hubs/hubs' },
      { label: 'Battery inventory', path: '/operator/fleet-hubs/batteries' },
    ],
  },
  {
    label: 'Operations',
    path: '/operator/operations/live',
    icon: 'radar',
    children: [
      { label: 'Live tracking', path: '/operator/operations/live' },
      { label: 'Flight history', path: '/operator/operations/history' },
      { label: 'Telemetry', path: '/operator/operations/telemetry' },
      { label: 'Incidents', path: '/operator/operations/incidents' },
    ],
  },
  /* AI Decision Center hidden from the Operator sidebar until a verified Model Insights source is available.
   * Mission Analysis remains accessible only through Create Mission > View AI details.
  {
    label: 'AI Decision Center',
    path: '/operator/ai/mission-analysis',
    icon: 'spark',
    children: [
      { label: 'Mission analysis', path: '/operator/ai/mission-analysis' },
      { label: 'Model insights', path: '/operator/ai/model-insights' },
    ],
  },
  */
  // ANALYTICS TEMPORARILY DISABLED — restore when real analytics API is integrated.
  // { label: 'Analytics', path: '/operator/analytics', icon: 'chart' },

  // REPORT FEATURE DISABLED — keep this code for future re-enable.
  // { label: 'Reports', path: '/operator/reports', icon: 'file' },

  { label: 'Notifications', path: '/operator/notifications', icon: 'bell' },
  { label: 'Profile', path: '/operator/profile', icon: 'user' },
];
