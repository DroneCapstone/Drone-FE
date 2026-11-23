import {

  ArrowLeft,

  ArrowRight,


  MapPin,
  Trash2,

} from "lucide-react";

import {

  Link,

  useParams,
  useNavigate,

} from "react-router-dom";

import {

  useEffect,

  useState,
  useRef,

} from "react";

import {

  customerDeliveryService,

  formatDeliveryMode,


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
import { createPortal } from "react-dom";

/**
 * Be conservative: only the backend's fresh order detail may authorize the
 * Delete button. In particular, missing mission/payment fields are NOT proof
 * that an order is eligible for deletion.
 */
function isDeletablePendingOrder(response: unknown, expectedId: string): boolean {
  let value: unknown = response;
  for (let depth = 0; depth < 3; depth += 1) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    if ("order_status" in record || "payment_status" in record) break;
    value = record.order ?? record.data ?? record.result;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const order = value as Record<string, unknown>;
  const orderId = order.order_id ?? order.id;
  const status = String(order.order_status ?? order.status ?? "").trim().toUpperCase();
  const payment = String(order.payment_status ?? order.paymentStatus ?? "").trim().toUpperCase();
  const hasMissionField = Object.prototype.hasOwnProperty.call(order, "mission_id") ||
    Object.prototype.hasOwnProperty.call(order, "missionId");
  // Null is meaningful here: it means no mission has been assigned.
  const missionId = Object.prototype.hasOwnProperty.call(order, "mission_id")
    ? order.mission_id
    : order.missionId;

  return String(orderId ?? "") === expectedId &&
    status === "PENDING" &&
    ["PENDING", "UNPAID", "NOT_PAID", "AWAITING_PAYMENT"].includes(payment) &&
    hasMissionField && (missionId === null || missionId === "");
}

/** Remove only the deleted order from the existing local offline fallback. */
function clearDeletedOrderFromCache(orderId: string) {
  try {
    const key = "droneoptai.customer.deliveries";
    const saved = window.localStorage.getItem(key);
    if (!saved) return;
    const list: unknown = JSON.parse(saved);
    if (!Array.isArray(list)) return;
    window.localStorage.setItem(
      key,
      JSON.stringify(list.filter((item: unknown) => {
        if (!item || typeof item !== "object") return true;
        return (item as { id?: unknown }).id !== orderId;
      })),
    );
  } catch {
    // The server deletion already succeeded; unavailable local storage must
    // not stop the customer from returning to My Deliveries.
  }
}

function DeleteOrderAction({
  orderId,
  visible,
  enabled,
}: {
  orderId: string;
  visible: boolean;
  enabled: boolean;
}) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const deletingRef = useRef(deleting);
  deletingRef.current = deleting;

  // Keep the confirmation above the header and floating assistant, and make
  // it usable with keyboard navigation. Only the modal is changed here.
  useEffect(() => {
    if (!confirmOpen || !visible) return;

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deletingRef.current) {
        event.preventDefault();
        setConfirmOpen(false);
      }
      if (event.key !== "Tab") return;
      const buttons = [cancelRef.current, deleteRef.current]
        .filter((button): button is HTMLButtonElement => Boolean(button && !button.disabled));
      if (buttons.length === 0) {
        event.preventDefault();
        return;
      }
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [confirmOpen, visible]);

  if (!visible) return null;

  const closeConfirm = () => {
    if (deleting) return;
    setConfirmOpen(false);
    setDeleteError("");
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      // Confirm against the freshest backend data before calling DELETE.
      // Payment/mission restrictions and the API remain unchanged.
      const latest = await customerApi.getOrder(orderId);
      if (!isDeletablePendingOrder(latest, orderId)) {
        setDeleteError("This order can no longer be deleted. Please check its latest status.");
        return;
      }
      await customerApi.deleteOrder(orderId);
      clearDeletedOrderFromCache(orderId);
      navigate("/customer/deliveries", { replace: true });
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Unable to delete this order.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => { setDeleteError(""); setConfirmOpen(true); }}
        title={!enabled ? "Eligibility will be checked before deleting" : undefined}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/[0.10] px-4 text-[13px] font-semibold text-orange-300 transition hover:border-orange-400/70 hover:bg-orange-500/[0.16]"
      >
        <Trash2 size={15} aria-hidden="true" />
        Delete order
      </button>

      {confirmOpen && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-black/75 px-4 py-6 backdrop-blur-[3px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeConfirm();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-order-title"
            aria-describedby="delete-order-description"
            className="my-auto max-h-[calc(100dvh-32px)] w-full max-w-[420px] overflow-y-auto rounded-2xl border border-white/[0.12] bg-[#191519] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.6)] sm:p-6"
          >
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-orange-500/[0.25] bg-orange-500/[0.10] text-orange-400">
              <Trash2 size={19} aria-hidden="true" />
            </div>
            <h2 id="delete-order-title" className="text-[20px] font-semibold tracking-[-0.025em] text-white">
              Delete this order?
            </h2>
            <p id="delete-order-description" className="mt-2 text-[13px] leading-6 text-white/[0.58]">
              This order will be permanently removed. This action cannot be undone.
            </p>
            <div className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.035] px-3.5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/[0.40]">Order ID</p>
              <p className="mt-1 break-all text-[13px] font-semibold text-white/[0.86]">{orderId}</p>
            </div>
            {deleteError && (
              <p role="alert" className="mt-4 rounded-lg border border-orange-500/[0.25] bg-orange-500/[0.08] px-3 py-2.5 text-[12px] leading-5 text-orange-200">
                {deleteError}
              </p>
            )}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                ref={cancelRef}
                type="button"
                onClick={closeConfirm}
                disabled={deleting}
                className="h-11 rounded-xl border border-white/[0.14] bg-white/[0.035] text-[13px] font-semibold text-white/[0.82] transition hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 disabled:cursor-wait disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                ref={deleteRef}
                type="button"
                onClick={() => { void handleDelete(); }}
                disabled={deleting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 text-[13px] font-semibold text-black transition hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:cursor-wait disabled:opacity-70"
              >
                <Trash2 size={14} aria-hidden="true" />
                {deleting ? "Deleting…" : "Delete order"}
              </button>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </div>
  );
}

export function DeliveryDetailPage() {

  const { deliveryId } = useParams();

  const { user } = useAuth();

  const [verifiedDeletableOrderId, setVerifiedDeletableOrderId] = useState<string | null>(null);

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
    setVerifiedDeletableOrderId(null);

    async function refreshSelectedOrder() {

      if (busy || document.hidden) return;

      busy = true;

      try {

        // Fetch only the selected order, never poll payment status for the order list.

        const latest = await customerDeliveryService.loadOrderSummaryFromBackend(customerId, currentId);

        if (!active) return;

        // The existing detail GET has already populated this raw response;
        // no duplicate GET is needed to check mission_id for the button.
        const rawDetail = customerApi.getLastOrderDetail(currentId);
        setVerifiedDeletableOrderId(
          isDeletablePendingOrder(rawDetail, currentId) ? currentId : null,
        );

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

  // Reserve the Delete button slot immediately for a pending, unpaid order.
  // Local data may only decide whether the slot is displayed, NEVER whether
  // deletion is enabled. The backend detail response grants that permission.
  const currentStatus = String(
    serverOrder?.orderStatus ?? delivery?.backendStatus ?? delivery?.orderStatus ?? "",
  ).trim().toUpperCase();
  const currentPayment = serverOrder?.paymentStatus ?? delivery?.paymentStatus;
  const showDeleteAction = Boolean(
    currentPayment === "pending" &&
    (currentStatus === "PENDING" || currentStatus === "PENDING_REVIEW")
  );
  const deleteAllowed = Boolean(
    deliveryId && verifiedDeletableOrderId === deliveryId && showDeleteAction
  );

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

        showDelete={showDeleteAction}
        canDelete={deleteAllowed}

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

      <OrderDetailHeader

        orderId={delivery.id}

        status={status}

        originHub={serverOrder?.originHub.name ?? delivery.originHub.name}

        destinationHub={serverOrder?.destinationHub.name ?? delivery.destinationHub.name}

      />

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

            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-6">

              <DetailItem

                label="Package"

                value={`${delivery.weightKg} kg · Size ${delivery.packageSize}`}

              />

              <DetailItem

                label="Delivery mode"

                value={formatDeliveryMode(delivery.deliveryMode)}

              />

              <DetailItem

                label="Insurance"

                value={delivery.hasInsurance ? "Included" : "Not added"}

              />

              <DetailItem

                label="Payment"

                value={paid ? "Paid" : "Pending"}

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

            {paid && delivery.orderStatus?.toUpperCase() === "DELIVERED_TO_HUB" && (

              <Link

                to={`/customer/deliveries/${delivery.id}/rate`}

                className="mt-6 flex h-11 items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/[0.08] text-[13px] font-semibold text-orange-400 transition hover:bg-orange-500/[0.14]"

              >

                ★ Rate this delivery

              </Link>

            )}

            <DeleteOrderAction orderId={delivery.id} visible={showDeleteAction} enabled={deleteAllowed} />

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

  showDelete,

  canDelete,

}: {

  order: CustomerOrderSummary;

  events: TrackingEvent[];

  changeNotice: string;

  onDismiss: () => void;

  refreshError: string;

  showDelete: boolean;

  canDelete: boolean;

}) {

  const canPay = order.paymentStatus === "pending" &&

    ["pending", "awaiting_payment"].includes(order.orderStatus.trim().toLowerCase());

  return (

    <div className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-8 text-white sm:px-6 sm:pt-10 lg:px-10 lg:pb-16 lg:pt-12">

      <OrderDetailHeader

        orderId={order.id}

        status={order.statusLabel}

        originHub={order.originHub.name}

        destinationHub={order.destinationHub.name}

      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">

        <main className="min-w-0 space-y-5">

          {changeNotice && <StatusChangeNotice text={changeNotice} onClose={onDismiss} />}

          {refreshError && <p role="status" className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-200">Unable to refresh now. Showing the last known status.</p>}

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

              {order.packageLabel && <DetailItem label="Package" value={order.packageLabel} />}
              {order.packageType && <DetailItem label="Type" value={order.packageType} />}
              <DetailItem label="Delivery mode" value={order.deliveryMode ? formatDeliveryMode(order.deliveryMode) : "—"} />

              <DetailItem label="Weight" value={order.weightKg === null ? "—" : `${order.weightKg} kg`} />

              <DetailItem label="Package size" value={order.packageSize ?? "—"} />
              {order.insuranceIncluded !== null && order.insuranceIncluded !== undefined && (
                <DetailItem label="Insurance" value={order.insuranceIncluded ? "Included" : "Not added"} />
              )}

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

            {order.paymentStatus === "paid" &&
              order.orderStatus?.toUpperCase() === "DELIVERED_TO_HUB" && (

              <Link

                to={`/customer/deliveries/${encodeURIComponent(order.id)}/rate`}

                className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/[0.08] text-[13px] font-semibold text-orange-400 transition hover:bg-orange-500/[0.14]"

              >

                ★ Rate this delivery

              </Link>

            )}

            {/* Cancel with reason — only for PENDING / AWAITING_DROP_OFF unpaid */}
            <CancelWithReasonButton
              orderId={order.id}
              orderStatus={order.orderStatus}
              paymentStatus={order.paymentStatus}
            />

            <DeleteOrderAction orderId={order.id} visible={showDelete} enabled={canDelete} />

          </div>

        </aside>

      </div>

    </div>

  );

}

/** One compact header for either data source; timestamps belong in the timeline. */

function OrderDetailHeader({

  orderId,

  status,

  originHub,

  destinationHub,


}: {

  orderId: string;

  status: string;

  originHub: string;

  destinationHub: string;


}) {

  const display = getReadableHeaderStatus(status);

  return (

    <header className="min-w-0">

      <Link

        to="/customer/deliveries"

        className="mb-6 inline-flex items-center gap-2 text-[12px] font-medium text-white/55 transition hover:text-orange-400 sm:mb-7"

      >

        <ArrowLeft size={15} aria-hidden="true" />

        Back to My deliveries

      </Link>

      <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-orange-400/90">

        {orderId}

      </p>

      <h1 className="mt-2 max-w-[680px] text-[30px] font-semibold leading-[1.13] tracking-[-0.035em] text-white sm:text-[40px]">

        {display.title}

      </h1>

      {display.detail && (

        <div className="mt-3 flex flex-wrap">

          <span className="inline-flex max-w-full items-center rounded-full border border-orange-400/25 bg-orange-500/10 px-3 py-1.5 text-[11px] font-medium leading-5 text-orange-200">

            {display.detail}

          </span>

        </div>

      )}

      {/* All milestone times live in Delivery Progress. Keep the header uncluttered. */}
      <div className="mt-4 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.035] px-2.5 py-2 text-[11px] text-white/70 sm:mt-5"
        title={`${originHub} → ${destinationHub}`}>
        <MapPin size={12} className="shrink-0 text-orange-400" aria-hidden="true" />
        <span className="min-w-0 truncate font-medium text-white/80">{compactHubName(originHub)}</span>
        <ArrowRight size={11} className="shrink-0 text-white/40" aria-hidden="true" />
        <span className="min-w-0 truncate font-medium text-white/80">{compactHubName(destinationHub)}</span>
      </div>

    </header>

  );

}

/** Shorten header labels only; full official hub name remains in route details. */

function compactHubName(name: string): string {

  return name.split(/\s+-\s+/, 1)[0]?.trim() || name || "—";

}

/** Avoid displaying a compound backend label as a two-line page heading. */

function getReadableHeaderStatus(status: string): {

  title: string;

  detail: string | null;

} {

  const label = status.trim() || "Order details";

  const separator = " / ";

  const index = label.indexOf(separator);

  if (index === -1) return { title: label, detail: null };

  const previous = label.slice(0, index).trim();

  const current = label.slice(index + separator.length).trim();

  if (!previous || !current) return { title: label, detail: null };

  return { title: current, detail: previous };

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


// ── Cancel with Reason ────────────────────────────────────────────────────────

const CANCEL_REASONS: { value: string; label: string }[] = [
  { value: "changed_my_mind",   label: "Changed my mind" },
  { value: "wrong_information", label: "Wrong information entered" },
  { value: "price_too_high",    label: "Price too high" },
  { value: "found_alternative", label: "Found an alternative" },
  { value: "delivery_too_slow", label: "Delivery too slow" },
  { value: "other",             label: "Other" },
];

function CancelWithReasonButton({
  orderId,
  orderStatus,
  paymentStatus,
}: {
  orderId: string;
  orderStatus: string | null | undefined;
  paymentStatus: string | null | undefined;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const eligible =
    ["pending", "awaiting_drop_off"].includes(orderStatus?.toLowerCase() ?? "") &&
    !["paid"].includes(paymentStatus?.toLowerCase() ?? "");

  if (!eligible) return null;

  const handleCancel = async () => {
    if (!reason || loading) return;
    setLoading(true);
    setError("");
    try {
      await customerApi.cancelOrderWithReason(orderId, reason, note.trim() || undefined);
      navigate("/customer/deliveries", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 flex h-10 w-full items-center justify-center text-[12px] font-medium text-white/[0.30] transition hover:text-red-400"
      >
        Cancel this order
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-white/[0.10] bg-[#161217] shadow-2xl">
            <div className="border-b border-white/[0.08] px-6 py-5">
              <h2 className="text-[16px] font-semibold text-white">Cancel order #{orderId}</h2>
              <p className="mt-1 text-[12px] text-white/[0.44]">Please tell us why you want to cancel.</p>
            </div>

            <div className="space-y-4 p-6">
              {/* Reason select */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/[0.36]">Reason</label>
                <div className="mt-2 space-y-2">
                  {CANCEL_REASONS.map((r) => (
                    <label key={r.value} className="flex cursor-pointer items-center gap-3">
                      <input
                        type="radio"
                        name="cancel-reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="h-4 w-4 accent-orange-500"
                      />
                      <span className="text-[13px] text-white/[0.78]">{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Optional note */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/[0.36]">
                  Additional note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Tell us more..."
                  className="mt-2 w-full resize-none rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-2.5 text-[13px] text-white placeholder-white/[0.22] outline-none focus:border-orange-500/50"
                />
              </div>

              {error && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[12px] text-red-300">
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-3 border-t border-white/[0.08] px-6 py-4">
              <button
                type="button"
                onClick={() => { setOpen(false); setError(""); }}
                className="flex-1 h-10 rounded-xl border border-white/[0.12] text-[13px] font-medium text-white/[0.60] transition hover:border-white/[0.24]"
              >
                Keep order
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={!reason || loading}
                className="flex-1 h-10 rounded-xl bg-red-500/80 text-[13px] font-semibold text-white transition hover:bg-red-500 disabled:opacity-40"
              >
                {loading ? "Cancelling…" : "Cancel order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
