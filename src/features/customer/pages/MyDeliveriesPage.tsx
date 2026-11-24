import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, ChevronRight, Package, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import {
  customerDeliveryService,
  formatDateTime,
} from "../services/customerDeliveryService";

type DeliverySummary = ReturnType<
  typeof customerDeliveryService.getOrderSummariesByCustomer
>[number];

type DeliveryTab = "all" | "unpaid" | "paid" | "received" | "in-transit" | "delivered";

const DELIVERY_TABS: ReadonlyArray<{ key: DeliveryTab; label: string }> = [
  { key: "all", label: "All" },
  { key: "unpaid", label: "Unpaid" },
  { key: "paid", label: "Paid" },
  { key: "received", label: "Received" },
  { key: "in-transit", label: "In transit" },
  { key: "delivered", label: "Delivered" },
];

const ORDERS_PER_PAGE = 8;

/**
 * UI-only grouping: statuses remain authoritative in the backend.
 * Group orders into distinct customer-facing stages without inventing a status.
 * A waiting-for-drop-off label takes priority over generic AT_HUB codes so an
 * unreceived package cannot mistakenly appear in Received.
 * Unknown, cancelled, and refunded orders remain visible in All.
 */
function getDeliveryTab(order: DeliverySummary): Exclude<DeliveryTab, "all"> | null {
  const code = String(order.orderStatus ?? "").trim().toLowerCase();
  const customer = String(order.customerStatus ?? "").trim().toLowerCase();
  const label = String(order.statusLabel ?? "").trim().toLowerCase();
  const payment = String(order.paymentStatus ?? "").trim().toLowerCase();
  const statuses = `${code} ${customer}`;
  const tokens = `${statuses} ${label}`.replace(/[_-]/g, " ");

  // Cancelled/expired/refunded orders are kept in All, not in active stages.
  if (/cancel|reject|order expired|refund/.test(tokens) ||
      /^(cancelled|canceled|refunded)$/.test(payment)) return null;

  const paid = /^(paid|completed|success|succeeded)$/.test(payment);
  const unpaid = /^(pending|unpaid|not_paid|failed|awaiting_payment|pending_payment|payment_pending|payment_required)$/.test(payment);
  const awaitingPayment =
    /awaiting_payment|pending_payment|payment_required|payment_pending/.test(statuses) ||
    /awaiting payment|payment pending|payment required|unpaid|not paid|pay now|complete payment/.test(label);
  const awaitingDropOff =
    /awaiting[_ -]?(package[_ -]?)?(drop[_ -]?off|handover)|pending[_ -]?(drop[_ -]?off|handover)/.test(`${statuses} ${label}`) ||
    /bring (your |the )?package to|waiting for (package|customer) (drop[_ -]?off|handover)/.test(label);

  // Payment is an explicit prerequisite for package processing.
  // A waiting-for-drop-off order is NOT Received even if a generic code says AT_HUB.
  if (unpaid && !paid) return "unpaid";
  if (awaitingPayment && !paid) return "unpaid";
  if (awaitingDropOff) return paid ? "paid" : null;

  // The parcel is collected by the recipient; only this completes delivery.
  if (
    /picked_up|package_collected|recipient_collected|handed_over_to_recipient|received_by_recipient/.test(statuses) ||
    /\b(picked up by recipient|collected by recipient|delivered to recipient|delivery completed|order completed)\b/.test(tokens) ||
    /^(delivered|completed)$/.test(code)
  ) return "delivered";

  // Arrival at destination is NOT final handover to the recipient.
  if (
    /delivered_to_hub|at_destination_hub|ready_for_pickup|destination_received/.test(statuses) ||
    /arrived at destination|destination hub|ready for (pick ?up|collection)|awaiting (recipient )?(pick ?up|collection)/.test(tokens)
  ) return "in-transit";

  if (
    /in_delivery|in_transit|out_for_delivery|flight_started|mission_in_progress/.test(statuses) ||
    /in transit|out for delivery|drone (departed|flying)|in flight|on the way/.test(tokens)
  ) return "in-transit";

  if (
    /package_received_at_origin|received_at_origin|\bat_hub\b|scheduled|mission_ready|preparing/.test(statuses) ||
    /received at origin|package received at (origin )?hub|preparing delivery|flight scheduled|mission (planned|ready)/.test(tokens)
  ) return "received";

  // Confirmed paid, not yet received at origin hub.
  if (paid) return "paid";

  // Missing or contradictory backend fields are not guessed into a stage.
  return null;
}

