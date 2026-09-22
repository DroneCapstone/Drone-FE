import type { ReactNode } from "react";

import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../features/auth/hooks/useAuth";

import type { UserRole } from "../features/auth/types/auth";

interface ProtectedRouteProps {
  children?: ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

function getRoleHome(role?: UserRole) {
  switch (role) {
    case "operator":
      return "/operator/dashboard";

    case "technician":
      return "/technician/dashboard";

    case "customer":
      return "/customer/dashboard";

    case "admin":
      return "/admin/dashboard";

    default:
      return "/";
  }
}

export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const location = useLocation();

  const {
    user,
    isAuthenticated,
  } = useAuth();

  /* =========================
     NOT LOGGED IN
  ========================= */

  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  /* =========================
     WRONG ROLE
  ========================= */

  if (
    allowedRoles &&
    user &&
    !allowedRoles.includes(user.role)
  ) {
    return (
      <Navigate
        to={getRoleHome(user.role)}
        replace
      />
    );
  }

  return children ?? <Outlet />;
}