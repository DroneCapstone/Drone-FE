import {
  Navigate,
} from "react-router-dom";

import type {
  RouteObject,
} from "react-router-dom";

import {
  TechnicianDashboardPage,
} from "./pages/TechnicianDashboardPage";

import {
  FleetPage,
} from "./pages/FleetPage";

import {
  DroneDetailPage,
} from "./pages/DroneDetailPage";

import {
  MaintenancePage,
} from "./pages/MaintenancePage";

import {
  MaintenanceAlertsPage,
} from "./pages/MaintenanceAlertsPage";

import {
  WorkOrdersPage,
} from "./pages/WorkOrdersPage";

import {
  WorkOrderDetailPage,
} from "./pages/WorkOrderDetailPage";


import {
  TechnicianNotificationsPage,
} from "./pages/TechnicianNotificationsPage";

import {
  TechnicianProfilePage,
} from "./pages/TechnicianProfilePage";

export const technicianRoutes: RouteObject[] = [
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
    element: (
      <TechnicianDashboardPage />
    ),
  },

  {
    path: "fleet",
    element: <FleetPage />,
  },

  {
    path: "fleet/:droneId",
    element: <DroneDetailPage />,
  },

  // =========================
  // MAINTENANCE
  // =========================

  {
    path: "maintenance",
    element: <MaintenancePage />,
  },

  {
    path: "maintenance/alerts",
    element: (
      <MaintenanceAlertsPage />
    ),
  },

  {
    path: "maintenance/work-orders",
    element: (
      <WorkOrdersPage />
    ),
  },

  {
    path:
      "maintenance/work-orders/:workOrderId",
    element: (
      <WorkOrderDetailPage />
    ),
  },

  // =========================
  // OTHER
  // =========================


  {
    path: "notifications",
    element: (
      <TechnicianNotificationsPage />
    ),
  },

  {
    path: "profile",
    element: (
      <TechnicianProfilePage />
    ),
  },
];