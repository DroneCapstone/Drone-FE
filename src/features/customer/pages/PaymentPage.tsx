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
import type { CustomerOrderSummary, CustomerOrderFeeBreakdown } from "../services/customerDeliveryService";
import { useAuth } from "../../auth/hooks/useAuth";

import { QRCodeSVG } from "qrcode.react";

/* =========================================================
   CHECKOUT: SINGLE-FLIGHT + SAFE QR CACHE
   ========================================================= */

// React StrictMode may rerun effects during development. Requests for
// the same order share one Promise instead of creating extra checkouts.
const checkoutInFlight = new Map<string, Promise<PaymentCheckoutDetails>>();
const recentCheckouts = new Map<
  string,
  { details: PaymentCheckoutDetails; recordedAt: number }
>();

const RECENT_REQUEST_MS = 60_000;
const SESSION_QR_CACHE_MS = 10 * 60_000;
const QR_SESSION_KEY_PREFIX = "droneoptai.customer.payment-qr.";

/**
 * Supports the canonical customerApi mapping AND direct snake_case fields
 * returned by FastAPI/PayOS (e.g. qr_code instead of qrCode).
 * This matters when Network has a QR but the page receives null fields.
 */
// Match the exact input type expected by the existing customerApi helper.
// This keeps the safe snake_case fallback without passing `unknown` to
// extractPaymentCheckoutDetails(), which caused TypeScript TS2345.
type PaymentCheckoutApiResponse = Parameters<
  typeof extractPaymentCheckoutDetails
>[0];

function extractCheckoutSafely(
  response: PaymentCheckoutApiResponse,
): PaymentCheckoutDetails {
  const mapped = extractPaymentCheckoutDetails(response);
  const raw =
    response && typeof response === "object"
      ? (response as Record<string, unknown>)
      : {};

  function rawText(...keys: string[]): string | null {
    for (const key of keys) {
      const value = raw[key];
      if ((typeof value === "string" || typeof value === "number") && String(value).trim()) {
        return String(value).trim();
      }
    }
    return null;
  }

  const rawAmount = raw.amount;
  const amount =
    typeof rawAmount === "number" && Number.isFinite(rawAmount)
      ? rawAmount
      : typeof rawAmount === "string" && rawAmount.trim() && Number.isFinite(Number(rawAmount))
        ? Number(rawAmount)
        : null;

  return {
    ...mapped,
    qrCode: mapped.qrCode || rawText("qr_code", "qrCode"),
    qrDataUrl: mapped.qrDataUrl || rawText("qr_data_url", "qrDataUrl"),
    bin: mapped.bin || rawText("bin"),
    accountNumber:
      mapped.accountNumber || rawText("account_number", "accountNumber"),
    accountName:
      mapped.accountName || rawText("account_name", "accountName"),
    description: mapped.description || rawText("description"),
    checkoutUrl:
      mapped.checkoutUrl || rawText("checkout_url", "checkoutUrl"),
    amount: mapped.amount ?? amount,
  };
}

function hasUsableQr(details: PaymentCheckoutDetails | null): boolean {
  if (!details) return false;
  return Boolean(
    details.qrCode ||
      details.qrDataUrl ||
      (details.bin && details.accountNumber),
  );
}

function getCheckoutUrl(details: PaymentCheckoutDetails | null): string {
  return details?.checkoutUrl?.trim() ?? "";
}

function isSamePayment(
  left: PaymentCheckoutDetails | null,
  right: PaymentCheckoutDetails | null,
): boolean {
  // Never merge bank details from a different/unknown PayOS payment link.
  const a = getCheckoutUrl(left);
  const b = getCheckoutUrl(right);
  return a.length > 0 && b.length > 0 && a === b;
}

function mergeCheckoutDetails(
  previous: PaymentCheckoutDetails | null,
  latest: PaymentCheckoutDetails,
): PaymentCheckoutDetails {
  if (!previous || !isSamePayment(previous, latest)) {
    return latest;
  }

  // An existing-PENDING checkout response from BE can omit QR fields.
  // Do not overwrite known-valid fields with null for the SAME link.
  return {
    ...latest,
    qrCode: latest.qrCode || previous.qrCode,
    qrDataUrl: latest.qrDataUrl || previous.qrDataUrl,
    bin: latest.bin || previous.bin,
    accountNumber: latest.accountNumber || previous.accountNumber,
    accountName: latest.accountName || previous.accountName,
    description: latest.description || previous.description,
    amount: latest.amount ?? previous.amount,
  };
}

