import { lazy } from "react";
import { Navigate, useRoutes } from "react-router-dom";

import { DroneAssistantWidget } from "../components/DroneAssistantWidget";
import { useAuth } from "../features/auth/hooks/useAuth";

import { technicianRoutes } from "../features/technician/technicianRoutes";
import { customerRoutes } from "../features/customer/customerRoutes";
import { operatorRoutes } from "./operatorRoutes";

import { ProtectedRoute } from "./ProtectedRoute";

import { HomePage } from "../features/home/pages/HomePage";

/* =========================================================
   LAZY PAGES / LAYOUTS
========================================================= */

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

const CustomerLayout = lazy(() =>
  import("../layouts/CustomerLayout").then((module) => ({
    default: module.CustomerLayout,
  })),
);

/* =========================================================
   APP ROUTES
========================================================= */

export function AppRoutes() {
  const {
    user,
    isAuthenticated,
    isRestoring,
  } = useAuth();

  /* =======================================================
     CURRENT USER HOME
  ======================================================== */

  function getCurrentHome() {
    switch (user?.role) {
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

  /* =======================================================
     AUTH PAGE
  ======================================================== */

  const authPageElement = isRestoring ? null : isAuthenticated ? (
    <Navigate
      to={getCurrentHome()}
      replace
    />
  ) : (
    <AuthPage />
  );

  /* =======================================================
     ROUTES
  ======================================================== */

  const routes = useRoutes([
    /* -----------------------------------------------------
       PUBLIC
    ----------------------------------------------------- */

    {
      path: "/",
      element: <HomePage />,
    },

    /* -----------------------------------------------------
       AUTH
    ----------------------------------------------------- */

    {
      path: "/login",
      element: authPageElement,
    },

    {
      path: "/register",
      element: authPageElement,
    },

    {
      path: "/forgot-password",
      element: authPageElement,
    },

    {
      path: "/reset-password",
      element: authPageElement,
    },

    /* -----------------------------------------------------
       OPERATOR
    ----------------------------------------------------- */

    {
      element: (
        <ProtectedRoute
          allowedRoles={["operator"]}
        />
      ),
      children: [
        {
          path: "/operator",
          element: <OperatorLayout />,
          children: operatorRoutes,
        },
      ],
    },

    /* -----------------------------------------------------
       TECHNICIAN
    ----------------------------------------------------- */

    {
      element: (
        <ProtectedRoute
          allowedRoles={["technician"]}
        />
      ),
      children: [
        {
          path: "/technician",
          element: <TechnicianLayout />,
          children: technicianRoutes,
        },
      ],
    },

    /* -----------------------------------------------------
       CUSTOMER
    ----------------------------------------------------- */

    {
      element: (
        <ProtectedRoute
          allowedRoles={["customer"]}
        />
      ),
      children: [
        {
          path: "/customer",
          element: <CustomerLayout />,
          children: customerRoutes,
        },
      ],
    },

    /* -----------------------------------------------------
       FALLBACK
    ----------------------------------------------------- */

    {
      path: "*",
      element: (
        <Navigate
          to="/"
          replace
        />
      ),
    },
  ]);

  /* =======================================================
     APP CONTENT
  ======================================================== */

  return (
    <>
      {routes}

      <DroneAssistantWidget />
    </>
  );
}