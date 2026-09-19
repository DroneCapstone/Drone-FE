import {
  Navigate,
  useRoutes,
} from "react-router-dom";

import { AuthPage } from "../features/auth/pages/AuthPage";

import { useAuth } from "../features/auth/hooks/useAuth";

import { OperatorLayout } from "../layouts/OperatorLayout";

import { TechnicianLayout } from "../layouts/TechnicianLayout";

import { operatorRoutes } from "./operatorRoutes";

import { technicianRoutes } from "../features/technician/technicianRoutes";

import { ProtectedRoute } from "./ProtectedRoute";

export function AppRoutes() {
  const {
    user,
    isAuthenticated,
  } = useAuth();

  function getCurrentHome() {
    if (
      user?.role === "technician"
    ) {
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
          to={
            isAuthenticated
              ? getCurrentHome()
              : "/login"
          }
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
        <Navigate
          to={getCurrentHome()}
          replace
        />
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
        <Navigate
          to={getCurrentHome()}
          replace
        />
      ) : (
        <AuthPage />
      ),
    },

    /* =========================
       OPERATOR
    ========================= */

    {
      element: (
        <ProtectedRoute
          allowedRoles={[
            "operator",
          ]}
        />
      ),

      children: [
        {
          element: (
            <OperatorLayout />
          ),

          children:
            operatorRoutes,
        },
      ],
    },

    /* =========================
       TECHNICIAN
    ========================= */

    {
      element: (
        <ProtectedRoute
          allowedRoles={[
            "technician",
          ]}
        />
      ),

      children: [
        {
          path: "/technician",

          element: (
            <TechnicianLayout />
          ),

          children:
            technicianRoutes,
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
          to={
            isAuthenticated
              ? getCurrentHome()
              : "/login"
          }
          replace
        />
      ),
    },
  ]);
}