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

import type {
  DeliveryPrice,
} from "../types/customer";

export function DeliverySummaryPage() {
  const { deliveryId } = useParams();

  const delivery = deliveryId
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
    <div className="mx-auto w-full max-w-[1050px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <p className="text-[11px] uppercase tracking-[0.2em] text-orange-500">
        Order created
      </p>

      <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.04em] sm:text-4xl">
        Complete payment
      </h1>

      <p className="mt-3 text-sm text-white/40">
        Order {delivery.id} has been created in the backend and is waiting for payment.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-white/[0.10] bg-[#161217]/95 p-5 sm:p-6">
          <RouteRow
            label="Drop-off Point"
            name={delivery.originHub.name}
            address={delivery.originHub.address}
          />

          <div className="my-5 h-px bg-white/[0.07]" />

          <RouteRow
            label="Pick-up Point"
            name={delivery.destinationHub.name}
            address={delivery.destinationHub.address}
          />

          <div className="mt-6 grid gap-4 border-t border-white/[0.07] pt-5 sm:grid-cols-3">
            <Info
              label="Departure"
              value={formatDateTime(
                delivery.estimatedDepartureAt,
              )}
            />
            <Info
              label="Arrival"
              value={formatDateTime(
                delivery.estimatedArrivalAt,
              )}
            />
            <Info
              label="Handover deadline"
              value={formatDateTime(
                delivery.handoverDeadlineAt,
              )}
            />
          </div>
        </section>

        <aside className="h-fit rounded-2xl border border-white/[0.10] bg-[#161217]/95 p-5 sm:p-6">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/[0.35]">
            Backend quotation
          </p>

          <SummaryPriceBreakdown
            price={delivery.price}
          />

          <div className="mt-5 flex items-center justify-between border-t border-white/[0.08] pt-5">
            <span className="text-sm text-white/[0.60]">
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
            className="mt-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-semibold text-black hover:bg-orange-400"
          >
            Continue to payment
            <ArrowRight size={15} />
          </Link>
        </aside>
      </div>
    </div>
  );
}

function RouteRow({
  label,
  name,
  address,
}: {
  label: string;
  name: string;
  address: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-white/[0.35]">
        {label}
      </p>
      <p className="mt-2 text-[16px] font-semibold text-white/[0.90]">
        {name}
      </p>
      <p className="mt-1 text-[12px] text-white/[0.42]">
        {address}
      </p>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.12em] text-white/[0.30]">
        {label}
      </p>
      <p className="mt-2 text-[12px] leading-5 text-white/[0.72]">
        {value}
      </p>
    </div>
  );
}

function SummaryPriceBreakdown({
  price,
}: {
  price: DeliveryPrice;
}) {
  const details =
    price.feeDetails;

  if (!details) {
    return (
      <div className="space-y-3">
        <AmountRow
          label="Delivery fee"
          value={formatVnd(
            price.deliveryFee,
          )}
        />
        <AmountRow
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

  const hasSeparateServiceFee =
    price.serviceFee > 0 &&
    Math.abs(
      price.serviceFee -
      details.expressSurcharge,
    ) > 0.5;

  return (
    <div className="space-y-3">
      <AmountRow
        label="Base fee"
        value={formatVnd(
          details.baseFee,
        )}
      />

      <AmountRow
        label="Distance fee"
        value={formatVnd(
          details.distanceFee,
        )}
      />

      <AmountRow
        label="Payload fee"
        value={formatVnd(
          details.payloadFee,
        )}
      />

      <div className="border-t border-white/[0.07] pt-3">
        <AmountRow
          label="Core fee"
          value={formatVnd(
            coreFee,
          )}
          strong
        />
      </div>

      {details.fragileSurcharge > 0 && (
        <AmountRow
          label="Fragile surcharge"
          value={`+${formatVnd(
            details.fragileSurcharge,
          )}`}
        />
      )}

      {details.insuranceFee > 0 && (
        <AmountRow
          label="Package insurance"
          value={`+${formatVnd(
            details.insuranceFee,
          )}`}
        />
      )}

      <div className="border-t border-white/[0.07] pt-3">
        <AmountRow
          label="Delivery subtotal"
          value={formatVnd(
            price.deliveryFee,
          )}
          strong
        />
      </div>

      {details.expressSurcharge > 0 && (
        <AmountRow
          label="Express surcharge"
          value={`+${formatVnd(
            details.expressSurcharge,
          )}`}
        />
      )}

      {hasSeparateServiceFee && (
        <AmountRow
          label="Service fee"
          value={formatVnd(
            price.serviceFee,
          )}
        />
      )}
    </div>
  );
}

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
    <div className="mt-4 flex justify-between gap-5 text-[12px]">
      <span
        className={
          strong
            ? "font-semibold text-white/[0.62]"
            : "text-white/[0.40]"
        }
      >
        {label}
      </span>

      <span
        className={
          strong
            ? "font-semibold text-white"
            : "font-medium text-white/[0.82]"
        }
      >
        {value}
      </span>
    </div>
  );
}
