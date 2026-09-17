import type { ReactNode } from "react";

import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

interface ProtectedRouteProps {
  isAllowed: boolean;

  children?: ReactNode;

  redirectTo?: string;
}

export function ProtectedRoute({
  isAllowed,
  children,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const location = useLocation();

  if (!isAllowed) {
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

  return children ?? <Outlet />;
}