function readCachedQr(orderId: string): PaymentCheckoutDetails | null {
  try {
    const raw = window.sessionStorage.getItem(
      `${QR_SESSION_KEY_PREFIX}${orderId}`,
    );
    if (!raw) return null;

    const stored = JSON.parse(raw) as {
      recordedAt: number;
      details: PaymentCheckoutDetails;
    };

    if (
      !stored ||
      !Number.isFinite(stored.recordedAt) ||
      Date.now() - stored.recordedAt > SESSION_QR_CACHE_MS ||
      !hasUsableQr(stored.details) ||
      !getCheckoutUrl(stored.details)
    ) {
      window.sessionStorage.removeItem(`${QR_SESSION_KEY_PREFIX}${orderId}`);
      return null;
    }

    return stored.details;
  } catch {
    return null;
  }
}

function saveCachedQr(orderId: string, details: PaymentCheckoutDetails) {
  if (!hasUsableQr(details) || !getCheckoutUrl(details)) return;

  try {
    window.sessionStorage.setItem(
      `${QR_SESSION_KEY_PREFIX}${orderId}`,
      JSON.stringify({ recordedAt: Date.now(), details }),
    );
  } catch {
    // Private browsing/storage restrictions must not block checkout.
  }
}

function clearCachedQr(orderId: string) {
  try {
    window.sessionStorage.removeItem(`${QR_SESSION_KEY_PREFIX}${orderId}`);
  } catch {
    // Ignore blocked storage.
  }
  recentCheckouts.delete(orderId);
}

function requestCheckout(
  orderId: string,
  forceRefresh = false,
): Promise<PaymentCheckoutDetails> {
  const existingRequest = checkoutInFlight.get(orderId);
  if (existingRequest) return existingRequest;

  const recent = recentCheckouts.get(orderId);
  if (
    !forceRefresh &&
    recent &&
    Date.now() - recent.recordedAt < RECENT_REQUEST_MS
  ) {
    return Promise.resolve(recent.details);
  }

  const request = customerApi
    .createCheckout(orderId)
    .then((response) => {
      const incoming = extractCheckoutSafely(response);
      // Use a cached QR only when the latest response has the same
      // checkout_url. A different PayOS payment must never reuse it.
      const fromSession = readCachedQr(orderId);
      const previous = recentCheckouts.get(orderId)?.details ?? null;
      const prior =
        previous && isSamePayment(previous, incoming)
          ? previous
          : fromSession && isSamePayment(fromSession, incoming)
            ? fromSession
            : null;
      const details = mergeCheckoutDetails(prior, incoming);

      recentCheckouts.set(orderId, {
        details,
        recordedAt: Date.now(),
      });
      saveCachedQr(orderId, details);
      return details;
    })
    .finally(() => {
      if (checkoutInFlight.get(orderId) === request) {
        checkoutInFlight.delete(orderId);
      }
    });

  checkoutInFlight.set(orderId, request);
  return request;
}

/* =========================================================
   QR RENDERING
   ========================================================= */

function isImageSource(value: string): boolean {
  return /^(data:image\/|https?:\/\/)/i.test(value.trim());
}

function getVietQrPayload(details: PaymentCheckoutDetails): string | null {
  const code = details.qrCode?.trim();
  if (!code || isImageSource(code)) return null;
  // PayOS qr_code is normally a raw EMV/VietQR payload.
  return code;
}

function buildVietQrImageUrl(details: PaymentCheckoutDetails): string | null {
  if (!details.bin || !details.accountNumber) return null;

  const params = new URLSearchParams();
  if (details.amount != null && details.amount > 0) {
    params.set("amount", String(Math.round(details.amount)));
  }
  if (details.description) params.set("addInfo", details.description);
  if (details.accountName) params.set("accountName", details.accountName);

  const query = params.toString();
  return `https://img.vietqr.io/image/${encodeURIComponent(details.bin)}-${encodeURIComponent(details.accountNumber)}-compact2.png${query ? `?${query}` : ""}`;
}

