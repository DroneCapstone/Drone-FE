import {
  ArrowLeft,
  ExternalLink,
} from "lucide-react";

import {
  Link,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  customerApi,
  extractCheckoutUrl,
  normalizePaymentStatus,
} from "../services/customerApi";

import {
  customerDeliveryService,
  formatVnd,
} from "../services/customerDeliveryService";

import type {
  DeliveryPrice,
} from "../types/customer";

export function PaymentPage() {
  const { deliveryId } = useParams();
  const navigate = useNavigate();

  const delivery = deliveryId
    ? customerDeliveryService.getById(
        deliveryId,
      )
    : null;

  /*
   * useParams() returns string | undefined.
   * Use the loaded delivery id as a stable string for async closures.
   * This avoids TypeScript losing the narrowing inside nested async
   * functions in useEffect().
   */
  const paymentOrderId =
    delivery?.id ?? null;

  const [checkoutUrl, setCheckoutUrl] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const checkoutStarted = useRef(false);

  useEffect(() => {
    if (!paymentOrderId) {
      return;
    }

    const orderId = paymentOrderId;
    let cancelled = false;

    async function checkStatus() {
      try {
        const response =
          await customerApi.getPaymentStatus(
            orderId,
          );

        const status =
          normalizePaymentStatus(response);

        if (status === "paid") {
          customerDeliveryService.markPaid(
            orderId,
          );

          if (!cancelled) {
            navigate(
              `/customer/payment/${orderId}/success`,
              {
                replace: true,
              },
            );
          }
        }
      } catch {
        // Keep polling; transient status errors should not break payment UI.
      }
    }

    void checkStatus();

    const timer = window.setInterval(
      () => {
        void checkStatus();
      },
      4000,
    );

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [paymentOrderId, navigate]);

  useEffect(() => {
    if (
      !paymentOrderId ||
      checkoutStarted.current
    ) {
      return;
    }

    const orderId = paymentOrderId;

    checkoutStarted.current = true;

    const sessionKey =
      `droneoptai.payos.checkout-opened:${orderId}`;

    const alreadyOpened =
      window.sessionStorage.getItem(
        sessionKey,
      );

    async function startCheckout() {
      setLoading(true);
      setError("");

      try {
        const response =
          await customerApi.createCheckout(
            orderId,
          );

        const url =
          extractCheckoutUrl(response);

        if (!url) {
          throw new Error(
            "Backend created the checkout but did not return a PayOS checkout URL.",
          );
        }

        setCheckoutUrl(url);

        if (!alreadyOpened) {
          window.sessionStorage.setItem(
            sessionKey,
            "1",
          );

          window.location.assign(url);
        }
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to create the PayOS checkout.",
        );
      } finally {
        setLoading(false);
      }
    }

    void startCheckout();
  }, [paymentOrderId]);

  if (!delivery) {
    return (
      <Navigate
        to="/customer/deliveries"
        replace
      />
    );
  }

  const openCheckout = async () => {
    if (checkoutUrl) {
      window.location.assign(
        checkoutUrl,
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await customerApi.createCheckout(
          delivery.id,
        );

      const url =
        extractCheckoutUrl(response);

      if (!url) {
        throw new Error(
          "PayOS checkout URL was not returned by the backend.",
        );
      }

      setCheckoutUrl(url);
      window.location.assign(url);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to open PayOS.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[820px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <Link
        to="/customer/deliveries/review"
        className="inline-flex items-center gap-2 text-[12px] text-white/[0.45] transition hover:text-white"
      >
        <ArrowLeft size={14} />
        Back to review
      </Link>

      <p className="mt-8 text-[11px] uppercase tracking-[0.2em] text-orange-500">
        Payment
      </p>

      <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.04em] sm:text-4xl">
        Pay with PayOS
      </h1>

      <p className="mt-3 text-sm leading-6 text-white/40">
        Order {delivery.id} is waiting for payment. This page checks payment status automatically.
      </p>

      <div className="mt-8 rounded-2xl border border-white/[0.10] bg-[#161217]/95 p-5 sm:p-7">
        <div className="flex items-center justify-between gap-5 border-b border-white/[0.08] pb-5">
          <span className="text-[12px] text-white/[0.40]">
            Amount
          </span>

          <strong className="text-[24px] tracking-[-0.03em] text-white">
            {formatVnd(
              delivery.price.total,
            )}
          </strong>
        </div>

        <div className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-4">
          <PaymentPriceBreakdown
            price={delivery.price}
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-5">
          <span className="text-[12px] text-white/[0.40]">
            Payment status
          </span>

          <span className="rounded-full border border-amber-400/[0.20] bg-amber-400/[0.06] px-3 py-1.5 text-[11px] font-medium text-amber-200">
            Waiting for payment
          </span>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[12px] leading-5 text-red-300">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={openCheckout}
          disabled={loading}
          className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 text-[13px] font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ExternalLink size={15} />
          {loading
            ? "Preparing PayOS…"
            : checkoutUrl
              ? "Open PayOS again"
              : "Open PayOS"}
        </button>

        <p className="mt-4 text-[11px] leading-5 text-white/[0.30]">
          After payment, return to this tab if PayOS does not redirect automatically. DroneOptAI checks the backend payment status every few seconds.
        </p>
      </div>
    </div>
  );
}


function PaymentPriceBreakdown({
  price,
}: {
  price: DeliveryPrice;
}) {
  const details =
    price.feeDetails;

  if (!details) {
    return (
      <div className="space-y-3">
        <PaymentPriceRow
          label="Delivery fee"
          value={formatVnd(
            price.deliveryFee,
          )}
        />
        <PaymentPriceRow
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
      <PaymentPriceRow
        label="Base fee"
        value={formatVnd(
          details.baseFee,
        )}
      />

      <PaymentPriceRow
        label="Distance fee"
        value={formatVnd(
          details.distanceFee,
        )}
      />

      <PaymentPriceRow
        label="Payload fee"
        value={formatVnd(
          details.payloadFee,
        )}
      />

      <div className="border-t border-white/[0.07] pt-3">
        <PaymentPriceRow
          label="Core fee"
          value={formatVnd(
            coreFee,
          )}
          strong
        />
      </div>

      {details.fragileSurcharge > 0 && (
        <PaymentPriceRow
          label="Fragile surcharge"
          value={`+${formatVnd(
            details.fragileSurcharge,
          )}`}
        />
      )}

      {details.insuranceFee > 0 && (
        <PaymentPriceRow
          label="Package insurance"
          value={`+${formatVnd(
            details.insuranceFee,
          )}`}
        />
      )}

      <div className="border-t border-white/[0.07] pt-3">
        <PaymentPriceRow
          label="Delivery subtotal"
          value={formatVnd(
            price.deliveryFee,
          )}
          strong
        />
      </div>

      {details.expressSurcharge > 0 && (
        <PaymentPriceRow
          label="Express surcharge"
          value={`+${formatVnd(
            details.expressSurcharge,
          )}`}
        />
      )}

      {hasSeparateServiceFee && (
        <PaymentPriceRow
          label="Service fee"
          value={formatVnd(
            price.serviceFee,
          )}
        />
      )}
    </div>
  );
}

function PaymentPriceRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-5 text-[11px]">
      <span
        className={
          strong
            ? "font-semibold text-white/[0.62]"
            : "text-white/[0.38]"
        }
      >
        {label}
      </span>

      <span
        className={
          strong
            ? "font-semibold text-white"
            : "font-medium text-white/[0.78]"
        }
      >
        {value}
      </span>
    </div>
  );
}
