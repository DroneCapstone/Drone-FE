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

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-14 lg:px-10">
      <p className="text-[11px] uppercase tracking-[0.2em] text-orange-500">
        Order created
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">
        Delivery booked
      </h1>

      <p className="mt-3 text-sm text-white/40">
        Order {delivery.id} has
        been created. Complete
        payment to continue.
      </p>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="border-y border-white/10 py-8">
            <RoutePoint
              label="Origin Hub"
              name={
                delivery.originHub.name
              }
              address={
                delivery.originHub
                  .address
              }
            />

            <div className="my-6 ml-[7px] h-12 border-l border-dashed border-white/15" />

            <RoutePoint
              label="Destination Hub"
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

          <div className="mt-10 border-l-2 border-orange-500 px-5 py-3">
            <p className="text-xs text-white/35">
              Bring package to
              origin hub by
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {formatDateTime(
                delivery.handoverDeadlineAt,
              )}
            </p>

            <p className="mt-3 max-w-[650px] text-xs leading-6 text-white/35">
              To keep your requested
              delivery time, your
              package must arrive
              before this deadline.
              Late handover may move
              the delivery to the
              next available slot.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
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
          </div>
        </div>

        <aside className="h-fit border border-white/10 p-7">
          <p className="text-[10px] uppercase tracking-[0.17em] text-white/30">
            Order summary
          </p>

          <div className="mt-7 space-y-5">
            <AmountRow
              label="Delivery fee"
              value={formatVnd(
                delivery.price
                  .deliveryFee,
              )}
            />

            <AmountRow
              label="Service fee"
              value={formatVnd(
                delivery.price
                  .serviceFee,
              )}
            />
          </div>

          <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5">
            <span className="text-sm">
              Total
            </span>

            <strong className="text-xl">
              {formatVnd(
                delivery.price.total,
              )}
            </strong>
          </div>

          <Link
            to={`/customer/payment/${delivery.id}`}
            className="mt-8 flex h-12 items-center justify-center gap-3 bg-orange-500 text-sm font-semibold text-black hover:bg-orange-400"
          >
            Continue to payment

            <ArrowRight
              size={16}
            />
          </Link>
        </aside>
      </div>
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
    <div className="flex gap-5">
      <div className="mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-orange-500" />

      <div>
        <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">
          {label}
        </p>

        <p className="mt-2 text-lg font-medium">
          {name}
        </p>

        <p className="mt-1 text-xs text-white/35">
          {address}
        </p>
      </div>
    </div>
  );
}

function TimeBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-t border-white/10 pt-4">
      <p className="text-xs text-white/30">
        {label}
      </p>

      <p className="mt-2 text-sm">
        {value}
      </p>
    </div>
  );
}

function AmountRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-5 text-sm">
      <span className="text-white/35">
        {label}
      </span>

      <span>{value}</span>
    </div>
  );
}