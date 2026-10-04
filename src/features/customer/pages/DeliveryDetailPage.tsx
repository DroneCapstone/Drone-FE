import {
  ArrowLeft,
  Check,
} from "lucide-react";

import {
  Link,
  Navigate,
  useParams,
} from "react-router-dom";

import {
  customerDeliveryService,
  formatDateTime,
  formatVnd,
} from "../services/customerDeliveryService";

import {
  getDeliveryPricing,
} from "../services/deliveryPricing";

/* =========================================================
   DELIVERY DETAIL PAGE
========================================================= */

export function DeliveryDetailPage() {
  const { deliveryId } =
    useParams();

  const delivery =
    deliveryId
      ? customerDeliveryService.getById(
          deliveryId,
        )
      : null;

  if (!delivery) {
    return (
      <Navigate
        to="/customer/deliveries"
        replace
      />
    );
  }

  const status =
    customerDeliveryService.getCustomerStatus(
      delivery,
    );

  const paid =
    delivery.paymentStatus ===
    "paid";

  const pricing =
    getDeliveryPricing(delivery);

  const steps = [
    {
      label: "Order placed",
      complete: true,
    },
    {
      label: "Payment confirmed",
      complete: paid,
    },
    {
      label:
        "Package at origin hub",
      complete:
        delivery.packageReceivedAtHub,
    },
    {
      label: "Scheduled",
      complete:
        delivery.orderStatus ===
          "accepted" ||
        delivery.orderStatus ===
          "in_delivery" ||
        delivery.orderStatus ===
          "completed",
    },
    {
      label: "In delivery",
      complete:
        delivery.orderStatus ===
          "in_delivery" ||
        delivery.orderStatus ===
          "completed",
    },
    {
      label:
        "Arrived at destination hub",
      complete:
        delivery.orderStatus ===
        "completed",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-28 pt-8 sm:px-6 sm:pt-10 lg:px-10 lg:pb-16 lg:pt-12">
      {/* =====================================================
          HEADER
      ====================================================== */}
      <header>
        <Link
          to="/customer/dashboard"
          className="mb-5 inline-flex items-center gap-2 text-[12px] font-medium text-white/[0.48] transition hover:text-white sm:mb-6 sm:text-[13px]"
        >
          <ArrowLeft size={15} />
          Back to dashboard
        </Link>

        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500">
          {delivery.id}
        </p>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[42px]">
              {status}
            </h1>

            <p className="mt-3 text-[14px] text-white/[0.50]">
              {
                delivery.originHub
                  .name
              }
              <span className="mx-2 text-white/[0.25]">
                →
              </span>
              {
                delivery
                  .destinationHub.name
              }
            </p>
          </div>

          <p className="text-[11px] text-white/[0.30]">
            Created{" "}
            {formatDateTime(
              delivery.createdAt,
            )}
          </p>
        </div>
      </header>

      {/* =====================================================
          CONTENT
      ====================================================== */}
      <div className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
        <main className="min-w-0 space-y-5">
          {/* PROGRESS */}
          <section className="rounded-2xl border border-white/[0.10] bg-[#161217]/92 p-5 shadow-[0_12px_32px_rgba(0,0,0,0.22)] backdrop-blur-sm sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-500">
              Delivery progress
            </p>

            <h2 className="mt-2 text-[18px] font-semibold text-white">
              Order status
            </h2>

            <div className="mt-6">
              {steps.map(
                (step, index) => (
                  <TimelineStep
                    key={step.label}
                    label={
                      step.label
                    }
                    complete={
                      step.complete
                    }
                    last={
                      index ===
                      steps.length - 1
                    }
                  />
                ),
              )}
            </div>
          </section>

          {/* ROUTE */}
          <section className="rounded-2xl border border-white/[0.10] bg-[#161217]/92 p-5 shadow-[0_12px_32px_rgba(0,0,0,0.22)] backdrop-blur-sm sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-500">
              Delivery route
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <RouteCard
                label="Origin hub"
                name={
                  delivery.originHub
                    .name
                }
                address={
                  delivery.originHub
                    .address
                }
              />

              <RouteCard
                label="Destination hub"
                name={
                  delivery
                    .destinationHub.name
                }
                address={
                  delivery
                    .destinationHub
                    .address
                }
              />
            </div>

            {pricing.distanceKm !== null && (
              <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/[0.07] pt-4">
                <span className="text-[11px] text-white/[0.38]">
                  Estimated hub distance
                </span>

                <span className="text-[13px] font-medium text-white/[0.78]">
                  {pricing.distanceKm} km
                </span>
              </div>
            )}
          </section>

          {/* DELIVERY INFO */}
          <section className="rounded-2xl border border-white/[0.10] bg-[#161217]/92 p-5 shadow-[0_12px_32px_rgba(0,0,0,0.22)] backdrop-blur-sm sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-500">
              Delivery information
            </p>

            <div className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <DetailItem
                label="Handover deadline"
                value={formatDateTime(
                  delivery.handoverDeadlineAt,
                )}
                emphasized
              />

              <DetailItem
                label="Estimated departure"
                value={formatDateTime(
                  delivery.estimatedDepartureAt,
                )}
              />

              <DetailItem
                label="Estimated arrival"
                value={formatDateTime(
                  delivery.estimatedArrivalAt,
                )}
              />

              <DetailItem
                label="Package"
                value={`${delivery.weightKg} kg · Size ${delivery.packageSize}`}
              />

              <DetailItem
                label="Handling"
                value={
                  pricing.isFragile
                    ? "Fragile"
                    : "Standard"
                }
              />

              <DetailItem
                label="Insurance"
                value={
                  pricing.hasInsurance
                    ? "Protected"
                    : "Not added"
                }
              />

              <DetailItem
                label="Delivery mode"
                value={
                  pricing.deliveryMode ===
                  "express"
                    ? "Express"
                    : "Scheduled"
                }
              />
            </div>
          </section>
        </main>

        {/* =================================================
            PRICE SUMMARY
        ================================================== */}
        <aside className="h-fit lg:sticky lg:top-[96px]">
          <div className="overflow-hidden rounded-2xl border border-white/[0.10] bg-[#161217]/95 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-sm">
            <div className="border-b border-white/[0.08] px-5 py-5 sm:px-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/[0.40]">
                Price summary
              </p>

              <p className="mt-2 text-[17px] font-semibold text-white">
                Delivery charge
              </p>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <div className="space-y-3.5">
                <PriceRow
                  label={`Base fee · Tier ${pricing.droneSize}`}
                  value={formatVnd(
                    pricing.baseFee,
                  )}
                />

                <PriceRow
                  label={
                    pricing.distanceKm !== null
                      ? `Distance · ${pricing.distanceKm} km`
                      : "Distance"
                  }
                  value={formatVnd(
                    pricing.distanceFee,
                  )}
                />

                <PriceRow
                  label={`Payload · ${delivery.weightKg} kg`}
                  value={formatVnd(
                    pricing.payloadFee,
                  )}
                />

                <PriceRow
                  label="Core fee"
                  value={formatVnd(
                    pricing.coreFee,
                  )}
                  strong
                />

                {pricing.isFragile && (
                  <PriceRow
                    label="Fragile items · 15%"
                    value={`+${formatVnd(
                      pricing.fragileSurcharge,
                    )}`}
                  />
                )}

                {pricing.hasInsurance && (
                  <PriceRow
                    label="Package insurance · 10%"
                    value={`+${formatVnd(
                      pricing.insuranceSurcharge,
                    )}`}
                  />
                )}

                {pricing.deliveryMode ===
                  "express" ? (
                  <PriceRow
                    label="Express surcharge · 25%"
                    value={`+${formatVnd(
                      pricing.serviceSurcharge,
                    )}`}
                  />
                ) : (
                  <PriceRow
                    label="Scheduled surcharge"
                    value={formatVnd(0)}
                  />
                )}
              </div>

              <div className="mt-5 flex items-end justify-between gap-5 border-t border-white/[0.08] pt-5">
                <span className="text-[13px] font-medium text-white/[0.62]">
                  Total
                </span>

                <strong className="text-right text-[24px] font-semibold tracking-[-0.03em] text-white">
                  {formatVnd(
                    pricing.finalFee,
                  )}
                </strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* =========================================================
   TIMELINE STEP
========================================================= */

function TimelineStep({
  label,
  complete,
  last,
}: {
  label: string;
  complete: boolean;
  last: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full border ${
            complete
              ? "border-orange-500 bg-orange-500 text-black"
              : "border-white/[0.14] bg-[#161217]"
          }`}
        >
          {complete && (
            <Check size={13} />
          )}
        </div>

        {!last && (
          <div
            className={`h-12 w-px ${
              complete
                ? "bg-orange-500/40"
                : "bg-white/[0.09]"
            }`}
          />
        )}
      </div>

      <p
        className={`pt-1 text-[13px] ${
          complete
            ? "font-medium text-white/[0.88]"
            : "text-white/[0.34]"
        }`}
      >
        {label}
      </p>
    </div>
  );
}

/* =========================================================
   ROUTE CARD
========================================================= */

function RouteCard({
  label,
  name,
  address,
}: {
  label: string;
  name: string;
  address: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/[0.36]">
        {label}
      </p>

      <p className="mt-2 text-[15px] font-semibold text-white/[0.90]">
        {name}
      </p>

      <p className="mt-1 text-[12px] leading-5 text-white/[0.46]">
        {address}
      </p>
    </div>
  );
}

/* =========================================================
   DETAIL ITEM
========================================================= */

function DetailItem({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/[0.34]">
        {label}
      </p>

      <p
        className={`mt-2 text-[13px] font-medium leading-5 ${
          emphasized
            ? "text-orange-400"
            : "text-white/[0.78]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   PRICE ROW
========================================================= */

function PriceRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-5">
      <span
        className={`text-[12px] leading-5 ${
          strong
            ? "font-semibold text-white/[0.66]"
            : "text-white/[0.44]"
        }`}
      >
        {label}
      </span>

      <span
        className={`shrink-0 text-right text-[12px] leading-5 ${
          strong
            ? "font-semibold text-white"
            : "font-medium text-white/[0.82]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
