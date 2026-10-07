import { useEffect, useState, type ReactNode } from "react";

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  Package,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";
import {
  customerDeliveryService,
  formatDateTime,
} from "../services/customerDeliveryService";

import droneImage from "../../../assets/images/home/drone-3d.png";
import hubImage from "../../../assets/images/home/delivery-hub.png";

/* =========================================================
   CUSTOMER DASHBOARD
========================================================= */

export function CustomerDashboardPage() {
  const { user } = useAuth();
  const [, setRevision] = useState(0);

  const deliveries = user
    ? customerDeliveryService.getByCustomer(user.id)
    : [];

  useEffect(() => {
    const pendingIds = deliveries
      .filter((item) => item.paymentStatus === "pending")
      .map((item) => item.id);

    if (pendingIds.length === 0) return;

    Promise.allSettled(
      pendingIds.map((id) =>
        customerDeliveryService.refreshPaymentStatus(id),
      ),
    ).then(() => {
      setRevision((value) => value + 1);
    });
  }, [user?.id]);

  const activeDeliveries = deliveries.filter(
    (delivery) =>
      delivery.orderStatus !== "completed" &&
      delivery.orderStatus !== "cancelled" &&
      delivery.orderStatus !== "rejected",
  );

  const active = activeDeliveries[0];

  const completedCount = deliveries.filter(
    (delivery) => delivery.orderStatus === "completed",
  ).length;

  const awaitingPaymentCount = deliveries.filter(
    (delivery) => delivery.paymentStatus === "pending",
  ).length;

  const recentDeliveries = deliveries.slice(0, 4);

  const firstName =
    user?.name?.trim().split(" ")[0] ?? "Customer";

  return (
    <div className="min-h-[calc(100vh-72px)] bg-transparent font-sans">
      {/* =====================================================
          HERO
      ====================================================== */}
      <section className="relative w-full overflow-hidden border-b border-white/[0.07] bg-[#080808]">
        <div className="relative h-[400px] w-full overflow-hidden sm:h-[470px]">
          <div className="absolute inset-0">
            <img
              src={hubImage}
              alt="DroneOptAI delivery hub"
              className="absolute inset-0 h-full w-full object-cover object-[62%_center] sm:object-center"
            />

            <img
              src={droneImage}
              alt="DroneOptAI delivery drone"
              className="absolute right-[9%] top-[7%] z-[2] hidden w-[29%] max-w-[470px] object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.55)] sm:block"
            />

            <div className="absolute inset-0 z-[3] bg-gradient-to-r from-[#050505] via-[#050505]/88 to-[#050505]/20 sm:via-[#050505]/82 sm:to-[#050505]/10" />
            <div className="absolute inset-0 z-[3] bg-gradient-to-t from-[#050505]/90 via-[#050505]/25 to-[#050505]/20 sm:from-[#050505]/82 sm:via-transparent sm:to-[#050505]/10" />
            <div className="absolute inset-y-0 right-0 z-[3] hidden w-[16%] bg-gradient-to-l from-black/20 to-transparent sm:block" />
            <div className="absolute right-[15%] top-[18%] z-[3] h-[300px] w-[300px] rounded-full bg-orange-500/[0.045] blur-[140px]" />
          </div>

          <div className="relative z-10 flex h-full w-full items-center px-4 sm:px-8 lg:px-12 xl:px-14 2xl:px-16">
            <div className="w-full max-w-[780px]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-500 sm:text-[12px]">
                Customer workspace
              </p>

              <h1 className="mt-3 text-[44px] font-semibold leading-[0.94] tracking-[-0.05em] text-white sm:mt-4 sm:text-[68px] lg:text-[82px] xl:text-[88px]">
                Welcome back,
                <br />
                <span className="text-[#9A9A9A]">{firstName}</span>
              </h1>

              <p className="mt-5 max-w-[620px] text-[14px] leading-6 text-white/[0.82] sm:mt-6 sm:text-[16px] sm:leading-7 lg:text-[17px]">
                Create hub-to-hub deliveries, track shipment progress and
                manage package handovers in one place.
              </p>

              <div className="mt-6 grid max-w-[420px] grid-cols-2 gap-3 sm:mt-8 sm:flex sm:max-w-none sm:flex-wrap sm:items-center sm:gap-4">
                <Link
                  to="/customer/deliveries/create?new=1"
                  className="group inline-flex h-[50px] items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-[13px] font-semibold text-black transition hover:bg-orange-400 sm:h-[54px] sm:gap-3 sm:px-7 sm:text-[14px]"
                >
                  Create delivery
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>

                <Link
                  to="/customer/deliveries"
                  className="inline-flex h-[50px] items-center justify-center rounded-xl border border-white/[0.14] bg-black/[0.25] px-4 text-[13px] font-semibold text-white backdrop-blur-sm transition hover:border-white/[0.30] hover:bg-white/[0.05] sm:h-[54px] sm:px-7 sm:text-[16px] sm:font-bold"
                >
                  View deliveries
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          DASHBOARD CONTENT

          Mobile priority:
          Active -> Quick actions -> Overview -> Recent

          Desktop priority:
          Overview -> Active + Quick actions -> Recent
      ====================================================== */}
      <div className="mx-auto flex max-w-[1280px] flex-col px-4 pb-12 pt-5 sm:px-6 sm:pb-14 sm:pt-7 lg:px-10">
        {/* ===================================================
            OVERVIEW / STATS
        ==================================================== */}
        <section className="order-3 mt-8 md:order-1 md:mt-0">
          <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.16em] text-white/[0.78] md:hidden">
            Overview
          </p>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              label="Active deliveries"
              value={String(activeDeliveries.length)}
              icon={<Package size={17} />}
            />

            <StatCard
              label="Completed"
              value={String(completedCount)}
              icon={<CheckCircle2 size={17} />}
            />

            <StatCard
              label="Awaiting payment"
              value={String(awaitingPaymentCount)}
              icon={<CreditCard size={17} />}
            />

            <StatCard
              label="Total orders"
              value={String(deliveries.length)}
              icon={<Clock3 size={17} />}
            />
          </div>
        </section>

        {/* ===================================================
            ACTIVE DELIVERY + QUICK ACTIONS
        ==================================================== */}
        <div className="order-1 grid items-start gap-6 md:order-2 md:mt-8 md:grid-cols-[minmax(0,1fr)_260px] md:gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          {/* ACTIVE DELIVERY */}
          <section className="min-w-0">
            <SectionHeader
              title="Active delivery"
              actionLabel="View all"
              actionTo="/customer/deliveries"
            />

            {active ? (
              <ActiveDeliveryCard delivery={active} />
            ) : (
              <EmptyActiveDelivery />
            )}
          </section>

          {/* QUICK ACTIONS */}
          <section className="w-full md:justify-self-end">
            <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.16em] text-white/[0.78] sm:mb-4 sm:text-[13px] sm:text-white">
              Quick actions
            </p>

            <div className="grid grid-cols-3 gap-2 md:block md:overflow-hidden md:rounded-2xl md:border md:border-white/[0.10] md:bg-[#161217]/96 md:shadow-[0_12px_32px_rgba(0,0,0,0.30)] md:backdrop-blur-sm">
              <QuickAction
                to="/customer/deliveries/create?new=1"
                title="Create"
                desktopTitle="Create delivery"
                description="Start a new shipment."
                icon={<Plus size={16} />}
              />

              <QuickAction
                to="/customer/deliveries"
                title="Track"
                desktopTitle="Track deliveries"
                description="View delivery status."
                icon={<Package size={16} />}
              />

              <QuickAction
                to="/customer/notifications"
                title="Updates"
                desktopTitle="Notifications"
                description="View recent updates."
                icon={<Clock3 size={16} />}
                last
              />
            </div>
          </section>
        </div>

        {/* ===================================================
            RECENT DELIVERIES
        ==================================================== */}
        <section className="order-4 mt-8 sm:mt-9">
          <SectionHeader
            title="Recent deliveries"
            actionLabel="View history"
            actionTo="/customer/deliveries"
          />

          <div className="overflow-hidden rounded-2xl border border-white/[0.10] bg-[#161217]/96 shadow-[0_12px_32px_rgba(0,0,0,0.24)] backdrop-blur-sm">
            {recentDeliveries.length === 0 ? (
              <EmptyRecentDeliveries />
            ) : (
              <>
                <div className="hidden grid-cols-[150px_minmax(0,1fr)_150px_160px_32px] border-b border-white/[0.07] px-6 py-4 md:grid">
                  <TableHeader>Order</TableHeader>
                  <TableHeader>Route</TableHeader>
                  <TableHeader>Package</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <span />
                </div>

                {recentDeliveries.map((delivery) => (
                  <RecentDeliveryRow
                    key={delivery.id}
                    delivery={delivery}
                  />
                ))}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="min-h-[112px] rounded-2xl border border-white/[0.10] bg-[#161217]/96 p-4 shadow-[0_8px_22px_rgba(0,0,0,0.20)] backdrop-blur-sm sm:min-h-0 sm:px-6 sm:py-5 sm:shadow-[0_10px_26px_rgba(0,0,0,0.26)]">
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-[110px] text-[10px] font-semibold uppercase leading-4 tracking-[0.10em] text-white/[0.72] sm:max-w-none sm:text-[12px] sm:font-medium sm:tracking-[0.12em] sm:text-white">
          {label}
        </p>

        <div className="shrink-0 text-white/[0.75] sm:text-white">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.03em] text-white sm:mt-4 sm:text-[32px]">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({
  title,
  actionLabel,
  actionTo,
}: {
  title: string;
  actionLabel: string;
  actionTo: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4 sm:mb-4">
      <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/[0.78] sm:text-[13px] sm:text-white">
        {title}
      </p>

      <Link
        to={actionTo}
        className="shrink-0 text-[12px] font-medium text-white/[0.55] transition hover:text-orange-400 sm:text-[13px] sm:text-white"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

/* =========================================================
   ACTIVE DELIVERY CARD
========================================================= */

function ActiveDeliveryCard({
  delivery,
}: {
  delivery: ReturnType<
    typeof customerDeliveryService.getByCustomer
  >[number];
}) {
  const status =
    customerDeliveryService.getCustomerStatus(delivery);

  const needsPayment =
    delivery.paymentStatus !== "paid";

  const target = needsPayment
    ? `/customer/payment/${delivery.id}`
    : `/customer/deliveries/${delivery.id}`;

  return (
    <Link
      to={target}
      className="group block rounded-2xl border border-white/[0.10] bg-[#161217]/96 p-5 shadow-[0_10px_26px_rgba(0,0,0,0.22)] backdrop-blur-sm transition hover:border-white/[0.18] hover:bg-[#1b161c] sm:p-7 sm:shadow-[0_12px_30px_rgba(0,0,0,0.28)]"
    >
      <div className="flex flex-col gap-5 sm:gap-7">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <p className="truncate text-[17px] font-bold text-white sm:text-[19px]">
                {delivery.id}
              </p>

              <span className="rounded-full border border-orange-500/[0.20] bg-orange-500/[0.07] px-2.5 py-1 text-[10px] font-medium text-orange-400 sm:px-3 sm:py-1.5 sm:text-[11px]">
                {status}
              </span>
            </div>

            <p className="mt-3 line-clamp-2 text-[14px] font-semibold leading-6 text-white sm:text-[16px]">
              {delivery.originHub.name}
              <span className="mx-2 text-white/[0.42] sm:mx-3">
                →
              </span>
              {delivery.destinationHub.name}
            </p>
          </div>

          <ArrowRight
            size={18}
            className="mt-1 shrink-0 text-white/[0.40] transition group-hover:translate-x-1 group-hover:text-orange-500 sm:size-[19px]"
          />
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-white/[0.07] pt-4 sm:gap-5 sm:pt-5">
          <DeliveryMetric
            label="Package"
            value={`${delivery.weightKg} kg · ${delivery.packageSize}`}
          />

          <DeliveryMetric
            label="ETA"
            value={formatDateTime(
              delivery.estimatedArrivalAt,
            )}
          />

          <DeliveryMetric
            label="Payment"
            value={
              delivery.paymentStatus === "paid"
                ? "Paid"
                : "Pending"
            }
          />
        </div>
      </div>
    </Link>
  );
}

/* =========================================================
   EMPTY ACTIVE DELIVERY
========================================================= */

function EmptyActiveDelivery() {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.12] bg-[#161217]/96 p-5 shadow-[0_10px_26px_rgba(0,0,0,0.20)] backdrop-blur-sm sm:p-8 sm:shadow-[0_12px_30px_rgba(0,0,0,0.26)]">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex items-start gap-3.5 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.035] text-white/[0.75] sm:h-11 sm:w-11 sm:rounded-lg sm:text-white/[0.88]">
            <Package size={18} />
          </div>

          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-white sm:font-medium">
              No active delivery
            </p>

            <p className="mt-1.5 max-w-[520px] text-[12px] leading-5 text-white/[0.48] sm:mt-2 sm:text-[13px] sm:leading-6 sm:text-white">
              Create a delivery to start tracking package handover,
              payment, flight progress and estimated arrival.
            </p>
          </div>
        </div>

        <Link
          to="/customer/deliveries/create?new=1"
          className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.02] px-5 text-[13px] font-medium text-white/[0.88] transition hover:border-orange-500/[0.40] hover:text-white sm:w-auto sm:rounded-lg sm:bg-transparent"
        >
          Create delivery
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

/* =========================================================
   DELIVERY METRIC
========================================================= */

function DeliveryMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-medium uppercase tracking-[0.10em] text-white/[0.42] sm:text-[11px] sm:tracking-[0.12em] sm:text-white">
        {label}
      </p>

      <p className="mt-1.5 line-clamp-2 break-words text-[12px] font-medium leading-5 text-white/[0.82] sm:mt-2 sm:text-[15px] sm:leading-6 sm:text-white">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   QUICK ACTION
========================================================= */

function QuickAction({
  to,
  title,
  desktopTitle,
  description,
  icon,
  last = false,
}: {
  to: string;
  title: string;
  desktopTitle: string;
  description: string;
  icon: ReactNode;
  last?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`group flex min-h-[88px] flex-col items-start justify-between gap-2 rounded-xl border border-white/[0.09] bg-[#161217]/96 px-3 py-3 transition hover:border-orange-500/[0.28] hover:bg-[#1b161c] md:min-h-0 md:flex-row md:items-center md:justify-start md:gap-3 md:rounded-none md:border-0 md:bg-transparent md:px-4 md:py-4 md:hover:bg-white/[0.025] ${
        last ? "" : "md:border-b md:border-white/[0.07]"
      }`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-white/[0.72] transition group-hover:bg-orange-500/[0.08] group-hover:text-orange-500 md:bg-white/[0.035] md:text-white/[0.82]">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-white md:hidden">
          {title}
        </p>

        <p className="hidden text-[14px] font-semibold text-white md:block">
          {desktopTitle}
        </p>

        <p className="mt-0.5 hidden truncate text-[11px] leading-5 text-white/[0.60] md:block">
          {description}
        </p>
      </div>

      <ArrowRight
        size={14}
        className="hidden shrink-0 text-white/[0.35] transition group-hover:translate-x-0.5 group-hover:text-orange-500 md:block"
      />
    </Link>
  );
}

/* =========================================================
   RECENT DELIVERY ROW
========================================================= */

function RecentDeliveryRow({
  delivery,
}: {
  delivery: ReturnType<
    typeof customerDeliveryService.getByCustomer
  >[number];
}) {
  const status =
    customerDeliveryService.getCustomerStatus(delivery);

  return (
    <Link
      to={`/customer/deliveries/${delivery.id}`}
      className="group block border-b border-white/[0.065] px-4 py-4 last:border-b-0 transition hover:bg-white/[0.018] md:grid md:grid-cols-[150px_minmax(0,1fr)_150px_160px_32px] md:items-center md:gap-4 md:px-6 md:py-5"
    >
      {/* MOBILE */}
      <div className="md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-white">
              {delivery.id}
            </p>

            <p className="mt-1 text-[11px] text-white/[0.38]">
              {formatDateTime(delivery.createdAt)}
            </p>
          </div>

          <span className="shrink-0 rounded-full border border-white/[0.09] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-white/[0.65]">
            {status}
          </span>
        </div>

        <p className="mt-3 truncate text-[13px] font-medium text-white/[0.82]">
          {delivery.originHub.name}
          <span className="mx-2 text-white/[0.30]">→</span>
          {delivery.destinationHub.name}
        </p>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[11px] text-white/[0.38]">
            {delivery.weightKg} kg · {delivery.packageSize}
          </p>

          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/[0.45] transition group-hover:text-orange-400">
            Details
            <ArrowRight size={12} />
          </span>
        </div>
      </div>

      {/* DESKTOP */}
      <div className="hidden md:block">
        <p className="text-[16px] font-bold text-white">
          {delivery.id}
        </p>

        <p className="mt-1 text-[13px] font-medium text-white/[0.78]">
          {formatDateTime(delivery.createdAt)}
        </p>
      </div>

      <p className="hidden truncate text-[15px] font-semibold text-white md:block">
        {delivery.originHub.name}
        <span className="mx-2 text-white/[0.55]">→</span>
        {delivery.destinationHub.name}
      </p>

      <p className="hidden text-[15px] font-semibold text-white md:block">
        {delivery.weightKg} kg · {delivery.packageSize}
      </p>

      <p className="hidden text-[15px] font-semibold text-white md:block">
        {status}
      </p>

      <ArrowRight
        size={16}
        className="hidden text-white/[0.60] transition group-hover:translate-x-0.5 group-hover:text-orange-500 md:block"
      />
    </Link>
  );
}

/* =========================================================
   EMPTY RECENT DELIVERIES
========================================================= */

function EmptyRecentDeliveries() {
  return (
    <div className="relative overflow-hidden px-5 py-9 sm:px-6 sm:py-14">
      <div className="relative z-10 mx-auto max-w-[460px] text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.035] text-white/[0.72] sm:h-11 sm:w-11 sm:rounded-lg sm:text-white">
          <Package size={18} />
        </div>

        <p className="mt-4 text-[14px] font-semibold text-white/[0.88] sm:mt-5 sm:text-[15px] sm:font-medium sm:text-white/[0.90]">
          No delivery history yet
        </p>

        <p className="mx-auto mt-2 max-w-[300px] text-[11px] leading-5 text-white/[0.40] sm:max-w-[360px] sm:text-[12px] sm:leading-6 sm:text-white">
          Your completed and previous delivery orders will appear here.
        </p>
      </div>

      <img
        src={droneImage}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -right-12 hidden w-[230px] opacity-[0.035] lg:block"
      />
    </div>
  );
}

/* =========================================================
   TABLE HEADER
========================================================= */

function TableHeader({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-[0.13em] text-white">
      {children}
    </span>
  );
}
