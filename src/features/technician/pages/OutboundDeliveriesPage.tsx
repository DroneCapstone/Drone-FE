import {
  BatteryFull,
  ChevronDown,
  Check,
  Eye,
  History,
  PackageCheck,
  Search,
  X,
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/shadcn/ui/button";
import { Card, CardContent } from "@/components/shadcn/ui/card";

import { TechnicianPageShell } from "../components/TechnicianPageShell";
import { TECHNICIAN_HUB } from "../utils/fleetStorage";
import {
  applyOperatorMissionAssignment,
  loadOutboundDeliveries,
  type OperatorAssignmentPayload,
  type OutboundDelivery,
} from "../utils/outboundDeliveryStorage";
import {
  useOutboundDeliveriesQuery,
  useOutboundHistoryQuery,
  usePrepareOutboundBatteryMutation,
  useReceiveOutboundMutation,
} from "../hooks/useOutboundQueries";
import { technicianQueryKeys } from "../hooks/queryKeys";
import { useBatteriesQuery, useBatteryMutation } from "../hooks/useBatteryQueries";
import { type HubBattery } from "../utils/batteryStorage";

type Status = OutboundDelivery["status"];
type ModeFilter = "ALL" | "EXPRESS" | "SCHEDULED";
type StatusFilter = "ALL" | Status;

// Share one responsive grid template between header and data rows.
// Each column grows proportionally to fill the full table width, instead of
// leaving an unused strip on the right when the viewport is wider than 1240px.
// Keep practical minimums for order codes, hub/mission names and action buttons.
const outboundTableGridTemplate = [
  "minmax(145px, 1.15fr)", // Order / Mode
  "minmax(135px, 1.05fr)", // Package
  "minmax(185px, 1.5fr)",  // Destination Hub
  "minmax(200px, 1.65fr)", // Mission / Drone
  "minmax(105px, 0.85fr)", // Battery
  "minmax(170px, 1.25fr)", // Status
  "minmax(175px, 1.4fr)",  // Action
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

/**
 * Never guess battery/drone fit from numeric suffixes or charge alone.
 * Prefer explicit Backend compatibility; exact model-code/name matching
 * is supported for installations where Backend uses a common model label.
 */
function normalizedModel(value?: string): string {
  return (value ?? "").trim().toLowerCase().replace(/\\s+/g, " ");
}

function targetDroneModel(delivery: OutboundDelivery): string {
  const explicit = delivery.assignedDroneModel?.trim();
  if (explicit) return explicit;

  // The outbound API may return "DJI FlyCart 15 Heavy - Unit H01-09".
  // Remove only its unit suffix, never the actual model name.
  return (delivery.assignedDroneCode ?? "")
    .replace(/\\s*[-–]\\s*unit\\b.*$/i, "")
    .trim();
}

function isVerifiedForDrone(battery: HubBattery, delivery: OutboundDelivery): boolean {
  const model = normalizedModel(targetDroneModel(delivery));
  if (!model) return false;

  const explicit = battery.compatibleDroneModels ?? [];
  if (explicit.length > 0) {
    return explicit.some((item) => normalizedModel(item) === model);
  }
  // Only if both database fields actually contain the same model label.
  return Boolean(battery.model) && normalizedModel(battery.model) === model;
}

function isReadyAndFullyCharged(battery: HubBattery): boolean {
  const unavailable = /^(IN_USE|INSTALLED|ASSIGNED|RESERVED|MAINTENANCE|CHARGING)$/i
    .test(battery.backendStatus ?? "");
  return Boolean(battery.backendId) &&
    battery.status === "Ready" &&
    battery.chargeReportedByBackend === true &&
    battery.chargeLevelPct >= 100 &&
    !battery.droneId &&
    !unavailable;
}

type PickerPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

export function OutboundDeliveriesPage() {
  const queryClient = useQueryClient();
  const outboundQuery = useOutboundDeliveriesQuery();
  const historyQuery = useOutboundHistoryQuery();
  const receiveMutation = useReceiveOutboundMutation();
  const batteriesQuery = useBatteriesQuery();
  const assignBatteryMutation = useBatteryMutation();

  const deliveries: OutboundDelivery[] = outboundQuery.data ?? [];
  const history = historyQuery.data ?? [];

  const [historyOpen, setHistoryOpen] = useState(false);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [receivingOrderId, setReceivingOrderId] = useState<string | null>(null);
  const [backendReceivedIds, setBackendReceivedIds] = useState<string[]>([]);
  const [batteryPickerOrderId, setBatteryPickerOrderId] = useState<string | null>(null);
  const [pickerPosition, setPickerPosition] = useState<PickerPosition | null>(null);
  // This menu is rendered through createPortal(document.body) so it does not
  // inherit the Technician layout's scoped CSS custom properties. Copy the
  // computed palette from the orange trigger before opening the menu.
  const [pickerTheme, setPickerTheme] = useState<Record<string, string>>({
    "--tech-surface": "#ffffff",
    "--tech-text": "#18181b",
    "--tech-text-secondary": "#3f3f46",
    "--tech-muted": "#71717a",
    "--tech-border": "#e4e4e7",
  });
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  // A successful battery-use request is not the same as Ready/dispatch.
  const [batteryAssignmentAwaitingReadiness, setBatteryAssignmentAwaitingReadiness] =
    useState<Record<string, string>>({});
  const pickerButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const pickerPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onOperatorAssigned = (event: Event) => {
      const detail = (event as CustomEvent<OperatorAssignmentPayload>).detail;
      if (!detail) return;
      applyOperatorMissionAssignment(detail);
      queryClient.setQueryData(
        technicianQueryKeys.outbound(),
        loadOutboundDeliveries(),
      );
    };
    window.addEventListener("operator-outbound-assigned", onOperatorAssigned);
    return () => window.removeEventListener("operator-outbound-assigned", onOperatorAssigned);
  }, [queryClient]);

  const normalizedDeliveries = useMemo(() => deliveries.map((delivery) =>
    backendReceivedIds.includes(delivery.orderId) && delivery.status === "Awaiting Drop-off"
      ? { ...delivery, status: "At Hub" as const }
      : delivery,
  ), [deliveries, backendReceivedIds]);

  useEffect(() => {
    // Clear local acknowledgement when Backend begins reporting the battery
    // or transitions the order away from Mission Assigned.
    setBatteryAssignmentAwaitingReadiness((current) => {
      const entries = Object.entries(current).filter(([orderId]) =>
        normalizedDeliveries.some((item) =>
          item.orderId === orderId &&
          item.status === "Mission Assigned" &&
          !item.installedBatteryId,
        ),
      );
      if (entries.length === Object.keys(current).length) return current;
      return Object.fromEntries(entries);
    });
  }, [normalizedDeliveries]);

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
  const batteryPickerDelivery = normalizedDeliveries.find(
    (item) => item.orderId === batteryPickerOrderId,
  );

  const fullyChargedBatteries = useMemo(
    () => (batteriesQuery.data ?? []).filter(isReadyAndFullyCharged),
    [batteriesQuery.data],
  );

  const compatibleBatteries = useMemo(
    () => batteryPickerDelivery
      ? fullyChargedBatteries.filter((battery) =>
        isVerifiedForDrone(battery, batteryPickerDelivery),
      )
      : [],
    [fullyChargedBatteries, batteryPickerDelivery],
  );

  const updateBatteryPickerPosition = useCallback((orderId: string) => {
    const button = pickerButtonRefs.current[orderId];
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const width = 300;
    const maxHeight = 280;
    const roomBelow = window.innerHeight - rect.bottom - 14;
    const showAbove = roomBelow < 165 && rect.top > roomBelow;

    const top = showAbove
      ? Math.max(8, rect.top - maxHeight - 6)
      : rect.bottom + 6;

    setPickerPosition({
      top,
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
      width,
      maxHeight: Math.min(maxHeight, showAbove ? rect.top - 14 : window.innerHeight - rect.bottom - 14),
    });
  }, []);

  useEffect(() => {
    if (!batteryPickerOrderId) return;
    const reposition = () => updateBatteryPickerPosition(batteryPickerOrderId);
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const trigger = pickerButtonRefs.current[batteryPickerOrderId];
      if (pickerPanelRef.current?.contains(target) || trigger?.contains(target)) return;
      setBatteryPickerOrderId(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setBatteryPickerOrderId(null);
    };
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [batteryPickerOrderId, updateBatteryPickerPosition]);

  const hubLabel = [deliveries[0]?.hub, history[0]?.hub, TECHNICIAN_HUB]
    .find((item) => item && item !== "—") ?? "the assigned hub";

  const awaitingCount = normalizedDeliveries.filter((item) => item.status === "Awaiting Drop-off").length;
  const atHubCount = normalizedDeliveries.filter((item) => item.status === "At Hub").length;
  const assignedCount = normalizedDeliveries.filter((item) => item.status === "Mission Assigned").length;
  const readyCount = normalizedDeliveries.filter((item) => item.status === "Ready").length;

  const handleReceiveAtHub = async (orderId: string) => {
    const delivery = normalizedDeliveries.find((item) => item.orderId === orderId);
    if (!delivery || delivery.status !== "Awaiting Drop-off" || receivingOrderId !== null || receiveMutation.isPending) return;

    setReceivingOrderId(orderId);
    setActionMessage("");
    try {
      await receiveMutation.mutateAsync(orderId);
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
      setReceivingOrderId(null);
    }
  };

  const openBatteryPicker = (delivery: OutboundDelivery) => {
    if (
      delivery.status !== "Mission Assigned" ||
      !delivery.backendMissionId ||
      !delivery.assignedDroneCode
    ) {
      setActionMessage("The mission and its drone must be assigned before selecting a battery.");
      return;
    }

    // A portal attached to <body> does not inherit scoped theme variables.
    // The trigger already inherits them from TechnicianPageShell, so read
    // their resolved values and apply them to the portal container.
    const trigger = pickerButtonRefs.current[delivery.orderId];
    if (trigger) {
      const computed = window.getComputedStyle(trigger);
      const isDark = computed.colorScheme === "dark" ||
        document.documentElement.classList.contains("dark");
      const fallback = isDark
        ? {
            "--tech-surface": "#181a20",
            "--tech-text": "#f4f4f5",
            "--tech-text-secondary": "#d4d4d8",
            "--tech-muted": "#a1a1aa",
            "--tech-border": "#3f3f46",
          }
        : {
            "--tech-surface": "#ffffff",
            "--tech-text": "#18181b",
            "--tech-text-secondary": "#3f3f46",
            "--tech-muted": "#71717a",
            "--tech-border": "#e4e4e7",
          };

      const palette = Object.fromEntries(
        Object.entries(fallback).map(([name, defaultColor]) => {
          const inherited = computed.getPropertyValue(name).trim();
          return [name, inherited && inherited !== "transparent" ? inherited : defaultColor];
        }),
      );
      setPickerTheme(palette);
    }

    setActionMessage("");
    setBatteryPickerOrderId((current) =>
      current === delivery.orderId ? null : delivery.orderId,
    );
    updateBatteryPickerPosition(delivery.orderId);
  };

  const handleSelectBattery = async (delivery: OutboundDelivery, battery: HubBattery) => {
    if (
      assigningOrderId !== null ||
      assignBatteryMutation.isPending ||
      !delivery.backendMissionId ||
      !isReadyAndFullyCharged(battery) ||
      !isVerifiedForDrone(battery, delivery)
    ) {
      setActionMessage("This battery is not verified as fully charged and compatible with the assigned drone.");
      return;
    }

    setActionMessage("");
    setAssigningOrderId(delivery.orderId);
    setBatteryPickerOrderId(null);

    try {
      // This API receives the exact selected battery, not an automatically chosen battery.
      // The no-body /prepare-battery endpoint is NOT called, as it may override
      // the selected battery. Backend must expose a validated, atomic readiness
      // transition if the battery-use endpoint alone does not mark order Ready.
      await assignBatteryMutation.mutateAsync({
        batteryId: battery.id,
        missionId: delivery.backendMissionId,
      });
      setBatteryAssignmentAwaitingReadiness((current) => ({
        ...current,
        [delivery.orderId]: battery.id,
      }));
      await outboundQuery.refetch();
      setActionMessage(
        `${battery.id} was assigned to mission ${delivery.missionCode ?? delivery.missionId}. ` +
        "Waiting for Backend to confirm Outbound readiness; no Ready status was generated on Frontend.",
      );
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "Unable to assign the selected battery to this mission.",
      );
    } finally {
      setAssigningOrderId(null);
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
              <span><strong className="font-semibold text-[var(--tech-text)]">{outboundQuery.isPending ? "—" : normalizedDeliveries.length}</strong> total</span>
              <span><strong className="font-semibold text-[var(--tech-text-secondary)]">{awaitingCount}</strong> awaiting</span>
              <span><strong className="font-semibold text-[var(--tech-text-secondary)]">{atHubCount}</strong> at hub</span>
              <span><strong className="font-semibold text-[var(--tech-text-secondary)]">{assignedCount}</strong> assigned</span>
              <span><strong className="font-semibold text-orange-500">{readyCount}</strong> ready</span>
            </div>
            <button type="button" onClick={() => setHistoryOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--tech-border)] px-3 text-[12px] font-medium text-[var(--tech-text-secondary)] hover:border-orange-500/50 hover:text-orange-500">
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
          <div className="w-full min-w-[1260px]">
            <div
              className="grid items-center gap-4 border-b border-[var(--tech-border)] px-5 py-3"
              style={{ gridTemplateColumns: outboundTableGridTemplate }}
            >
              <Header>Order / Mode</Header>
              <Header>Package</Header>
              <Header>Destination Hub</Header>
              <Header>Mission / Drone</Header>
              <Header>Battery</Header>
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
                      {delivery.deliveryMode === "EXPRESS" ? "Express" : delivery.deliveryMode === "SCHEDULED" ? "Scheduled" : display(delivery.deliveryMode)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-[var(--tech-text-secondary)]" title={delivery.packageName}>
                      {display(delivery.packageName)}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-[var(--tech-muted)]">
                      {[delivery.packageType, delivery.weightProvided ? `${delivery.weightKg} kg` : undefined].filter(Boolean).join(" · ") || "—"}
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
                    <p className="mt-1 truncate text-[11px] text-[var(--tech-muted)]" title={delivery.assignedDroneCode ?? ""}>
                      {delivery.prematureMissionAssignment
                        ? "Awaiting package receipt"
                        : delivery.assignedDroneCode || "Drone not assigned"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    {delivery.installedBatteryId ? (
                      <div className="flex items-center gap-2">
                        <BatteryFull className="shrink-0 text-orange-500" size={14} />
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-orange-500" title={delivery.installedBatteryId}>{delivery.installedBatteryId}</p>
                          {delivery.batteryChargePct !== undefined && (
                            <p className="mt-1 text-[11px] text-[var(--tech-muted)]">{delivery.batteryChargePct}%</p>
                          )}
                        </div>
                      </div>
                    ) : batteryAssignmentAwaitingReadiness[delivery.orderId] ? (
                      <div>
                        <p className="text-[12px] font-semibold text-orange-500">
                          {batteryAssignmentAwaitingReadiness[delivery.orderId]}
                        </p>
                        <p className="text-[10px] text-[var(--tech-muted)]">Awaiting Backend sync</p>
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
                        disabled={receivingOrderId !== null || receiveMutation.isPending}
                        onClick={() => void handleReceiveAtHub(delivery.orderId)}
                        className="h-9 rounded-md bg-orange-500 px-2.5 text-[11px] font-semibold text-black hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <PackageCheck size={13} />
                        {receivingOrderId === delivery.orderId ? "Receiving..." : "Receive at hub"}
                      </Button>
                    )}
                    {delivery.status === "At Hub" && (
                      <span className="text-right text-[11px] text-[var(--tech-muted)]">
                        {delivery.missionId ? "Awaiting drone assignment" : "Awaiting Operator"}
                      </span>
                    )}
                    {delivery.status === "Mission Assigned" && (
                      batteryAssignmentAwaitingReadiness[delivery.orderId] ? (
                        <span
                          className="max-w-[145px] text-right text-[11px] text-orange-500"
                          title="Battery-use API succeeded; waiting for Backend to confirm Outbound Ready"
                        >
                          Battery assigned · Awaiting Ready
                        </span>
                      ) : (
                        <Button
                          ref={(element) => { pickerButtonRefs.current[delivery.orderId] = element; }}
                          type="button"
                          aria-haspopup="listbox"
                          aria-expanded={batteryPickerOrderId === delivery.orderId}
                          disabled={assigningOrderId !== null || assignBatteryMutation.isPending}
                          onClick={() => openBatteryPicker(delivery)}
                          className="h-9 rounded-md bg-orange-500 px-2.5 text-[11px] font-semibold text-black hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <BatteryFull size={13} /> Prepare battery
                          <ChevronDown size={13} className="ml-1" />
                        </Button>
                      )
                    )}
                    {delivery.status === "Ready" && (
                      <span className="text-right text-[11px] text-[var(--tech-muted)]" title="Dispatch is controlled by Backend / Operator. No Technician dispatch endpoint is exposed.">
                        Awaiting dispatch
                      </span>
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
                <div className="px-6 py-14 text-center text-[13px] text-[var(--tech-muted)]">Loading outbound deliveries...</div>
              )}
              {!outboundQuery.isPending && filteredDeliveries.length === 0 && (
                <div className="px-6 py-14 text-center text-[13px] text-[var(--tech-muted)]">
                  {normalizedDeliveries.length === 0 ? "No outbound deliveries available." : "No orders match these filters."}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {batteryPickerOrderId && batteryPickerDelivery && pickerPosition &&
        createPortal(
          <div
            ref={pickerPanelRef}
            role="listbox"
            aria-label={`Ready batteries compatible with ${targetDroneModel(batteryPickerDelivery)}`}
            style={{
              ...pickerTheme,
              position: "fixed",
              top: pickerPosition.top,
              left: pickerPosition.left,
              width: pickerPosition.width,
              maxHeight: Math.max(100, pickerPosition.maxHeight),
              zIndex: 9999,
              // An explicit opaque background is important here: without the
              // inherited Technician variables the old popup was transparent
              // and the table text showed through the battery choices.
              backgroundColor: pickerTheme["--tech-surface"] || "#ffffff",
              color: pickerTheme["--tech-text"] || "#18181b",
              opacity: 1,
              isolation: "isolate",
              boxShadow: "0 14px 40px rgba(0, 0, 0, 0.19)",
            }}
            className="overflow-y-auto rounded-lg border border-[var(--tech-border)] p-1.5"
          >
            <div className="border-b border-[var(--tech-border)] px-3 py-2">
              <p className="text-[12px] font-semibold text-[var(--tech-text)]">
                Ready batteries · 100%
              </p>
              <p className="mt-1 text-[11px] text-[var(--tech-muted)]">
                Compatible with: {targetDroneModel(batteryPickerDelivery) || "Model not provided"}
              </p>
            </div>

            {batteriesQuery.isPending ? (
              <p className="p-3 text-[12px] text-[var(--tech-muted)]">Loading hub batteries...</p>
            ) : batteriesQuery.isError ? (
              <p className="p-3 text-[12px] text-red-400">
                Cannot load batteries. Check the Battery Management API.
              </p>
            ) : compatibleBatteries.length ? (
              compatibleBatteries.map((battery) => (
                <button
                  key={battery.backendId ?? battery.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  disabled={assignBatteryMutation.isPending}
                  onClick={() => void handleSelectBattery(batteryPickerDelivery, battery)}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left hover:bg-orange-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[var(--tech-text)]">{battery.id}</p>
                    <p className="mt-0.5 truncate text-[10px] text-[var(--tech-muted)]">
                      {battery.model || "Compatible model from Backend"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[12px] font-semibold text-orange-500">{battery.chargeLevelPct}%</p>
                    <p className="text-[10px] text-[var(--tech-muted)]">Ready</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-3">
                <p className="text-[12px] text-[var(--tech-text-secondary)]">
                  No verified compatible, fully charged battery at this hub.
                </p>
                <p className="mt-1 text-[11px] leading-4 text-[var(--tech-muted)]">
                  {fullyChargedBatteries.length
                    ? `${fullyChargedBatteries.length} fully charged battery(s), but no verified model match. Backend must provide compatibility information if battery model names differ from drone model names.`
                    : "Backend has not returned an available battery with an actual 100% charge reading and a usable battery ID."}
                </p>
              </div>
            )}
          </div>,
          document.body,
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
                  <DetailField label="Package type / weight" value={[selectedDelivery.packageType, selectedDelivery.weightProvided ? `${selectedDelivery.weightKg} kg` : undefined].filter(Boolean).join(" · ") || "—"} />
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
                  <DetailField label="Drone" value={display(selectedDelivery.assignedDroneCode)} />
                  <DetailField label="Battery" value={selectedDelivery.installedBatteryId ? `${selectedDelivery.installedBatteryId}${selectedDelivery.batteryChargePct !== undefined ? ` · ${selectedDelivery.batteryChargePct}%` : ""}${selectedDelivery.batteryStatus ? ` · ${selectedDelivery.batteryStatus}` : ""}` : "—"} />
                </div>
              </section>
            </div>
            <div className="flex justify-end border-t border-[var(--tech-border)] px-6 py-4">
              <Button type="button" onClick={() => setDetailOrderId(null)} className="h-9 rounded-md border border-[var(--tech-border)] bg-transparent px-4 text-[12px] text-[var(--tech-text-secondary)] hover:bg-white/5">Close</Button>
            </div>
          </div>
        </div>
      )}

      {historyOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 px-4 py-6" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setHistoryOpen(false);
        }}>
          <div role="dialog" aria-modal="true" aria-label="Outbound history" className="flex max-h-[82vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-xl border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--tech-border)] px-6 py-5">
              <div>
                <h2 className="text-[19px] font-semibold text-[var(--tech-text)]">Outbound history</h2>
                <p className="mt-1 text-[12px] text-[var(--tech-muted)]">Previously recorded departures from {hubLabel}.</p>
              </div>
              <button type="button" aria-label="Close outbound history" onClick={() => setHistoryOpen(false)} className="rounded-md p-1.5 text-[var(--tech-muted)] hover:text-orange-500"><X size={18} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <div className="min-w-[1000px]">
                <div className="sticky top-0 z-10 grid grid-cols-[140px_140px_145px_135px_1fr_160px_100px] gap-4 border-b border-[var(--tech-border)] bg-[var(--tech-surface)] px-6 py-3">
                  <Header>Order</Header><Header>Mission</Header><Header>Drone</Header><Header>Battery</Header><Header>Destination Hub</Header><Header>Departed</Header><Header>Result</Header>
                </div>
                {history.length ? history.map((item) => (
                  <div key={item.id} className="grid grid-cols-[140px_140px_145px_135px_1fr_160px_100px] items-center gap-4 border-b border-[var(--tech-border)] px-6 py-4 text-[12px] text-[var(--tech-text-secondary)]">
                    <span className="break-all font-semibold">{item.orderId}</span>
                    <span className="break-all">{display(item.missionId)}</span>
                    <span className="truncate" title={item.droneCode}>{display(item.droneCode)}</span>
                    <span className="text-orange-500">{display(item.batteryId)}</span>
                    <span className="truncate" title={item.destination}>{display(item.destination)}</span>
                    <span>{display(item.departedAt)}</span>
                    <span className="inline-flex items-center gap-1 text-orange-500"><Check size={13} />{item.result}</span>
                  </div>
                )) : <div className="px-6 py-14 text-center text-[13px] text-[var(--tech-muted)]">No outbound history available.</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </TechnicianPageShell>
  );
}
