import type { LucideIcon } from "lucide-react";
import {
  ClipboardCheck,
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
      { label: "Spare Parts", path: "/admin/network/drones/spare-parts" },
      { label: "Batteries", path: "/admin/network/batteries" },
    ],
  },
  { label: "Approvals", path: "/admin/approvals", icon: ClipboardCheck },
  { label: "Users", path: "/admin/users", icon: Users },
  {
    label: "Payments",
    path: "/admin/payments/transactions",
    icon: CreditCard,
    children: [
      { label: "Transactions", path: "/admin/payments/transactions" },
      { label: "Refunds", path: "/admin/payments/refunds" },
      { label: "Financial Overview", path: "/admin/payments/financial" },
    ],
  },
  { label: "Audit & Logs", path: "/admin/audit", icon: ScrollText, children: [
    { label: "Audit Logs", path: "/admin/audit" },
    { label: "Activity Logs", path: "/admin/audit/activity" },
    { label: "System Logs", path: "/admin/audit/system" },
  ] },
  { label: "System Settings", path: "/admin/settings", icon: Settings },
  { label: "Profile", path: "/admin/profile", icon: UserRound },
];

/**
 * Resolve one active navigation child even when child paths are nested.
 * Example: /network/drones/spare-parts must select Spare Parts, not Drones.
 * Drone detail URLs still select the Drones child.
 */
export function getActiveAdminChildPath(
  pathname: string,
  children: NonNullable<AdminNavigationItem["children"]>,
): string | undefined {
  return children
    .filter(({ path }) => pathname === path || pathname.startsWith(`${path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0]?.path;
}
