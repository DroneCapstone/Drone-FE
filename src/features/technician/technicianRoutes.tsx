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
  WorkOrderDetailPage,
} from "./pages/WorkOrderDetailPage";

import {
  IncidentsPage,
} from "./pages/IncidentsPage";

import {
  TechnicianReportsPage,
} from "./pages/TechnicianReportsPage";

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

  {
    path: "maintenance",
    element: <MaintenancePage />,
  },

  {
    path:
      "maintenance/work-orders/:workOrderId",

    element: (
      <WorkOrderDetailPage />
    ),
  },

  {
    path: "incidents",
    element: <IncidentsPage />,
  },

  {
    path: "reports",
    element: (
      <TechnicianReportsPage />
    ),
  },

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