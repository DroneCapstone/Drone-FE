import {
  Navigate,
  useRoutes,
} from "react-router-dom";

import { AuthPage } from "../features/auth/pages/AuthPage";

import { useAuth } from "../features/auth/hooks/useAuth";

import { OperatorLayout } from "../layouts/OperatorLayout";

import { operatorRoutes } from "./operatorRoutes";

import { ProtectedRoute } from "./ProtectedRoute";

export function AppRoutes() {
  const {
    isAuthenticated,
  } = useAuth();

  return useRoutes([
    {
      path: "/login",

      element: isAuthenticated ? (
        <Navigate
          to="/operator/dashboard"
          replace
        />
      ) : (
        <AuthPage />
      ),
    },

    {
      path: "/register",

      element: isAuthenticated ? (
        <Navigate
          to="/operator/dashboard"
          replace
        />
      ) : (
        <AuthPage />
      ),
    },

    {
      element: (
        <ProtectedRoute
          isAllowed={isAuthenticated}
        />
      ),

      children: [
        {
          element: <OperatorLayout />,

          children: operatorRoutes,
        },
      ],
    },

    {
      path: "*",

      element: (
        <Navigate
          to={
            isAuthenticated
              ? "/operator/dashboard"
              : "/login"
          }
          replace
        />
      ),
    },
  ]);
}