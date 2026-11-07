import type { ReactNode } from "react";

import {

  ArrowLeft,

  ArrowRight,

} from "lucide-react";

import {

  Navigate,

  useNavigate,

} from "react-router-dom";

import { useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";

import {

  PACKAGE_CATEGORIES,

  PACKAGE_SIZE_RULES,

} from "../data/customerData";

import {

  customerDeliveryService,

  formatDeliveryMode,

  formatDateTime,

  formatVnd,

} from "../services/customerDeliveryService";

import type {

  DeliveryDraft,

  DeliveryPrice,

} from "../types/customer";

/* =========================================================

   DELIVERY REVIEW / CHECKOUT

   - Uses the latest backend estimate cached by Create Delivery.

   - Pay now creates the backend order, then opens PaymentPage.

   - No intermediate "Place order" summary step.

========================================================= */

export function DeliveryReviewPage() {

  const navigate = useNavigate();

  const { user } = useAuth();

  const draft =

    customerDeliveryService.getDraft();

  const preview =

    customerDeliveryService.getCachedEstimate();

  const [submitting, setSubmitting] =

    useState(false);

  const [submitError, setSubmitError] =

    useState("");

  if (!draft || !user || !draft.recipientEmail?.trim()) {

    return (

      <Navigate

        to="/customer/deliveries/create"

        replace

      />

    );

  }

  if (!preview) {

    return (

      <Navigate

        to="/customer/deliveries/create?step=3"

        replace

      />

    );

  }

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

  const continueToPayment = async () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      /*
       * Backward-compat cleanup:
       * older FE versions stored the previous unpaid order id here.
       * Never read/reuse that value for a new draft.
       */
      window.sessionStorage.removeItem(
        "droneoptai.customer.pending-checkout-order",
      );

      /*
       * Always create a NEW backend order from the CURRENT draft.
       * createRemote() maps delivery.id directly from the newest
       * POST /api/v1/customer/orders response.id.
       */
      const delivery =
        await customerDeliveryService.createRemote(
          user.id,
          draft as DeliveryDraft,
        );

      const newOrderId = String(
        delivery.id ?? "",
      ).trim();

      if (!newOrderId) {
        throw new Error(
          "Backend created the order without returning a valid order id.",
        );
      }

      /*
       * Do not store/reuse a pending order id.
       * Navigate only with the id returned by the latest POST.
       */
      navigate(
        `/customer/payment/${encodeURIComponent(newOrderId)}`,
      );
    } catch (requestError) {
      setSubmitError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create the order. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (

    <>

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-[132px] pt-6 sm:px-6 sm:pb-28 sm:pt-9 lg:px-10 lg:pb-16 lg:pt-12">

        <header className="max-w-[720px]">

          <p className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500 sm:block">

            Review

          </p>

          <h1 className="text-[30px] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:mt-3 sm:text-[42px]">

            Review your delivery

          </h1>

          <p className="mt-2 max-w-[560px] text-[13px] leading-5 text-white/[0.48] sm:mt-3 sm:text-[15px] sm:leading-6 sm:text-white/[0.58]">

            Confirm the route, contacts, package, schedule and final amount before payment.

          </p>

        </header>

        <div className="mt-5 grid gap-5 sm:mt-8 sm:gap-6 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">

          <main className="min-w-0 space-y-4 sm:space-y-5">

            <CompactSection

              title="Delivery route"

              edit={() =>

                navigate(

                  "/customer/deliveries/create?step=2",

                )

              }

            >

              <RoutePoint

                label="Origin"

                name={preview.originHub.name}

                address={preview.originHub.address}

              />

              <div className="ml-[7px] h-6 border-l border-dashed border-white/[0.14]" />

              <RoutePoint

                label="Destination"

                name={preview.destinationHub.name}

                address={preview.destinationHub.address}

              />

            </CompactSection>

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

                  contact={draft.senderPhone}

                />

                <ContactInfo

                  label="Recipient"

                  name={draft.recipientName}

                  contact={draft.recipientEmail}

                />

              </div>

            </CompactSection>

            <CompactSection

              title="Package details"

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

                  value={draft.packageSize}

                  helper={sizeRule?.dimensions}

                />

                <CompactInfo

                  label="Insurance"

                  value={

                    draft.hasInsurance

                      ? "Added · 10% core fee"

                      : "Not added"

                  }

                />

              </div>

            </CompactSection>

            <CompactSection

              title="Delivery schedule"

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

                    formatDeliveryMode(draft.deliveryMode)

                  }

                />

                <CompactInfo

                  label="Departure"

                  value={formatDateTime(

                    preview.estimatedDepartureAt,

                  )}

                />

                <CompactInfo

                  label="Arrival"

                  value={formatDateTime(

                    preview.estimatedArrivalAt,

                  )}

                />

              </div>

              <div className="mt-4 rounded-xl border border-orange-500/[0.12] bg-orange-500/[0.04] px-4 py-3">

                <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-orange-400">

                  Handover deadline

                </p>

                <p className="mt-1 text-[13px] font-medium text-white/[0.82]">

                  {formatDateTime(

                    preview.handoverDeadlineAt,

                  )}

                </p>

              </div>

            </CompactSection>

            {/* ===================================================

                MOBILE PAYMENT DETAILS

                Delivery-app checkout order:

                route -> contacts -> package -> schedule -> payment

            ==================================================== */}

            <section className="overflow-hidden rounded-2xl border border-white/[0.10] bg-[#161217]/95 shadow-[0_10px_28px_rgba(0,0,0,0.18)] lg:hidden">

              <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-4 py-3.5 sm:px-5 sm:py-4">

                <div>

                  <h2 className="text-[13px] font-semibold text-white/[0.96] sm:text-[15px]">

                    Payment details

                  </h2>

                  <p className="mt-1 text-[10px] text-white/[0.58]">

                    Backend quotation

                  </p>

                </div>

                <span className="text-[11px] font-medium text-white/[0.72]">

                  {formatDeliveryMode(draft.deliveryMode)}

                </span>

              </div>

              <div className="p-4 sm:p-5">

                <PriceBreakdown

                  price={preview.price}

                />

                <div className="mt-4 flex items-end justify-between gap-4 border-t border-white/[0.10] pt-4">

                  <div>

                    <p className="text-[12px] font-semibold text-white/[0.90]">

                      Order total

                    </p>

                    <p className="mt-1 text-[9px] text-white/[0.52]">

                      Amount to pay

                    </p>

                  </div>

                  <strong className="text-right text-[23px] font-semibold tracking-[-0.035em] text-white">

                    {formatVnd(

                      preview.price.total,

                    )}

                  </strong>

                </div>

              </div>

            </section>

            {submitError && (

              <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[12px] leading-5 text-red-300">

                {submitError}

              </div>

            )}

          </main>

          <aside className="hidden h-fit lg:sticky lg:top-[96px] lg:block">

            <div className="overflow-hidden rounded-2xl border border-white/[0.10] bg-[#161217]/95 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-sm">

              <div className="border-b border-white/[0.08] px-6 py-5">

                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/[0.64]">

                  Payment details

                </p>

                <p className="mt-2 text-[18px] font-semibold text-white">

                  Order total

                </p>

              </div>

              <div className="px-6 py-5">

                <PriceBreakdown price={preview.price} />

                <div className="mt-5 flex items-end justify-between gap-5 border-t border-white/[0.08] pt-5">

                  <div>

                    <p className="text-[13px] font-medium text-white/[0.88]">

                      Total

                    </p>

                    <p className="mt-1 text-[10px] text-white/[0.52]">

                      Amount to pay

                    </p>

                  </div>

                  <strong className="text-right text-[25px] font-semibold tracking-[-0.035em] text-white">

                    {formatVnd(preview.price.total)}

                  </strong>

                </div>

              </div>

              <div className="border-t border-white/[0.08] p-5">

                <button

                  type="button"

                  onClick={continueToPayment}

                  disabled={submitting}

                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-[13px] font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"

                >

                  {submitting

                    ? "Creating order…"

                    : "Continue to payment"}

                  <ArrowRight size={15} />

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

                  <ArrowLeft size={14} />

                  Edit delivery

                </button>

              </div>

            </div>

          </aside>

        </div>

      </div>

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

              {formatVnd(preview.price.total)}

            </p>

          </div>

          <button

            type="button"

            onClick={continueToPayment}

            disabled={submitting}

            className="inline-flex h-12 min-w-[128px] shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-[13px] font-semibold text-black transition active:bg-orange-400 disabled:opacity-50"

          >

            {submitting ? "Please wait" : "Pay now"}

            <ArrowRight size={14} />

          </button>

        </div>

      </div>

    </>

  );

}

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

