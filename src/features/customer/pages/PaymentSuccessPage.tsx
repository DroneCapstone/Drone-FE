import {
  Check,
  Loader2,
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
} from "../services/customerDeliveryService";

export function PaymentSuccessPage() {
  const { deliveryId } = useParams();

  const [delivery, setDelivery] =
    useState(() =>
      deliveryId
        ? customerDeliveryService.getById(
            deliveryId,
          )
        : null,
    );

  const [checking, setChecking] =
    useState(true);

  useEffect(() => {
    if (!deliveryId) {
      return;
    }

    customerDeliveryService
      .refreshPaymentStatus(deliveryId)
      .then((next) => {
        setDelivery(next);

        if (next?.paymentStatus === "paid") {
          customerDeliveryService.clearDraft();
          window.sessionStorage.removeItem(
            "droneoptai.customer.pending-checkout-order",
          );
        }
      })
      .finally(() => {
        setChecking(false);
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

  if (
    checking ||
    delivery.paymentStatus !== "paid"
  ) {
    return (
      <div className="mx-auto max-w-[760px] px-6 py-20 text-center">
        <Loader2
          size={30}
          className="mx-auto animate-spin text-orange-400"
        />

        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em]">
          Verifying payment
        </h1>

        <p className="mx-auto mt-3 max-w-[520px] text-sm leading-6 text-white/40">
          DroneOptAI is checking the payment status with the backend.
        </p>

        {!checking && (
          <Link
            to={`/customer/payment/${delivery.id}`}
            className="mt-7 inline-flex rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-black"
          >
            Return to payment
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[760px] px-6 py-20 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10 text-green-400">
        <Check size={25} />
      </div>

      <h1 className="mt-7 text-4xl font-semibold tracking-[-0.04em]">
        Payment successful
      </h1>

      <p className="mx-auto mt-4 max-w-[520px] text-sm leading-6 text-white/40">
        Your order is confirmed. Bring your package to the origin hub before the handover deadline.
      </p>

      <div className="mx-auto mt-10 max-w-[520px] border-y border-white/10 py-7 text-left">
        <SuccessRow
          label="Order"
          value={delivery.id}
        />
        <SuccessRow
          label="Origin hub"
          value={delivery.originHub.name}
        />
        <SuccessRow
          label="Handover deadline"
          value={formatDateTime(
            delivery.handoverDeadlineAt,
          )}
        />
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Link
          to={`/customer/deliveries/${delivery.id}`}
          className="rounded-xl bg-orange-500 px-7 py-3 text-sm font-semibold text-black hover:bg-orange-400"
        >
          View delivery
        </Link>

        <Link
          to="/customer/deliveries"
          className="rounded-xl border border-white/15 px-7 py-3 text-sm text-white/75 hover:border-white/30"
        >
          My deliveries
        </Link>
      </div>
    </div>
  );
}

function SuccessRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-8 py-3">
      <span className="text-xs text-white/30">
        {label}
      </span>
      <span className="text-right text-sm">
        {value}
      </span>
    </div>
  );
}
