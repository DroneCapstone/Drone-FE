import type { ReactNode } from "react";

import {
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

import {
  Navigate,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";

import {
  PACKAGE_CATEGORIES,
  PACKAGE_SIZE_RULES,
} from "../data/customerData";

import {
  customerDeliveryService,
  formatDateTime,
  formatVnd,
} from "../services/customerDeliveryService";

import {
  calculateDeliveryPricing,
  persistDeliveryPricingSnapshot,
} from "../services/deliveryPricing";

import {
  persistDeliveryRouteSnapshot,
  resolveCustomerRoute,
} from "../services/customerRouteService";

/* =========================================================
   DELIVERY REVIEW / CHECKOUT PAGE

   Mobile UX:
   - Compact review cards
   - Total + Pay now always visible at the bottom
   - No intermediate "Place order" page
   - Continue directly to payment

   Desktop UX:
   - Detail column + sticky price summary
========================================================= */

export function DeliveryReviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const draft =
    customerDeliveryService.getDraft() as
      | (ReturnType<
          typeof customerDeliveryService.getDraft
        > & {
          hasInsurance?: boolean;
          draftVersion?: number;
        })
      | null;

  if (!draft || !user) {
    return (
      <Navigate
        to="/customer/deliveries/create"
        replace
      />
    );
  }

  const selectedRoute =
    resolveCustomerRoute(
      draft.originArea,
      draft.destinationArea,
    );

  if (
    !draft.packageCategory ||
    !draft.weightKg ||
    !draft.packageSize ||
    !draft.deliveryMode ||
    !selectedRoute
  ) {
    return (
      <Navigate
        to="/customer/deliveries/create"
        replace
      />
    );
  }

  /*
   * customerDeliveryService.preview() is still used for timing.
   * Route/hub information comes from the selected route resolver,
   * so origin and destination cannot fall back to the same hub
   * incorrectly.
   */
  const timingPreview =
    customerDeliveryService.preview(
      draft,
    );

  const preview = {
    ...timingPreview,
    ...selectedRoute,
  };

  const pricing =
    calculateDeliveryPricing(
      draft,
      selectedRoute,
    );

  const category =
    PACKAGE_CATEGORIES.find(
      (item) =>
        item.value ===
        draft.packageCategory,
    )?.label ?? "—";

  const sizeRule =
    PACKAGE_SIZE_RULES[
      draft.packageSize
    ];

  /* =======================================================
     CHECKOUT

     The current mock Payment route requires a deliveryId.
     We create/reuse a PENDING checkout record only to open
     payment. The UI no longer treats this step as "Order placed".

     On a real backend the recommended lifecycle is:
     create checkout -> pay -> confirm order.
  ======================================================== */

  const continueToPayment = () => {
    if (!pricing.isRoutePriced) {
      return;
    }

    const signature = JSON.stringify({
      customerId: user.id,
      senderName: draft.senderName,
      senderPhone: draft.senderPhone,
      recipientName:
        draft.recipientName,
      recipientPhone:
        draft.recipientPhone,
      packageCategory:
        draft.packageCategory,
      weightKg: draft.weightKg,
      packageSize:
        draft.packageSize,
      hasInsurance:
        Boolean(
          draft.hasInsurance,
        ),
      originArea:
        draft.originArea,
      destinationArea:
        draft.destinationArea,
      deliveryMode:
        draft.deliveryMode,
      requestedDepartureAt:
        draft.requestedDepartureAt,
      total: pricing.finalFee,
    });

    const storageKey =
      "droneoptai.customer.pendingCheckout";

    /*
     * Reuse the same unpaid checkout when the customer goes
     * back from Payment to Review and taps Pay again.
     * This prevents duplicate mock orders.
     */
    try {
      const stored =
        window.sessionStorage.getItem(
          storageKey,
        );

      if (stored) {
        const parsed = JSON.parse(
          stored,
        ) as {
          deliveryId?: string;
          signature?: string;
        };

        if (
          parsed.signature ===
            signature &&
          parsed.deliveryId
        ) {
          const existing =
            customerDeliveryService.getById(
              parsed.deliveryId,
            );

          if (
            existing &&
            existing.paymentStatus !==
              "paid"
          ) {
            navigate(
              `/customer/payment/${existing.id}`,
            );
            return;
          }
        }
      }
    } catch {
      // Session storage is optional.
    }

    const delivery =
      customerDeliveryService.create(
        user.id,
        draft,
      );

    persistDeliveryPricingSnapshot(
      delivery.id,
      pricing,
    );

    persistDeliveryRouteSnapshot(
      delivery.id,
      selectedRoute,
    );

    try {
      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          deliveryId: delivery.id,
          signature,
        }),
      );
    } catch {
      // Continue even if sessionStorage is unavailable.
    }

    /*
     * IMPORTANT:
     * Do NOT clear the draft here.
     * The customer has not paid yet.
     *
     * Clear/reset the draft only after payment succeeds.
     */
    navigate(
      `/customer/payment/${delivery.id}`,
    );
  };

  return (
    <>
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-[132px] pt-6 sm:px-6 sm:pb-28 sm:pt-9 lg:px-10 lg:pb-16 lg:pt-12">
        {/* ===================================================
            HEADER
        ==================================================== */}
        <header className="max-w-[720px]">
          <p className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500 sm:block">
            Review
          </p>

          <h1 className="text-[30px] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:mt-3 sm:text-[42px]">
            Review your delivery
          </h1>

          <p className="mt-2 max-w-[560px] text-[13px] leading-5 text-white/[0.48] sm:mt-3 sm:text-[15px] sm:leading-6 sm:text-white/[0.58]">
            Check the delivery information
            before continuing to payment.
          </p>
        </header>

        {/* ===================================================
            MOBILE TOTAL PREVIEW
        ==================================================== */}
        <section className="mt-5 rounded-2xl border border-orange-500/[0.18] bg-orange-500/[0.045] p-4 lg:hidden">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/[0.40]">
                Amount to pay
              </p>

              <p className="mt-1 text-[12px] text-white/[0.44]">
                {draft.deliveryMode ===
                "express"
                  ? "Express delivery"
                  : "Scheduled delivery"}
              </p>
            </div>

            <p className="text-right text-[24px] font-semibold tracking-[-0.035em] text-white">
              {formatVnd(
                pricing.finalFee,
              )}
            </p>
          </div>
        </section>

        {/* ===================================================
            MAIN
        ==================================================== */}
        <div className="mt-5 grid gap-5 sm:mt-8 sm:gap-6 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
          <main className="min-w-0 space-y-4 sm:space-y-5">
            {/* ===============================================
                CONTACTS
            ================================================ */}
            <CompactSection
              title="Contacts"
              edit={() =>
                navigate(
                  "/customer/deliveries/create?step=0",
                )
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <ContactInfo
                  label="Sender"
                  name={draft.senderName}
                  phone={
                    draft.senderPhone
                  }
                />

                <ContactInfo
                  label="Recipient"
                  name={
                    draft.recipientName
                  }
                  phone={
                    draft.recipientPhone
                  }
                />
              </div>
            </CompactSection>

            {/* ===============================================
                PACKAGE
            ================================================ */}
            <CompactSection
              title="Package"
              edit={() =>
                navigate(
                  "/customer/deliveries/create?step=1",
                )
              }
            >
              <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
                <CompactInfo
                  label="Category"
                  value={category}
                />

                <CompactInfo
                  label="Weight"
                  value={`${draft.weightKg} kg`}
                />

                <CompactInfo
                  label="Size"
                  value={
                    draft.packageSize
                  }
                  helper={
                    sizeRule
                      ?.dimensions
                  }
                />

                <CompactInfo
                  label="Insurance"
                  value={
                    pricing.hasInsurance
                      ? "Added"
                      : "Not added"
                  }
                />
              </div>

              {pricing.isFragile && (
                <div className="mt-4 border-t border-white/[0.07] pt-3">
                  <p className="text-[11px] leading-5 text-orange-400/90">
                    Fragile items · +15%
                    Core Fee applied
                    automatically.
                  </p>
                </div>
              )}
            </CompactSection>

            {/* ===============================================
                ROUTE
            ================================================ */}
            <CompactSection
              title="Delivery route"
              edit={() =>
                navigate(
                  "/customer/deliveries/create?step=2",
                )
              }
            >
              <div className="relative">
                <RoutePoint
                  label="Origin"
                  name={
                    preview.originHub
                      .name
                  }
                  address={
                    preview.originHub
                      .address
                  }
                />

                <div className="ml-[7px] h-6 border-l border-dashed border-white/[0.14]" />

                <RoutePoint
                  label="Destination"
                  name={
                    preview
                      .destinationHub
                      .name
                  }
                  address={
                    preview
                      .destinationHub
                      .address
                  }
                />
              </div>

              {pricing.distanceKm !==
                null && (
                <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/[0.07] pt-3">
                  <span className="text-[11px] text-white/[0.36]">
                    Estimated distance
                  </span>

                  <span className="text-[12px] font-medium text-white/[0.72]">
                    {pricing.distanceKm} km
                  </span>
                </div>
              )}
            </CompactSection>

            {/* ===============================================
                DELIVERY TIME
            ================================================ */}
            <CompactSection
              title="Delivery time"
              edit={() =>
                navigate(
                  "/customer/deliveries/create?step=3",
                )
              }
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <CompactInfo
                  label="Mode"
                  value={
                    draft.deliveryMode ===
                    "express"
                      ? "Express"
                      : "Scheduled"
                  }
                />

                <CompactInfo
                  label="Departure"
                  value={formatDateTime(
                    preview
                      .estimatedDepartureAt,
                  )}
                />

                <CompactInfo
                  label="Arrival"
                  value={formatDateTime(
                    preview
                      .estimatedArrivalAt,
                  )}
                />
              </div>

              <div className="mt-4 rounded-xl border border-orange-500/[0.12] bg-orange-500/[0.04] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-orange-400">
                  Handover deadline
                </p>

                <p className="mt-1 text-[13px] font-medium text-white/[0.82]">
                  {formatDateTime(
                    preview
                      .handoverDeadlineAt,
                  )}
                </p>
              </div>
            </CompactSection>

            {/* ===============================================
                MOBILE PRICE DETAILS
            ================================================ */}
            <section className="overflow-hidden rounded-2xl border border-white/[0.10] bg-[#161217]/95 shadow-[0_10px_28px_rgba(0,0,0,0.18)] lg:hidden">
              <details>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4">
                  <div>
                    <p className="text-[12px] font-semibold text-white/[0.84]">
                      Price details
                    </p>

                    <p className="mt-1 text-[10px] text-white/[0.36]">
                      View fee breakdown
                    </p>
                  </div>

                  <span className="text-[13px] font-semibold text-white">
                    {formatVnd(
                      pricing.finalFee,
                    )}
                  </span>
                </summary>

                <div className="border-t border-white/[0.07] px-4 py-4">
                  <PriceBreakdown
                    pricing={pricing}
                    weightKg={
                      draft.weightKg
                    }
                  />
                </div>
              </details>
            </section>
          </main>

          {/* ===============================================
              DESKTOP SUMMARY
          ================================================ */}
          <aside className="hidden h-fit lg:sticky lg:top-[96px] lg:block">
            <div className="overflow-hidden rounded-2xl border border-white/[0.10] bg-[#161217]/95 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-sm">
              <div className="border-b border-white/[0.08] px-6 py-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/[0.38]">
                  Payment summary
                </p>

                <p className="mt-2 text-[18px] font-semibold text-white">
                  Order total
                </p>
              </div>

              <div className="px-6 py-5">
                <PriceBreakdown
                  pricing={pricing}
                  weightKg={
                    draft.weightKg
                  }
                />

                <div className="mt-5 flex items-end justify-between gap-5 border-t border-white/[0.08] pt-5">
                  <div>
                    <p className="text-[13px] font-medium text-white/[0.60]">
                      Total
                    </p>

                    <p className="mt-1 text-[10px] text-white/[0.32]">
                      Amount to pay
                    </p>
                  </div>

                  <strong className="text-right text-[25px] font-semibold tracking-[-0.035em] text-white">
                    {formatVnd(
                      pricing.finalFee,
                    )}
                  </strong>
                </div>
              </div>

              <div className="border-t border-white/[0.08] p-5">
                <button
                  type="button"
                  onClick={
                    continueToPayment
                  }
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-[13px] font-semibold text-black transition hover:bg-orange-400"
                >
                  Continue to payment

                  <ArrowRight
                    size={15}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/customer/deliveries/create",
                    )
                  }
                  className="mt-3 flex h-10 w-full items-center justify-center gap-2 text-[12px] font-medium text-white/[0.42] transition hover:text-white"
                >
                  <ArrowLeft
                    size={14}
                  />
                  Edit delivery
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* =====================================================
          MOBILE CHECKOUT BAR
          Shopee / Grab style: always visible
      ====================================================== */}
      <div className="fixed inset-x-0 bottom-0 z-[110] border-t border-white/[0.10] bg-[#100d10]/[0.98] px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-14px_34px_rgba(0,0,0,0.42)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-[520px] items-center gap-3">
          <button
            type="button"
            onClick={() =>
              navigate(
                "/customer/deliveries/create",
              )
            }
            className="flex h-12 shrink-0 items-center justify-center gap-1.5 px-1 text-[12px] font-medium text-white/[0.50]"
          >
            <ArrowLeft size={14} />
            Edit
          </button>

          <div className="min-w-0 flex-1 text-right">
            <p className="text-[10px] text-white/[0.36]">
              Total
            </p>

            <p className="truncate text-[18px] font-semibold tracking-[-0.02em] text-white">
              {formatVnd(
                pricing.finalFee,
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={continueToPayment}
            className="inline-flex h-12 min-w-[128px] shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-[13px] font-semibold text-black transition active:bg-orange-400"
          >
            Pay now
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </>
  );
}

