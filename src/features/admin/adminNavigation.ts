import type { LucideIcon } from "lucide-react";
import {
  Database,
  Gauge,
  MapPinned,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

export type AdminNavigationItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  children?: Array<{ label: string; path: string }>;
};

export const adminNavigation: AdminNavigationItem[] = [
  { label: "Dashboard", path: "/admin/dashboard", icon: Gauge },
  {
    label: "Hub & Fleet",
    path: "/admin/network/hubs",
    icon: MapPinned,
    children: [
      { label: "Hubs", path: "/admin/network/hubs" },
      { label: "Drones", path: "/admin/network/drones" },
      { label: "Batteries", path: "/admin/network/batteries" },
    ],
  },
  {
    label: "Users",
    path: "/admin/users",
    icon: Users,
    children: [
      { label: "User list", path: "/admin/users" },
      { label: "Roles & permissions", path: "/admin/users/roles" },
    ],
  },
  { label: "Audit", path: "/admin/audit/logs", icon: ShieldCheck },
  {
    label: "Data Governance",
    path: "/admin/data/overview",
    icon: Database,
    children: [
      { label: "Overview", path: "/admin/data/overview" },
      { label: "Data quality", path: "/admin/data/quality" },
    ],
  },
  {
    label: "System",
    path: "/admin/system/logs",
    icon: Settings,
    children: [
      { label: "System logs", path: "/admin/system/logs" },
      { label: "Activity log", path: "/admin/system/activity" },
      { label: "Settings", path: "/admin/system/settings" },
      { label: "Notifications", path: "/admin/system/notifications" },
      { label: "Backup", path: "/admin/system/backup" },
    ],
  },
  { label: "Profile", path: "/admin/profile", icon: UserRound },
];
