import {
  lazy,
  type ComponentType,
} from "react";

import {
  Navigate,
  type RouteObject,
} from "react-router-dom";

const lazyPage = <
  TModule,
  TKey extends keyof TModule,
>(
  loader: () => Promise<TModule>,
  key: TKey,
) =>
  lazy(() =>
    loader().then((module) => ({
      default:
        module[
          key
        ] as ComponentType,
    })),
  );

const CustomerDashboardPage =
  lazyPage(
    () =>
      import(
        "./pages/CustomerDashboardPage"
      ),
    "CustomerDashboardPage",
  );

const CreateDeliveryPage =
  lazyPage(
    () =>
      import(
        "./pages/CreateDeliveryPage"
      ),
    "CreateDeliveryPage",
  );

const DeliveryReviewPage =
  lazyPage(
    () =>
      import(
        "./pages/DeliveryReviewPage"
      ),
    "DeliveryReviewPage",
  );

const DeliverySummaryPage =
  lazyPage(
    () =>
      import(
        "./pages/DeliverySummaryPage"
      ),
    "DeliverySummaryPage",
  );

const PaymentPage = lazyPage(
  () =>
    import("./pages/PaymentPage"),
  "PaymentPage",
);

const PaymentSuccessPage =
  lazyPage(
    () =>
      import(
        "./pages/PaymentSuccessPage"
      ),
    "PaymentSuccessPage",
  );

const MyDeliveriesPage =
  lazyPage(
    () =>
      import(
        "./pages/MyDeliveriesPage"
      ),
    "MyDeliveriesPage",
  );

const DeliveryDetailPage =
  lazyPage(
    () =>
      import(
        "./pages/DeliveryDetailPage"
      ),
    "DeliveryDetailPage",
  );

const CustomerNotificationsPage =
  lazyPage(
    () =>
      import(
        "./pages/CustomerNotificationsPage"
      ),
    "CustomerNotificationsPage",
  );

const CustomerProfilePage =
  lazyPage(
    () =>
      import(
        "./pages/CustomerProfilePage"
      ),
    "CustomerProfilePage",
  );

const PricingServiceInfoPage =
  lazyPage(
    () =>
      import(
        "./pages/PricingServiceInfoPage"
      ),
    "PricingServiceInfoPage",
  );

const HelpPoliciesPage =
  lazyPage(
    () =>
      import(
        "./pages/HelpPoliciesPage"
      ),
    "HelpPoliciesPage",
  );

const OrderRatingPage =
  lazyPage(
    () =>
      import(
        "./pages/OrderRatingPage"
      ),
    "OrderRatingPage",
  );

export const customerRoutes: RouteObject[] =
  [
    {
      index: true,
      element: (
        <Navigate
          to="/customer/dashboard"
          replace
        />
      ),
    },

    {
      path: "dashboard",
      element: (
        <CustomerDashboardPage />
      ),
    },

    {
      path: "deliveries",
      element: (
        <MyDeliveriesPage />
      ),
    },

    {
      path: "deliveries/create",
      element: (
        <CreateDeliveryPage />
      ),
    },

    {
      path: "deliveries/review",
      element: (
        <DeliveryReviewPage />
      ),
    },

    {
      path: "deliveries/:deliveryId",
      element: (
        <DeliveryDetailPage />
      ),
    },

    {
      path: "deliveries/:deliveryId/rate",
      element: (
        <OrderRatingPage />
      ),
    },

    {
      path: "deliveries/:deliveryId/summary",
      element: (
        <DeliverySummaryPage />
      ),
    },

    {
      path: "payment/:deliveryId",
      element: <PaymentPage />,
    },

    {
      path: "payment/:deliveryId/success",
      element: (
        <PaymentSuccessPage />
      ),
    },

    {
      path: "notifications",
      element: (
        <CustomerNotificationsPage />
      ),
    },


    {
      path: "pricing",
      element: (
        <PricingServiceInfoPage />
      ),
    },

    {
      path: "help",
      element: (
        <HelpPoliciesPage />
      ),
    },
    {
      path: "profile",
      element: (
        <CustomerProfilePage />
      ),
    },
  ];