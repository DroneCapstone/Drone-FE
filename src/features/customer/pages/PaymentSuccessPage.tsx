import {
  Check,
  Loader2,
} from "lucide-react";

import {
  Link,
  useNavigate,
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
import type { CustomerOrderSummary } from "../services/customerDeliveryService";
import { customerApi, normalizePaymentStatus } from "../services/customerApi";
import { useAuth } from "../../auth/hooks/useAuth";

export function PaymentSuccessPage() {
  const { deliveryId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [remote, setRemote] = useState<CustomerOrderSummary | null>(() =>
    user?.id && deliveryId
      ? customerDeliveryService.getServerOrderSummary(user.id, deliveryId)
      : null,
  );
  const [verifiedPaid, setVerifiedPaid] = useState(false);

  const [delivery, setDelivery] = useState(() => {
    const candidate = deliveryId ? customerDeliveryService.getById(deliveryId) : null;
    return candidate?.customerId === user?.id ? candidate : null;
  });

  const [checking, setChecking] =
    useState(true);
  const [verificationError, setVerificationError] =
    useState("");
  const [verificationAttempt, setVerificationAttempt] =
    useState(0);

  useEffect(() => {
    if (!deliveryId) {
      return;
    }

    const orderId = deliveryId;
    let active = true;

    setChecking(true);
    setVerifiedPaid(false);
    setVerificationError("");
    const candidate = customerDeliveryService.getById(orderId);
    setDelivery(candidate?.customerId === user?.id ? candidate : null);

    // Server status is authoritative. Do not rely on the presence of a
    // localStorage order: older orders may exist only in the backend.
    void customerApi.getPaymentStatus(orderId)
      .then(async (response) => {
        if (!active) return;
        const status = normalizePaymentStatus(response);
        if (status !== "paid") {
          navigate(`/customer/payment/${encodeURIComponent(orderId)}`, { replace: true });
          return;
        }
        setVerifiedPaid(true);
        const candidate = customerDeliveryService.getById(orderId);
        const current = candidate?.customerId === user?.id ? candidate : null;
        if (current) {
          setDelivery(customerDeliveryService.markPaid(orderId));
        } else if (user?.id) {
          const known = customerDeliveryService.getServerOrderSummary(user.id, orderId);
          if (known) setRemote(known);
          else {
            try {
              const summary = await customerDeliveryService.loadOrderSummaryFromBackend(user.id, orderId);
              if (active) setRemote(summary);
            } catch { /* Payment is verified; summary may remain unavailable. */ }
          }
        }
        customerDeliveryService.clearDraft();
        window.sessionStorage.removeItem("droneoptai.customer.pending-checkout-order");
      })
      .catch(() => {
        if (active) setVerificationError(
          "Payment verification is temporarily unavailable. Please try again.",
        );
      })
      .finally(() => { if (active) setChecking(false); });

    return () => {
      active = false;
    };
  }, [deliveryId, navigate, verificationAttempt, user?.id]);

  if (checking || !verifiedPaid) {
    return (
      <div className="mx-auto max-w-[760px] px-6 py-20 text-center">
        <Loader2
          size={30}
          className={
            checking
              ? "mx-auto animate-spin text-orange-400"
              : "mx-auto text-orange-400"
          }
        />

        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em]">
          {verificationError ? "Unable to verify payment" : "Verifying payment"}
        </h1>

        <p className="mx-auto mt-3 max-w-[520px] text-sm leading-6 text-white/60">
          {verificationError ||
            "DroneOptAI is checking the payment status with the backend."}
        </p>

        {verificationError && (
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setVerificationAttempt((attempt) => attempt + 1)}
              className="inline-flex rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white"
            >
              Try again
            </button>
            <Link
              to={`/customer/payment/${encodeURIComponent(deliveryId ?? "")}`}
              replace
              className="inline-flex rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-black"
            >
              Return to payment
            </Link>
          </div>
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
        Your order is confirmed. Bring your package to the Drop-off Point before the handover deadline.
      </p>

      <div className="mx-auto mt-10 max-w-[520px] border-y border-white/10 py-7 text-left">
        <SuccessRow
          label="Order"
          value={deliveryId ?? "—"}
        />
        <SuccessRow
          label="Drop-off Point"
          value={delivery?.originHub.name ?? remote?.originHub.name ?? "—"}
        />
        <SuccessRow
          label="Handover deadline"
          value={delivery ? formatDateTime(delivery.handoverDeadlineAt) : "Not available"}
        />
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Link
          to={`/customer/deliveries/${encodeURIComponent(deliveryId ?? "")}`}
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
