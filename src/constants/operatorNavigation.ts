import type { OperatorNavItem } from '../features/operator/types/operator';

export const operatorNavigation: OperatorNavItem[] = [
  { label: 'Dashboard', path: '/operator/dashboard', icon: 'grid' },
  {
    label: 'Missions', path: '/operator/missions/all', icon: 'mission',
    children: [
      { label: 'All missions', path: '/operator/missions/all' },
      { label: 'Create mission', path: '/operator/missions/create' },
      { label: 'Mission detail', path: '/operator/missions/detail' },
      { label: 'Approval queue', path: '/operator/missions/approvals' },
    ],
  },
  {
    label: 'Operations', path: '/operator/operations/live', icon: 'radar',
    children: [
      { label: 'Live tracking', path: '/operator/operations/live' },
      { label: 'Telemetry', path: '/operator/operations/telemetry' },
      { label: 'Incidents', path: '/operator/operations/incidents' },
    ],
  },
  {
    label: 'AI Decision Center', path: '/operator/ai/prediction', icon: 'spark',
    children: [
      { label: 'Prediction', path: '/operator/ai/prediction' },
      { label: 'Explainability', path: '/operator/ai/explainability' },
      { label: 'Recommendation', path: '/operator/ai/recommendation' },
      { label: 'What-if simulation', path: '/operator/ai/simulation' },
    ],
  },
  { label: 'Analytics', path: '/operator/analytics', icon: 'chart' },
  { label: 'Reports', path: '/operator/reports', icon: 'file' },
  { label: 'Notifications', path: '/operator/notifications', icon: 'bell' },
  { label: 'Profile', path: '/operator/profile', icon: 'user' },
];
