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
    ? customerDeliveryService.getByCustomer(
        user.id,
      )
    : [];

  useEffect(() => {
    const pendingIds = deliveries
      .filter(
        (item) =>
          item.paymentStatus ===
          "pending",
      )
      .map((item) => item.id);

    if (pendingIds.length === 0) {
      return;
    }

    Promise.allSettled(
      pendingIds.map((id) =>
        customerDeliveryService.refreshPaymentStatus(
          id,
        ),
      ),
    ).then(() => {
      setRevision(
        (value) => value + 1,
      );
    });
  }, [user?.id]);

  return (
    <div className="min-h-[calc(100vh-72px)] bg-transparent font-sans">
      <div className="mx-auto max-w-[1320px] px-4 pb-24 pt-7 sm:px-6 sm:py-10 lg:px-10 lg:py-12">
        {/* =====================================================
            PAGE HEADER
        ====================================================== */}

        <div className="flex flex-col gap-6 border-b border-white/[0.10] pb-7 sm:gap-7 sm:pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-500 sm:text-[12px]">
              Deliveries
            </p>

            <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.04em] text-white sm:mt-3 sm:text-[38px] lg:text-[44px]">
              My deliveries
            </h1>

            <p className="mt-2 max-w-[720px] text-[13px] leading-6 text-white/[0.64] sm:mt-3 sm:text-[15px] sm:leading-7 sm:text-white/[0.78]">
              Review your delivery
              requests, payment status
              and package handover
              progress.
            </p>
          </div>

          <Link
            to="/customer/deliveries/create?new=1"
            className="group inline-flex h-[50px] w-full shrink-0 items-center justify-center gap-3 rounded-xl bg-orange-500 px-6 text-[14px] font-semibold text-black transition hover:bg-orange-400 sm:h-[52px] lg:w-auto lg:px-7"
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

        <section className="mt-7 lg:mt-9">
          {deliveries.length === 0 ? (
            <div className="overflow-hidden rounded-2xl border border-white/[0.12] bg-[#151318]/95 shadow-[0_14px_36px_rgba(0,0,0,0.25)] backdrop-blur-sm">
              <EmptyDeliveries />
            </div>
          ) : (
            <>
              {/* =================================================
                  DESKTOP TABLE
              ================================================== */}

              <div className="hidden overflow-hidden rounded-2xl border border-white/[0.12] bg-[#151318]/95 shadow-[0_14px_36px_rgba(0,0,0,0.25)] backdrop-blur-sm lg:block">
                <div className="grid grid-cols-[170px_minmax(210px,1fr)_28px_minmax(210px,1fr)_140px_220px_28px] items-center gap-4 border-b border-white/[0.10] bg-white/[0.025] px-7 py-5">
                  <TableHeader>
                    Order
                  </TableHeader>

                  <TableHeader>
                    Origin hub
                  </TableHeader>

                  <span />

                  <TableHeader>
                    Destination hub
                  </TableHeader>

                  <TableHeader>
                    Package
                  </TableHeader>

                  <TableHeader>
                    Status
                  </TableHeader>

                  <span />
                </div>

                {deliveries.map(
                  (delivery) => {
                    const status =
                      customerDeliveryService.getCustomerStatus(
                        delivery,
                      );

                    return (
                      <Link
                        key={
                          delivery.id
                        }
                        to={`/customer/deliveries/${delivery.id}`}
                        className="group grid grid-cols-[170px_minmax(210px,1fr)_28px_minmax(210px,1fr)_140px_220px_28px] items-center gap-4 border-b border-white/[0.09] px-7 py-6 transition last:border-b-0 hover:bg-white/[0.035]"
                      >
                        {/* ORDER */}

                        <div className="min-w-0">
                          <p className="text-[16px] font-bold tracking-[-0.01em] text-white">
                            {delivery.id}
                          </p>

                          <p className="mt-1.5 text-[12px] font-medium leading-5 text-white/[0.54]">
                            {formatDateTime(
                              delivery.createdAt,
                            )}
                          </p>
                        </div>

                        {/* ROUTE */}

                        <DesktopHubCell
                          name={
                            delivery
                              .originHub
                              .name
                          }
                        />

                        <div className="flex items-center justify-center">
                          <span className="text-[13px] text-white/[0.30]">
                            →
                          </span>
                        </div>

                        <DesktopHubCell
                          name={
                            delivery
                              .destinationHub
                              .name
                          }
                        />

                        {/* PACKAGE */}

                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold leading-5 text-white/[0.92]">
                            {
                              delivery.weightKg
                            }{" "}
                            kg
                          </p>

                          <p className="mt-1 text-[11px] leading-4 text-white/[0.44]">
                            Size{" "}
                            {
                              delivery.packageSize
                            }
                          </p>
                        </div>

                        {/* STATUS */}

                        <div className="min-w-0">
                          <StatusBadge
                            status={
                              status
                            }
                          />
                        </div>

                        {/* ARROW */}

                        <div className="flex items-center justify-end">
                          <ArrowRight
                            size={18}
                            className="text-white/[0.42] transition duration-200 group-hover:translate-x-1 group-hover:text-orange-500"
                          />
                        </div>
                      </Link>
                    );
                  },
                )}
              </div>

              {/* =================================================
                  MOBILE / TABLET CARDS
              ================================================== */}

              <div className="grid gap-4 lg:hidden">
                {deliveries.map(
                  (delivery) => {
                    const status =
                      customerDeliveryService.getCustomerStatus(
                        delivery,
                      );

                    return (
                      <Link
                        key={
                          delivery.id
                        }
                        to={`/customer/deliveries/${delivery.id}`}
                        className="group relative overflow-hidden rounded-2xl border border-white/[0.12] bg-[#151318]/96 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.22)] transition active:bg-white/[0.035] sm:p-6"
                      >
                        {/* TOP */}

                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-[16px] font-bold tracking-[-0.01em] text-white">
                              {delivery.id}
                            </p>

                            <p className="mt-1 text-[11px] font-medium text-white/[0.46] sm:text-[12px]">
                              {formatDateTime(
                                delivery.createdAt,
                              )}
                            </p>
                          </div>

                          <ArrowRight
                            size={18}
                            className="mt-1 shrink-0 text-white/[0.38] transition group-hover:translate-x-1 group-hover:text-orange-500"
                          />
                        </div>

                        {/* ROUTE */}

                        <div className="mt-5 border-t border-white/[0.07] pt-4">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/[0.30]">
                            Route
                          </p>

                          <MobileRoute
                            origin={
                              delivery
                                .originHub
                                .name
                            }
                            destination={
                              delivery
                                .destinationHub
                                .name
                            }
                          />
                        </div>

                        {/* PACKAGE + STATUS */}

                        <div className="mt-5 grid gap-4 border-t border-white/[0.07] pt-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-end">
                          <div>
                            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/[0.30]">
                              Package
                            </p>

                            <p className="mt-1.5 text-[13px] font-semibold text-white/[0.82]">
                              {
                                delivery.weightKg
                              }{" "}
                              kg · Size{" "}
                              {
                                delivery.packageSize
                              }
                            </p>
                          </div>

                          <div className="min-w-0 sm:flex sm:justify-end">
                            <StatusBadge
                              status={
                                status
                              }
                            />
                          </div>
                        </div>
                      </Link>
                    );
                  },
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/* =========================================================
   DESKTOP HUB CELL
========================================================= */

function DesktopHubCell({
  name,
}: {
  name: string;
}) {
  return (
    <div className="min-w-0">
      <p className="break-words text-[13px] font-semibold leading-5 text-white/[0.92]">
        {name}
      </p>
    </div>
  );
}

/* =========================================================
   MOBILE ROUTE
========================================================= */

function MobileRoute({
  origin,
  destination,
}: {
  origin: string;
  destination: string;
}) {
  return (
    <div className="mt-3 grid gap-2.5">
      <div className="flex gap-3">
        <div className="mt-[5px] h-2.5 w-2.5 shrink-0 rounded-full border-2 border-orange-500" />

        <div className="min-w-0">
          <p className="text-[9px] font-medium uppercase tracking-[0.10em] text-white/[0.28]">
            Origin
          </p>

          <p className="mt-1 break-words text-[13px] font-semibold leading-5 text-white/[0.88]">
            {origin}
          </p>
        </div>
      </div>

      <div className="ml-[4px] h-4 w-px bg-white/[0.10]" />

      <div className="flex gap-3">
        <div className="mt-[5px] h-2.5 w-2.5 shrink-0 rounded-full border-2 border-orange-500" />

        <div className="min-w-0">
          <p className="text-[9px] font-medium uppercase tracking-[0.10em] text-white/[0.28]">
            Destination
          </p>

          <p className="mt-1 break-words text-[13px] font-semibold leading-5 text-white/[0.88]">
            {destination}
          </p>
        </div>
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
    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/[0.72]">
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
  const normalizedStatus =
    status.toLowerCase();

  let className =
    "border-white/[0.12] bg-white/[0.045] text-white";

  if (
    normalizedStatus.includes(
      "overdue",
    ) ||
    normalizedStatus.includes(
      "failed",
    )
  ) {
    className =
      "border-orange-500/[0.26] bg-orange-500/[0.09] text-orange-300";
  } else if (
    normalizedStatus.includes(
      "payment",
    ) ||
    normalizedStatus.includes(
      "pending",
    )
  ) {
    className =
      "border-amber-400/[0.22] bg-amber-400/[0.07] text-amber-200";
  } else if (
    normalizedStatus.includes(
      "completed",
    ) ||
    normalizedStatus.includes(
      "arrived",
    )
  ) {
    className =
      "border-emerald-400/[0.18] bg-emerald-400/[0.06] text-emerald-200";
  } else if (
    normalizedStatus.includes(
      "delivery",
    ) ||
    normalizedStatus.includes(
      "transit",
    )
  ) {
    className =
      "border-orange-400/[0.20] bg-orange-400/[0.07] text-orange-200";
  }

  return (
    <span
      className={`inline-flex max-w-full whitespace-normal rounded-full border px-3 py-1.5 text-[12px] font-semibold leading-5 ${className}`}
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
        Create your first
        hub-to-hub delivery and
        its progress will appear
        here.
      </p>

      <Link
        to="/customer/deliveries/create?new=1"
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
