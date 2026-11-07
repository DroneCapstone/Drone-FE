import type {
  LucideIcon,
} from "lucide-react";

import {
  Bell,
  LayoutDashboard,
  PackageCheck,
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

export const technicianNavigation:
  TechnicianNavigationItem[] = [
  {
    label: "Dashboard",
    path: "/technician/dashboard",
    icon: LayoutDashboard,
  },

  {
    label: "Fleet",
    path: "/technician/fleet",
    icon: Plane,
    children: [
      {
        label: "Hub fleet",
        path: "/technician/fleet",
      },
      {
        label: "Transit missions",
        path: "/technician/fleet/transit",
      },
      {
        label: "Battery management",
        path: "/technician/fleet/batteries",
      },
    ],
  },

  {
    label: "Deliveries",
    path: "/technician/deliveries/outbound",
    icon: PackageCheck,
    children: [
      {
        label: "Outbound deliveries",
        path: "/technician/deliveries/outbound",
      },
      {
        label: "Delivery confirmations",
        path: "/technician/deliveries/confirmations",
      },
    ],
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
      {
        label: "Hub supplies",
        path: "/technician/maintenance/supplies",
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
