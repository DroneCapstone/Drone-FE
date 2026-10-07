import type { LucideIcon } from "lucide-react";
import {
  CreditCard,
  Gauge,
  MapPinned,
  ScrollText,
  Settings,
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
    label: "Network & Assets",
    path: "/admin/network/hubs",
    icon: MapPinned,
    children: [
      { label: "Hubs", path: "/admin/network/hubs" },
      { label: "Drones", path: "/admin/network/drones" },
      { label: "Batteries", path: "/admin/network/batteries" },
    ],
  },
  { label: "Users", path: "/admin/users", icon: Users },
  {
    label: "Payments",
    path: "/admin/payments/transactions",
    icon: CreditCard,
    children: [
      { label: "Transactions", path: "/admin/payments/transactions" },
      { label: "Refunds", path: "/admin/payments/refunds" },
    ],
  },
  { label: "Audit Logs", path: "/admin/audit", icon: ScrollText },
  { label: "System Settings", path: "/admin/settings", icon: Settings },
  { label: "Profile", path: "/admin/profile", icon: UserRound },
];
