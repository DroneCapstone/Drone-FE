import {
  Navigate,
  type RouteObject,
} from "react-router-dom";

import {
  TechnicianDashboardPage,
} from "./pages/TechnicianDashboardPage";

import {
  FleetPage,
} from "./pages/FleetPage";

import {
  TransitMissionsPage,
} from "./pages/TransitMissionsPage";

import {
  BatteryManagementPage,
} from "./pages/BatteryManagementPage";

import {
  DroneDetailPage,
} from "./pages/DroneDetailPage";

import {
  OutboundDeliveriesPage,
} from "./pages/OutboundDeliveriesPage";

import {
  DeliveryConfirmationsPage,
} from "./pages/DeliveryConfirmationsPage";

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

export const technicianRoutes:
  RouteObject[] = [
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

  /* Fleet */
  {
    path: "fleet",
    element: <FleetPage />,
  },
  {
    path: "fleet/transit",
    element: (
      <TransitMissionsPage />
    ),
  },
  {
    path: "fleet/batteries",
    element: (
      <BatteryManagementPage />
    ),
  },
  {
    path: "fleet/:droneId",
    element: (
      <DroneDetailPage />
    ),
  },

  /* Deliveries */
  {
    path: "deliveries/outbound",
    element: (
      <OutboundDeliveriesPage />
    ),
  },
  {
    path: "deliveries/confirmations",
    element: (
      <DeliveryConfirmationsPage />
    ),
  },

  /* Maintenance */
  {
    path: "maintenance",
    element: (
      <MaintenancePage />
    ),
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

  {
    path: "*",
    element: (
      <Navigate
        to="/technician/dashboard"
        replace
      />
    ),
  },
];
