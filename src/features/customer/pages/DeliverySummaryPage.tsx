import {
  ArrowRight,
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
   DELIVERY SUMMARY PAGE
========================================================= */

export function DeliverySummaryPage() {
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

  const pricing =
    getDeliveryPricing(delivery);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-28 pt-8 sm:px-6 sm:pt-10 lg:px-10 lg:pb-16 lg:pt-12">
      {/* =====================================================
          HEADER
      ====================================================== */}
      <header className="max-w-[720px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500">
          Order created
        </p>

        <h1 className="mt-3 text-[34px] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[42px]">
          Delivery booked
        </h1>

        <p className="mt-3 text-[14px] leading-6 text-white/[0.58] sm:text-[15px]">
          Order {delivery.id} has been
          created. Complete payment to
          continue.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
        {/* =================================================
            DELIVERY INFO
        ================================================== */}
        <main className="min-w-0 space-y-5">
          {/* ROUTE */}
          <section className="rounded-2xl border border-white/[0.10] bg-[#161217]/92 p-5 shadow-[0_12px_32px_rgba(0,0,0,0.22)] backdrop-blur-sm sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-500">
              Delivery route
            </p>

            <div className="mt-5">
              <RoutePoint
                label="Origin hub"
                name={
                  delivery.originHub.name
                }
                address={
                  delivery.originHub.address
                }
              />

              <div className="my-3 ml-[9px] h-7 w-px bg-white/[0.12]" />

              <RoutePoint
                label="Destination hub"
                name={
                  delivery
                    .destinationHub.name
                }
                address={
                  delivery
                    .destinationHub.address
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

          {/* HANDOVER */}
          <section className="rounded-2xl border border-orange-500/[0.16] bg-orange-500/[0.045] p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-400">
              Package handover
            </p>

            <p className="mt-3 text-[13px] text-white/[0.50]">
              Bring your package to the
              origin hub by
            </p>

            <p className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-white sm:text-[26px]">
              {formatDateTime(
                delivery.handoverDeadlineAt,
              )}
            </p>

            <p className="mt-3 max-w-[650px] text-[12px] leading-6 text-white/[0.48]">
              To keep the requested
              delivery time, your package
              must arrive before this
              deadline. Late handover may
              move the delivery to the next
              available slot.
            </p>
          </section>

          {/* TIMING */}
          <section className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <TimeBlock
              label="Estimated departure"
              value={formatDateTime(
                delivery
                  .estimatedDepartureAt,
              )}
            />

            <TimeBlock
              label="Estimated arrival"
              value={formatDateTime(
                delivery
                  .estimatedArrivalAt,
              )}
            />
          </section>
        </main>

        {/* =================================================
            ORDER SUMMARY
        ================================================== */}
        <aside className="h-fit lg:sticky lg:top-[96px]">
          <div className="overflow-hidden rounded-2xl border border-white/[0.10] bg-[#161217]/95 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-sm">
            <div className="border-b border-white/[0.08] px-5 py-5 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/[0.42]">
                    Order summary
                  </p>

                  <p className="mt-2 text-[17px] font-semibold text-white">
                    {delivery.id}
                  </p>
                </div>

                <span className="rounded-full border border-orange-500/[0.22] bg-orange-500/[0.07] px-3 py-1.5 text-[10px] font-semibold text-orange-400">
                  {pricing.deliveryMode ===
                  "express"
                    ? "Express"
                    : "Scheduled"}
                </span>
              </div>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/[0.34]">
                Price details
              </p>

              <div className="mt-4 space-y-3.5">
                <AmountRow
                  label={`Base fee · Tier ${pricing.droneSize}`}
                  value={formatVnd(
                    pricing.baseFee,
                  )}
                />

                <AmountRow
                  label={
                    pricing.distanceKm !== null
                      ? `Distance · ${pricing.distanceKm} km`
                      : "Distance"
                  }
                  value={formatVnd(
                    pricing.distanceFee,
                  )}
                />

                <AmountRow
                  label={`Payload · ${delivery.weightKg} kg`}
                  value={formatVnd(
                    pricing.payloadFee,
                  )}
                />

                <AmountRow
                  label="Core fee"
                  value={formatVnd(
                    pricing.coreFee,
                  )}
                  strong
                />

                {pricing.isFragile && (
                  <AmountRow
                    label="Fragile items · 15%"
                    value={`+${formatVnd(
                      pricing.fragileSurcharge,
                    )}`}
                  />
                )}

                {pricing.hasInsurance && (
                  <AmountRow
                    label="Package insurance · 10%"
                    value={`+${formatVnd(
                      pricing.insuranceSurcharge,
                    )}`}
                  />
                )}

                {pricing.deliveryMode ===
                  "express" ? (
                  <AmountRow
                    label="Express surcharge · 25%"
                    value={`+${formatVnd(
                      pricing.serviceSurcharge,
                    )}`}
                  />
                ) : (
                  <AmountRow
                    label="Scheduled surcharge"
                    value={formatVnd(0)}
                  />
                )}
              </div>

              <div className="mt-5 flex items-end justify-between gap-5 border-t border-white/[0.08] pt-5">
                <div>
                  <p className="text-[13px] font-medium text-white/[0.62]">
                    Total
                  </p>

                  <p className="mt-1 text-[11px] text-white/[0.34]">
                    Amount to pay
                  </p>
                </div>

                <strong className="text-right text-[24px] font-semibold tracking-[-0.03em] text-white">
                  {formatVnd(
                    pricing.finalFee,
                  )}
                </strong>
              </div>
            </div>

            <div className="border-t border-white/[0.08] p-4 sm:p-5">
              <Link
                to={`/customer/payment/${delivery.id}`}
                className="group flex h-12 items-center justify-center gap-3 rounded-lg bg-orange-500 text-[13px] font-semibold text-black transition hover:bg-orange-400"
              >
                Continue to payment

                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* =========================================================
   ROUTE POINT
========================================================= */

function RoutePoint({
  label,
  name,
  address,
}: {
  label: string;
  name: string;
  address: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="relative z-10 mt-1 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border border-orange-500/[0.42] bg-[#161217]">
        <span className="h-[5px] w-[5px] rounded-full bg-orange-500" />
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/[0.38]">
          {label}
        </p>

        <p className="mt-2 text-[15px] font-semibold text-white/[0.92]">
          {name}
        </p>

        <p className="mt-1 text-[12px] leading-5 text-white/[0.48]">
          {address}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   TIME BLOCK
========================================================= */

function TimeBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.09] bg-[#161217]/92 p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/[0.36]">
        {label}
      </p>

      <p className="mt-2 text-[14px] font-medium text-white/[0.84]">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   AMOUNT ROW
========================================================= */

function AmountRow({
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
