import { lazy } from "react";
import { Navigate, useRoutes } from "react-router-dom";

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
  const { user, isAuthenticated } = useAuth();

  /* =========================================================
     HOME THEO ROLE
  ========================================================= */

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

  return useRoutes([
    /* =========================================================
       PUBLIC HOME PAGE

       Tất cả user khi mở website đều có thể vào landing page.
    ========================================================= */

    {
      path: "/",
      element: <HomePage />,
    },

    /* =========================================================
       LOGIN
    ========================================================= */

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

    /* =========================================================
       REGISTER
    ========================================================= */

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

    /* =========================================================
       OPERATOR
    ========================================================= */

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

    /* =========================================================
       TECHNICIAN
    ========================================================= */

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

    /* =========================================================
       CUSTOMER
    ========================================================= */

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

    /* =========================================================
       FALLBACK

       Route không tồn tại -> quay về Landing Page.
    ========================================================= */

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
}