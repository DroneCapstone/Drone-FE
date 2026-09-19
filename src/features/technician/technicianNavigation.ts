import {
  Bell,
  FileText,
  LayoutDashboard,
  Plane,
  TriangleAlert,
  User,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export interface TechnicianNavigationItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

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
  },
  {
    label: "Incidents",
    path: "/technician/incidents",
    icon: TriangleAlert,
  },
  {
    label: "Reports",
    path: "/technician/reports",
    icon: FileText,
  },
  {
    label: "Notifications",
    path: "/technician/notifications",
    icon: Bell,
  },
  {
    label: "Profile",
    path: "/technician/profile",
    icon: User,
  },
];