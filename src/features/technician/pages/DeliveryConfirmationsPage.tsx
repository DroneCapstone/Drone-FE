import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  PackageCheck,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/shadcn/ui/button";
import { Card, CardContent } from "@/components/shadcn/ui/card";
import { TechnicianPageShell } from "../components/TechnicianPageShell";
import {
  type DeliveryConfirmation,
} from "../utils/deliveryConfirmationStorage";
import {
  useConfirmPickupMutation,
  useDeliveryConfirmationsQuery,
} from "../hooks/useDeliveryQueries";
type Remaining = {
  expired: boolean;
  label: string;
};
function remainingUntil(deadline: string, now: number): Remaining | null {
  if (!deadline) return null;
  const end = Date.parse(deadline);
  if (!Number.isFinite(end)) return null;
  const ms = end - now;
  if (ms <= 0) return { expired: true, label: "Expired · awaiting server update" };
  const s = Math.ceil(ms / 1_000);
  const days = Math.floor(s / 86_400);
  const hours = Math.floor((s % 86_400) / 3_600);
  const minutes = Math.floor((s % 3_600) / 60);
  const seconds = s % 60;
  const fmt = (n: number) => String(n).padStart(2, "0");
  return {
    expired: false,
    label: `${days}d ${fmt(hours)}h ${fmt(minutes)}m ${fmt(seconds)}s`,
  };
}
export function DeliveryConfirmationsPage() {
  const confirmationsQuery = useDeliveryConfirmationsQuery();
  const confirmPickupMutation = useConfirmPickupMutation();
  const deliveries = confirmationsQuery.data ?? [];
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState("");
  // Track confirmation requests independently, without disabling other orders.
  const confirmingOrdersRef = useRef<Set<string>>(new Set());
  const [confirmingOrderIds, setConfirmingOrderIds] = useState<string[]>([]);
  const expiredRefetchDone = useRef<Set<string>>(new Set());
  // Track pickup deadlines for Backend-controlled expiration (not shown in the table).
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, []);
  // Refetch once on reaching the deadline. BE must perform the actual cancellation.
  useEffect(() => {
    for (const delivery of deliveries) {
      if (delivery.status !== "Delivered" || !delivery.pickupDeadlineAtIso) continue;
      const deadline = Date.parse(delivery.pickupDeadlineAtIso);
      if (!Number.isFinite(deadline) || now < deadline) continue;
      const marker = `${delivery.orderId}:${delivery.pickupDeadlineAtIso}`;
      if (expiredRefetchDone.current.has(marker)) continue;
      expiredRefetchDone.current.add(marker);
      void confirmationsQuery.refetch();
    }
  }, [deliveries, now, confirmationsQuery.refetch]);
  // With the filter tabs removed, display all statuses from Backend.
  const visible: DeliveryConfirmation[] = deliveries;
  async function handleConfirm(delivery: DeliveryConfirmation) {
    if (!delivery.backendOrderId || confirmingOrdersRef.current.has(delivery.orderId)) return;
    if (remainingUntil(delivery.pickupDeadlineAtIso, Date.now())?.expired) {
      setMessage("Pickup window expired. Wait for Backend to cancel the order, then refresh.");
      return;
    }
    setMessage("");
    confirmingOrdersRef.current.add(delivery.orderId);
    setConfirmingOrderIds((ids) => [...ids, delivery.orderId]);
    try {
      await confirmPickupMutation.mutateAsync(delivery.backendOrderId);
      // Only BE can complete the order. The invalidated list is the source of truth.
      setMessage(`Pickup confirmed for ${delivery.orderCode}. Status is refreshed from Backend.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Could not confirm customer pickup.";
      setMessage(`${detail} — If Backend rejects ${delivery.backendOrderId}, ask BE to return the actual order_id.`);
      void confirmationsQuery.refetch();
    } finally {
      confirmingOrdersRef.current.delete(delivery.orderId);
      setConfirmingOrderIds((ids) => ids.filter((id) => id !== delivery.orderId));
    }
  }
  return (
    <TechnicianPageShell
      title="Delivery confirmations"
      description=""
    >
      {message && (
        <div className="mb-4 flex items-start justify-between gap-4 rounded-md border border-orange-500/30 px-4 py-3 text-[13px] text-[var(--tech-text-secondary)]">
          <p>{message}</p>
          <button type="button" onClick={() => setMessage("")} className="shrink-0 text-xs hover:text-orange-500">Dismiss</button>
        </div>
      )}
      {confirmationsQuery.isError && (
        <div className="mb-4 rounded-md border border-red-500/30 px-4 py-3 text-[13px] text-red-500">
          {confirmationsQuery.error instanceof Error ? confirmationsQuery.error.message : "Failed to load delivery confirmations."}
          <button type="button" onClick={() => void confirmationsQuery.refetch()} className="ml-3 font-semibold underline">Retry</button>
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => void confirmationsQuery.refetch()}
          disabled={confirmationsQuery.isFetching}
          className="ml-auto inline-flex items-center gap-2 rounded-md border border-[var(--tech-border)] px-3 py-2 text-[12px] text-[var(--tech-text-secondary)] hover:text-orange-500 disabled:opacity-50"
        >
          <RefreshCw size={14} className={confirmationsQuery.isFetching ? "animate-spin" : ""} />
          {confirmationsQuery.isFetching && !confirmationsQuery.isPending ? "Updating..." : "Refresh"}
        </button>
      </div>
      <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[920px]">
              <div className="grid grid-cols-[minmax(175px,1.3fr)_minmax(170px,1.2fr)_minmax(165px,1.15fr)_minmax(205px,1.5fr)_minmax(165px,1.1fr)] items-center gap-3 border-b border-[var(--tech-border)] px-5 py-3">
                <Header>Order</Header>
                <Header>Mission</Header>
                <Header>Arrival hub</Header>
                <Header>Status</Header>
                <Header alignRight>Action</Header>
              </div>
              <div className="divide-y divide-[var(--tech-border)]">
                {visible.map((delivery) => {
                  const time = remainingUntil(delivery.pickupDeadlineAtIso, now);
                  const pending = delivery.status === "Delivered";
                  const blockConfirm = !delivery.backendOrderId || Boolean(time?.expired);
                  const submitting = confirmingOrderIds.includes(delivery.orderId);
                  return (
                    <div
                      key={`${delivery.orderId}:${delivery.missionId}`}
                      className="grid grid-cols-[minmax(175px,1.3fr)_minmax(170px,1.2fr)_minmax(165px,1.15fr)_minmax(205px,1.5fr)_minmax(165px,1.1fr)] items-center gap-3 px-5 py-4"
                    >
                      <div className="min-w-0">
                        <p className="break-words text-[13px] font-semibold text-[var(--tech-text)]">{delivery.orderCode}</p>
                        <p className="mt-1 text-[11px] text-[var(--tech-muted)]">{delivery.recipient}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="break-words text-[12px] text-[var(--tech-text-secondary)]">{delivery.missionCode || "—"}</p>
                      </div>
                      <span className="min-w-0 break-words text-[12px] text-[var(--tech-text-secondary)]">{delivery.destination}</span>
                      <div>
                        <StatusCell delivery={delivery} />
                      </div>
                      <div className="flex justify-end">
                        {pending ? (
                          <Button
                            type="button"
                            onClick={() => void handleConfirm(delivery)}
                            disabled={blockConfirm || submitting}
                            title={!delivery.backendOrderId
                              ? "Backend must provide order_id or an ORD-... code."
                              : time?.expired
                                ? "72-hour pickup window expired; waiting for Backend cancellation."
                                : "Confirm the recipient physically collected this parcel."}
                            className="h-9 shrink-0 rounded-md bg-orange-500 px-3 text-[12px] font-medium text-black hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <PackageCheck size={14} />
                            {submitting ? "Confirming..." : blockConfirm && !delivery.backendOrderId ? "Order ID required" : "Confirm received"}
                          </Button>
                        ) : delivery.status === "Completed" ? (
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-orange-500"><CheckCircle2 size={14} />Completed</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-red-500"><XCircle size={14} />Cancelled</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {visible.length === 0 && (
                  <div className="px-5 py-14 text-center text-[13px] text-[var(--tech-muted)]">
                    {confirmationsQuery.isPending
                      ? "Loading delivery confirmations..."
                      : confirmationsQuery.isError && !confirmationsQuery.data
                        ? "Unable to load delivery confirmations."
                        : "No delivery confirmations available."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
    </TechnicianPageShell>
  );
}
function StatusCell({ delivery }: { delivery: DeliveryConfirmation }) {
  if (delivery.status === "Completed") {
    return <div><p className="text-[12px] font-medium text-orange-500">Completed</p><p className="mt-1 text-[11px] text-[var(--tech-muted)]">{delivery.receivedConfirmedAt || "Pickup confirmed"}</p></div>;
  }
  if (delivery.status === "Cancelled") {
    return <div><p className="text-[12px] font-medium text-red-500">Cancelled</p><p className="mt-1 text-[11px] text-[var(--tech-muted)]">{delivery.cancelledAt || "—"}</p>{delivery.cancelReason && <p className="mt-1 text-[10px] text-[var(--tech-muted)]">{delivery.cancelReason}</p>}</div>;
  }
  return <p className="text-[12px] font-medium text-[var(--tech-text-secondary)]">Awaiting customer pickup</p>;
}
function Header({ children, alignRight = false }: { children: ReactNode; alignRight?: boolean }) {
  return <span className={`text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-subtle)] ${alignRight ? "text-right" : ""}`}>{children}</span>;
}
