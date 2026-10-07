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
  useEffect,
  useState,
} from "react";

import {
  customerDeliveryService,
  formatDateTime,
  formatVnd,
} from "../services/customerDeliveryService";

export function DeliveryDetailPage() {
  const { deliveryId } = useParams();

  const [delivery, setDelivery] =
    useState(() =>
      deliveryId
        ? customerDeliveryService.getById(
            deliveryId,
          )
        : null,
    );

  useEffect(() => {
    if (
      !deliveryId ||
      !delivery ||
      delivery.paymentStatus !== "pending"
    ) {
      return;
    }

    customerDeliveryService
      .refreshPaymentStatus(deliveryId)
      .then((next) => {
        if (next) {
          setDelivery(next);
        }
      })
      .catch(() => {
        // Keep cached delivery when status endpoint is unavailable.
      });
  }, [deliveryId]);

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
    delivery.paymentStatus === "paid";

  const steps = [
    {
      label: "Order created",
      complete: true,
    },
    {
      label: "Payment confirmed",
      complete: paid,
    },
    {
      label: "Package at origin hub",
      complete:
        delivery.packageReceivedAtHub,
    },
    {
      label: "Scheduled",
      complete:
        delivery.orderStatus === "accepted" ||
        delivery.orderStatus === "in_delivery" ||
        delivery.orderStatus === "completed",
    },
    {
      label: "In delivery",
      complete:
        delivery.orderStatus === "in_delivery" ||
        delivery.orderStatus === "completed",
    },
    {
      label: "Arrived at destination hub",
      complete:
        delivery.orderStatus === "completed",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-8 sm:px-6 sm:pt-10 lg:px-10 lg:pb-16 lg:pt-12">
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
              {delivery.originHub.name}
              <span className="mx-2 text-white/[0.25]">→</span>
              {delivery.destinationHub.name}
            </p>
          </div>

          <p className="text-[11px] text-white/[0.30]">
            Created {formatDateTime(delivery.createdAt)}
          </p>
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
        <main className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-white/[0.10] bg-[#161217]/92 p-5 shadow-[0_12px_32px_rgba(0,0,0,0.22)] sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-500">
              Delivery progress
            </p>

            <h2 className="mt-2 text-[18px] font-semibold text-white">
              Order status
            </h2>

            <div className="mt-6">
              {steps.map((step, index) => (
                <TimelineStep
                  key={step.label}
                  label={step.label}
                  complete={step.complete}
                  last={index === steps.length - 1}
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.10] bg-[#161217]/92 p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-500">
              Delivery route
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <RouteCard
                label="Origin hub"
                name={delivery.originHub.name}
                address={delivery.originHub.address}
              />
              <RouteCard
                label="Destination hub"
                name={delivery.destinationHub.name}
                address={delivery.destinationHub.address}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.10] bg-[#161217]/92 p-5 sm:p-6">
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
                label="Payment"
                value={paid ? "Paid" : "Pending"}
              />
              <DetailItem
                label="Delivery mode"
                value={
                  delivery.deliveryMode === "express"
                    ? "Express"
                    : "Scheduled"
                }
              />
            </div>
          </section>
        </main>

        <aside className="h-fit lg:sticky lg:top-[96px]">
          <div className="rounded-2xl border border-white/[0.10] bg-[#161217]/95 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.28)] sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/[0.40]">
              Backend quotation
            </p>

            <PriceRow
              label="Delivery fee"
              value={formatVnd(
                delivery.price.deliveryFee,
              )}
            />
            <PriceRow
              label="Service fee"
              value={formatVnd(
                delivery.price.serviceFee,
              )}
            />

            <div className="mt-5 flex items-end justify-between gap-5 border-t border-white/[0.08] pt-5">
              <span className="text-[13px] font-medium text-white/[0.62]">
                Total
              </span>
              <strong className="text-right text-[24px] font-semibold tracking-[-0.03em] text-white">
                {formatVnd(
                  delivery.price.total,
                )}
              </strong>
            </div>

            {!paid && (
              <Link
                to={`/customer/payment/${delivery.id}`}
                className="mt-6 flex h-11 items-center justify-center rounded-xl bg-orange-500 text-[13px] font-semibold text-black"
              >
                Complete payment
              </Link>
            )}
          </div>
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
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full border ${
            complete
              ? "border-orange-500 bg-orange-500 text-black"
              : "border-white/[0.14] bg-[#161217]"
          }`}
        >
          {complete && <Check size={13} />}
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

function PriceRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mt-4 flex items-start justify-between gap-5 text-[12px]">
      <span className="text-white/[0.44]">
        {label}
      </span>
      <span className="font-medium text-white/[0.82]">
        {value}
      </span>
    </div>
  );
}
