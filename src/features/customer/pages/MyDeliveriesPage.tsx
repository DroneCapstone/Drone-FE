import { useEffect, useState } from "react";

import {
  ArrowRight,
  Package,
  Plus,
} from "lucide-react";

import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";

import {
  customerDeliveryService,
  formatDateTime,
} from "../services/customerDeliveryService";

/* =========================================================
   MY DELIVERIES PAGE
========================================================= */

export function MyDeliveriesPage() {
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

  return (
    <div className="min-h-[calc(100vh-72px)] bg-transparent font-sans">
      <div className="mx-auto max-w-[1500px] px-6 py-10 lg:px-10 lg:py-12">
        {/* =====================================================
            PAGE HEADER
        ====================================================== */}

        <div className="flex flex-col gap-7 border-b border-white/[0.10] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-orange-500">
              Deliveries
            </p>

            <h1 className="mt-3 text-[38px] font-semibold tracking-[-0.04em] text-white lg:text-[44px]">
              My deliveries
            </h1>

            <p className="mt-3 max-w-[680px] text-[15px] leading-7 text-white/[0.78]">
              Review your delivery requests, payment status and package handover
              progress.
            </p>
          </div>

          <Link
            to="/customer/deliveries/create"
            className="group inline-flex h-[52px] shrink-0 items-center justify-center gap-3 rounded-xl bg-orange-500 px-7 text-[14px] font-semibold text-black transition hover:bg-orange-400"
          >
            <Plus size={17} />

            Create delivery

            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        {/* =====================================================
            DELIVERY LIST
        ====================================================== */}

        <section className="mt-9 overflow-hidden rounded-2xl border border-white/[0.12] bg-[#151318]/95 shadow-[0_14px_36px_rgba(0,0,0,0.25)] backdrop-blur-sm">
          {deliveries.length === 0 ? (
            <EmptyDeliveries />
          ) : (
            <>
              {/* =================================================
                  TABLE HEADER
              ================================================== */}

              <div className="hidden grid-cols-[180px_minmax(0,1fr)_160px_190px_36px] gap-6 border-b border-white/[0.10] bg-white/[0.025] px-7 py-5 md:grid">
                <TableHeader>Order</TableHeader>

                <TableHeader>Route</TableHeader>

                <TableHeader>Package</TableHeader>

                <TableHeader>Status</TableHeader>

                <span />
              </div>

              {/* =================================================
                  ROWS
              ================================================== */}

              {deliveries.map((delivery) => {
                const status =
                  customerDeliveryService.getCustomerStatus(delivery);

                return (
                  <Link
                    key={delivery.id}
                    to={`/customer/deliveries/${delivery.id}`}
                    className="group grid gap-5 border-b border-white/[0.09] px-7 py-7 transition last:border-b-0 hover:bg-white/[0.035] md:grid-cols-[180px_minmax(0,1fr)_160px_190px_36px] md:items-center"
                  >
                    {/* ORDER */}

                    <div>
                      <p className="text-[16px] font-bold tracking-[-0.01em] text-white">
                        {delivery.id}
                      </p>

                      <p className="mt-1.5 text-[13px] font-medium text-white/[0.72]">
                        {formatDateTime(delivery.createdAt)}
                      </p>
                    </div>

                    {/* ROUTE */}

                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-white">
                        {delivery.originHub.name}

                        <span className="mx-3 font-normal text-white/[0.50]">
                          →
                        </span>

                        {delivery.destinationHub.name}
                      </p>
                    </div>

                    {/* PACKAGE */}

                    <div>
                      <p className="text-[15px] font-semibold text-white/[0.94]">
                        {delivery.weightKg} kg · Size {delivery.packageSize}
                      </p>
                    </div>

                    {/* STATUS */}

                    <div>
                      <StatusBadge status={status} />
                    </div>

                    {/* ARROW */}

                    <div className="flex items-center justify-end">
                      <ArrowRight
                        size={18}
                        className="text-white/[0.48] transition duration-200 group-hover:translate-x-1 group-hover:text-orange-500"
                      />
                    </div>
                  </Link>
                );
              })}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/* =========================================================
   TABLE HEADER
========================================================= */

function TableHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/[0.78]">
      {children}
    </span>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalizedStatus = status.toLowerCase();

  let className =
    "border-white/[0.12] bg-white/[0.045] text-white";

  if (
    normalizedStatus.includes("overdue") ||
    normalizedStatus.includes("failed")
  ) {
    className =
      "border-orange-500/[0.26] bg-orange-500/[0.09] text-orange-300";
  } else if (
    normalizedStatus.includes("payment") ||
    normalizedStatus.includes("pending")
  ) {
    className =
      "border-amber-400/[0.22] bg-amber-400/[0.07] text-amber-200";
  } else if (
    normalizedStatus.includes("completed") ||
    normalizedStatus.includes("arrived")
  ) {
    className =
      "border-emerald-400/[0.18] bg-emerald-400/[0.06] text-emerald-200";
  } else if (
    normalizedStatus.includes("delivery") ||
    normalizedStatus.includes("transit")
  ) {
    className =
      "border-orange-400/[0.20] bg-orange-400/[0.07] text-orange-200";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${className}`}
    >
      {status}
    </span>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyDeliveries() {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.10] bg-[#1b181d] text-white/[0.78]">
        <Package size={22} />
      </div>

      <p className="mt-6 text-[18px] font-bold text-white">
        No deliveries yet
      </p>

      <p className="mt-2 max-w-[390px] text-[14px] leading-6 text-white/[0.72]">
        Create your first hub-to-hub delivery and its progress will appear here.
      </p>

      <Link
        to="/customer/deliveries/create"
        className="group mt-7 inline-flex h-12 items-center gap-3 rounded-xl border border-white/[0.14] bg-[#1b181d] px-6 text-[14px] font-semibold text-white transition hover:border-orange-500/[0.40] hover:bg-[#211a19]"
      >
        Create delivery

        <ArrowRight
          size={15}
          className="transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  );
}