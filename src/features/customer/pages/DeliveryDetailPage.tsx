import {
  ArrowLeft,
} from "lucide-react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  useEffect,
  useState,
} from "react";

import {
  customerDeliveryService,
  formatDeliveryMode,
  formatDateTime,
  formatVnd,
} from "../services/customerDeliveryService";

import type {
  DeliveryPrice,
} from "../types/customer";
import type { CustomerOrderSummary } from "../services/customerDeliveryService";
import { customerApi, ApiError } from "../services/customerApi";
import {
  DeliveryProgressTimeline,
  parseTrackingEvents,
  type TrackingEvent,
} from "../components/DeliveryProgressTimeline";
import { useAuth } from "../../auth/hooks/useAuth";

export function DeliveryDetailPage() {
  const { deliveryId } = useParams();
  const { user } = useAuth();

  const [delivery, setDelivery] = useState(() => {
    const candidate = deliveryId ? customerDeliveryService.getById(deliveryId) : null;
    return candidate?.customerId === user?.id ? candidate : null;
  });

  const [serverOrder, setServerOrder] = useState<CustomerOrderSummary | null>(() =>
    user?.id && deliveryId
      ? customerDeliveryService.getServerOrderSummary(user.id, deliveryId)
      : null,
  );
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(!delivery && !serverOrder);
  const [loadError, setLoadError] = useState("");
  const [changeNotice, setChangeNotice] = useState("");

  useEffect(() => {
    if (!deliveryId || !user?.id) return;
    let active = true;
    let busy = false;
    let trackingNotAvailable = false;
    let trackingFailures = 0;
    let lastStatus: string | null = null;
    const currentId = deliveryId;
    const customerId = user.id;

    const cached = customerDeliveryService.getById(currentId);
    setDelivery(cached?.customerId === customerId ? cached : null);
    const currentSummary = customerDeliveryService.getServerOrderSummary(customerId, currentId);
    setServerOrder(currentSummary);
    setIsLoading(!cached && !currentSummary);
    setLoadError("");
    setTrackingEvents([]);
    setChangeNotice("");

    async function refreshSelectedOrder() {
      if (busy || document.hidden) return;
      busy = true;
      try {
        // Fetch only the selected order, never poll payment status for the order list.
        const latest = await customerDeliveryService.loadOrderSummaryFromBackend(customerId, currentId);
        if (!active) return;
        setServerOrder(latest);
        setDelivery(() => {
          const next = customerDeliveryService.getById(currentId);
          return next?.customerId === customerId ? next : null;
        });
        setLoadError("");
        const key = [latest.orderStatus, latest.customerStatus, latest.paymentStatus].join("|");
        if (lastStatus !== null && key !== lastStatus) {
          setChangeNotice(`Order updated: ${latest.statusLabel}`);
        }
        lastStatus = key;
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : "Unable to refresh order.");
      } finally {
        if (active) setIsLoading(false);
        busy = false;
      }
      if (trackingNotAvailable || !active) return;
      try {
        const result = await customerApi.getOrderTracking(currentId);
        trackingFailures = 0;
        if (active) setTrackingEvents(parseTrackingEvents(result));
      } catch (error) {
        // Prevent repeated failing requests when BE tracking is unavailable.
        trackingFailures += 1;
        if (error instanceof ApiError && [401, 403, 404, 405, 501].includes(error.status)) {
          trackingNotAvailable = true;
        } else if (trackingFailures >= 2) {
          trackingNotAvailable = true;
        }
      }
    }

    void refreshSelectedOrder();
    const timer = window.setInterval(() => { void refreshSelectedOrder(); }, 30000);
    const onFocus = () => { void refreshSelectedOrder(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [deliveryId, user?.id]);

  const progressOrder = serverOrder ?? (
    user?.id && deliveryId
      ? customerDeliveryService.getLocalOrderSummary(user.id, deliveryId)
      : null
  );

  if (!delivery) {
    if (serverOrder) return (
      <BackendOrderDetails
        order={serverOrder}
        events={trackingEvents}
        changeNotice={changeNotice}
        onDismiss={() => setChangeNotice("")}
        refreshError={loadError}
      />
    );
    return (
      <div className="mx-auto max-w-[960px] px-4 py-16 text-white">
        <p className="text-lg font-semibold">{isLoading ? "Loading order details…" : "Order details unavailable"}</p>
        {loadError && <p className="mt-3 text-sm text-orange-300">{loadError}</p>}
        <Link to="/customer/deliveries" className="mt-6 inline-block text-orange-400">Back to My deliveries</Link>
      </div>
    );
  }

  const status = serverOrder?.statusLabel ??
    customerDeliveryService.getCustomerStatus(delivery);

  const paid = (serverOrder?.paymentStatus ?? delivery.paymentStatus) === "paid";

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-8 sm:px-6 sm:pt-10 lg:px-10 lg:pb-16 lg:pt-12">
      <header>
        <Link
          to="/customer/deliveries"
          className="mb-5 inline-flex items-center gap-2 text-[12px] font-medium text-white/[0.48] transition hover:text-white sm:mb-6 sm:text-[13px]"
        >
          <ArrowLeft size={15} />
          Back to My deliveries
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
          {changeNotice && <StatusChangeNotice text={changeNotice} onClose={() => setChangeNotice("")} />}
          {loadError && <p className="text-xs text-amber-200" role="status">Unable to refresh right now. Showing the last saved information.</p>}
          {progressOrder && <DeliveryProgressTimeline order={progressOrder} events={trackingEvents} />}

          <section className="rounded-2xl border border-white/[0.10] bg-[#161217]/92 p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-500">
              Delivery route
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <RouteCard
                label="Drop-off Point"
                name={delivery.originHub.name}
                address={delivery.originHub.address}
              />
              <RouteCard
                label="Pick-up Point"
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
                label="Insurance"
                value={
                  delivery.hasInsurance
                    ? "Included"
                    : "Not added"
                }
              />
              <DetailItem
                label="Payment"
                value={paid ? "Paid" : "Pending"}
              />
              <DetailItem
                label="Delivery mode"
                value={
                  formatDeliveryMode(delivery.deliveryMode)
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

            <DetailPriceBreakdown
              price={delivery.price}
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

/** Same progress timeline for orders that exist only on the backend. */
function BackendOrderDetails({
  order,
  events,
  changeNotice,
  refreshError,
  onDismiss,
}: {
  order: CustomerOrderSummary;
  events: TrackingEvent[];
  changeNotice: string;
  onDismiss: () => void;
  refreshError: string;
}) {
  const canPay = order.paymentStatus === "pending" &&
    ["pending", "awaiting_payment"].includes(order.orderStatus.trim().toLowerCase());
  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-8 text-white sm:px-6 sm:pt-10 lg:px-10 lg:pb-16 lg:pt-12">
      <Link to="/customer/deliveries" className="mb-6 inline-flex items-center gap-2 text-[12px] font-medium text-white/60 hover:text-orange-400">
        <ArrowLeft size={15} /> Back to My deliveries
      </Link>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500">{order.id}</p>
      <h1 className="mt-3 text-[28px] font-semibold leading-tight text-white sm:text-[42px]">{order.statusLabel}</h1>
      <p className="mt-3 text-[13px] text-white/55">{order.originHub.name} → {order.destinationHub.name}</p>
      <p className="mt-2 text-[11px] text-white/35">Created {formatDateTime(order.createdAt)}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
        <main className="min-w-0 space-y-5">
          {changeNotice && <StatusChangeNotice text={changeNotice} onClose={onDismiss} />}
          {refreshError && <p role="status" className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-200">Unable to refresh now. Showing the last known backend status.</p>}
          <DeliveryProgressTimeline order={order} events={events} />
          <section className="rounded-2xl border border-white/10 bg-[#161217]/95 p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-500">Delivery route</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <RouteCard label="Drop-off Point" name={order.originHub.name} address={order.originHub.address} />
              <RouteCard label="Pick-up Point" name={order.destinationHub.name} address={order.destinationHub.address} />
            </div>
          </section>
          <section className="rounded-2xl border border-white/10 bg-[#161217]/95 p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-500">Delivery information</p>
            <div className="mt-5 grid grid-cols-2 gap-5">
              <DetailItem label="Created" value={formatDateTime(order.createdAt)} />
              <DetailItem label="Delivery mode" value={order.deliveryMode ? formatDeliveryMode(order.deliveryMode) : "—"} />
              <DetailItem label="Weight" value={order.weightKg === null ? "—" : `${order.weightKg} kg`} />
              <DetailItem label="Package size" value={order.packageSize ?? "Not provided by API"} />
              <DetailItem label="Payment" value={order.paymentStatus === "paid" ? "Paid" : order.paymentStatus === "pending" ? "Pending" : "—"} />
            </div>
          </section>
        </main>
        <aside className="h-fit lg:sticky lg:top-[96px]">
          <div className="rounded-2xl border border-white/10 bg-[#161217]/95 p-5 sm:p-6">
            <p className="text-xs uppercase tracking-wide text-white/50">Order total</p>
            <strong className="mt-3 block text-2xl text-white">{order.totalFee === null ? "—" : formatVnd(order.totalFee)}</strong>
            {canPay && (
              <Link to={`/customer/payment/${encodeURIComponent(order.id)}`}
                className="mt-6 flex h-11 items-center justify-center rounded-xl bg-orange-500 text-sm font-semibold text-black">
                Continue to payment
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatusChangeNotice({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-orange-500/25 bg-orange-500/10 px-4 py-3 text-xs text-orange-200">
      <span>{text}</span>
      <button type="button" onClick={onClose} className="shrink-0 text-orange-300 hover:text-white" aria-label="Dismiss update">×</button>
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
        className={`mt-2 text-[13px] font-medium leading-5 ${emphasized
          ? "text-orange-400"
          : "text-white/[0.78]"
          }`}
      >
        {value}
      </p>
    </div>
  );
}

function DetailPriceBreakdown({
  price,
}: {
  price: DeliveryPrice;
}) {
  const details =
    price.feeDetails;

  if (!details) {
    return (
      <div className="space-y-3">
        <PriceRow
          label="Delivery fee"
          value={formatVnd(
            price.deliveryFee,
          )}
        />
        <PriceRow
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
      <PriceRow
        label="Base fee"
        value={formatVnd(
          details.baseFee,
        )}
      />

      <PriceRow
        label="Distance fee"
        value={formatVnd(
          details.distanceFee,
        )}
      />

      <PriceRow
        label="Payload fee"
        value={formatVnd(
          details.payloadFee,
        )}
      />

      <div className="border-t border-white/[0.07] pt-3">
        <PriceRow
          label="Core fee"
          value={formatVnd(
            coreFee,
          )}
          strong
        />
      </div>

      {details.fragileSurcharge > 0 && (
        <PriceRow
          label="Fragile surcharge"
          value={`+${formatVnd(
            details.fragileSurcharge,
          )}`}
        />
      )}

      {details.insuranceFee > 0 && (
        <PriceRow
          label="Package insurance"
          value={`+${formatVnd(
            details.insuranceFee,
          )}`}
        />
      )}

      <div className="border-t border-white/[0.07] pt-3">
        <PriceRow
          label="Delivery subtotal"
          value={formatVnd(
            price.deliveryFee,
          )}
          strong
        />
      </div>

      {details.expressSurcharge > 0 && (
        <PriceRow
          label="Express surcharge"
          value={`+${formatVnd(
            details.expressSurcharge,
          )}`}
        />
      )}

      {hasSeparateServiceFee && (
        <PriceRow
          label="Service fee"
          value={formatVnd(
            price.serviceFee,
          )}
        />
      )}
    </div>
  );
}

function PriceRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="mt-4 flex items-start justify-between gap-5 text-[12px]">
      <span
        className={
          strong
            ? "font-semibold text-white/[0.64]"
            : "text-white/[0.44]"
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
