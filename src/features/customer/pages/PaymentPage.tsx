import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
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
  extractPaymentCheckoutDetails,
  normalizePaymentStatus,
  type PaymentCheckoutDetails,
} from "../services/customerApi";

import {
  customerDeliveryService,
  formatVnd,
} from "../services/customerDeliveryService";

import type {
  DeliveryPrice,
} from "../types/customer";

/* =========================================================
   HELPERS
========================================================= */

function buildVietQrImageUrl(
  details: PaymentCheckoutDetails,
) {
  if (
    !details.bin ||
    !details.accountNumber
  ) {
    return null;
  }

  const params =
    new URLSearchParams();

  if (
    details.amount !== null &&
    details.amount > 0
  ) {
    params.set(
      "amount",
      String(
        Math.round(
          details.amount,
        ),
      ),
    );
  }

  if (details.description) {
    params.set(
      "addInfo",
      details.description,
    );
  }

  if (details.accountName) {
    params.set(
      "accountName",
      details.accountName,
    );
  }

  const query =
    params.toString();

  return `https://img.vietqr.io/image/${encodeURIComponent(
    details.bin,
  )}-${encodeURIComponent(
    details.accountNumber,
  )}-compact2.png${
    query ? `?${query}` : ""
  }`;
}

function resolveQrImage(
  details: PaymentCheckoutDetails,
) {
  if (
    details.qrDataUrl &&
    (
      details.qrDataUrl.startsWith(
        "data:image/",
      ) ||
      details.qrDataUrl.startsWith(
        "http://",
      ) ||
      details.qrDataUrl.startsWith(
        "https://",
      )
    )
  ) {
    return details.qrDataUrl;
  }

  if (
    details.qrCode &&
    (
      details.qrCode.startsWith(
        "data:image/",
      ) ||
      details.qrCode.startsWith(
        "http://",
      ) ||
      details.qrCode.startsWith(
        "https://",
      )
    )
  ) {
    return details.qrCode;
  }

  /*
   * payOS normally returns the VietQR payload as text plus
   * bin/accountNumber/amount/description. We use those payment
   * fields to show the bank QR directly inside DroneOptAI.
   */
  return buildVietQrImageUrl(
    details,
  );
}

async function copyText(
  value: string,
) {
  await navigator.clipboard.writeText(
    value,
  );
}