/* =========================================================
   COMPACT SECTION
========================================================= */

function CompactSection({
  title,
  edit,
  children,
}: {
  title: string;
  edit: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.10] bg-[#161217]/94 shadow-[0_10px_28px_rgba(0,0,0,0.18)]">
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-3.5 sm:px-5 sm:py-4">
        <h2 className="text-[13px] font-semibold text-white/[0.88] sm:text-[15px]">
          {title}
        </h2>

        <button
          type="button"
          onClick={edit}
          className="text-[11px] font-medium text-orange-400/90 transition hover:text-orange-400"
        >
          Edit
        </button>
      </div>

      <div className="p-4 sm:p-5">
        {children}
      </div>
    </section>
  );
}

/* =========================================================
   CONTACT INFO
========================================================= */

function ContactInfo({
  label,
  name,
  phone,
}: {
  label: string;
  name: string;
  phone: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-semibold uppercase tracking-[0.11em] text-white/[0.30]">
        {label}
      </p>

      <p className="mt-1.5 truncate text-[13px] font-semibold text-white/[0.86]">
        {name}
      </p>

      <p className="mt-0.5 text-[11px] text-white/[0.45]">
        {phone}
      </p>
    </div>
  );
}

/* =========================================================
   COMPACT INFO
========================================================= */

