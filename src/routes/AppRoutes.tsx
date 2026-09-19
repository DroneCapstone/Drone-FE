import { lazy } from "react";
import { Navigate, useRoutes } from "react-router-dom";

import { useAuth } from "../features/auth/hooks/useAuth";
import { technicianRoutes } from "../features/technician/technicianRoutes";

import { operatorRoutes } from "./operatorRoutes";
import { ProtectedRoute } from "./ProtectedRoute";

const AuthPage = lazy(() =>
  import("../features/auth/pages/AuthPage").then((module) => ({
    default: module.AuthPage,
  })),
);

const OperatorLayout = lazy(() =>
  import("../layouts/OperatorLayout").then((module) => ({
    default: module.OperatorLayout,
  })),
);

const TechnicianLayout = lazy(() =>
  import("../layouts/TechnicianLayout").then((module) => ({
    default: module.TechnicianLayout,
  })),
);

export function AppRoutes() {
  const { user, isAuthenticated } = useAuth();

  function getCurrentHome() {
    if (user?.role === "technician") {
      return "/technician/dashboard";
    }

    return "/operator/dashboard";
  }

  return useRoutes([
    /* =========================
       ROOT
    ========================= */
    {
      path: "/",
      element: (
        <Navigate
          to={isAuthenticated ? getCurrentHome() : "/login"}
          replace
        />
      ),
    },

    /* =========================
       LOGIN
    ========================= */
    {
      path: "/login",
      element: isAuthenticated ? (
        <Navigate to={getCurrentHome()} replace />
      ) : (
        <AuthPage />
      ),
    },

    /* =========================
       REGISTER
    ========================= */
    {
      path: "/register",
      element: isAuthenticated ? (
        <Navigate to={getCurrentHome()} replace />
      ) : (
        <AuthPage />
      ),
    },

    /* =========================
       OPERATOR
    ========================= */
    {
      element: <ProtectedRoute allowedRoles={["operator"]} />,
      children: [
        {
          element: <OperatorLayout />,
          children: operatorRoutes,
        },
      ],
    },

    /* =========================
       TECHNICIAN
    ========================= */
    {
      element: <ProtectedRoute allowedRoles={["technician"]} />,
      children: [
        {
          path: "/technician",
          element: <TechnicianLayout />,
          children: technicianRoutes,
        },
      ],
    },

    /* =========================
       FALLBACK
    ========================= */
    {
      path: "*",
      element: (
        <Navigate
          to={isAuthenticated ? getCurrentHome() : "/login"}
          replace
        />
      ),
    },
  ]);
}