import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface RoleRouteProps {
  allowedRoles: readonly string[];
  currentRole?: string | null;
  children?: ReactNode;
  redirectTo?: string;
}

export function RoleRoute({
  allowedRoles,
  currentRole,
  children,
  redirectTo = '/',
}: RoleRouteProps) {
  if (!currentRole || !allowedRoles.includes(currentRole)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children ?? <Outlet />;
}