/* =========================================================
   PAYMENT PAGE
========================================================= */

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

  const paymentOrderId =
    delivery?.id ?? null;

  const [
    checkout,
    setCheckout,
  ] = useState<
    PaymentCheckoutDetails | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    copied,
    setCopied,
  ] = useState("");

  const checkoutStarted =
    useRef(false);

  /* =======================================================
     PAYMENT STATUS POLLING
  ======================================================== */

  useEffect(() => {
    if (!paymentOrderId) {
      return;
    }

    const orderId =
      paymentOrderId;

    let cancelled = false;

    async function checkStatus() {
      try {
        const response =
          await customerApi.getPaymentStatus(
            orderId,
          );

        const status =
          normalizePaymentStatus(
            response,
          );

        if (
          status === "paid"
        ) {
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
        // Temporary status errors should not break the payment page.
      }
    }

    void checkStatus();

    const timer =
      window.setInterval(
        () => {
          void checkStatus();
        },
        4000,
      );

    return () => {
      cancelled = true;
      window.clearInterval(
        timer,
      );
    };
  }, [
    paymentOrderId,
    navigate,
  ]);

  /* =======================================================
     LOAD BANK PAYMENT DETAILS
  ======================================================== */

  useEffect(() => {
    if (
      !paymentOrderId ||
      checkoutStarted.current
    ) {
      return;
    }

    checkoutStarted.current =
      true;

    const orderId =
      paymentOrderId;

    async function loadCheckout() {
      setLoading(true);
      setError("");

      try {
        const response =
          await customerApi.createCheckout(
            orderId,
          );

        const details =
          extractPaymentCheckoutDetails(
            response,
          );

        setCheckout(details);
      } catch (
        requestError
      ) {
        setError(
          requestError instanceof
            Error
            ? requestError.message
            : "Unable to prepare payment.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadCheckout();
  }, [paymentOrderId]);

  if (!delivery) {
    return (
      <Navigate
        to="/customer/deliveries"
        replace
      />
    );
  }

  const reloadPayment =
    async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await customerApi.createCheckout(
            delivery.id,
          );

        setCheckout(
          extractPaymentCheckoutDetails(
            response,
          ),
        );
      } catch (
        requestError
      ) {
        setError(
          requestError instanceof
            Error
            ? requestError.message
            : "Unable to reload payment.",
        );
      } finally {
        setLoading(false);
      }
    };

  const handleCopy =
    async (
      key: string,
      value: string | null,
    ) => {
      if (!value) {
        return;
      }

      try {
        await copyText(value);

        setCopied(key);

        window.setTimeout(
          () => {
            setCopied("");
          },
          1400,
        );
      } catch {
        // Clipboard can be blocked by browser permissions.
      }
    };

  const qrImage =
    checkout
      ? resolveQrImage(
          checkout,
        )
      : null;

  const displayAmount =
    checkout?.amount ??
    delivery.price.total;

  const hasBankDetails =
    Boolean(
      checkout?.bin &&
        checkout
          ?.accountNumber,
    );

  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Link
        to="/customer/deliveries/review"
        className="inline-flex items-center gap-2 text-[12px] text-white/[0.50] transition hover:text-white"
      >
        <ArrowLeft
          size={14}
        />

        Back to review
      </Link>

      <div className="mt-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-400">
          Payment
        </p>

        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.045em] text-white sm:text-[38px]">
          Scan to pay
        </h1>

        <p className="mt-2 max-w-[650px] text-[12px] leading-6 text-white/[0.60] sm:text-[13px]">
          Scan the VietQR code with your banking app. You can complete the payment without leaving DroneOptAI.
        </p>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* PAYMENT QR */}
        <section className="overflow-hidden rounded-[22px] border border-white/[0.10] bg-[#151217]/95">
          <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] px-5 py-4 sm:px-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/[0.42]">
                Amount to pay
              </p>

              <p className="mt-1 text-[25px] font-semibold tracking-[-0.035em] text-white">
                {formatVnd(
                  displayAmount,
                )}
              </p>
            </div>

            <span className="rounded-full border border-amber-400/[0.20] bg-amber-400/[0.07] px-3 py-1.5 text-[10px] font-semibold text-amber-200">
              Waiting for payment
            </span>
          </div>

          {error && (
            <div className="mx-5 mt-5 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[11px] leading-5 text-red-300 sm:mx-6">
              {error}
            </div>
          )}

          <div className="p-5 sm:p-6">
            {loading ? (
              <div className="flex min-h-[390px] flex-col items-center justify-center rounded-2xl bg-white px-6 text-center">
                <RefreshCw
                  size={24}
                  className="animate-spin text-orange-500"
                />

                <p className="mt-4 text-[13px] font-semibold text-neutral-900">
                  Preparing payment QR
                </p>
              </div>
            ) : qrImage ? (
              <div className="overflow-hidden rounded-2xl bg-white p-3 sm:p-4">
                <img
                  src={qrImage}
                  alt="VietQR payment code"
                  className="mx-auto block w-full max-w-[430px]"
                />
              </div>
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-black/[0.12] px-6 text-center">
                <p className="text-[14px] font-semibold text-white">
                  QR information is not available
                </p>

                <p className="mt-2 max-w-[430px] text-[11px] leading-5 text-white/[0.52]">
                  The checkout API succeeded, but its response does not include the bank details needed to render the VietQR code directly on DroneOptAI.
                </p>

                <button
                  type="button"
                  onClick={
                    reloadPayment
                  }
                  className="mt-5 inline-flex items-center gap-2 text-[11px] font-semibold text-orange-400"
                >
                  <RefreshCw
                    size={13}
                  />
                  Retry
                </button>
              </div>
            )}

            {hasBankDetails &&
              checkout && (
                <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08]">
                  <BankRow
                    label="Bank BIN"
                    value={
                      checkout.bin
                    }
                  />

                  <BankRow
                    label="Account number"
                    value={
                      checkout.accountNumber
                    }
                    copyKey="account"
                    copied={
                      copied
                    }
                    onCopy={
                      handleCopy
                    }
                  />

                  {checkout.accountName && (
                    <BankRow
                      label="Account name"
                      value={
                        checkout.accountName
                      }
                    />
                  )}

                  <BankRow
                    label="Amount"
                    value={formatVnd(
                      displayAmount,
                    )}
                    copyValue={String(
                      Math.round(
                        displayAmount,
                      ),
                    )}
                    copyKey="amount"
                    copied={
                      copied
                    }
                    onCopy={
                      handleCopy
                    }
                  />

                  {checkout.description && (
                    <BankRow
                      label="Transfer content"
                      value={
                        checkout.description
                      }
                      copyKey="description"
                      copied={
                        copied
                      }
                      onCopy={
                        handleCopy
                      }
                    />
                  )}
                </div>
              )}

            {checkout?.checkoutUrl && (
              <div className="mt-5 border-t border-white/[0.08] pt-5">
                <a
                  href={checkout.checkoutUrl}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-[13px] font-semibold text-black transition hover:bg-orange-400"
                >
                  Pay with PayOS

                  <ExternalLink
                    size={15}
                  />
                </a>

                <p className="mt-2 text-center text-[10px] leading-5 text-white/[0.40]">
                  Continue to PayOS to complete payment. After a successful payment, PayOS will use the return URL configured by the backend to return to DroneOptAI.
                </p>
              </div>
            )}

            <div className="mt-5 flex items-start gap-3 rounded-xl bg-white/[0.025] px-4 py-3">
              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" />

              <p className="text-[10px] leading-5 text-white/[0.45]">
                Keep this page open after transferring. DroneOptAI checks the backend payment status automatically every few seconds.
              </p>
            </div>
          </div>
        </section>

        {/* SUMMARY */}
        <aside className="h-fit rounded-[22px] border border-white/[0.10] bg-[#151217]/95 p-5 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/[0.44]">
            Payment summary
          </p>

          <div className="mt-4 border-b border-white/[0.08] pb-4">
            <p className="text-[10px] text-white/[0.42]">
              Order
            </p>

            <p className="mt-1 break-all text-[13px] font-semibold text-white/[0.92]">
              {delivery.id}
            </p>
          </div>

          <div className="mt-5">
            <PaymentPriceBreakdown
              price={
                delivery.price
              }
            />
          </div>

          <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/[0.08] pt-5">
            <span className="text-[12px] font-medium text-white/[0.64]">
              Total
            </span>

            <strong className="text-[22px] tracking-[-0.03em] text-white">
              {formatVnd(
                delivery.price
                  .total,
              )}
            </strong>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* =========================================================
   BANK DETAIL ROW
