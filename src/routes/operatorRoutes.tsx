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
  () => import("../features/operator/pages/AnalyticsPage"),
  "AnalyticsPage",
);

const DashboardPage = lazyPage(
  () => import("../features/operator/pages/DashboardPage"),
  "DashboardPage",
);

const NotificationsPage = lazyPage(
  () => import("../features/operator/pages/NotificationsPage"),
  "NotificationsPage",
);

const ProfilePage = lazyPage(
  () => import("../features/operator/pages/ProfilePage"),
  "ProfilePage",
);

// REPORT FEATURE DISABLED — keep import code for future re-enable.
// const ReportsPage = lazyPage(
//   () => import("../features/operator/pages/ReportsPage"),
//   "ReportsPage",
// );

/* =========================================================
   ORDERS
========================================================= */

const AllOrdersPage = lazyPage(
  () =>
    import(
      "../features/operator/pages/orders/AllOrdersPage"
    ),
  "AllOrdersPage",
);

const OrderDetailPage = lazyPage(
  () =>
    import(
      "../features/operator/pages/orders/OrderDetailPage"
    ),
  "OrderDetailPage",
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
   FLEET & NETWORK
========================================================= */

const DroneAvailabilityPage = lazyPage(
  () =>
    import(
      "../features/operator/pages/fleet/DroneAvailabilityPage"
    ),
  "DroneAvailabilityPage",
);

const HubNetworkPage = lazyPage(
  () =>
    import(
      "../features/operator/pages/hubs/HubNetworkPage"
    ),
  "HubNetworkPage",
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
   AI DECISION CENTER
========================================================= */

const MissionAnalysisPage = lazyPage(
  () =>
    import(
      "../features/operator/pages/ai/MissionAnalysisPage"
    ),
  "MissionAnalysisPage",
);

const SimulationPage = lazyPage(
  () =>
    import(
      "../features/operator/pages/ai/SimulationPage"
    ),
  "SimulationPage",
);

const ModelInsightsPage = lazyPage(
  () =>
    import(
      "../features/operator/pages/ai/ModelInsightsPage"
    ),
  "ModelInsightsPage",
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

  /* =========================
     DASHBOARD
  ========================= */

  {
    path: "dashboard",
    element: <DashboardPage />,
  },

  /* =========================
     ORDERS
  ========================= */

  {
    path: "orders",
    element: (
      <Navigate
        to="/operator/orders/all"
        replace
      />
    ),
  },

  {
    path: "orders/all",
    element: <AllOrdersPage />,
  },

  {
    path: "orders/ready",
    element: <AllOrdersPage />,
  },

  {
    path: "orders/:orderId",
    element: <OrderDetailPage />,
  },

  /* =========================
     FLIGHT MISSIONS
  ========================= */

  {
    path: "missions",
    element: (
      <Navigate
        to="/operator/missions/all"
        replace
      />
    ),
  },

  {
    path: "missions/all",
    element: <AllMissionsPage />,
  },

  {
    path: "missions/create",
    element: <CreateMissionPage />,
  },

  // Backward-compatible route.
  {
    path: "missions/detail",
    element: <MissionDetailPage />,
  },

  {
    path: "missions/:missionId",
    element: <MissionDetailPage />,
  },

  /* =========================
     FLEET & NETWORK
  ========================= */

  {
    path: "fleet-hubs",
    element: (
      <Navigate
        to="/operator/fleet-hubs/drones"
        replace
      />
    ),
  },

  {
    path: "fleet-hubs/drones",
    element: <DroneAvailabilityPage />,
  },

  {
    path: "fleet-hubs/hubs",
    element: <HubNetworkPage />,
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
     AI DECISION CENTER
  ========================= */

  {
    path: "ai/mission-analysis",
    element: <MissionAnalysisPage />,
  },

  {
    path: "ai/simulation",
    element: <SimulationPage />,
  },

  {
    path: "ai/model-insights",
    element: <ModelInsightsPage />,
  },

  // Backward-compatible redirects from old AI routes.
  {
    path: "ai/prediction",
    element: (
      <Navigate
        to="/operator/ai/mission-analysis"
        replace
      />
    ),
  },

  {
    path: "ai/explainability",
    element: (
      <Navigate
        to="/operator/ai/mission-analysis"
        replace
      />
    ),
  },

  {
    path: "ai/recommendation",
    element: (
      <Navigate
        to="/operator/ai/mission-analysis"
        replace
      />
    ),
  },

  /* =========================
     OTHER
  ========================= */

  {
    path: "analytics",
    element: <AnalyticsPage />,
  },

  // REPORT FEATURE DISABLED — keep route code for future re-enable.
  // {
  //   path: "reports",
  //   element: <ReportsPage />,
  // },

  {
    path: "notifications",
    element: <NotificationsPage />,
  },

  {
    path: "profile",
    element: <ProfilePage />,
  },
];