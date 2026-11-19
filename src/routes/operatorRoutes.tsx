import { lazy, type ComponentType } from "react";
import { Navigate, useLocation, type RouteObject } from "react-router-dom";

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

// ANALYTICS TEMPORARILY DISABLED — preserve original lazy import.
// const AnalyticsPage = lazyPage(
//   () => import("../features/operator/pages/AnalyticsPage"),
//   "AnalyticsPage",
// );

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

const BatteryInventoryPage = lazyPage(
  () => import("../features/operator/pages/fleet/BatteryInventoryPage"),
  "BatteryInventoryPage",
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

const FlightHistoryPage = lazyPage(
  () => import("../features/operator/pages/operations/FlightHistoryPage"),
  "FlightHistoryPage",
);

const FlightReplayPage = lazyPage(
  () => import("../features/operator/pages/operations/FlightReplayPage"),
  "FlightReplayPage",
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

// Scenario simulation disabled — leave lazy import commented for future re-enable.
// const SimulationPage = lazyPage(
//   () =>
//     import(
//       "../features/operator/pages/ai/SimulationPage"
//     ),
//   "SimulationPage",
// );

// Model Insights is intentionally hidden while its metrics are mock values.
// Keep the lazy import for re-enable once real metrics are available.
// const ModelInsightsPage = lazyPage(
//   () => import("../features/operator/pages/ai/ModelInsightsPage"),
//   "ModelInsightsPage",
// );

/** Only the Create Mission route review may open mission-level AI analysis. */
function MissionAnalysisEntry() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const hasDraftContext = params.get('returnTo') === 'mission-create'
    && Boolean(params.get('orderId') && params.get('droneId') && params.get('batteryId') && params.get('routeId'));
  return hasDraftContext ? <MissionAnalysisPage /> : <Navigate to="/operator/missions/all" replace />;
}


/** Allow AI analysis from Create Mission and Flight Mission. */
// function MissionAnalysisEntry() {
//   const { search } = useLocation();
//   const params = new URLSearchParams(search);

//   const hasDraftContext =
//     params.get('returnTo') === 'mission-create' &&
//     Boolean(
//       params.get('orderId') &&
//       params.get('droneId') &&
//       params.get('batteryId') &&
//       params.get('routeId')
//     );

//   const hasFlightMissionContext =
//     params.get('returnTo') !== 'mission-create' &&
//     Boolean(
//       params.get('orderId') &&
//       params.get('droneId') &&
//       params.get('batteryId') &&
//       params.get('routeId')
//     );

//   return hasDraftContext || hasFlightMissionContext
//     ? <MissionAnalysisPage />
//     : <Navigate to="/operator/missions/all" replace />;
// }


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

  {
    path: "fleet-hubs/batteries",
    element: <BatteryInventoryPage />,
  },

  /* =========================
     OPERATIONS
  ========================= */

  {
    path: "operations/live",
    element: <LiveTrackingPage />,
  },

  {
    path: "operations/history",
    element: <FlightHistoryPage />,
  },

  {
    path: "operations/history/:missionId",
    element: <FlightReplayPage />,
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
    element: <MissionAnalysisEntry />,
  },

  // Scenario simulation disabled — leave route commented for future re-enable.
  // {
  //   path: "ai/simulation",
  //   element: <SimulationPage />,
  // },

  // Model Insights page is preserved, but the mock-metrics screen is inaccessible.
  // { path: "ai/model-insights", element: <ModelInsightsPage /> },
  {
    path: "ai/model-insights",
    element: <Navigate to="/operator/missions/all" replace />,
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

  // ANALYTICS TEMPORARILY DISABLED — preserve original route.
  // {
  //   path: "analytics",
  //   element: <AnalyticsPage />,
  // },

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