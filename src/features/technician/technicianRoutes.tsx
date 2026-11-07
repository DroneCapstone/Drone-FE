import {
  Navigate,
  Outlet,
  type RouteObject,
} from "react-router-dom";

import {
  TechnicianDashboardPage,
} from "./pages/TechnicianDashboardPage";
import { FleetPage } from "./pages/FleetPage";
import { TransitMissionsPage } from "./pages/TransitMissionsPage";
import { BatteryManagementPage } from "./pages/BatteryManagementPage";
import { BatteryDetailPage } from "./pages/BatteryDetailPage";
import { DroneDetailPage } from "./pages/DroneDetailPage";
import { OutboundDeliveriesPage } from "./pages/OutboundDeliveriesPage";
import { DeliveryConfirmationsPage } from "./pages/DeliveryConfirmationsPage";
import { MaintenancePage } from "./pages/MaintenancePage";
import { HubSuppliesPage } from "./pages/HubSuppliesPage";
import { MaintenanceAlertsPage } from "./pages/MaintenanceAlertsPage";
import { WorkOrdersPage } from "./pages/WorkOrdersPage";
import { WorkOrderDetailPage } from "./pages/WorkOrderDetailPage";
import { TechnicianNotificationsPage } from "./pages/TechnicianNotificationsPage";
import { TechnicianProfilePage } from "./pages/TechnicianProfilePage";
import { TechnicianQueryProvider } from "./query/TechnicianQueryProvider";

function TechnicianQueryBoundary() {
  return (
    <TechnicianQueryProvider>
      <Outlet />
    </TechnicianQueryProvider>
  );
}

/**
 * One QueryClient boundary for all Technician route pages.
 *
 * Previously every page created its own QueryClientProvider wrapper. That was
 * redundant and made request behaviour harder to reason about while moving
 * between pages. The route boundary keeps a single Technician cache alive for
 * the active Technician workspace.
 */
export const technicianRoutes: RouteObject[] = [
  {
    element: <TechnicianQueryBoundary />,
    children: [
      {
        index: true,
        element: <Navigate to="dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <TechnicianDashboardPage />,
      },

      /* Fleet */
      {
        path: "fleet",
        element: <FleetPage />,
      },
      {
        path: "fleet/transit",
        element: <TransitMissionsPage />,
      },
      {
        path: "fleet/batteries",
        element: <BatteryManagementPage />,
      },
      {
        path: "fleet/batteries/:batteryId",
        element: <BatteryDetailPage />,
      },
      {
        path: "fleet/:droneId",
        element: <DroneDetailPage />,
      },

      /* Deliveries */
      {
        path: "deliveries/outbound",
        element: <OutboundDeliveriesPage />,
      },
      {
        path: "deliveries/confirmations",
        element: <DeliveryConfirmationsPage />,
      },

      /* Maintenance */
      {
        path: "maintenance/supplies",
        element: <HubSuppliesPage />,
      },
      {
        path: "maintenance",
        element: <MaintenancePage />,
      },
      {
        path: "maintenance/alerts",
        element: <MaintenanceAlertsPage />,
      },
      {
        path: "maintenance/work-orders",
        element: <WorkOrdersPage />,
      },
      {
        path: "maintenance/work-orders/:workOrderId",
        element: <WorkOrderDetailPage />,
      },

      {
        path: "notifications",
        element: <TechnicianNotificationsPage />,
      },
      {
        path: "profile",
        element: <TechnicianProfilePage />,
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
    ],
  },
];
