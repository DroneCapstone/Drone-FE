import { Navigate, type RouteObject } from 'react-router-dom';
import { AnalyticsPage } from '../features/operator/pages/AnalyticsPage';
import { DashboardPage } from '../features/operator/pages/DashboardPage';
import { NotificationsPage } from '../features/operator/pages/NotificationsPage';
import { ProfilePage } from '../features/operator/pages/ProfilePage';
import { ReportsPage } from '../features/operator/pages/ReportsPage';
import { ExplainabilityPage } from '../features/operator/pages/ai/ExplainabilityPage';
import { PredictionPage } from '../features/operator/pages/ai/PredictionPage';
import { RecommendationPage } from '../features/operator/pages/ai/RecommendationPage';
import { SimulationPage } from '../features/operator/pages/ai/SimulationPage';
import { AllMissionsPage } from '../features/operator/pages/missions/AllMissionsPage';
import { ApprovalQueuePage } from '../features/operator/pages/missions/ApprovalQueuePage';
import { CreateMissionPage } from '../features/operator/pages/missions/CreateMissionPage';
import { MissionDetailPage } from '../features/operator/pages/missions/MissionDetailPage';
import { IncidentsPage } from '../features/operator/pages/operations/IncidentsPage';
import { LiveTrackingPage } from '../features/operator/pages/operations/LiveTrackingPage';
import { TelemetryPage } from '../features/operator/pages/operations/TelemetryPage';

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
