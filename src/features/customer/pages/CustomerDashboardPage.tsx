import type { ReactNode } from "react";

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

  const deliveries = user
    ? customerDeliveryService.getByCustomer(user.id)
    : [];

  /* =========================================================
     DERIVED DATA
  ========================================================= */

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
    <div className="min-h-[calc(100vh-72px)] bg-[#070707] font-sans">
      {/* =====================================================
          FULL WIDTH HERO
      ====================================================== */}

      <section className="relative w-full overflow-hidden border-b border-white/[0.07] bg-[#080808]">
        <div className="relative h-[470px] w-full overflow-hidden">
          {/* =================================================
              BACKGROUND
          ================================================== */}

          <div className="absolute inset-0">
            {/* HUB BACKGROUND */}
            <img
              src={hubImage}
              alt="DroneOptAI delivery hub"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />

            {/* DRONE */}
            <img
              src={droneImage}
              alt="DroneOptAI delivery drone"
              className="absolute right-[9%] top-[7%] z-[2] w-[29%] max-w-[470px] object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.55)]"
            />

            {/* DARK LEFT OVERLAY */}
            <div className="absolute inset-0 z-[3] bg-gradient-to-r from-[#050505] via-[#050505]/82 to-[#050505]/10" />

            {/* DARK BOTTOM OVERLAY */}
            <div className="absolute inset-0 z-[3] bg-gradient-to-t from-[#050505]/82 via-transparent to-[#050505]/10" />

            {/* RIGHT FADE */}
            <div className="absolute inset-y-0 right-0 z-[3] w-[16%] bg-gradient-to-l from-black/20 to-transparent" />

            {/* SUBTLE ORANGE */}
            <div className="absolute right-[15%] top-[18%] z-[3] h-[300px] w-[300px] rounded-full bg-orange-500/[0.045] blur-[140px]" />
          </div>

          {/* =================================================
              HERO CONTENT
          ================================================== */}

          <div className="relative z-10 flex h-full w-full items-center px-6 sm:px-8 lg:px-12 xl:px-14 2xl:px-16">
            <div className="max-w-[780px]">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-orange-500">
                Customer workspace
              </p>

              <h1 className="mt-4 text-[58px] font-semibold leading-[0.92] tracking-[-0.055em] text-white sm:text-[68px] lg:text-[82px] xl:text-[88px]">
                Welcome back,
                <br />

                <span className="text-white/40">
                  {firstName}
                </span>
              </h1>

              <p className="mt-6 max-w-[620px] text-[16px] leading-7 text-white/60 lg:text-[17px]">
                Create hub-to-hub deliveries, track shipment progress and
                manage package handovers in one place.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/customer/deliveries/create"
                  className="group inline-flex h-[54px] items-center gap-3 rounded-xl bg-orange-500 px-7 text-[14px] font-semibold text-black transition hover:bg-orange-400"
                >
                  Create delivery

                  <ArrowRight
                    size={17}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>

                <Link
                  to="/customer/deliveries"
                  className="inline-flex h-[54px] items-center rounded-xl border border-white/[0.14] bg-black/25 px-7 text-[14px] font-medium text-white/80 backdrop-blur-sm transition hover:border-white/30 hover:bg-white/[0.05] hover:text-white"
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
      ====================================================== */}

      <div className="mx-auto max-w-[1280px] px-6 pb-14 pt-7 lg:px-10">
        {/* ===================================================
            STATS
        ==================================================== */}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Active deliveries"
            value={String(activeDeliveries.length)}
            icon={<Package size={18} />}
          />

          <StatCard
            label="Completed"
            value={String(completedCount)}
            icon={<CheckCircle2 size={18} />}
          />

          <StatCard
            label="Awaiting payment"
            value={String(awaitingPaymentCount)}
            icon={<CreditCard size={18} />}
          />

          <StatCard
            label="Total orders"
            value={String(deliveries.length)}
            icon={<Clock3 size={18} />}
          />
        </section>

        {/* ===================================================
            ACTIVE DELIVERY + QUICK ACTIONS
        ==================================================== */}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ACTIVE */}
          <section>
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
          <section>
            <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Quick actions
            </p>

            <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a]">
              <QuickAction
                to="/customer/deliveries/create"
                title="Create delivery"
                description="Start a new hub-to-hub shipment."
                icon={<Plus size={17} />}
              />

              <QuickAction
                to="/customer/deliveries"
                title="Track deliveries"
                description="Check status and estimated arrival."
                icon={<Package size={17} />}
              />

              <QuickAction
                to="/customer/notifications"
                title="Notifications"
                description="Review order and handover updates."
                icon={<Clock3 size={17} />}
                last
              />
            </div>
          </section>
        </div>

        {/* ===================================================
            RECENT DELIVERIES
        ==================================================== */}

        <section className="mt-9">
          <SectionHeader
            title="Recent deliveries"
            actionLabel="View history"
            actionTo="/customer/deliveries"
          />

          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a]">
            {recentDeliveries.length === 0 ? (
              <EmptyRecentDeliveries />
            ) : (
              <>
                {/* TABLE HEADER */}
                <div className="hidden grid-cols-[150px_minmax(0,1fr)_150px_160px_32px] border-b border-white/[0.07] px-6 py-4 md:grid">
                  <TableHeader>
                    Order
                  </TableHeader>

                  <TableHeader>
                    Route
                  </TableHeader>

                  <TableHeader>
                    Package
                  </TableHeader>

                  <TableHeader>
                    Status
                  </TableHeader>

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
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-6 py-5">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-white/40">
          {label}
        </p>

        <div className="text-white/30">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-[32px] font-semibold tracking-[-0.03em] text-white">
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
    <div className="mb-4 flex items-center justify-between">
      <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/45">
        {title}
      </p>

      <Link
        to={actionTo}
        className="text-[13px] text-white/40 transition hover:text-white"
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
      className="group block rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-7 transition hover:border-white/[0.15]"
    >
      <div className="flex flex-col gap-7">
        {/* TOP */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <p className="text-[18px] font-semibold text-white">
                {delivery.id}
              </p>

              <span className="rounded-full border border-orange-500/20 bg-orange-500/[0.07] px-3 py-1.5 text-[11px] font-medium text-orange-400">
                {status}
              </span>
            </div>

            <p className="mt-3 text-[15px] text-white/55">
              {delivery.originHub.name}

              <span className="mx-3 text-white/20">
                →
              </span>

              {delivery.destinationHub.name}
            </p>
          </div>

          <ArrowRight
            size={19}
            className="mt-1 text-white/20 transition group-hover:translate-x-1 group-hover:text-orange-500"
          />
        </div>

        {/* INFO */}
        <div className="grid gap-5 border-t border-white/[0.07] pt-5 sm:grid-cols-3">
          <DeliveryMetric
            label="Package"
            value={`${delivery.weightKg} kg · Size ${delivery.packageSize}`}
          />

          <DeliveryMetric
            label="Estimated arrival"
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
    <div className="rounded-xl border border-dashed border-white/[0.1] bg-[#0a0a0a] p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/[0.035] text-white/35">
            <Package size={19} />
          </div>

          <div>
            <p className="text-[15px] font-medium text-white/80">
              No active delivery
            </p>

            <p className="mt-2 max-w-[520px] text-[13px] leading-6 text-white/40">
              Create a delivery to start tracking package handover,
              payment, flight progress and estimated arrival.
            </p>
          </div>
        </div>

        <Link
          to="/customer/deliveries/create"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/[0.1] px-5 text-[13px] font-medium text-white/70 transition hover:border-orange-500/40 hover:text-white"
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
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/30">
        {label}
      </p>

      <p className="mt-2 text-[13px] leading-5 text-white/65">
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
  description,
  icon,
  last = false,
}: {
  to: string;
  title: string;
  description: string;
  icon: ReactNode;
  last?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`group flex items-start gap-4 px-5 py-5 transition hover:bg-white/[0.02] ${
        last
          ? ""
          : "border-b border-white/[0.07]"
      }`}
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035] text-white/35 transition group-hover:bg-orange-500/[0.08] group-hover:text-orange-500">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-white/75 transition group-hover:text-white">
          {title}
        </p>

        <p className="mt-1.5 text-[12px] leading-5 text-white/35">
          {description}
        </p>
      </div>

      <ArrowRight
        size={15}
        className="mt-2 text-white/20 transition group-hover:translate-x-0.5 group-hover:text-orange-500"
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
      className="group grid gap-4 border-b border-white/[0.065] px-6 py-5 last:border-b-0 transition hover:bg-white/[0.018] md:grid-cols-[150px_minmax(0,1fr)_150px_160px_32px] md:items-center"
    >
      {/* ORDER */}
      <div>
        <p className="text-[14px] font-medium text-white/75">
          {delivery.id}
        </p>

        <p className="mt-1 text-[11px] text-white/25">
          {formatDateTime(
            delivery.createdAt,
          )}
        </p>
      </div>

      {/* ROUTE */}
      <p className="truncate text-[13px] text-white/50">
        {delivery.originHub.name}

        <span className="mx-2 text-white/15">
          →
        </span>

        {delivery.destinationHub.name}
      </p>

      {/* PACKAGE */}
      <p className="text-[13px] text-white/45">
        {delivery.weightKg} kg · {delivery.packageSize}
      </p>

      {/* STATUS */}
      <p className="text-[13px] text-white/50">
        {status}
      </p>

      <ArrowRight
        size={16}
        className="text-white/20 transition group-hover:translate-x-0.5 group-hover:text-orange-500"
      />
    </Link>
  );
}

/* =========================================================
   EMPTY RECENT DELIVERIES
========================================================= */

function EmptyRecentDeliveries() {
  return (
    <div className="relative overflow-hidden px-6 py-14">
      <div className="relative z-10 mx-auto max-w-[460px] text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-white/[0.035] text-white/30">
          <Package size={19} />
        </div>

        <p className="mt-5 text-[15px] font-medium text-white/60">
          No delivery history yet
        </p>

        <p className="mx-auto mt-2 max-w-[360px] text-[12px] leading-6 text-white/30">
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
    <span className="text-[11px] font-medium uppercase tracking-[0.13em] text-white/30">
      {children}
    </span>
  );
}