function resolveQrImage(details: PaymentCheckoutDetails): string | null {
  if (details.qrDataUrl && isImageSource(details.qrDataUrl)) {
    return details.qrDataUrl;
  }
  if (details.qrCode && isImageSource(details.qrCode)) {
    return details.qrCode;
  }
  // Fallback only: prefer local SVG made from qr_code instead of
  // downloading the QR from an external image server.
  return getVietQrPayload(details) ? null : buildVietQrImageUrl(details);
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

/* =========================================================
   PAYMENT PAGE
   ========================================================= */

export function PaymentPage() {
  const { deliveryId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // A paid/unpaid order may exist on BE but not in this browser's localStorage.
  // Never redirect such orders to My Deliveries before requesting their detail.
  const [delivery, setDelivery] = useState(() => {
    const cached = deliveryId ? customerDeliveryService.getById(deliveryId) : null;
    return cached?.customerId === user?.id ? cached : null;
  });
  const [serverOrder, setServerOrder] = useState<CustomerOrderSummary | null>(() =>
    deliveryId && user?.id
      ? customerDeliveryService.getServerOrderSummary(user.id, deliveryId)
      : null,
  );
  const [orderLoading, setOrderLoading] = useState(true);
  const [orderError, setOrderError] = useState("");

  useEffect(() => {
    if (!deliveryId || !user?.id) {
      setOrderLoading(false);
      setOrderError("Order information is unavailable.");
      return;
    }

    let active = true;
    const orderId = deliveryId;
    const customerId = user.id;
    const cached = customerDeliveryService.getById(orderId);
    setDelivery(cached?.customerId === customerId ? cached : null);
    setServerOrder(customerDeliveryService.getServerOrderSummary(customerId, orderId));
    setOrderLoading(true);
    setOrderError("");

    void customerDeliveryService.loadOrderSummaryFromBackend(customerId, orderId)
      .then((summary) => {
        if (!active) return;
        setServerOrder(summary);
        const refreshed = customerDeliveryService.getById(orderId);
        setDelivery(refreshed?.customerId === customerId ? refreshed : null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        // Preserve a previously known local/BE order during a temporary outage.
        // Checkout still requires the backend to authorize the selected order.
        setOrderError(error instanceof Error ? error.message : "Unable to load order details.");
      })
      .finally(() => {
        if (active) {
          setOrderLoading(false);
        }
      });

    return () => { active = false; };
  }, [deliveryId, user?.id]);

  // Route changes must never briefly show/checkout a previous order.
  const currentDelivery = delivery?.id === deliveryId ? delivery : null;
  const currentServerOrder = serverOrder?.id === deliveryId ? serverOrder : null;
  const knownOrder = Boolean(
    (currentDelivery && currentDelivery.customerId === user?.id) ||
    (currentServerOrder && currentServerOrder.customerId === user?.id),
  );
  const latestPaymentStatus = currentServerOrder?.paymentStatus ?? currentDelivery?.paymentStatus;
  const orderStatus = (currentServerOrder?.orderStatus ?? currentDelivery?.backendStatus ?? "").trim().toUpperCase();
  const cannotPay = latestPaymentStatus === "paid" ||
    latestPaymentStatus === "refunded" ||
    latestPaymentStatus === "failed" ||
    ["CANCELLED", "REJECTED", "COMPLETED", "DELIVERED_TO_HUB", "PICKED_UP"].includes(orderStatus);

  // A known order from My Deliveries is sufficient to start checkout.
  // Refreshing its detail happens in PARALLEL, never as a full-page gate.
  // When the user deep-links to an uncached order, checkout starts after the
  // GET confirms that it belongs to the signed-in customer.
  const paymentOrderId = Boolean(user?.id) && knownOrder && !cannotPay
    ? deliveryId ?? null
    : null;

  const [

    storedCheckout,

    setCheckout,

  ] = useState<

    PaymentCheckoutDetails | null

  >(null);

  // Do not accidentally render a QR/amount from the previous order when
  // React Router reuses PaymentPage across two different order IDs.
  const [checkoutOwnerId, setCheckoutOwnerId] = useState<string | null>(null);
  const checkout = checkoutOwnerId === deliveryId ? storedCheckout : null;

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

  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);

  /* =======================================================
     PAYMENT STATUS: GET only, never retrigger POST checkout
     ======================================================= */

  useEffect(() => {
    if (!paymentOrderId || loading) return;

    const orderId = paymentOrderId;
    let cancelled = false;
    let checking = false;
    let completed = false;

    async function checkStatus() {
      if (checking || completed || cancelled) return;
      checking = true;

      try {
        const response = await customerApi.getPaymentStatus(orderId);
        if (cancelled) return;

        const status = normalizePaymentStatus(response);
        if (status === "paid") {
          completed = true;
          clearCachedQr(orderId);
          customerDeliveryService.markPaid(orderId);
          navigate(`/customer/payment/${encodeURIComponent(orderId)}/success`, {
            replace: true,
          });
        }
      } catch {
        // Temporary GET status errors must not trigger another checkout.
      } finally {
        checking = false;
      }
    }

    void checkStatus();
    const timer = window.setInterval(() => void checkStatus(), 4000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [paymentOrderId, navigate, loading]);

  /* =======================================================
     INITIAL CHECKOUT: one POST for one order / mount
     ======================================================= */

  useEffect(() => {
    if (!paymentOrderId) return;

    const orderId = paymentOrderId;
    let active = true;

    setCheckout(null);
    setCheckoutOwnerId(orderId);
    setFailedImageSrc(null);
    setLoading(true);
    setError("");

    void requestCheckout(orderId)
      .then((details) => {
        if (!active) return;
        setCheckout(details);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to prepare payment.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [paymentOrderId]);

  // Payment shell is rendered immediately. Only the QR region waits while
  // the selected backend order is resolved; no blank intermediate page.
  if (!knownOrder && !orderLoading) {
    return (
      <div className="mx-auto max-w-[760px] px-6 py-20 text-center text-white">
        <h1 className="text-2xl font-semibold">Unable to open payment</h1>
        <p role="alert" className="mt-3 text-sm text-white/65">
          {orderError || "The selected order could not be found."}
        </p>
        <Link to="/customer/deliveries" className="mt-6 inline-block rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-black">
          Back to My deliveries
        </Link>
      </div>
    );
  }

  if (knownOrder && latestPaymentStatus === "paid") {
    return <Navigate to={`/customer/payment/${encodeURIComponent(deliveryId ?? "")}/success`} replace />;
  }

  if (knownOrder && cannotPay) {
    return (
      <div className="mx-auto max-w-[760px] px-6 py-20 text-center text-white">
        <h1 className="text-2xl font-semibold">Payment unavailable</h1>
        <p className="mt-3 text-sm text-white/65">This order is not eligible for payment in its current status.</p>
        <Link to={`/customer/deliveries/${encodeURIComponent(deliveryId ?? "")}`} className="mt-6 inline-block rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-black">
          View order details
        </Link>
      </div>
    );
  }

  const reloadPayment = async () => {
    if (!paymentOrderId || loading) return;

    setLoading(true);
    setError("");
    setFailedImageSrc(null);

    try {
      // An explicit Retry may call POST again, but never concurrently.
      const details = await requestCheckout(paymentOrderId, true);
      setCheckout((current) => mergeCheckoutDetails(current, details));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to reload payment.",
      );
      // Keep previously valid QR details if Retry fails.
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

  const qrPayload = checkout ? getVietQrPayload(checkout) : null;
  const qrImage = checkout ? resolveQrImage(checkout) : null;
  const canShowQrImage = Boolean(qrImage && qrImage !== failedImageSrc);

  // The list/detail API supplies a total even for orders without a local
  // quotation. Use the checkout amount first; never manufacture a fee breakdown.
  const displayAmount = checkout?.amount ?? currentDelivery?.price.total ?? currentServerOrder?.totalFee ?? null;

  const hasBankDetails =

    Boolean(

      checkout?.bin &&

        checkout

          ?.accountNumber,

    );

  return (

    <div className="mx-auto w-full max-w-[1080px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">

      <Link

        to={`/customer/deliveries/${encodeURIComponent(deliveryId ?? "")}`}

        className="inline-flex items-center gap-2 text-[12px] text-white/[0.50] transition hover:text-white"

      >

        <ArrowLeft

          size={14}

        />

        Back to order details

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

                {displayAmount === null ? "—" : formatVnd(displayAmount)}

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

            {loading || (orderLoading && !knownOrder) ? (

              <div className="flex min-h-[390px] flex-col items-center justify-center rounded-2xl bg-white px-6 text-center">

                <RefreshCw

                  size={24}

                  className="animate-spin text-orange-500"

                />

                <p className="mt-4 text-[13px] font-semibold text-neutral-900">

                  Preparing payment QR

                </p>

              </div>

            ) : qrPayload ? (
              <div className="overflow-hidden rounded-2xl bg-white p-4 sm:p-5">
                <div className="mx-auto w-full max-w-[320px]">
                  <QRCodeSVG
                    value={qrPayload}
                    size={280}
                    level="M"
                    marginSize={4}
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                    className="block h-auto w-full"
                    aria-label="VietQR payment code"
                  />
                </div>
              </div>
            ) : canShowQrImage && qrImage ? (
              <div className="overflow-hidden rounded-2xl bg-white p-4 sm:p-5">
                <img
                  key={qrImage}
                  src={qrImage}
                  alt="VietQR payment code"
                  className="mx-auto block h-auto w-full max-w-[320px] object-contain"
                  onError={() => setFailedImageSrc(qrImage)}
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

                    value={displayAmount === null ? "—" : formatVnd(displayAmount)}

                    copyValue={displayAmount === null ? undefined : String(Math.round(displayAmount))}

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

              {deliveryId}

            </p>

          </div>

          <div className="mt-5">

            {currentDelivery?.price.feeDetails ? (
              <PaymentPriceBreakdown price={currentDelivery.price} />
            ) : (
              <BackendPaymentPriceBreakdown
                details={currentServerOrder?.feeBreakdown ?? null}
                isExpress={currentServerOrder?.deliveryMode === "express"}
                isRefreshing={orderLoading}
              />
            )}

          </div>

          <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/[0.08] pt-5">

            <span className="text-[12px] font-medium text-white/[0.64]">

              Total

            </span>

            <strong className="text-[22px] tracking-[-0.03em] text-white">

              {displayAmount === null ? "—" : formatVnd(displayAmount)}

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

function BackendPaymentPriceBreakdown({
  details,
  isExpress,
  isRefreshing,
}: {
  details: CustomerOrderFeeBreakdown | null;
  isExpress: boolean;
  isRefreshing: boolean;
}) {
  const money = (value: number | null | undefined) =>
    value === null || value === undefined ? "—" : formatVnd(value);

  // A historical order is NOT repriced using the current estimate API.
  // Values appear only when the backend returns the original fee breakdown.
  return (
    <div className="space-y-3">
      <PaymentPriceRow label="Base fee" value={money(details?.baseFee)} />
      <PaymentPriceRow label="Distance fee" value={money(details?.distanceFee)} />
      <PaymentPriceRow label="Payload fee" value={money(details?.payloadFee)} />
      <div className="border-t border-white/[0.07] pt-3">
        <PaymentPriceRow label="Core fee" value={money(details?.coreFee)} strong />
      </div>
      {(details?.fragileSurcharge ?? 0) > 0 && (
        <PaymentPriceRow label="Fragile surcharge"
          value={details?.fragileSurcharge === null || details?.fragileSurcharge === undefined
            ? "—" : `+${formatVnd(details.fragileSurcharge)}`} />
      )}
      {(details?.insuranceFee === undefined ||
        details?.insuranceFee === null || details.insuranceFee > 0) && (
        <PaymentPriceRow label="Package insurance"
          value={details?.insuranceFee === null || details?.insuranceFee === undefined
            ? "—" : `+${formatVnd(details.insuranceFee)}`} />
      )}
      <div className="border-t border-white/[0.07] pt-3">
        <PaymentPriceRow label="Delivery subtotal" value={money(details?.deliverySubtotal)} strong />
      </div>
      {(isExpress && details?.expressSurcharge === undefined ||
        isExpress && details?.expressSurcharge === null ||
        (details?.expressSurcharge ?? 0) > 0) && (
        <PaymentPriceRow label="Express surcharge"
          value={details?.expressSurcharge === null || details?.expressSurcharge === undefined
            ? "—" : `+${formatVnd(details.expressSurcharge)}`} />
      )}
      <PaymentPriceRow label="Service fee" value={money(details?.serviceFee)} />
      {!details && (
        <p className="pt-2 text-[10px] leading-5 text-white/[0.46]">
          {isRefreshing
            ? "Loading fee details from your order…"
            : "A detailed fee breakdown was not provided for this order by the backend. The total above is the amount on record."}
        </p>
      )}
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
