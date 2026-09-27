import {
  Check,
} from "lucide-react";

import {
  Navigate,
  useParams,
} from "react-router-dom";

import {
  customerDeliveryService,
  formatDateTime,
} from "../services/customerDeliveryService";

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
    <div className="mx-auto max-w-[1180px] px-6 py-14 lg:px-10">
      <p className="text-[11px] uppercase tracking-[0.2em] text-orange-500">
        {delivery.id}
      </p>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">
            {status}
          </h1>

          <p className="mt-3 text-sm text-white/35">
            {
              delivery.originHub
                .name
            }
            {" → "}
            {
              delivery
                .destinationHub.name
            }
          </p>
        </div>

        <p className="text-xs text-white/25">
          Created{" "}
          {formatDateTime(
            delivery.createdAt,
          )}
        </p>
      </div>

      <div className="mt-14 grid gap-14 lg:grid-cols-[1fr_400px]">
        <div>
          <h2 className="text-lg font-medium">
            Delivery progress
          </h2>

          <div className="mt-8">
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
                    steps.length -
                      1
                  }
                />
              ),
            )}
          </div>
        </div>

        <aside className="border-l border-white/10 pl-8">
          <DetailRow
            label="Origin hub"
            value={
              delivery.originHub
                .name
            }
          />

          <DetailRow
            label="Destination hub"
            value={
              delivery
                .destinationHub.name
            }
          />

          <DetailRow
            label="Handover deadline"
            value={formatDateTime(
              delivery.handoverDeadlineAt,
            )}
          />

          <DetailRow
            label="Estimated departure"
            value={formatDateTime(
              delivery.estimatedDepartureAt,
            )}
          />

          <DetailRow
            label="Estimated arrival"
            value={formatDateTime(
              delivery.estimatedArrivalAt,
            )}
          />

          <DetailRow
            label="Package"
            value={`${delivery.weightKg} kg · Size ${delivery.packageSize}`}
          />
        </aside>
      </div>
    </div>
  );
}

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
    <div className="flex gap-5">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full border ${
            complete
              ? "border-orange-500 bg-orange-500 text-black"
              : "border-white/20 bg-[#050505]"
          }`}
        >
          {complete && (
            <Check size={13} />
          )}
        </div>

        {!last && (
          <div className="h-14 w-px bg-white/10" />
        )}
      </div>

      <p
        className={`pt-1 text-sm ${
          complete
            ? "text-white"
            : "text-white/30"
        }`}
      >
        {label}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-white/10 py-5 first:pt-0">
      <p className="text-[10px] uppercase tracking-[0.14em] text-white/25">
        {label}
      </p>

      <p className="mt-2 text-sm text-white/75">
        {value}
      </p>
    </div>
  );
}