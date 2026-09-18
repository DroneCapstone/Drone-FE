import { lazy, type ComponentType } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';

const lazyPage = <TModule, TKey extends keyof TModule>(
  loader: () => Promise<TModule>,
  key: TKey,
) => lazy(() => loader().then((module) => ({ default: module[key] as ComponentType })));

const AnalyticsPage = lazyPage(() => import('../features/operator/pages/AnalyticsPage'), 'AnalyticsPage');
const DashboardPage = lazyPage(() => import('../features/operator/pages/DashboardPage'), 'DashboardPage');
const NotificationsPage = lazyPage(() => import('../features/operator/pages/NotificationsPage'), 'NotificationsPage');
const ProfilePage = lazyPage(() => import('../features/operator/pages/ProfilePage'), 'ProfilePage');
const ReportsPage = lazyPage(() => import('../features/operator/pages/ReportsPage'), 'ReportsPage');
const ExplainabilityPage = lazyPage(() => import('../features/operator/pages/ai/ExplainabilityPage'), 'ExplainabilityPage');
const PredictionPage = lazyPage(() => import('../features/operator/pages/ai/PredictionPage'), 'PredictionPage');
const RecommendationPage = lazyPage(() => import('../features/operator/pages/ai/RecommendationPage'), 'RecommendationPage');
const SimulationPage = lazyPage(() => import('../features/operator/pages/ai/SimulationPage'), 'SimulationPage');
const AllMissionsPage = lazyPage(() => import('../features/operator/pages/missions/AllMissionsPage'), 'AllMissionsPage');
const ApprovalQueuePage = lazyPage(() => import('../features/operator/pages/missions/ApprovalQueuePage'), 'ApprovalQueuePage');
const CreateMissionPage = lazyPage(() => import('../features/operator/pages/missions/CreateMissionPage'), 'CreateMissionPage');
const MissionDetailPage = lazyPage(() => import('../features/operator/pages/missions/MissionDetailPage'), 'MissionDetailPage');
const IncidentsPage = lazyPage(() => import('../features/operator/pages/operations/IncidentsPage'), 'IncidentsPage');
const LiveTrackingPage = lazyPage(() => import('../features/operator/pages/operations/LiveTrackingPage'), 'LiveTrackingPage');
const TelemetryPage = lazyPage(() => import('../features/operator/pages/operations/TelemetryPage'), 'TelemetryPage');

export const operatorRoutes: RouteObject[] = [
  { index: true, element: <Navigate to="/operator/dashboard" replace/> },
  { path: '/operator/dashboard', element: <DashboardPage/> },
  { path: '/operator/missions/all', element: <AllMissionsPage/> },
  { path: '/operator/missions/create', element: <CreateMissionPage/> },
  { path: '/operator/missions/detail', element: <MissionDetailPage/> },
  { path: '/operator/missions/:missionId', element: <MissionDetailPage/> },
  { path: '/operator/missions/approvals', element: <ApprovalQueuePage/> },
  { path: '/operator/operations/live', element: <LiveTrackingPage/> },
  { path: '/operator/operations/telemetry', element: <TelemetryPage/> },
  { path: '/operator/operations/incidents', element: <IncidentsPage/> },
  { path: '/operator/ai/prediction', element: <PredictionPage/> },
  { path: '/operator/ai/explainability', element: <ExplainabilityPage/> },
  { path: '/operator/ai/recommendation', element: <RecommendationPage/> },
  { path: '/operator/ai/simulation', element: <SimulationPage/> },
  { path: '/operator/analytics', element: <AnalyticsPage/> },
  { path: '/operator/reports', element: <ReportsPage/> },
  { path: '/operator/notifications', element: <NotificationsPage/> },
  { path: '/operator/profile', element: <ProfilePage/> },
];
