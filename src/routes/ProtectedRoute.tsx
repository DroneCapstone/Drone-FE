import type { ReactNode } from "react";

import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../features/auth/hooks/useAuth";

import type {
  UserRole,
} from "../features/auth/types/auth";

interface ProtectedRouteProps {
  children?: ReactNode;

  allowedRoles?: UserRole[];

  redirectTo?: string;
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

  if (
    allowedRoles &&
    user &&
    !allowedRoles.includes(user.role)
  ) {
    return (
      <Navigate
        to={
          user.role === "technician"
            ? "/technician/dashboard"
            : "/operator/dashboard"
        }
        replace
      />
    );
  }

  return children ?? <Outlet />;
}