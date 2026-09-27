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

export function DeliveryReviewPage() {
  const navigate =
    useNavigate();

  const { user } =
    useAuth();

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
    )?.label;

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
    <div className="mx-auto max-w-[1180px] px-6 py-14 lg:px-10">
      <p className="text-[11px] uppercase tracking-[0.2em] text-orange-500">
        Review
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">
        Review your delivery
      </h1>

      <p className="mt-3 text-sm text-white/40">
        Confirm the information
        before placing your order.
      </p>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_390px]">
        <div className="space-y-12">
          <ReviewSection title="Contacts">
            <ReviewPair
              label="Sender"
              value={`${draft.senderName}\n${draft.senderPhone}`}
            />

            <ReviewPair
              label="Recipient"
              value={`${draft.recipientName}\n${draft.recipientPhone}`}
            />
          </ReviewSection>

          <ReviewSection title="Package">
            <ReviewPair
              label="Category"
              value={category ?? ""}
            />

            <ReviewPair
              label="Weight"
              value={`${draft.weightKg} kg`}
            />

            <ReviewPair
              label="Size"
              value={`${draft.packageSize} · ${PACKAGE_SIZE_RULES[draft.packageSize].dimensions}`}
            />
          </ReviewSection>

          <ReviewSection title="Route">
            <ReviewPair
              label="Origin"
              value={`${preview.originHub.name}\n${preview.originHub.address}`}
            />

            <ReviewPair
              label="Destination"
              value={`${preview.destinationHub.name}\n${preview.destinationHub.address}`}
            />
          </ReviewSection>
        </div>

        <aside className="h-fit border border-white/10 bg-[#080808] p-7">
          <p className="text-[10px] uppercase tracking-[0.17em] text-white/30">
            Delivery summary
          </p>

          <div className="mt-7 space-y-6">
            <BillRow
              label="Mode"
              value={
                draft.deliveryMode ===
                "express"
                  ? "Express"
                  : "Scheduled"
              }
            />

            <BillRow
              label="Estimated departure"
              value={formatDateTime(
                preview
                  .estimatedDepartureAt,
              )}
            />

            <BillRow
              label="Estimated arrival"
              value={formatDateTime(
                preview
                  .estimatedArrivalAt,
              )}
            />

            <BillRow
              label="Hub handover deadline"
              value={formatDateTime(
                preview
                  .handoverDeadlineAt,
              )}
            />
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <BillRow
              label="Delivery fee"
              value={formatVnd(
                preview.price
                  .deliveryFee,
              )}
            />

            <div className="mt-4">
              <BillRow
                label="Service fee"
                value={formatVnd(
                  preview.price
                    .serviceFee,
                )}
              />
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
              <span className="text-sm">
                Total
              </span>

              <span className="text-xl font-semibold">
                {formatVnd(
                  preview.price.total,
                )}
              </span>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-12 flex items-center justify-between border-t border-white/10 pt-7">
        <button
          onClick={() =>
            navigate(
              "/customer/deliveries/create",
            )
          }
          className="inline-flex items-center gap-2 text-sm text-white/45 hover:text-white"
        >
          <ArrowLeft size={16} />
          Edit delivery
        </button>

        <button
          onClick={placeOrder}
          className="inline-flex h-12 items-center gap-3 bg-orange-500 px-7 text-sm font-semibold text-black transition hover:bg-orange-400"
        >
          Place order
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="border-b border-white/10 pb-4 text-lg font-medium">
        {title}
      </h2>

      <div className="grid gap-8 pt-6 md:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function ReviewPair({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-white/30">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-white/75">
        {value}
      </p>
    </div>
  );
}

function BillRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <span className="text-xs text-white/35">
        {label}
      </span>

      <span className="text-right text-xs text-white/80">
        {value}
      </span>
    </div>
  );
}