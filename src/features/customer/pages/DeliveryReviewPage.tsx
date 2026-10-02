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

/* =========================================================
   DELIVERY REVIEW PAGE
========================================================= */

export function DeliveryReviewPage() {
  const navigate = useNavigate();

  const { user } = useAuth();

  const draft =
    customerDeliveryService.getDraft();

  if (!draft || !user) {
    return (
      <Navigate
        to="/customer/deliveries/create"
        replace
      />
    );
  }

  const preview =
    customerDeliveryService.preview(
      draft,
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

  const placeOrder = () => {
    const delivery =
      customerDeliveryService.create(
        user.id,
        draft,
      );

    navigate(
      `/customer/deliveries/${delivery.id}/summary`,
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-28 pt-8 sm:px-6 sm:pt-10 lg:px-10 lg:pb-16 lg:pt-12">
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}
      <header className="max-w-[720px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500">
          Review
        </p>

        <h1 className="mt-3 text-[34px] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[42px]">
          Review your delivery
        </h1>

        <p className="mt-3 text-[14px] leading-6 text-white/[0.58] sm:text-[15px]">
          Confirm the information
          before placing your order.
        </p>
      </header>

      {/* =====================================================
          MAIN LAYOUT
      ====================================================== */}
      <div className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
        {/* =================================================
            LEFT — DELIVERY DETAILS
        ================================================== */}
        <main className="min-w-0 space-y-5">
          {/* CONTACTS */}
          <ReviewCard
            eyebrow="Contacts"
            title="Sender & recipient"
          >
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <ContactCard
                label="Sender"
                name={draft.senderName}
                phone={draft.senderPhone}
              />

              <ContactCard
                label="Recipient"
                name={draft.recipientName}
                phone={draft.recipientPhone}
              />
            </div>
          </ReviewCard>

          {/* PACKAGE */}
          <ReviewCard
            eyebrow="Package"
            title="Package information"
          >
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
              <InfoItem
                label="Category"
                value={category}
              />

              <InfoItem
                label="Weight"
                value={`${draft.weightKg} kg`}
              />

              <InfoItem
                label="Size"
                value={draft.packageSize}
                helper={
                  sizeRule?.dimensions
                }
                fullWidthOnMobile
              />
            </div>
          </ReviewCard>

          {/* ROUTE */}
          <ReviewCard
            eyebrow="Route"
            title="Hub-to-hub route"
          >
            <div className="relative">
              {/* ROUTE LINE */}
              <div className="absolute bottom-[44px] left-[9px] top-[44px] hidden w-px bg-white/[0.12] sm:block" />

              {/* ORIGIN */}
              <RoutePoint
                type="Origin hub"
                hub={
                  preview.originHub.name
                }
                address={
                  preview.originHub.address
                }
                first
              />

              {/* MOBILE CONNECTOR */}
              <div className="my-3 ml-[9px] h-6 w-px bg-white/[0.12] sm:hidden" />

              {/* DESTINATION */}
              <RoutePoint
                type="Destination hub"
                hub={
                  preview.destinationHub.name
                }
                address={
                  preview.destinationHub.address
                }
              />
            </div>
          </ReviewCard>
        </main>

        {/* =================================================
            RIGHT — ORDER SUMMARY
        ================================================== */}
        <aside className="h-fit lg:sticky lg:top-[96px]">
          <div className="overflow-hidden rounded-2xl border border-white/[0.10] bg-[#161217]/95 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-sm">
            {/* SUMMARY HEADER */}
            <div className="border-b border-white/[0.08] px-5 py-5 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/[0.46]">
                    Delivery summary
                  </p>

                  <p className="mt-2 text-[17px] font-semibold text-white">
                    Order overview
                  </p>
                </div>

                <span className="rounded-full border border-orange-500/[0.24] bg-orange-500/[0.08] px-3 py-1.5 text-[11px] font-semibold text-orange-400">
                  {draft.deliveryMode ===
                  "express"
                    ? "Express"
                    : "Scheduled"}
                </span>
              </div>
            </div>

            {/* DELIVERY TIME */}
            <div className="px-5 py-5 sm:px-6">
              <SummaryGroupLabel>
                Delivery timing
              </SummaryGroupLabel>

              <div className="mt-4 space-y-4">
                <SummaryRow
                  label="Estimated departure"
                  value={formatDateTime(
                    preview
                      .estimatedDepartureAt,
                  )}
                />

                <SummaryRow
                  label="Estimated arrival"
                  value={formatDateTime(
                    preview
                      .estimatedArrivalAt,
                  )}
                />

                <SummaryRow
                  label="Hub handover deadline"
                  value={formatDateTime(
                    preview
                      .handoverDeadlineAt,
                  )}
                  emphasized
                />
              </div>
            </div>

            {/* FEES */}
            <div className="border-t border-white/[0.08] px-5 py-5 sm:px-6">
              <SummaryGroupLabel>
                Price details
              </SummaryGroupLabel>

              <div className="mt-4 space-y-4">
                <SummaryRow
                  label="Delivery fee"
                  value={formatVnd(
                    preview.price
                      .deliveryFee,
                  )}
                />

                <SummaryRow
                  label="Service fee"
                  value={formatVnd(
                    preview.price
                      .serviceFee,
                  )}
                />
              </div>

              {/* TOTAL */}
              <div className="mt-5 border-t border-white/[0.08] pt-5">
                <div className="flex items-end justify-between gap-5">
                  <div>
                    <p className="text-[13px] font-medium text-white/[0.62]">
                      Total
                    </p>

                    <p className="mt-1 text-[11px] text-white/[0.34]">
                      Final amount
                    </p>
                  </div>

                  <p className="text-right text-[24px] font-semibold tracking-[-0.03em] text-white">
                    {formatVnd(
                      preview.price.total,
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="border-t border-white/[0.08] p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-[1fr_1.25fr] lg:grid-cols-1 xl:grid-cols-[1fr_1.15fr]">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/customer/deliveries/create",
                    )
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/[0.10] bg-white/[0.025] px-4 text-[13px] font-medium text-white/[0.78] transition hover:border-orange-500/[0.35] hover:bg-white/[0.04] hover:text-white"
                >
                  <ArrowLeft
                    size={15}
                  />

                  Edit delivery
                </button>

                <button
                  type="button"
                  onClick={placeOrder}
                  className="group inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 text-[13px] font-semibold text-black transition hover:bg-orange-400"
                >
                  Place order

                  <ArrowRight
                    size={15}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* =========================================================
   REVIEW CARD
========================================================= */

function ReviewCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.10] bg-[#161217]/92 shadow-[0_12px_32px_rgba(0,0,0,0.22)] backdrop-blur-sm">
      <div className="border-b border-white/[0.07] px-5 py-5 sm:px-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-500">
          {eyebrow}
        </p>

        <h2 className="mt-2 text-[18px] font-semibold tracking-[-0.02em] text-white">
          {title}
        </h2>
      </div>

      <div className="p-5 sm:p-6">
        {children}
      </div>
    </section>
  );
}

/* =========================================================
   CONTACT CARD
========================================================= */

function ContactCard({
  label,
  name,
  phone,
}: {
  label: string;
  name: string;
  phone: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 sm:p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/[0.38]">
        {label}
      </p>

      <p className="mt-3 truncate text-[15px] font-semibold text-white/[0.92]">
        {name || "—"}
      </p>

      <p className="mt-1 text-[13px] text-white/[0.55]">
        {phone || "—"}
      </p>
    </div>
  );
}

/* =========================================================
   INFORMATION ITEM
========================================================= */

function InfoItem({
  label,
  value,
  helper,
  fullWidthOnMobile = false,
}: {
  label: string;
  value: string;
  helper?: string;
  fullWidthOnMobile?: boolean;
}) {
  return (
    <div
      className={
        fullWidthOnMobile
          ? "col-span-2 sm:col-span-1"
          : ""
      }
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/[0.38]">
        {label}
      </p>

      <p className="mt-2 text-[15px] font-semibold leading-6 text-white/[0.90]">
        {value}
      </p>

      {helper && (
        <p className="mt-1 text-[12px] leading-5 text-white/[0.44]">
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
  type,
  hub,
  address,
  first = false,
}: {
  type: string;
  hub: string;
  address: string;
  first?: boolean;
}) {
  return (
    <div
      className={`relative flex gap-4 ${
        first
          ? "pb-0 sm:pb-7"
          : ""
      }`}
    >
      {/* DOT */}
      <div className="relative z-10 mt-1 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border border-orange-500/[0.42] bg-[#161217]">
        <span className="h-[5px] w-[5px] rounded-full bg-orange-500" />
      </div>

      {/* CONTENT */}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/[0.38]">
          {type}
        </p>

        <p className="mt-2 text-[15px] font-semibold text-white/[0.92]">
          {hub}
        </p>

        <p className="mt-1 max-w-[620px] text-[13px] leading-6 text-white/[0.52]">
          {address}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   SUMMARY GROUP LABEL
========================================================= */

function SummaryGroupLabel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/[0.34]">
      {children}
    </p>
  );
}

/* =========================================================
   SUMMARY ROW
========================================================= */

function SummaryRow({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
      <span className="text-[12px] leading-5 text-white/[0.48]">
        {label}
      </span>

      <span
        className={`max-w-[190px] text-right text-[12px] font-medium leading-5 ${
          emphasized
            ? "text-orange-400"
            : "text-white/[0.82]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}