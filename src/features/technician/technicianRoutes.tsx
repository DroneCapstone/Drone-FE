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

import {
  TechnicianQueryProvider,
} from "./query/TechnicianQueryProvider";

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
      <TechnicianQueryProvider>
        <TechnicianDashboardPage />
      </TechnicianQueryProvider>
    ),
  },

  /* Fleet */
  {
    path: "fleet",
    element: (
      <TechnicianQueryProvider>
        <FleetPage />
      </TechnicianQueryProvider>
    ),
  },
  {
    path: "fleet/transit",
    element: (
      <TechnicianQueryProvider>
        <TransitMissionsPage />
      </TechnicianQueryProvider>
    ),
  },
  {
    path: "fleet/batteries",
    element: (
      <TechnicianQueryProvider>
        <BatteryManagementPage />
      </TechnicianQueryProvider>
    ),
  },
  {
    path: "fleet/:droneId",
    element: (
      <TechnicianQueryProvider>
        <DroneDetailPage />
      </TechnicianQueryProvider>
    ),
  },

  /* Deliveries */
  {
    path: "deliveries/outbound",
    element: (
      <TechnicianQueryProvider>
        <OutboundDeliveriesPage />
      </TechnicianQueryProvider>
    ),
  },
  {
    path: "deliveries/confirmations",
    element: (
      <TechnicianQueryProvider>
        <DeliveryConfirmationsPage />
      </TechnicianQueryProvider>
    ),
  },

  /* Maintenance */
  {
    path: "maintenance",
    element: (
      <TechnicianQueryProvider>
        <MaintenancePage />
      </TechnicianQueryProvider>
    ),
  },
  {
    path: "maintenance/alerts",
    element: (
      <TechnicianQueryProvider>
        <MaintenanceAlertsPage />
      </TechnicianQueryProvider>
    ),
  },
  {
    path: "maintenance/work-orders",
    element: (
      <TechnicianQueryProvider>
        <WorkOrdersPage />
      </TechnicianQueryProvider>
    ),
  },
  {
    path:
      "maintenance/work-orders/:workOrderId",
    element: (
      <TechnicianQueryProvider>
        <WorkOrderDetailPage />
      </TechnicianQueryProvider>
    ),
  },

  {
    path: "notifications",
    element: (
      <TechnicianQueryProvider>
        <TechnicianNotificationsPage />
      </TechnicianQueryProvider>
    ),
  },
  {
    path: "profile",
    element: (
      <TechnicianQueryProvider>
        <TechnicianProfilePage />
      </TechnicianQueryProvider>
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