========================================================= */

function BankRow({
  label,
  value,
  copyValue,
  copyKey,
  copied,
  onCopy,
}: {
  label: string;
  value: string | null;
  copyValue?: string;
  copyKey?: string;
  copied?: string;
  onCopy?: (
    key: string,
    value: string | null,
  ) => void;
}) {
  const canCopy =
    Boolean(
      copyKey &&
        onCopy &&
        value,
    );

  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-3.5 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-[0.10em] text-white/[0.34]">
          {label}
        </p>

        <p className="mt-1 break-words text-[12px] font-medium text-white/[0.84]">
          {value ?? "—"}
        </p>
      </div>

      {canCopy && (
        <button
          type="button"
          onClick={() =>
            onCopy?.(
              copyKey!,
              copyValue ??
                value,
            )
          }
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/[0.40] transition hover:bg-white/[0.05] hover:text-white"
          aria-label={`Copy ${label}`}
        >
          {copied ===
          copyKey ? (
            <Check
              size={14}
              className="text-emerald-400"
            />
          ) : (
            <Copy size={14} />
          )}
        </button>
      )}
    </div>
  );
}

/* =========================================================
   PRICE BREAKDOWN
========================================================= */

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

      {details.fragileSurcharge >
        0 && (
        <PaymentPriceRow
          label="Fragile surcharge"
          value={`+${formatVnd(
            details.fragileSurcharge,
          )}`}
        />
      )}

      {details.insuranceFee >
        0 && (
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

      {details.expressSurcharge >
        0 && (
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
            ? "font-semibold text-white/[0.72]"
            : "text-white/[0.52]"
        }
      >
        {label}
      </span>

      <span
        className={
          strong
            ? "font-semibold text-white"
            : "font-medium text-white/[0.86]"
        }
      >
        {value}
      </span>
    </div>
  );
}
