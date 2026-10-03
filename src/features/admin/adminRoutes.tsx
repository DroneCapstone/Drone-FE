import { Navigate, type RouteObject } from "react-router-dom";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { HubsPage } from "./pages/network/HubsPage";
import { DronesPage } from "./pages/network/DronesPage";
import { DroneDetailPage } from "./pages/network/DroneDetailPage";
import { BatteriesPage } from "./pages/network/BatteriesPage";
import { AdminUsersPage } from "./pages/users/AdminUsersPage";
import { AdminUserDetailPage } from "./pages/users/AdminUserDetailPage";
import { RolesPermissionsPage } from "./pages/users/RolesPermissionsPage";
import { AuditLogsPage } from "./pages/audit/AuditLogsPage";
import { DataGovernanceOverviewPage } from "./pages/data/DataGovernanceOverviewPage";
import { DataQualityPage } from "./pages/data/DataQualityPage";
import { SystemLogsPage } from "./pages/system/SystemLogsPage";
import { ActivityLogPage } from "./pages/system/ActivityLogPage";
import { AdminSettingsPage } from "./pages/system/AdminSettingsPage";
import { AdminNotificationsPage } from "./pages/system/AdminNotificationsPage";
import { BackupPage } from "./pages/system/BackupPage";
import { AdminProfilePage } from "./pages/profile/AdminProfilePage";

export const adminRoutes: RouteObject[] = [
  { index: true, element: <Navigate to="dashboard" replace /> },
  { path: "dashboard", element: <AdminDashboardPage /> },
  { path: "network", element: <Navigate to="/admin/network/hubs" replace /> },
  { path: "network/hubs", element: <HubsPage /> },
  { path: "network/drones", element: <DronesPage /> },
  { path: "network/drones/:droneId", element: <DroneDetailPage /> },
  { path: "network/batteries", element: <BatteriesPage /> },
  { path: "users", element: <AdminUsersPage /> },
  { path: "users/roles", element: <RolesPermissionsPage /> },
  { path: "users/:userId", element: <AdminUserDetailPage /> },
  { path: "audit/logs", element: <AuditLogsPage /> },
  { path: "data/overview", element: <DataGovernanceOverviewPage /> },
  { path: "data/quality", element: <DataQualityPage /> },
  { path: "system/logs", element: <SystemLogsPage /> },
  { path: "system/activity", element: <ActivityLogPage /> },
  { path: "system/settings", element: <AdminSettingsPage /> },
  { path: "system/notifications", element: <AdminNotificationsPage /> },
  { path: "system/backup", element: <BackupPage /> },
  { path: "profile", element: <AdminProfilePage /> },
  { path: "*", element: <Navigate to="/admin/dashboard" replace /> },
];
