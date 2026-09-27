import type { ReactNode } from "react";

import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../features/auth/hooks/useAuth";

import type { UserRole } from "../features/auth/types/auth";

/* =========================================================
   PROPS
========================================================= */

interface ProtectedRouteProps {
  children?: ReactNode;

  allowedRoles?: UserRole[];

  redirectTo?: string;
}

/* =========================================================
   ROLE HOME
========================================================= */

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

/* =========================================================
   PROTECTED ROUTE
========================================================= */

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

  /* =========================================================
     NOT LOGGED IN

     Ví dụ:
     user nhập trực tiếp /customer/dashboard

     -> chuyển sang /login
     -> lưu route cũ trong state.from
  ========================================================= */

  if (!isAuthenticated || !user) {
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

  /* =========================================================
     WRONG ROLE

     Ví dụ:
     Customer cố vào /operator/dashboard

     -> đưa về /customer/dashboard
  ========================================================= */

  if (
    allowedRoles &&
    !allowedRoles.includes(user.role)
  ) {
    return (
      <Navigate
        to={getRoleHome(user.role)}
        replace
      />
    );
  }

  /* =========================================================
     AUTHORIZED
  ========================================================= */

  return children ?? <Outlet />;
}