function CompactInfo({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-semibold uppercase tracking-[0.10em] text-white/[0.30]">
        {label}
      </p>

      <p className="mt-1.5 break-words text-[13px] font-semibold leading-5 text-white/[0.84]">
        {value}
      </p>

      {helper && (
        <p className="mt-0.5 text-[10px] leading-4 text-white/[0.34]">
          {helper}
        </p>
      )}
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
    <div className="flex gap-3">
      <div className="mt-[5px] h-[14px] w-[14px] shrink-0 rounded-full border-2 border-orange-500" />

      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.10em] text-white/[0.30]">
          {label}
        </p>

        <p className="mt-1 text-[13px] font-semibold text-white/[0.86]">
          {name}
        </p>

        <p className="mt-1 text-[10px] leading-4 text-white/[0.38]">
          {address}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   PRICE BREAKDOWN
========================================================= */

function PriceBreakdown({
  pricing,
  weightKg,
}: {
  pricing: ReturnType<
    typeof calculateDeliveryPricing
  >;
  weightKg: number;
}) {
  return (
    <div className="space-y-3">
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
        label={`Payload · ${weightKg} kg`}
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
          label="Express · 25%"
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
        className={`text-[11px] leading-5 ${
          strong
            ? "font-semibold text-white/[0.66]"
            : "text-white/[0.40]"
        }`}
      >
        {label}
      </span>

      <span
        className={`shrink-0 text-right text-[11px] leading-5 ${
          strong
            ? "font-semibold text-white"
            : "font-medium text-white/[0.76]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
