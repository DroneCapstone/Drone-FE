import { lazy, type ComponentType } from "react";
import { Navigate, type RouteObject } from "react-router-dom";

const lazyPage = <
  TModule,
  TKey extends keyof TModule,
>(
  loader: () => Promise<TModule>,
  key: TKey,
) =>
  lazy(() =>
    loader().then((module) => ({
      default: module[key] as ComponentType,
    })),
  );

/* =========================================================
   GENERAL
========================================================= */

const AnalyticsPage = lazyPage(
  () =>
    import(
      "../features/operator/pages/AnalyticsPage"
    ),
  "AnalyticsPage",
);

const DashboardPage = lazyPage(
  () =>
    import(
      "../features/operator/pages/DashboardPage"
    ),
  "DashboardPage",
);

const NotificationsPage = lazyPage(
  () =>
    import(
      "../features/operator/pages/NotificationsPage"
    ),
  "NotificationsPage",
);

const ProfilePage = lazyPage(
  () =>
    import(
      "../features/operator/pages/ProfilePage"
    ),
  "ProfilePage",
);

const ReportsPage = lazyPage(
  () =>
    import(
      "../features/operator/pages/ReportsPage"
    ),
  "ReportsPage",
);

/* =========================================================
   AI
========================================================= */

const ExplainabilityPage = lazyPage(
  () =>
    import(
      "../features/operator/pages/ai/ExplainabilityPage"
    ),
  "ExplainabilityPage",
);

const PredictionPage = lazyPage(
  () =>
    import(
      "../features/operator/pages/ai/PredictionPage"
    ),
  "PredictionPage",
);

const RecommendationPage = lazyPage(
  () =>
    import(
      "../features/operator/pages/ai/RecommendationPage"
    ),
  "RecommendationPage",
);

const SimulationPage = lazyPage(
  () =>
    import(
      "../features/operator/pages/ai/SimulationPage"
    ),
  "SimulationPage",
);

/* =========================================================
   MISSIONS
========================================================= */

const AllMissionsPage = lazyPage(
  () =>
    import(
      "../features/operator/pages/missions/AllMissionsPage"
    ),
  "AllMissionsPage",
);

const ApprovalQueuePage = lazyPage(
  () =>
    import(
      "../features/operator/pages/missions/ApprovalQueuePage"
    ),
  "ApprovalQueuePage",
);

const CreateMissionPage = lazyPage(
  () =>
    import(
      "../features/operator/pages/missions/CreateMissionPage"
    ),
  "CreateMissionPage",
);

const MissionDetailPage = lazyPage(
  () =>
    import(
      "../features/operator/pages/missions/MissionDetailPage"
    ),
  "MissionDetailPage",
);

/* =========================================================
   OPERATIONS
========================================================= */

const IncidentsPage = lazyPage(
  () =>
    import(
      "../features/operator/pages/operations/IncidentsPage"
    ),
  "IncidentsPage",
);

const LiveTrackingPage = lazyPage(
  () =>
    import(
      "../features/operator/pages/operations/LiveTrackingPage"
    ),
  "LiveTrackingPage",
);

const TelemetryPage = lazyPage(
  () =>
    import(
      "../features/operator/pages/operations/TelemetryPage"
    ),
  "TelemetryPage",
);

/* =========================================================
   ROUTES
========================================================= */

export const operatorRoutes: RouteObject[] = [
  {
    index: true,
    element: (
      <Navigate
        to="dashboard"
        replace
      />
    ),
  },

  {
    path: "dashboard",
    element: <DashboardPage />,
  },

  /* =========================
     MISSIONS
  ========================= */

  {
    path: "missions/all",
    element: <AllMissionsPage />,
  },

  {
    path: "missions/create",
    element: <CreateMissionPage />,
  },

  {
    path: "missions/detail",
    element: <MissionDetailPage />,
  },

  {
    path: "missions/:missionId",
    element: <MissionDetailPage />,
  },

  {
    path: "missions/approvals",
    element: <ApprovalQueuePage />,
  },

  /* =========================
     OPERATIONS
  ========================= */

  {
    path: "operations/live",
    element: <LiveTrackingPage />,
  },

  {
    path: "operations/telemetry",
    element: <TelemetryPage />,
  },

  {
    path: "operations/incidents",
    element: <IncidentsPage />,
  },

  /* =========================
     AI
  ========================= */

  {
    path: "ai/prediction",
    element: <PredictionPage />,
  },

  {
    path: "ai/explainability",
    element: <ExplainabilityPage />,
  },

  {
    path: "ai/recommendation",
    element: <RecommendationPage />,
  },

  {
    path: "ai/simulation",
    element: <SimulationPage />,
  },

  /* =========================
     OTHER
  ========================= */

  {
    path: "analytics",
    element: <AnalyticsPage />,
  },

  {
    path: "reports",
    element: <ReportsPage />,
  },

  {
    path: "notifications",
    element: <NotificationsPage />,
  },

  {
    path: "profile",
    element: <ProfilePage />,
  },
];