/* =========================================================
   MY DELIVERIES — STATUS TABS (UI ONLY)
   The API refresh, cached fallback, routes and order data are unchanged.
========================================================= */
export function MyDeliveriesPage() {
  const { user } = useAuth();
  const [, setRevision] = useState(0);
  const [syncError, setSyncError] = useState(false);
  const [activeTab, setActiveTab] = useState<DeliveryTab>("all");
  const [visibleCount, setVisibleCount] = useState(ORDERS_PER_PAGE);

  const deliveries = user
    ? customerDeliveryService.getOrderSummariesByCustomer(user.id)
    : [];

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    let busy = false;

    const refresh = async () => {
      if (!active || busy || document.hidden) return;
      busy = true;
      try {
        // One list request; never an individual Payment Status request per order.
        await customerDeliveryService.syncOrdersFromBackend(user.id);
        if (active) {
          setSyncError(false);
          setRevision((value) => value + 1);
        }
      } catch (error) {
        if (active) {
          console.warn("[MyDeliveries] Unable to refresh orders", error);
          setSyncError(true);
        }
      } finally {
        busy = false;
      }
    };

    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 60000);
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [user?.id]);

  const orderCategories = deliveries.map((order) => ({
    order,
    tab: getDeliveryTab(order),
  }));
  const counts = Object.fromEntries(
    DELIVERY_TABS.map(({ key }) => [
      key,
      key === "all"
        ? deliveries.length
        : orderCategories.filter((item) => item.tab === key).length,
    ]),
  ) as Record<DeliveryTab, number>;

  const tabs = DELIVERY_TABS;
  const matchingOrders = orderCategories
    .filter(({ tab }) => activeTab === "all" || tab === activeTab)
    .map(({ order }) => order);
  const visibleOrders = matchingOrders.slice(0, visibleCount);
  const selectedLabel = DELIVERY_TABS.find((tab) => tab.key === activeTab)?.label ?? "All";

  const selectTab = (key: DeliveryTab) => {
    setActiveTab(key);
    setVisibleCount(ORDERS_PER_PAGE);
  };

  return (
    <div className="min-h-[calc(100vh-72px)] bg-transparent font-sans">
      <div className="mx-auto max-w-[1320px] px-4 pb-24 pt-7 sm:px-6 sm:py-10 lg:px-10 lg:py-12">
        <header className="flex items-start justify-between gap-3 pb-6 sm:items-end sm:pb-8">
          <div className="min-w-0">
      
            <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-white sm:text-[38px] lg:text-[44px]">
              My deliveries
            </h1>
            
          </div>
          <Link
            to="/customer/deliveries/create?new=1"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-3.5 text-[12px] font-semibold text-black transition hover:bg-orange-400 sm:h-12 sm:px-5 sm:text-[14px]"
          >
            <Plus size={16} />
            <span className="sm:hidden">New</span>
            <span className="hidden sm:inline">Create delivery</span>
            <ArrowRight size={15} className="hidden sm:block" />
          </Link>
        </header>

        {/* Tab bar: scrolls horizontally on narrow screens, just like an order center. */}
        <nav
          role="tablist"
          aria-label="Filter deliveries by status"
          className="-mx-4 flex gap-1 overflow-x-auto border-b border-white/[0.10] px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0"
        >
          {tabs.map(({ key, label }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                id={`delivery-tab-${key}`}
                aria-selected={active}
                aria-controls="delivery-order-list"
                onClick={() => selectTab(key)}
                className={`relative flex h-[50px] shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-[12px] font-medium transition sm:h-[54px] sm:px-4 sm:text-[13px] ${
                  active ? "text-orange-400" : "text-white/[0.57] hover:text-white/[0.85]"
                }`}
              >
                {label}
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${
                    active ? "bg-orange-500/[0.13] text-orange-300" : "bg-white/[0.05] text-white/[0.43]"
                  }`}
                >
                  {counts[key]}
                </span>
                {active && <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-t bg-orange-500" />}
              </button>
            );
          })}
        </nav>

        <section id="delivery-order-list" role="tabpanel" aria-labelledby={`delivery-tab-${activeTab}`} className="mt-5 sm:mt-7">
          {syncError && (
            <p role="status" className="mb-4 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-[12px] text-amber-200">
              Could not refresh deliveries right now. Showing saved order information.
            </p>
          )}

          {deliveries.length === 0 ? (
            <div className="overflow-hidden rounded-2xl border border-white/[0.10] bg-[#151318]/95">
              <EmptyDeliveries />
            </div>
          ) : matchingOrders.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-white/[0.10] bg-[#151318]/95 px-6 py-10 text-center">
              <Package size={23} className="text-white/[0.35]" />
              <p className="mt-4 text-[15px] font-semibold text-white">No orders here yet</p>
              <p className="mt-1.5 max-w-[320px] text-[12px] leading-5 text-white/[0.50]">
                You have no orders in the {selectedLabel.toLowerCase()} category.
              </p>
              <button type="button" onClick={() => selectTab("all")} className="mt-5 text-[12px] font-semibold text-orange-400 hover:text-orange-300">
                View all deliveries
              </button>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between gap-3 px-0.5 sm:mb-4">
                <p className="text-[12px] text-white/[0.55]">
                  <span className="font-semibold text-white/[0.85]">{selectedLabel}</span>
                  <span className="ml-2 text-white/[0.35]">{matchingOrders.length} {matchingOrders.length === 1 ? "order" : "orders"}</span>
                </p>
                <span className="text-[11px] tabular-nums text-white/[0.35]">
                  Showing {visibleOrders.length} of {matchingOrders.length}
                </span>
              </div>

              {/* Desktop: original table information and order-detail links. */}
              <div className="hidden overflow-hidden rounded-2xl border border-white/[0.10] bg-[#151318]/95 lg:block">
                <div className="grid grid-cols-[170px_minmax(170px,1fr)_20px_minmax(170px,1fr)_115px_190px_20px] items-center gap-4 border-b border-white/[0.09] bg-white/[0.025] px-6 py-4">
                  <TableHeader>Order</TableHeader>
                  <TableHeader>Drop-off point</TableHeader>
                  <span />
                  <TableHeader>Pick-up point</TableHeader>
                  <TableHeader>Package</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <span />
                </div>
                {visibleOrders.map((delivery) => (
                  <Link
                    key={delivery.id}
                    to={`/customer/deliveries/${delivery.id}`}
                    className="group grid grid-cols-[170px_minmax(170px,1fr)_20px_minmax(170px,1fr)_115px_190px_20px] items-center gap-4 border-b border-white/[0.07] px-6 py-5 transition last:border-b-0 hover:bg-white/[0.035]"
                  >
                    <div className="min-w-0">
                      <p className="break-all text-[13px] font-semibold text-white">{delivery.id}</p>
                      <p className="mt-1.5 text-[11px] text-white/[0.45]">{formatDateTime(delivery.createdAt)}</p>
                    </div>
                    <DesktopHubCell name={delivery.originHub.name} />
                    <span className="text-center text-[13px] text-white/[0.28]">→</span>
                    <DesktopHubCell name={delivery.destinationHub.name} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-white/[0.84]">
                        {delivery.weightKg === null ? "—" : `${delivery.weightKg} kg`}
                      </p>
                      <p className="mt-1 text-[11px] text-white/[0.43]">
                        {delivery.packageSize ? `Size ${delivery.packageSize}` : "Size —"}
                      </p>
                    </div>
                    <StatusBadge status={delivery.statusLabel} />
                    <ChevronRight size={17} className="text-white/[0.35] transition group-hover:translate-x-0.5 group-hover:text-orange-400" />
                  </Link>
                ))}
              </div>

              {/* Mobile and tablet: compact order cards within the selected tab. */}
              <div className="grid gap-3 lg:hidden">
                {visibleOrders.map((delivery) => (
                  <Link
                    key={delivery.id}
                    to={`/customer/deliveries/${delivery.id}`}
                    className="group block overflow-hidden rounded-xl border border-white/[0.10] bg-[#151318]/95 px-4 py-4 transition active:bg-white/[0.035] sm:px-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-all text-[13px] font-semibold tracking-[-0.01em] text-white sm:text-[15px]">{delivery.id}</p>
                        <p className="mt-1 text-[11px] text-white/[0.46]">{formatDateTime(delivery.createdAt)}</p>
                      </div>
                      <ChevronRight size={18} className="mt-0.5 shrink-0 text-white/[0.36] transition group-hover:translate-x-0.5 group-hover:text-orange-400" />
                    </div>
                    <div className="mt-3">
                      <StatusBadge status={delivery.statusLabel} />
                    </div>
                    <div className="mt-3 border-t border-white/[0.07] pt-3">
                      <MobileRoute origin={delivery.originHub.name} destination={delivery.destinationHub.name} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-white/[0.07] pt-3">
                      <span className="text-[11px] text-white/[0.51]">Package</span>
                      <span className="text-[12px] font-medium text-white/[0.80]">
                        {delivery.weightKg === null ? "—" : `${delivery.weightKg} kg`}
                        {delivery.packageSize ? ` · Size ${delivery.packageSize}` : ""}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {matchingOrders.length > visibleCount && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((count) => count + ORDERS_PER_PAGE)}
                    className="min-h-11 rounded-xl border border-white/[0.15] bg-white/[0.025] px-6 text-[13px] font-semibold text-white/[0.82] transition hover:border-white/[0.30] hover:bg-white/[0.055]"
                  >
                    Show more orders
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function DesktopHubCell({ name }: { name: string }) {
  return <p className="min-w-0 break-words text-[13px] font-medium leading-5 text-white/[0.86]">{name}</p>;
}

function MobileRoute({ origin, destination }: { origin: string; destination: string }) {
  return (
    <div className="grid grid-cols-[12px_minmax(0,1fr)] gap-x-3 gap-y-1.5">
      <div className="flex flex-col items-center pt-1">
        <span className="h-2 w-2 shrink-0 rounded-full border-2 border-orange-500" />
        <span className="my-1 h-4 w-px bg-white/[0.15]" />
        <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" />
      </div>
      <div className="grid min-w-0 gap-2">
        <div className="min-w-0">
          <p className="text-[10px] text-white/[0.42]">Drop-off hub</p>
          <p className="mt-0.5 break-words text-[12px] font-medium leading-5 text-white/[0.87]">{origin}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-white/[0.42]">Pick-up hub</p>
          <p className="mt-0.5 break-words text-[12px] font-medium leading-5 text-white/[0.87]">{destination}</p>
        </div>
      </div>
    </div>
  );
}

function TableHeader({ children }: { children: ReactNode }) {
  return <span className="text-[10px] font-semibold uppercase tracking-[0.10em] text-white/[0.53]">{children}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = status.toLowerCase();
  let className = "border-white/[0.12] bg-white/[0.045] text-white/[0.76]";

  if (normalizedStatus.includes("overdue") || normalizedStatus.includes("failed")) {
    className = "border-orange-500/[0.26] bg-orange-500/[0.09] text-orange-300";
  } else if (normalizedStatus.includes("payment") || normalizedStatus.includes("pending")) {
    className = "border-amber-400/[0.22] bg-amber-400/[0.07] text-amber-200";
  } else if (
    normalizedStatus.includes("completed") ||
    normalizedStatus.includes("delivered to recipient") ||
    normalizedStatus.includes("picked up by recipient")
  ) {
    className = "border-emerald-400/[0.18] bg-emerald-400/[0.06] text-emerald-200";
  } else if (normalizedStatus.includes("arrived") || normalizedStatus.includes("pickup")) {
    className = "border-orange-400/[0.20] bg-orange-400/[0.07] text-orange-200";
  } else if (normalizedStatus.includes("delivery") || normalizedStatus.includes("transit")) {
    className = "border-orange-400/[0.20] bg-orange-400/[0.07] text-orange-200";
  }

  return (
    <span className={`inline-flex max-w-full rounded-md border px-2.5 py-1 text-[11px] font-medium leading-4 ${className}`}>
      {status}
    </span>
  );
}

function EmptyDeliveries() {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.10] bg-[#1b181d] text-white/[0.65]">
        <Package size={21} />
      </div>
      <p className="mt-5 text-[17px] font-semibold text-white">No deliveries yet</p>
      <p className="mt-2 max-w-[320px] text-[13px] leading-6 text-white/[0.55]">
        Create your first hub-to-hub delivery and its progress will appear here.
      </p>
      <Link
        to="/customer/deliveries/create?new=1"
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.14] bg-[#1b181d] px-5 text-[13px] font-semibold text-white transition hover:border-orange-500/[0.40]"
      >
        Create delivery <ArrowRight size={15} />
      </Link>
    </div>
  );
}
