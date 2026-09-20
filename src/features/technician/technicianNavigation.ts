import type { LucideIcon } from "lucide-react";

import {
  Bell,
  LayoutDashboard,
  Plane,
  UserRound,
  Wrench,
} from "lucide-react";

export type TechnicianNavigationChild = {
  label: string;
  path: string;
};

export type TechnicianNavigationItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  children?: TechnicianNavigationChild[];
};

export const technicianNavigation: TechnicianNavigationItem[] = [
  {
    label: "Dashboard",
    path: "/technician/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Fleet",
    path: "/technician/fleet",
    icon: Plane,
  },
  {
    label: "Maintenance",
    path: "/technician/maintenance",
    icon: Wrench,
    children: [
      {
        label: "Maintenance alerts",
        path: "/technician/maintenance/alerts",
      },
      {
        label: "Work orders",
        path: "/technician/maintenance/work-orders",
      },
    ],
  },
  {
    label: "Notifications",
    path: "/technician/notifications",
    icon: Bell,
  },
  {
    label: "Profile",
    path: "/technician/profile",
    icon: UserRound,
  },
];
