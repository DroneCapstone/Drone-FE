import { HistoryDetailsButton, TechnicianHistoryDetails } from "../components/TechnicianHistoryDetails";
import { ProofActionDialog, OrderProofGallery } from "../components/TechnicianProofImage";
import { TechnicianLoadingState } from "../components/TechnicianLoadingState";
import {
  BatteryFull,
  Eye,
  History,
  PackageCheck,
  PlaneTakeoff,
  Search,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/shadcn/ui/button";
import { Card, CardContent } from "@/components/shadcn/ui/card";

import { TechnicianPageShell } from "../components/TechnicianPageShell";
import { TECHNICIAN_HUB } from "../utils/fleetStorage";
import {
  type OutboundDelivery,
} from "../utils/outboundDeliveryStorage";
import {
  useOutboundDeliveriesQuery,
  useOutboundHistoryQuery,
  useReceiveOutboundMutation,
  useOutboundDispatchMutation,
  useOutboundReadyMutation,
} from "../hooks/useOutboundQueries";
import { technicianQueryKeys } from "../hooks/queryKeys";
import { historyFromConfirmedDispatch, mergeOutboundHistoryRows, type OutboundHistoryViewRow } from "../api/outboundHistoryApi";
import type { OutboundDeliveryHistory } from "../utils/outboundDeliveryStorage";

type Status = OutboundDelivery["status"];
type ModeFilter = "ALL" | "EXPRESS" | "SCHEDULED";
type StatusFilter = "ALL" | Status;

// Share one responsive grid template between header and data rows.
// Each column grows proportionally to fill the full table width, instead of
// leaving an unused strip on the right when the viewport is wider than 1240px.
// Keep practical minimums for order codes, hub/mission names and action buttons.
const outboundTableGridTemplate = [
  "minmax(160px, 1.15fr)", // Order / Mode
  "minmax(125px, 0.9fr)",  // Package
  "minmax(155px, 1.05fr)", // Destination Hub
  "minmax(190px, 1.4fr)",  // Mission / Drone
  "minmax(225px, 1.65fr)", // Assigned Battery: keep long IDs fully visible
  "minmax(165px, 1.15fr)", // Status
  "minmax(155px, 1.1fr)",  // Action
].join(" ");

function display(value?: string | null): string {
  return value && value.trim() ? value.trim() : "—";
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function dateNumber(value?: string): number | null {
  if (!value) return null;
  const date = Date.parse(value);
  return Number.isFinite(date) ? date : null;
}

function maskedPhone(value?: string): string {
  if (!value) return "—";
  const digits = value.replace(/\s+/g, "");
  return digits.length > 4 ? `•••• ${digits.slice(-4)}` : "••••";
}

function readableStatus(value?: string): string {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function StatusLabel({ status, missionStatus, receivedAt }: { status: Status; missionStatus?: string; receivedAt?: string }) {
  const style: Record<Status, string> = {
    "Awaiting Drop-off": "text-[var(--tech-text-secondary)]",
    "At Hub": "text-[var(--tech-text-secondary)]",
    "Mission Assigned": "text-[var(--tech-text)]",
    "Ready": "text-orange-500",
    "Needs Review": "text-red-400",
  };

  return (
    <div className="min-w-0">
      <p className={`text-[12px] font-semibold ${style[status]}`}>
        {status === "Ready" ? "Ready · not departed" : status}
      </p>
      {missionStatus && (
        <p className="mt-1 truncate text-[11px] text-[var(--tech-muted)]" title={missionStatus}>
          Mission: {readableStatus(missionStatus)}
        </p>
      )}
      {receivedAt && status !== "Awaiting Drop-off" && (
        <p className="mt-1 truncate text-[11px] text-[var(--tech-muted)]" title={`Received at hub: ${formatDate(receivedAt)}`}>
          Received: {formatDate(receivedAt)}
        </p>
      )}
    </div>
  );
}

function Header({ children, alignRight = false }: { children: ReactNode; alignRight?: boolean }) {
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--tech-subtle)] ${alignRight ? "text-right" : ""}`}>
      {children}
    </span>
  );
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-[var(--tech-muted)]">{label}</p>
      <div className="mt-1 break-words text-[13px] font-medium text-[var(--tech-text-secondary)]">
        {value}
      </div>
    </div>
  );
}

/** A Scheduled mission is allowed to reach READY through the dedicated API.
 * Do not mistake mission.status=Scheduled for mission.handling_status=READY.
 */
function normalizedState(raw?: string) {
  return (raw ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function isInitialDispatchCandidate(delivery: OutboundDelivery): boolean {
  if (delivery.prematureMissionAssignment) return false;
  if (delivery.status !== "Mission Assigned" && delivery.status !== "Ready") return false;
  const missionState = normalizedState(delivery.missionStatus);
  if (missionState !== "SCHEDULED" && missionState !== "READY") return false;
  return Boolean(delivery.backendMissionId && delivery.assignedDroneId && delivery.installedBatteryId);
}

function isBackendReady(delivery: OutboundDelivery): boolean {
  return normalizedState(delivery.handlingStatus) === "READY";
}

export function OutboundDeliveriesPage() {
  const queryClient = useQueryClient();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDetailId, setHistoryDetailId] = useState<string | null>(null);
  const outboundQuery = useOutboundDeliveriesQuery();
  const historyQuery = useOutboundHistoryQuery(historyOpen);
  const receiveMutation = useReceiveOutboundMutation();
  const outboundDispatchMutation = useOutboundDispatchMutation();
  const outboundReadyMutation = useOutboundReadyMutation();

  const deliveries: OutboundDelivery[] = outboundQuery.data ?? [];
  const history = (historyQuery.data ?? []) as OutboundHistoryViewRow[];
  const historyDetail = history.find(row => row.id === historyDetailId);
  const closeHistory = () => { setHistoryDetailId(null); setHistoryOpen(false); };

  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  // Track each Receive request independently: other rows stay interactive.
  // The ref prevents duplicate clicks on the same order before React rerenders.
  const receivingOrdersRef = useRef<Set<string>>(new Set());
  const [receivingOrderIds, setReceivingOrderIds] = useState<string[]>([]);
  const [dispatchingMissionId, setDispatchingMissionId] = useState<string | null>(null);
  const [dispatchConfirmOrderId, setDispatchConfirmOrderId] = useState<string | null>(null);
  const [receiveProofOrderId, setReceiveProofOrderId] = useState<string | null>(null);
  // Keep evidence of a successful READY POST if a following Dispatch fails.
  // On remount the API GET handling_status=READY also provides this evidence.
  const [readyConfirmedIds, setReadyConfirmedIds] = useState<string[]>([]);
  // Prevent double-dispatch after a successful POST while BE data propagates.
  const [acceptedDispatchIds, setAcceptedDispatchIds] = useState<string[]>([]);
  const [backendReceivedIds, setBackendReceivedIds] = useState<string[]>([]);
  useEffect(() => {
    // Operator assignment is authoritative only after Backend confirms it.
    // Refresh Outbound instead of inserting a client-only drone or battery assignment.
    const onOperatorAssigned = () => {
      void queryClient.invalidateQueries({ queryKey: technicianQueryKeys.outbound() });
    };
    window.addEventListener("operator-outbound-assigned", onOperatorAssigned);
    return () => window.removeEventListener("operator-outbound-assigned", onOperatorAssigned);
  }, [queryClient]);

  const normalizedDeliveries = useMemo(() => deliveries.map((delivery) =>
    backendReceivedIds.includes(delivery.orderId) && delivery.status === "Awaiting Drop-off"
      ? { ...delivery, status: "At Hub" as const }
      : delivery,
  ), [deliveries, backendReceivedIds]);

  const filteredDeliveries = useMemo(() => {
    const term = search.trim().toLowerCase();
    return normalizedDeliveries.filter((delivery) => {
      if (modeFilter !== "ALL" && delivery.deliveryMode !== modeFilter) return false;
      if (statusFilter !== "ALL" && delivery.status !== statusFilter) return false;
      if (!term) return true;
      return [
        delivery.orderCode,
        delivery.orderId,
        delivery.packageName,
        delivery.packageType,
        delivery.destination,
        delivery.deliveryMode,
        delivery.missionCode,
        delivery.missionId,
        delivery.assignedDroneId,
        delivery.assignedDroneCode,
      ].some((field) => field?.toLowerCase().includes(term));
    }).sort((a, b) => {
      // Technician prioritizes parcels not yet received; Operator owns SLA/deadlines.
      const statusPriority: Record<Status, number> = {
        "Awaiting Drop-off": 0,
        "Needs Review": 1,
        "At Hub": 2,
        "Mission Assigned": 3,
        "Ready": 4,
      };
      const byStatus = statusPriority[a.status] - statusPriority[b.status];
      if (byStatus) return byStatus;
      // Within a workflow stage, newest paid orders come first.
      return (dateNumber(b.createdAt) ?? 0) - (dateNumber(a.createdAt) ?? 0);
    });
  }, [normalizedDeliveries, search, modeFilter, statusFilter]);

  const selectedDelivery = normalizedDeliveries.find((item) => item.orderId === detailOrderId);
  const hubLabel = [deliveries[0]?.hub, history[0]?.hub, TECHNICIAN_HUB]
    .find((item) => item && item !== "—") ?? "the assigned hub";

  const awaitingCount = normalizedDeliveries.filter((item) => item.status === "Awaiting Drop-off").length;
  const atHubCount = normalizedDeliveries.filter((item) => item.status === "At Hub").length;
  const assignedCount = normalizedDeliveries.filter((item) => item.status === "Mission Assigned").length;
  const readyCount = normalizedDeliveries.filter((item) => item.status === "Ready").length;

  const handleReceiveAtHub = async (orderId: string, proofImageUrl: string) => {
    const delivery = normalizedDeliveries.find((item) => item.orderId === orderId);
    if (!delivery || delivery.status !== "Awaiting Drop-off" || receivingOrdersRef.current.has(orderId)) return;

    receivingOrdersRef.current.add(orderId);
    setReceivingOrderIds((current) => [...current, orderId]);
    setActionMessage("");
    try {
      await receiveMutation.mutateAsync({ orderId, proofImageUrl });
      setBackendReceivedIds((items) => items.includes(orderId) ? items : [...items, orderId]);
      setActionMessage("Package received at hub. Outbound information has been refreshed from Backend.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to receive this package.";
      const alreadyReceived = /AT[_\s-]*HUB|already received|đã nhận hàng/i.test(message);
      if (alreadyReceived) {
        setBackendReceivedIds((items) => items.includes(orderId) ? items : [...items, orderId]);
      }
      try { await outboundQuery.refetch(); } catch { /* Display original backend error. */ }
      if (alreadyReceived) {
        setActionMessage("Backend confirms this package is already at hub (AT_HUB). Receive has been disabled to prevent duplicate receipt.");
      } else if (/not found|\b404\b/i.test(message)) {
        setActionMessage(`Backend returned 404 for order_id ${orderId}. FE sent the canonical order_id; Backend must verify the Orders lookup and the Technician's origin hub access.`);
      } else {
        setActionMessage(message);
      }
    } finally {
      receivingOrdersRef.current.delete(orderId);
      setReceivingOrderIds((current) => current.filter((id) => id !== orderId));
    }
  };

  const dispatchCandidate = normalizedDeliveries.find(
    (delivery) => delivery.orderId === dispatchConfirmOrderId,
  );

  const handleInitialDispatch = async (delivery: OutboundDelivery, proofImageUrl: string) => {
    const missionId = delivery.backendMissionId;
    if (!missionId || !isInitialDispatchCandidate(delivery) ||
        dispatchingMissionId !== null || outboundReadyMutation.isPending ||
        outboundDispatchMutation.isPending || acceptedDispatchIds.includes(missionId)) return;

    setDispatchingMissionId(missionId);
    setActionMessage("");
    setDispatchConfirmOrderId(null);
    let readyConfirmedThisAttempt = isBackendReady(delivery) || readyConfirmedIds.includes(missionId);
    try {
      const readyAlreadyConfirmed = readyConfirmedThisAttempt;
      if (!readyAlreadyConfirmed) {
        // Only send Dispatch after the READY request actually succeeds.
        await outboundReadyMutation.mutateAsync(missionId);
        readyConfirmedThisAttempt = true;
        setReadyConfirmedIds((ids) => ids.includes(missionId) ? ids : [...ids, missionId]);
      }

      // BE has confirmed this endpoint supports the initial Origin departure.
      const dispatchResult = await outboundDispatchMutation.mutateAsync({ missionId, proofImageUrl });
      // The POST response already confirms the actual departure at the origin.
      // Add only this BE-confirmed event; do not fabricate client-side times.
      const confirmed = historyFromConfirmedDispatch(delivery, dispatchResult);
      if (confirmed) {
        queryClient.setQueryData<OutboundDeliveryHistory[]>(
          [...technicianQueryKeys.outbound(), "history"],
          (existing) => mergeOutboundHistoryRows(existing ?? [], [confirmed]),
        );
        // setQueryData marks history fresh; invalidate again so opening history
        // retrieves the actual server proof instead of only the local receipt.
        void queryClient.invalidateQueries({ queryKey: [...technicianQueryKeys.outbound(), "history"], refetchType: "active" });
      }
      setAcceptedDispatchIds((ids) => ids.includes(missionId) ? ids : [...ids, missionId]);
      setActionMessage("Dispatch accepted by Backend. Mission is starting; Hub Fleet and Battery Management are refreshing from the server.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start the mission.";
      setActionMessage(
        readyConfirmedThisAttempt
          ? `Dispatch was not completed: ${message}. If READY was accepted, retry will skip the Ready request.`
          : `Ready/Dispatch failed: ${message}`,
      );
      // If READY succeeded but Dispatch failed, GET will show READY for retries.
      void outboundQuery.refetch();
    } finally {
      setDispatchingMissionId(null);
    }
  };

  return (
    <TechnicianPageShell
      title="Outbound deliveries"
      description={``}
    >
      {outboundQuery.error instanceof Error && (
        <div className="mb-4 rounded-md border border-red-500/30 px-4 py-3 text-[12px] text-red-400">
          {outboundQuery.error.message}
        </div>
      )}

      {actionMessage && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-md border border-orange-500/25 px-4 py-3">
          <p className="text-[12px] leading-5 text-[var(--tech-text-secondary)]">{actionMessage}</p>
          <button type="button" onClick={() => setActionMessage("")} className="shrink-0 text-[11px] text-[var(--tech-muted)] hover:text-orange-500">Dismiss</button>
        </div>
      )}

      <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
        <CardContent className="border-b border-[var(--tech-border)] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[var(--tech-muted)]">
              <span><strong className="font-semibold text-[var(--tech-text)]">{outboundQuery.data === undefined ? "—" : normalizedDeliveries.length}</strong> total</span>
              <span><strong className="font-semibold text-[var(--tech-text-secondary)]">{outboundQuery.data === undefined ? "—" : awaitingCount}</strong> awaiting</span>
              <span><strong className="font-semibold text-[var(--tech-text-secondary)]">{outboundQuery.data === undefined ? "—" : atHubCount}</strong> at hub</span>
              <span><strong className="font-semibold text-[var(--tech-text-secondary)]">{outboundQuery.data === undefined ? "—" : assignedCount}</strong> assigned</span>
              <span><strong className="font-semibold text-orange-500">{outboundQuery.data === undefined ? "—" : readyCount}</strong> ready</span>
            </div>
            <button type="button" onClick={() => {
              setHistoryOpen(true);
              // An old cached [] must not suppress a new attempt to load
              // history. Successful nonempty caches still reopen instantly.
              if (historyQuery.data?.length === 0 && !historyQuery.isFetching) {
                void historyQuery.refetch();
              }
            }} className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--tech-border)] px-3 text-[12px] font-medium text-[var(--tech-text-secondary)] hover:border-orange-500/50 hover:text-orange-500">
              <History size={14} /> View history
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <label className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tech-muted)]" size={15} />
              <input
                aria-label="Search outbound orders"
                placeholder="Search order, mission, package or hub..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="tech-control h-10 w-full rounded-md pl-9 pr-3 text-[12px]"
              />
            </label>
            <select aria-label="Filter by delivery mode" value={modeFilter} onChange={(event) => setModeFilter(event.target.value as ModeFilter)} className="tech-control h-10 min-w-[145px] rounded-md px-3 text-[12px]">
              <option value="ALL">All modes</option>
              <option value="EXPRESS">Express</option>
              <option value="SCHEDULED">Scheduled</option>
            </select>
            <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="tech-control h-10 min-w-[180px] rounded-md px-3 text-[12px]">
              <option value="ALL">All statuses</option>
              <option value="Awaiting Drop-off">Awaiting Drop-off</option>
              <option value="At Hub">At Hub</option>
              <option value="Mission Assigned">Mission Assigned</option>
              <option value="Ready">Ready</option>
              <option value="Needs Review">Needs Review</option>
            </select>
          </div>
        </CardContent>

        <div className="overflow-x-auto">
          <div className="w-full min-w-[1320px]">
            <div
              className="grid items-center gap-4 border-b border-[var(--tech-border)] px-5 py-3"
              style={{ gridTemplateColumns: outboundTableGridTemplate }}
            >
              <Header>Order / Mode</Header>
              <Header>Package</Header>
              <Header>Destination Hub</Header>
              <Header>Mission / Drone</Header>
              <Header>Assigned Battery</Header>
              <Header>Status</Header>
              <Header alignRight>Action</Header>
            </div>
            <div className="divide-y divide-[var(--tech-border)]">
              {filteredDeliveries.map((delivery) => (
                <div
                  key={delivery.orderId}
                  className="grid items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.025]"
                  style={{ gridTemplateColumns: outboundTableGridTemplate }}
                >
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setDetailOrderId(delivery.orderId)}
                      className="block max-w-full break-all text-left text-[12px] font-semibold text-[var(--tech-text)] hover:text-orange-500"
                      title="View order details"
                    >
                      {display(delivery.orderCode ?? delivery.orderId)}
                    </button>
                    <p className={`mt-1 text-[11px] font-medium ${delivery.deliveryMode === "EXPRESS" ? "text-orange-500" : "text-[var(--tech-muted)]"}`}>
                      {delivery.deliveryMode === "EXPRESS" ? "Express" : delivery.deliveryMode === "SCHEDULED" ? "Scheduled" : display(delivery.deliveryMode).toUpperCase() === "NORMAL" ? "Normal" : display(delivery.deliveryMode)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-[var(--tech-text-secondary)]" title={delivery.packageName}>
                      {display(delivery.packageName)}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-[var(--tech-muted)]">
                      {delivery.weightProvided ? `${delivery.weightKg} kg` : "—"}
                    </p>
                  </div>
                  <p className="truncate text-[12px] text-[var(--tech-text-secondary)]" title={delivery.destination}>
                    {display(delivery.destination)}
                  </p>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-[var(--tech-text-secondary)]" title={delivery.missionCode ?? delivery.missionId ?? ""}>
                      {delivery.prematureMissionAssignment
                        ? "—"
                        : display(delivery.missionCode ?? delivery.missionId)}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-[var(--tech-muted)]" title={delivery.assignedDroneId ?? ""}>
                      {delivery.prematureMissionAssignment
                        ? "Awaiting package receipt"
                        : delivery.assignedDroneId || "Drone not assigned"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    {delivery.installedBatteryId ? (
                      <div className="flex items-center gap-2">
                        <BatteryFull className="shrink-0 text-orange-500" size={14} />
                        <div className="min-w-0">
                          <p className="break-all whitespace-normal text-[12px] font-semibold leading-5 text-orange-500" title={delivery.installedBatteryId}>{delivery.installedBatteryId}</p>
                          {delivery.assignedBatteryCode && delivery.assignedBatteryCode !== delivery.installedBatteryId && (
                            <p className="mt-1 break-all whitespace-normal text-[10px] text-[var(--tech-muted)]" title={delivery.assignedBatteryCode}>SN: {delivery.assignedBatteryCode}</p>
                          )}
                          {delivery.batteryChargePct !== undefined && (
                            <p className="mt-1 text-[11px] text-[var(--tech-muted)]">{delivery.batteryChargePct}%</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[12px] text-[var(--tech-muted)]">—</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <StatusLabel status={delivery.status} missionStatus={delivery.prematureMissionAssignment ? undefined : delivery.missionStatus} receivedAt={delivery.packageReceivedAt} />
                    {delivery.prematureMissionAssignment && (
                      <p className="mt-1 text-[10px] text-orange-500" title="Backend assigned a mission before Technician received the package. Needs Backend review.">
                        Early mission in Backend
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {delivery.status === "Awaiting Drop-off" && (
                      <Button
                        type="button"
                        disabled={receivingOrderIds.includes(delivery.orderId)}
                        onClick={() => setReceiveProofOrderId(delivery.orderId)}
                        className="h-9 rounded-md bg-orange-500 px-2.5 text-[11px] font-semibold text-black hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <PackageCheck size={13} />
                        {receivingOrderIds.includes(delivery.orderId) ? "Receiving..." : "Receive at hub"}
                      </Button>
                    )}
                    {delivery.status === "At Hub" && (
                      <span className="text-right text-[11px] text-[var(--tech-muted)]">
                        {delivery.missionId ? "Awaiting drone assignment" : "Awaiting Operator"}
                      </span>
                    )}
                    {(delivery.status === "Mission Assigned" || delivery.status === "Ready") && (
                      <div className="flex max-w-[168px] flex-col items-end gap-1">
                        {delivery.backendMissionId && acceptedDispatchIds.includes(delivery.backendMissionId) ? (
                          <span className="text-right text-[11px] text-orange-500">Dispatch accepted · Syncing</span>
                        ) : (
                          <>
                            <Button
                              type="button"
                              disabled={!isInitialDispatchCandidate(delivery) ||
                                outboundReadyMutation.isPending || outboundDispatchMutation.isPending ||
                                dispatchingMissionId !== null}
                              title={isInitialDispatchCandidate(delivery)
                                ? "Confirm the Operator-assigned drone and battery before departure."
                                : "Mission must be Scheduled/Ready with a valid mission ID, drone ID and battery ID."}
                              onClick={() => {
                                if (isInitialDispatchCandidate(delivery)) {
                                  setActionMessage("");
                                  setDispatchConfirmOrderId(delivery.orderId);
                                }
                              }}
                              className="h-9 rounded-md bg-orange-500 px-3 text-[11px] font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <PlaneTakeoff size={13} />
                              {dispatchingMissionId === delivery.backendMissionId ? "Dispatching..." : "Dispatch"}
                            </Button>
                            {!isInitialDispatchCandidate(delivery) && (
                              <span className="text-right text-[10px] text-[var(--tech-muted)]">
                                {!delivery.installedBatteryId
                                  ? "Awaiting Operator battery"
                                  : !delivery.assignedDroneId || !delivery.backendMissionId
                                    ? "Verify mission & drone ID"
                                    : "Mission not eligible for dispatch"}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    {delivery.status === "Needs Review" && (
                      <span className="text-right text-[11px] text-[var(--tech-muted)]">Check order status</span>
                    )}
                    <button
                      type="button"
                      aria-label={`View details for ${delivery.orderCode ?? delivery.orderId}`}
                      title="View details"
                      onClick={() => setDetailOrderId(delivery.orderId)}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--tech-border)] text-[var(--tech-muted)] hover:border-orange-500/50 hover:text-orange-500"
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {outboundQuery.isPending && (
                <TechnicianLoadingState label="Loading outbound deliveries..." />
              )}
              {!outboundQuery.isPending && filteredDeliveries.length === 0 && (
                <div className="px-6 py-14 text-center text-[13px] text-[var(--tech-muted)]">
                  {outboundQuery.isError && !outboundQuery.data ? "Unable to load outbound deliveries." : normalizedDeliveries.length === 0 ? "No outbound deliveries available." : "No orders match these filters."}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {receiveProofOrderId && (
        <ProofActionDialog key={`receive:${receiveProofOrderId}`} title="Receive at hub" reference={receiveProofOrderId}
          description="Attach a photo of the parcel received from the customer." confirmLabel="Confirm receipt"
          disabled={!normalizedDeliveries.some(item => item.orderId === receiveProofOrderId && item.status === "Awaiting Drop-off") || receivingOrderIds.includes(receiveProofOrderId)}
          onCancel={() => setReceiveProofOrderId(null)} onConfirm={image => { const id = receiveProofOrderId; setReceiveProofOrderId(null); void handleReceiveAtHub(id, image); }} />
      )}
      {dispatchCandidate && (
        <ProofActionDialog key={JSON.stringify(["dispatch", dispatchCandidate.orderId, dispatchCandidate.backendMissionId, dispatchCandidate.assignedDroneId, dispatchCandidate.installedBatteryId])} title="Confirm dispatch"
          reference={display(dispatchCandidate.backendMissionId)} description="Check the assigned battery and pre-flight inspection. Attach a photo of the drone and loaded parcel before departure."
          confirmLabel="Confirm dispatch" disabled={!isInitialDispatchCandidate(dispatchCandidate) || dispatchingMissionId !== null || outboundReadyMutation.isPending || outboundDispatchMutation.isPending}
          onCancel={() => setDispatchConfirmOrderId(null)} onConfirm={image => { setDispatchConfirmOrderId(null); void handleInitialDispatch(dispatchCandidate, image); }}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailField label="Order" value={display(dispatchCandidate.orderCode ?? dispatchCandidate.orderId)} />
            <DetailField label="Drone ID" value={display(dispatchCandidate.assignedDroneId)} />
            <DetailField label="Assigned battery" value={display(dispatchCandidate.installedBatteryId)} />
          </div>
        </ProofActionDialog>
      )}

      {selectedDelivery && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setDetailOrderId(null);
        }}>
          <div role="dialog" aria-modal="true" aria-label="Outbound order details" className="flex max-h-[88vh] w-full max-w-[720px] flex-col overflow-hidden rounded-xl border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--tech-border)] px-6 py-5">
              <div>
                <h2 className="break-all text-[19px] font-semibold text-[var(--tech-text)]">{display(selectedDelivery.orderCode ?? selectedDelivery.orderId)}</h2>
                <p className="mt-1 text-[12px] text-[var(--tech-muted)]">Outbound order details · {display(selectedDelivery.deliveryMode)}</p>
              </div>
              <button type="button" aria-label="Close order details" onClick={() => setDetailOrderId(null)} className="rounded-md p-1.5 text-[var(--tech-muted)] hover:text-orange-500"><X size={18} /></button>
            </div>
            <div className="min-h-0 space-y-6 overflow-y-auto px-6 py-5">
              <section>
                <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--tech-text)]">Receiving timeline</h3>
                <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
                  <DetailField label="Order created at" value={formatDate(selectedDelivery.createdAt)} />
                  <DetailField label="Payment completed at" value={formatDate(selectedDelivery.paidAt)} />
                  <DetailField
                    label="Received at hub"
                    value={selectedDelivery.packageReceivedAt
                      ? formatDate(selectedDelivery.packageReceivedAt)
                      : selectedDelivery.status === "Awaiting Drop-off"
                        ? "Not received yet"
                        : "Time not provided by Backend"}
                  />
                  <DetailField label="Receiving status" value={<StatusLabel status={selectedDelivery.status} />} />
                </div>
              </section>
              <div className="border-t border-[var(--tech-border)]" />
              <section>
                <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--tech-text)]">Package &amp; hub</h3>
                <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
                  <DetailField label="Package label" value={display(selectedDelivery.packageName)} />
                  <DetailField label="Package weight" value={selectedDelivery.weightProvided ? `${selectedDelivery.weightKg} kg` : "—"} />
                  <DetailField label="Origin hub" value={display(selectedDelivery.hub)} />
                  <DetailField label="Destination hub" value={display(selectedDelivery.destination)} />
                  <DetailField label="Receiver phone" value={maskedPhone(selectedDelivery.receiverPhone)} />
                </div>
              </section>
              <div className="border-t border-[var(--tech-border)]" />
              <section>
                <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--tech-text)]">Mission &amp; preparation</h3>
                <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
                  <DetailField label="Order status (Backend)" value={readableStatus(selectedDelivery.orderStatus)} />
                  <DetailField label="Handling status (Backend)" value={readableStatus(selectedDelivery.handlingStatus)} />
                  {selectedDelivery.prematureMissionAssignment && (
                    <p className="col-span-full rounded-md border border-orange-500/30 p-3 text-[12px] text-orange-500">
                      Backend has already scheduled a mission before this order was received at the hub.
                      This violates the agreed workflow and requires Backend correction; the table hides this
                      premature assignment, but the raw mission is retained here for diagnosis.
                    </p>
                  )}
                  <DetailField label="Mission (Backend)" value={display(selectedDelivery.missionCode ?? selectedDelivery.missionId)} />
                  <DetailField label="Mission state" value={readableStatus(selectedDelivery.missionStatus)} />
                  <DetailField label="Drone ID" value={display(selectedDelivery.assignedDroneId)} />
                  <DetailField label="Assigned battery" value={selectedDelivery.installedBatteryId ? `${selectedDelivery.installedBatteryId}${selectedDelivery.batteryChargePct !== undefined ? ` · ${selectedDelivery.batteryChargePct}%` : ""}${selectedDelivery.batteryStatus ? ` · ${selectedDelivery.batteryStatus}` : ""}` : "Not assigned"} />
                  <DetailField label="Battery serial / code" value={display(selectedDelivery.assignedBatteryCode)} />
                </div>
              </section>
              <OrderProofGallery images={selectedDelivery.proofImages} />
            </div>
            <div className="flex justify-end border-t border-[var(--tech-border)] px-6 py-4">
              <Button type="button" onClick={() => setDetailOrderId(null)} className="h-9 rounded-md border border-[var(--tech-border)] bg-transparent px-4 text-[12px] text-[var(--tech-text-secondary)] hover:bg-white/5">Close</Button>
            </div>
          </div>
        </div>
      )}

      {historyOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 px-4 py-6" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeHistory();
        }}>
          <div role="dialog" aria-modal="true" aria-label="Outbound history" className="flex max-h-[82vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-xl border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--tech-border)] px-6 py-5">
              <div>
                <h2 className="text-[19px] font-semibold text-[var(--tech-text)]">Outbound history</h2>
              </div>
              <button type="button" aria-label="Close outbound history" onClick={closeHistory} className="rounded-md p-1.5 text-[var(--tech-muted)] hover:text-orange-500"><X size={18} /></button>
            </div>
            {historyQuery.isError && (
              <div className="mx-6 mt-4 flex items-start justify-between gap-3 rounded-md border border-red-500/30 px-4 py-3 text-[12px] text-red-400">
                <span>{historyQuery.error instanceof Error ? historyQuery.error.message : "Unable to retrieve history from Backend."}</span>
                <button type="button" className="shrink-0 font-semibold underline" onClick={() => void historyQuery.refetch()}>Retry</button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-auto">
              <div className="min-w-[1510px]">
                <div className="sticky top-0 z-10 grid grid-cols-[175px_170px_145px_145px_125px_135px_165px_175px_100px] gap-4 border-b border-[var(--tech-border)] bg-[var(--tech-surface)] px-6 py-3">
                  <Header>Order</Header><Header>Mission</Header><Header>Drone</Header><Header>Battery</Header><Header>Origin Hub</Header><Header>Destination Hub</Header><Header>Customer Drop-off</Header><Header>Drone Departed</Header><Header>Action</Header>
                </div>
                {history.length ? history.map((item) => (
                  <div key={item.id} className="grid grid-cols-[175px_170px_145px_145px_125px_135px_165px_175px_100px] items-center gap-4 border-b border-[var(--tech-border)] px-6 py-4 text-[12px] text-[var(--tech-text-secondary)]">
                    <div className="min-w-0">
                      <p className="break-all font-semibold">{display(item.orderId)}</p>
                      {item.receiverName && <p className="mt-1 truncate text-[11px] text-[var(--tech-muted)]" title={item.receiverName}>Receiver: {item.receiverName}</p>}
                    </div>
                    <span className="break-all">{display(item.missionId)}</span>
                    <div className="min-w-0">
                      <p className="truncate font-medium" title={item.droneId}>{display(item.droneId)}</p>
                      {item.droneCode && item.droneCode !== item.droneId && <p className="mt-1 truncate text-[11px] text-[var(--tech-muted)]" title={item.droneCode}>{item.droneCode}</p>}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-orange-500" title={item.batteryId}>{display(item.batteryId)}</p>
                    </div>
                    <span className="truncate" title={item.hub}>{display(item.hub)}</span>
                    <span className="truncate" title={item.destination}>{display(item.destination)}</span>
                    <span>{formatDate(item.customerDropoffAt)}</span>
                    <span>{formatDate(item.departedAt)}</span>
                    <div><HistoryDetailsButton onClick={() => setHistoryDetailId(item.id)} /></div>
                  </div>
                )) : (
                  <div className={historyQuery.isPending ? "" : "px-6 py-14 text-center text-[13px] text-[var(--tech-muted)]"}>
                    {historyQuery.isPending
                      ? <TechnicianLoadingState label="Loading outbound history..." />
                      : historyQuery.isError
                        ? "Unable to load outbound history."
                        : "No outbound mission history found."}
                    
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {historyOpen && historyDetail && <TechnicianHistoryDetails key={historyDetail.id} title="Outbound delivery details" record={historyDetail} onClose={() => setHistoryDetailId(null)} fields={[
        { label: "Order ID", value: historyDetail.orderId }, { label: "Mission ID", value: historyDetail.missionId },
        { label: "Receiver", value: historyDetail.receiverName }, { label: "Drone ID", value: historyDetail.droneId },
        { label: "Battery ID", value: historyDetail.batteryId }, { label: "Origin hub", value: historyDetail.hub },
        { label: "Destination hub", value: historyDetail.destination }, { label: "Customer drop-off", value: formatDate(historyDetail.customerDropoffAt) },
        { label: "Drone departed", value: formatDate(historyDetail.departedAt) },
      ]} />}
    </TechnicianPageShell>
  );
}
