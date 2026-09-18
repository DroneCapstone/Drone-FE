import { lazy } from "react";
import {
  Navigate,
  useRoutes,
} from "react-router-dom";

import { useAuth } from "../features/auth/hooks/useAuth";

import { operatorRoutes } from "./operatorRoutes";

import { ProtectedRoute } from "./ProtectedRoute";

const AuthPage = lazy(() =>
  import("../features/auth/pages/AuthPage").then((module) => ({ default: module.AuthPage })),
);
const OperatorLayout = lazy(() =>
  import("../layouts/OperatorLayout").then((module) => ({ default: module.OperatorLayout })),
);

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
