import {
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  customerDeliveryService,
  formatVnd,
} from "../services/customerDeliveryService";

export function PaymentPage() {
  const { deliveryId } =
    useParams();

  const navigate =
    useNavigate();

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

  const completePayment = () => {
    customerDeliveryService.markPaid(
      delivery.id,
    );

    navigate(
      `/customer/payment/${delivery.id}/success`,
    );
  };

  return (
    <div className="mx-auto max-w-[980px] px-6 py-14 lg:px-10">
      <p className="text-[11px] uppercase tracking-[0.2em] text-orange-500">
        Payment
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">
        Scan to pay
      </h1>

      <p className="mt-3 text-sm text-white/40">
        Complete the bank transfer
        for order {delivery.id}.
      </p>

      <div className="mt-12 grid gap-12 md:grid-cols-[320px_1fr]">
        <div className="bg-white p-6">
          <FakeQr />
        </div>

        <div>
          <PaymentInfo
            label="Amount"
            value={formatVnd(
              delivery.price.total,
            )}
          />

          <PaymentInfo
            label="Bank"
            value="Vietcombank"
          />

          <PaymentInfo
            label="Account name"
            value="DRONEOPTAI"
          />

          <PaymentInfo
            label="Transfer content"
            value={delivery.id.replace(
              "-",
              "",
            )}
          />

          <button
            type="button"
            onClick={completePayment}
            className="mt-9 h-12 bg-orange-500 px-7 text-sm font-semibold text-black transition hover:bg-orange-400"
          >
            I've completed the
            payment
          </button>

          <p className="mt-4 max-w-[500px] text-xs leading-5 text-white/25">
            Demo payment flow.
            Payment verification
            will be handled by the
            payment backend in the
            production system.
          </p>
        </div>
      </div>
    </div>
  );
}

function PaymentInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-8 border-b border-white/10 py-5">
      <span className="text-xs text-white/30">
        {label}
      </span>

      <span className="text-sm font-medium">
        {value}
      </span>
    </div>
  );
}

function FakeQr() {
  const cells =
    Array.from({
      length: 169,
    });

  return (
    <div className="aspect-square w-full bg-white p-2">
      <div className="grid h-full grid-cols-13 gap-[2px]">
        {cells.map(
          (_, index) => {
            const dark =
              (index * 7 +
                (index % 11) *
                  3) %
                5 <
              2;

            return (
              <span
                key={index}
                className={
                  dark
                    ? "bg-black"
                    : "bg-white"
                }
              />
            );
          },
        )}
      </div>
    </div>
  );
}