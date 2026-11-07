import { Navigate, type RouteObject } from "react-router-dom";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { HubsPage } from "./pages/network/HubsPage";
import { HubDetailPage } from "./pages/network/HubDetailPage";
import { DronesPage } from "./pages/network/DronesPage";
import { DroneDetailPage } from "./pages/network/DroneDetailPage";
import { BatteriesPage } from "./pages/network/BatteriesPage";
import { BatteryDetailPage } from "./pages/network/BatteryDetailPage";
import { AdminUsersPage } from "./pages/users/AdminUsersPage";
import { AdminUserDetailPage } from "./pages/users/AdminUserDetailPage";
import { TransactionsPage } from "./pages/payments/TransactionsPage";
import { RefundsPage } from "./pages/payments/RefundsPage";
import { ExpensesPage } from "./pages/payments/ExpensesPage";
import { AuditLogsPage } from "./pages/audit/AuditLogsPage";
import { AdminSettingsPage } from "./pages/system/AdminSettingsPage";
import { ApprovalsPage } from "./pages/approvals/ApprovalsPage";
import { SparePartsPage } from "./pages/network/SparePartsPage";
import { SystemLogsPage } from "./pages/system/SystemLogsPage";
import { ActivityLogPage } from "./pages/system/ActivityLogPage";
import { AdminNotificationsPage } from "./pages/system/AdminNotificationsPage";
import { AdminProfilePage } from "./pages/profile/AdminProfilePage";

export const adminRoutes: RouteObject[] = [
  { index: true, element: <Navigate to="dashboard" replace /> },
  { path: "dashboard", element: <AdminDashboardPage /> },
  { path: "network", element: <Navigate to="/admin/network/hubs" replace /> },
  { path: "network/hubs", element: <HubsPage /> },
  { path: "network/hubs/:hubId", element: <HubDetailPage /> },
  { path: "network/drones", element: <DronesPage /> },
  { path: "network/drones/:droneId", element: <DroneDetailPage /> },
  { path: "network/drones/spare-parts", element: <SparePartsPage /> },
  { path: "approvals", element: <ApprovalsPage /> },
  { path: "network/batteries", element: <BatteriesPage /> },
  { path: "network/batteries/:batteryId", element: <BatteryDetailPage /> },
  { path: "users", element: <AdminUsersPage /> },
  { path: "users/:userId", element: <AdminUserDetailPage /> },
  { path: "payments", element: <Navigate to="/admin/payments/transactions" replace /> },
  { path: "payments/transactions", element: <TransactionsPage /> },
  { path: "payments/refunds", element: <RefundsPage /> },
  { path: "payments/financial", element: <ExpensesPage /> },
  { path: "audit", element: <AuditLogsPage /> },
  { path: "audit/system", element: <SystemLogsPage /> },
  { path: "audit/activity", element: <ActivityLogPage /> },
  { path: "notifications", element: <AdminNotificationsPage /> },
  { path: "settings", element: <AdminSettingsPage /> },
  { path: "profile", element: <AdminProfilePage /> },
  { path: "*", element: <Navigate to="/admin/dashboard" replace /> },
];