function ContactInfo({

  label,

  name,

  contact,

}: {

  label: string;

  name: string;

  contact: string;

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

        {contact}

      </p>

    </div>

  );

}

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

function PriceBreakdown({

  price,

}: {

  price: DeliveryPrice;

}) {

  const details =

    price.feeDetails;

  if (!details) {

    return (

      <div className="space-y-3">

        <PriceRow

          label="Delivery fee"

          value={formatVnd(

            price.deliveryFee,

          )}

        />

        <PriceRow

          label="Service fee"

          value={formatVnd(

            price.serviceFee,

          )}

        />

      </div>

    );

  }

  const coreFee =

    details.baseFee +

    details.distanceFee +

    details.payloadFee;

  return (

    <div className="space-y-3">

      <PriceRow

        label="Base fee"

        value={formatVnd(

          details.baseFee,

        )}

      />

      <PriceRow

        label="Distance fee"

        value={formatVnd(

          details.distanceFee,

        )}

      />

      <PriceRow

        label="Payload fee"

        value={formatVnd(

          details.payloadFee,

        )}

      />

      <div className="border-t border-white/[0.07] pt-3">

        <PriceRow

          label="Core fee"

          value={formatVnd(

            coreFee,

          )}

          strong

        />

      </div>

      {details.fragileSurcharge > 0 && (

        <PriceRow

          label="Fragile surcharge"

          value={`+${formatVnd(

            details.fragileSurcharge,

          )}`}

        />

      )}

      {details.insuranceFee > 0 && (

        <PriceRow

          label="Package insurance"

          value={`+${formatVnd(

            details.insuranceFee,

          )}`}

        />

      )}

      {details.expressSurcharge > 0 && (

        <PriceRow

          label="Express surcharge"

          value={`+${formatVnd(

            details.expressSurcharge,

          )}`}

        />

      )}

    </div>

  );

}

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

            ? "font-semibold text-white/[0.96]"

            : "font-medium text-white/[0.78]"

        }`}

      >

        {label}

      </span>

      <span

        className={`shrink-0 text-right text-[11px] leading-5 ${

          strong

            ? "font-semibold text-white"

            : "font-semibold text-white/[0.96]"

        }`}

      >

        {value}

      </span>

    </div>

  );

}
