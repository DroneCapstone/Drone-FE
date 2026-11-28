import { WorkOrderHistoryDetails, type WorkOrderHistorySummary } from "../components/WorkOrderHistoryDetails";
import { HistoryDetailsButton } from "../components/TechnicianHistoryDetails";
import { TechnicianLoadingState } from "../components/TechnicianLoadingState";
import {
  ArrowUpRight,
  History,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  Button,
} from "@/components/shadcn/ui/button";
import {
  Card,
  CardContent,
} from "@/components/shadcn/ui/card";
import {
  TechnicianPageShell,
} from "../components/TechnicianPageShell";
import {
  loadWorkOrders,
  type WorkOrder,
  type WorkOrderStatus,
} from "../utils/maintenanceStorage";
// GET /technician/fleet/work-orders is the source of truth for completed history.
import { getWorkOrdersApi } from "../api/maintenanceApi";
import { isRecord, unwrapList } from "../api/httpClient";
import {
  useCreateWorkOrderMutation,
  useUpdateWorkOrderMutation,
  useDeleteWorkOrderMutation,
  useWorkOrdersQuery,
} from "../hooks/useMaintenanceQueries";
import {
  useBatteriesQuery,
} from "../hooks/useBatteryQueries";
import {
  useDroneDetailQuery,
  useFleetQuery,
} from "../hooks/useFleetQueries";
import type { HubBattery } from "../utils/batteryStorage";
// DroneOptAI compatibility mapping for the three currently configured models.
// Prefer explicit compatibility from the Backend battery record when provided.
// This is an application rule, not a physical battery safety certification.
const BATTERY_MODEL_BY_DRONE_MODEL: Record<string, readonly string[]> = {
  // Accept the current abbreviated battery model codes and the legacy names.
  "dji flycart 15 heavy": ["dji-bat-980w", "dji db2000", "db2000"],
  "dji flycart 15": ["dji-bat-980w", "dji db2000", "db2000"],
  "dji matrice 100": ["dji-bat-130w", "tb48d", "dji tb48d"],
  "aurelia x6 pro": ["aur-bat-444w", "aurelia ultrapower", "aurelia ultrapower 12s"],
};
function normalizeModel(model: string): string {
  return model.trim().replace(/\s+/g, " ").toLowerCase();
}
function isCompatibleTestBattery(battery: HubBattery, droneModel: string): boolean {
  if (!droneModel || battery.status !== "Ready") return false;
  if (battery.compatibleDroneModels?.length) {
    return battery.compatibleDroneModels.some(
      (compatibleModel) => normalizeModel(compatibleModel) === normalizeModel(droneModel),
    );
  }
  const expectedBatteryModels = BATTERY_MODEL_BY_DRONE_MODEL[normalizeModel(droneModel)];
  return Boolean(
    battery.model &&
    expectedBatteryModels?.some(
      (model) => normalizeModel(battery.model ?? "") === normalizeModel(model),
    ),
  );
}
type AlertSource =
  | "Schedule"
  | "Incident"
  | "Hub inspection";
type ActiveWorkOrderStatus =
  Exclude<
    WorkOrderStatus,
    "Completed"
  >;
type WorkOrderForm = {
  drone: string;
  droneId: string;
  batteryId: string;
  title: string;
  relatedAlertId?: string;
  alertSource?: AlertSource;
};
type AlertLog = {
  id: string;
  alertId: string;
  drone: string;
  title: string;
  source: AlertSource;
  status: "Handled";
  workOrderId: string;
  handledAt: string;
};
const ALERT_LOG_STORAGE_KEY =
  "droneoptai.technician.maintenance-alert-log.v1";
const initialForm: WorkOrderForm = {
  drone: "",
  droneId: "",
  batteryId: "",
  title: "",
};
function loadAlertLogs(): AlertLog[] {
  try {
    const stored = localStorage.getItem(
      ALERT_LOG_STORAGE_KEY,
    );
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(
      stored,
    ) as AlertLog[];
    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}
function formatNow() {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  )
    .format(new Date())
    .replace(",", " ·");
}
/** The list mapper used by the main table does not expose action_taken or
 * resolved_at. History therefore reads the original Work Orders response. */
type CompletedWorkOrderHistory = WorkOrderHistorySummary;
function workOrderApiString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}
function formatWorkOrderTimestamp(timestamp: string): string {
  if (!timestamp) return "—";
  const value = timestamp.trim();
  // Backend may return timezone-naive timestamps. Preserve those clock values
  // instead of guessing a timezone.
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
    return parts
      ? `${parts[3]}/${parts[2]}/${parts[1]} · ${parts[4]}:${parts[5]}:${parts[6] ?? "00"}`
      : value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(date).replace(",", " ·");
}
function mapCompletedWorkOrderHistory(input: unknown): CompletedWorkOrderHistory | null {
  if (!isRecord(input)) return null;
  if (workOrderApiString(input, "status").toLowerCase() !== "completed") return null;
  const rawId = workOrderApiString(input, "id") || workOrderApiString(input, "work_order_id");
  if (!rawId) return null;
  return {
    rawId,
    raw: input,
    id: /^WO-/i.test(rawId) ? rawId.toUpperCase() : `WO-${rawId.padStart(4, "0")}`,
    droneId: workOrderApiString(input, "drone_id") || "—",
    batteryId: workOrderApiString(input, "battery_id") || "—",
    issue: workOrderApiString(input, "issue_description") || workOrderApiString(input, "title") || "—",
    actionTaken: workOrderApiString(input, "action_taken") || "—",
    createdAt: workOrderApiString(input, "created_at"),
    resolvedAt: workOrderApiString(input, "resolved_at") || workOrderApiString(input, "completed_at"),
  };
}
export function WorkOrdersPage() {
  const navigate = useNavigate();
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();
  const workOrdersQuery =
    useWorkOrdersQuery();
  const createWorkOrderMutation =
    useCreateWorkOrderMutation();
  const updateWorkOrderMutation = useUpdateWorkOrderMutation();
  const deleteWorkOrderMutation = useDeleteWorkOrderMutation();
  const [editOrder, setEditOrder] = useState<WorkOrder | null>(null);
  const [editIssue, setEditIssue] = useState("");
  const [deleteOrder, setDeleteOrder] = useState<WorkOrder | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [writeMessage, setWriteMessage] = useState("");
  const writeLock = useRef(false);
  const editPendingOrder = (order: WorkOrder) => {
    if (order.status !== "Pending") return;
    setEditOrder(order);
    setEditIssue(order.title);
    setApiError("");
    setWriteMessage("");
  };
  const savePendingOrder = async () => {
    if (!editOrder || editOrder.status !== "Pending" || writeLock.current) return;
    const issue = editIssue.trim();
    if (!issue) {
      setApiError("Issue description cannot be empty.");
      return;
    }
    writeLock.current = true;
    try {
      setApiError("");
      await updateWorkOrderMutation.mutateAsync({
        workOrderId: editOrder.id,
        payload: { issue_description: issue },
      });
      setEditOrder(null);
      setWriteMessage(`${editOrder.id} updated successfully.`);
    } catch  {
      setApiError("Unable to update Work Order.");
    } finally {
      writeLock.current = false;
    }
  };
  const openDeleteConfirmation = (order: WorkOrder) => {
    if (order.status !== "Pending" || writeLock.current) return;
    setDeleteOrder(order);
    setDeleteError("");
  };
  const confirmDeletePendingOrder = async () => {
    if (!deleteOrder || deleteOrder.status !== "Pending" || writeLock.current) return;
    const workOrderId = deleteOrder.id;
    writeLock.current = true;
    try {
      setDeleteError("");
      setApiError("");
      setWriteMessage("");
      await deleteWorkOrderMutation.mutateAsync(workOrderId);
      setDeleteOrder(null);
      setWriteMessage(`${workOrderId} deleted successfully.`);
    } catch  {
      setDeleteError("Unable to delete Work Order.");
    } finally {
      writeLock.current = false;
    }
  };
  const batteriesQuery =
    useBatteriesQuery();
  // Prefetch the hub fleet while Work Orders load; both APIs include model.
  const fleetQuery = useFleetQuery();
  const workOrders: WorkOrder[] =
    workOrdersQuery.data ?? [];
  // A single completed Work Order is a single history row, not multiple audit logs.
  const [selectedHistory, setSelectedHistory] = useState<CompletedWorkOrderHistory | null>(null);
  const [completedHistory, setCompletedHistory] = useState<CompletedWorkOrderHistory[]>([]);
  const [query, setQuery] =
    useState("");
  const [
    historyOpen,
    setHistoryOpen,
  ] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyWarning, setHistoryWarning] = useState("");
  // Keep the already loaded history while the Work Orders page is mounted.
  // Closing and reopening the modal must not refetch GET /work-orders.
  const historyLoadedRef = useRef(false);
  const historyFetchingRef = useRef(false);
  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    "all" | ActiveWorkOrderStatus
  >("all");
  const [
    createModalOpen,
    setCreateModalOpen,
  ] = useState(false);
  const [form, setForm] =
    useState<WorkOrderForm>(
      initialForm,
    );
  // When opened from a Maintenance Alert, the Backend identifies the drone.
  // Technician must not override the associated Drone ID or its model.
  const [droneLockedFromAlert, setDroneLockedFromAlert] = useState(false);
  const [apiError, setApiError] =
    useState("");
  // Prefer the model that BE already returns in GET /work-orders.
  // If this drone has never had a WO, use GET /drones (already prefetched).
  // A detail request is the final fallback, not an unconditional extra call.
  // Send the exact Backend ID; normalize only for model lookup comparisons.
  const selectedDroneId = form.droneId.trim();
  const modelFromWorkOrders = workOrders.find(
    (order) => order.droneId.trim().toUpperCase() === selectedDroneId.toUpperCase() &&
      order.model?.trim() && order.model !== "—",
  )?.model?.trim() ?? "";
  const modelFromFleet = fleetQuery.data?.find(
    (drone) => drone.id.trim().toUpperCase() === selectedDroneId.toUpperCase() &&
      drone.model?.trim() && drone.model !== "—",
  )?.model?.trim() ?? "";
  const needsDroneDetail = Boolean(
    createModalOpen && selectedDroneId &&
    !modelFromWorkOrders && !modelFromFleet &&
    !workOrdersQuery.isPending && !fleetQuery.isPending,
  );
  const droneDetailQuery = useDroneDetailQuery(
    needsDroneDetail ? selectedDroneId : undefined,
  );
  const modelFromDetail =
    droneDetailQuery.data?.id.trim().toUpperCase() === selectedDroneId.toUpperCase() &&
    droneDetailQuery.data.model !== "—"
      ? droneDetailQuery.data.model.trim()
      : "";
  const droneModel = modelFromWorkOrders || modelFromFleet || modelFromDetail;
  const modelLoading = Boolean(
    selectedDroneId && !droneModel &&
    (workOrdersQuery.isPending || fleetQuery.isPending ||
      (needsDroneDetail && droneDetailQuery.isPending)),
  );
  const compatibleReadyBatteries = useMemo(
    () => (batteriesQuery.data ?? []).filter(
      (battery) => isCompatibleTestBattery(battery, droneModel),
    ),
    [batteriesQuery.data, droneModel],
  );
  const selectedBatteryIsCompatible = compatibleReadyBatteries.some(
    (battery) => (battery.backendId ?? battery.id) === form.batteryId,
  );
  // Clear stale battery selection if the drone/model or hub batteries change.
  useEffect(() => {
    if (!createModalOpen || batteriesQuery.isPending || modelLoading) return;
    setForm((current) =>
      current.batteryId &&
      !compatibleReadyBatteries.some(
        (battery) => (battery.backendId ?? battery.id) === current.batteryId,
      )
        ? { ...current, batteryId: "" }
        : current,
    );
  }, [
    createModalOpen,
    batteriesQuery.isPending,
    modelLoading,
    compatibleReadyBatteries,
  ]);
  useEffect(() => {
    const drone =
      searchParams.get("drone");
    const title =
      searchParams.get("title");
    if (!drone || !title) {
      return;
    }
    const sourceParam =
      searchParams.get(
        "source",
      ) as AlertSource | null;
    setForm({
      drone,
      droneId:
        searchParams.get(
          "droneId",
        ) ?? "",
      batteryId:
        searchParams.get(
          "batteryId",
        ) ?? "",
      title,
      relatedAlertId:
        searchParams.get(
          "alertId",
        ) ?? undefined,
      alertSource:
        sourceParam ??
        undefined,
    });
    setDroneLockedFromAlert(true);
    setCreateModalOpen(true);
    setSearchParams(
      {},
      { replace: true },
    );
  }, [
    searchParams,
    setSearchParams,
  ]);
  const normalizedQuery = query
    .trim()
    .toLowerCase();
  const activeWorkOrders =
    useMemo(
      () =>
        workOrders.filter(
          (order) =>
            order.status !==
            "Completed",
        ),
      [workOrders],
    );
  const filteredWorkOrders =
    useMemo(
      () =>
        activeWorkOrders.filter(
          (order) => {
            const matchesSearch =
              !normalizedQuery ||
              order.id
                .toLowerCase()
                .includes(
                  normalizedQuery,
                ) ||
              order.droneId
                .toLowerCase()
                .includes(
                  normalizedQuery,
                ) ||
              order.title
                .toLowerCase()
                .includes(
                  normalizedQuery,
                );
            const matchesStatus =
              statusFilter ===
                "all" ||
              order.status ===
                statusFilter;
            return matchesSearch && matchesStatus;
          },
        ),
      [
        activeWorkOrders,
        normalizedQuery,
        statusFilter,
      ],
    );
  const openCreateModal = () => {
    setApiError("");
    setForm(initialForm);
    setDroneLockedFromAlert(false);
    setCreateModalOpen(true);
  };
  const openHistory = async () => {
    setHistoryOpen(true);
    // Fetch only on the first open during this page visit; reuse the snapshot
    // on subsequent opens, including when the Backend returns an empty list.
    if (historyLoadedRef.current || historyFetchingRef.current) return;
    historyFetchingRef.current = true;
    setHistoryLoading(true);
    setHistoryWarning("");
    try {
      const response = await getWorkOrdersApi();
      const rows = unwrapList(response)
        .map(mapCompletedWorkOrderHistory)
        .filter((item): item is CompletedWorkOrderHistory => item !== null);
      // One Work Order per row. The audit log endpoint is not used here.
      const byId = new Map(rows.map((item) => [item.id, item]));
      setCompletedHistory([...byId.values()].sort((a, b) =>
        (Date.parse(b.resolvedAt || b.createdAt) || 0) -
        (Date.parse(a.resolvedAt || a.createdAt) || 0),
      ));
      historyLoadedRef.current = true;
    } catch  {
      // Leave historyLoadedRef false so Retry can request the list again.
      setHistoryWarning(
        "Could not load completed work orders. Please retry.",
      );
    } finally {
      historyFetchingRef.current = false;
      setHistoryLoading(false);
    }
  };
  const handleCreateWorkOrder = async (
    event: FormEvent,
  ) => {
    event.preventDefault();
    if (
      !form.droneId.trim() ||
      (Boolean(form.batteryId.trim()) && !selectedBatteryIsCompatible) ||
      !form.title.trim()
    ) {
      setApiError(
        "Select a drone, describe the issue, and choose a compatible Ready battery only if a test battery is needed.",
      );
      return;
    }
    try {
      setApiError("");
      await createWorkOrderMutation.mutateAsync({
        droneId: form.droneId.trim(),
        batteryId: form.batteryId,
        issueDescription: form.title,
      });
      const nextOrders =
        loadWorkOrders();
      if (form.relatedAlertId && form.alertSource) {
        const currentAlertLogs = loadAlertLogs();
        if (!currentAlertLogs.some((log) => log.alertId === form.relatedAlertId)) {
          const created = nextOrders[0];
          const alertLog: AlertLog = {
            id: `ALOG-${Date.now()}`,
            alertId: form.relatedAlertId,
            drone: form.drone,
            title: form.title,
            source: form.alertSource,
            status: "Handled",
            workOrderId: created?.id ?? "WO",
            handledAt: formatNow(),
          };
          localStorage.setItem(
            ALERT_LOG_STORAGE_KEY,
            JSON.stringify([alertLog, ...currentAlertLogs]),
          );
        }
      }
      setCreateModalOpen(false);
      setForm(initialForm);
    } catch  {
      setApiError(
        "Unable to create work order.",
      );
    }
  };
  return (
    <TechnicianPageShell
      title="Work orders"
      description=""
      action={
        <Button
          type="button"
          onClick={
            openCreateModal
          }
          className="h-9 rounded-md bg-orange-500 px-4 text-[14px] font-medium text-black hover:bg-orange-600"
        >
          <Plus size={15} />
          Create work order
        </Button>
      }
    >
      {(apiError || workOrdersQuery.error instanceof Error) && (
        <div className="mb-4 rounded-md border border-red-500/25 px-4 py-3 text-[13px] text-red-500">
          {apiError ||
            ("")}
        </div>
      )}
      {writeMessage && <div role="status" className="mb-4 rounded-md border border-[var(--tech-border)] px-4 py-3 text-[13px] text-[var(--tech-text-secondary)]">{writeMessage}</div>}
      {/* WORK ORDERS */}
      <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
        {/* FILTERS */}
        <CardContent className="flex flex-wrap gap-3 border-b border-[var(--tech-border)] p-4">
          <div className="relative min-w-[280px] flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tech-subtle)]"
            />
            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
              placeholder="Search work order, drone or task..."
              className="tech-control h-10 w-full pl-9 pr-3 !text-[14px]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target
                  .value as
                  | "all"
                  | ActiveWorkOrderStatus,
              )
            }
            className="tech-control h-10 min-w-[180px] px-3 !text-[14px]"
          >
            <option value="all">
              All status
            </option>
            <option value="Pending">
              Pending
            </option>
            <option value="In Progress">
              In progress
            </option>
          </select>
        </CardContent>
        {/* TABLE TITLE */}
        <div className="flex items-center justify-between border-b border-[var(--tech-border)] px-5 py-5">
          <h2 className="text-[20px] font-semibold text-[var(--tech-text)]">
            Work orders
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-[13px] text-[var(--tech-subtle)]">
              {workOrdersQuery.data === undefined ? "—" : filteredWorkOrders.length} work orders
            </span>
            <button
              type="button"
              onClick={() => {
                void openHistory();
              }}
              className="
  inline-flex items-center gap-2
  text-[13px] font-medium
  text-[var(--tech-text-secondary)]
  transition-colors duration-150
  hover:text-orange-500
"
            >
              <History size={15} />
              View history
            </button>
          </div>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[1070px]">
              <div className="grid grid-cols-[125px_175px_minmax(240px,1fr)_145px_195px_160px] items-center border-b border-[var(--tech-border)] px-5 py-3 text-center text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-muted)]">
                <span>Order</span>
                <span>Drone ID</span>
                <span>Task</span>
                <span>Status</span>
                <span>Created at</span>
                <span>Actions</span>
              </div>
              {filteredWorkOrders.map(
                (order) => (
                  <div
                    key={order.id}
                    className="group grid grid-cols-[125px_175px_minmax(240px,1fr)_145px_195px_160px] items-center border-b border-[var(--tech-border)] px-5 py-4 last:border-b-0 hover:bg-[var(--tech-surface-2)]"
                  >
                    <span className="text-center text-[14px] text-[var(--tech-muted)]">
                      {order.id}
                    </span>
                    <span className="min-w-0 break-words px-1 text-center text-[15px] font-medium text-[var(--tech-text)]">
                      {order.droneId}
                    </span>
                    <span className="px-4 text-[14px] text-[var(--tech-text-secondary)]">
                      {order.title}
                    </span>
                    <div className="flex justify-center">
                      <WorkOrderStatusText status={order.status} />
                    </div>
                    <span className="text-center text-[13px] tabular-nums text-[var(--tech-muted)]">
                      {order.createdAt || "—"}
                    </span>
                    <div className="flex items-center justify-center gap-3">
                      {order.status === "Pending" && (
                        <>
                          <button type="button" aria-label={`Edit ${order.id}`} title="Edit issue"
                            onClick={() => editPendingOrder(order)}
                            disabled={updateWorkOrderMutation.isPending || deleteWorkOrderMutation.isPending}
                            className="text-[var(--tech-subtle)] hover:text-orange-500 disabled:opacity-40">
                            <Pencil size={16}/>
                          </button>
                          <button type="button" aria-label={`Delete ${order.id}`} title="Delete pending work order"
                            onClick={() => openDeleteConfirmation(order)}
                            disabled={deleteWorkOrderMutation.isPending || updateWorkOrderMutation.isPending}
                            className="text-[var(--tech-subtle)] hover:text-orange-500 disabled:opacity-40">
                            <Trash2 size={16}/>
                          </button>
                        </>
                      )}
                      <button type="button" aria-label={`Open ${order.id}`} title="View work order"
                        onClick={() => navigate(`/technician/maintenance/work-orders/${order.id}`)}
                        className="text-[var(--tech-subtle)] transition-colors hover:text-orange-500">
                        <ArrowUpRight size={16}/>
                      </button>
                    </div>
                  </div>
                ),
              )}
              {workOrdersQuery.isPending ? (
                <TechnicianLoadingState label="Loading work orders..." />
              ) : filteredWorkOrders.length === 0 && (
                <div className="px-5 py-10 text-center text-[14px] text-[var(--tech-muted)]">
                  {workOrdersQuery.isError && !workOrdersQuery.data ? "Unable to load work orders." : "No work orders match the current filters."}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      {deleteOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-work-order-title"
            aria-describedby="delete-work-order-description"
            className="w-full max-w-[460px] rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--tech-border)] px-6 py-4">
              <h2 id="delete-work-order-title" className="text-[19px] font-semibold text-[var(--tech-text)]">
                Delete work order
              </h2>
              <button
                type="button"
                aria-label="Close delete confirmation"
                onClick={() => { if (!deleteWorkOrderMutation.isPending) setDeleteOrder(null); }}
                disabled={deleteWorkOrderMutation.isPending}
                className="text-[var(--tech-muted)] transition-colors hover:text-[var(--tech-text)] disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5">
              <p id="delete-work-order-description" className="text-[14px] leading-relaxed text-[var(--tech-text-secondary)]">
                Are you sure you want to delete <strong className="text-[var(--tech-text)]">{deleteOrder.id}</strong>?
                This will permanently remove the Work Order and cannot be undone.
              </p>
              {deleteError && (
                <p role="alert" className="mt-3 text-[13px] text-red-500">{deleteError}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-[var(--tech-border)] px-6 py-4">
              <button
                type="button"
                autoFocus
                disabled={deleteWorkOrderMutation.isPending}
                onClick={() => setDeleteOrder(null)}
                className="rounded-md border border-[var(--tech-border)] px-4 py-2 text-[13px] font-medium text-[var(--tech-text)] transition-colors hover:bg-[var(--tech-surface-2)] disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteWorkOrderMutation.isPending}
                onClick={() => void confirmDeletePendingOrder()}
                className="inline-flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={15} />
                {deleteWorkOrderMutation.isPending ? "Deleting..." : "Delete work order"}
              </button>
            </div>
          </div>
        </div>
      )}
      {editOrder && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-[560px] rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[19px] font-semibold text-[var(--tech-text)]">Edit {editOrder.id}</h2>
              <button type="button" title="Close" aria-label="Close edit dialog"
                onClick={() => setEditOrder(null)} className="text-[var(--tech-muted)] hover:text-orange-500"><X size={18}/></button>
            </div>
            <label className="mt-5 block text-[13px] text-[var(--tech-text-secondary)]">
              <textarea value={editIssue} onChange={(event) => setEditIssue(event.target.value)} rows={4}
                className="tech-control mt-2 w-full resize-y p-3 text-[14px]"/>
            </label>
            {apiError && <p role="alert" className="mt-3 text-[12px] text-red-500">{apiError}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setEditOrder(null)}
                className="rounded-md border border-[var(--tech-border)] px-4 py-2 text-[13px] text-[var(--tech-text-secondary)]">Cancel</button>
              <button type="button" disabled={updateWorkOrderMutation.isPending || !editIssue.trim()}
                onClick={() => void savePendingOrder()}
                className="rounded-md bg-orange-500 px-4 py-2 text-[13px] font-semibold text-black disabled:opacity-40">
                {updateWorkOrderMutation.isPending ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
      {historyOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4">
          <div className="flex max-h-[80vh] w-full max-w-[1260px] flex-col overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--tech-border)] px-5 py-4">
              <div>
                <h2 className="text-[20px] font-semibold text-[var(--tech-text)]">Work order history</h2>
                {!historyLoading && !historyWarning && (
                  <p className="mt-1 text-[12px] text-[var(--tech-muted)]">
                    {completedHistory.length} completed work order{completedHistory.length === 1 ? "" : "s"}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setSelectedHistory(null); setHistoryOpen(false); }}
                className="text-[var(--tech-muted)] transition-colors hover:text-orange-500"
                aria-label="Close work order history"
              >
                <X size={18} />
              </button>
            </div>
            {historyWarning && (
              <div role="alert" className="px-5 py-3 text-[13px] text-red-500">
                {historyWarning}
                <button type="button" className="ml-3 font-semibold underline" onClick={() => void openHistory()}>
                  Retry
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-auto">
              <div className="min-w-[1580px]">
                <div className="sticky top-0 z-10 grid grid-cols-[115px_175px_minmax(200px,1fr)_175px_165px_165px_minmax(210px,1fr)_110px_100px] items-center gap-3 border-b border-[var(--tech-border)] bg-[var(--tech-surface)] px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--tech-muted)]">
                  <span>Work order</span>
                  <span>Drone ID</span>
                  <span>Task / issue</span>
                  <span>Battery ID</span>
                  <span>Created at</span>
                  <span>Completed at</span>
                  <span>Action taken</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>
                {historyLoading ? (
                  <TechnicianLoadingState label="Loading completed work orders..." />
                ) : completedHistory.length > 0 ? (
                  <div className="divide-y divide-[var(--tech-border)]">
                    {completedHistory.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[115px_175px_minmax(200px,1fr)_175px_165px_165px_minmax(210px,1fr)_110px_100px] items-center gap-3 px-5 py-4 hover:bg-[var(--tech-surface-2)]"
                      >
                        <span className="text-[13px] font-medium text-orange-500">{item.id}</span>
                        <span className="min-w-0 break-words text-[13px] font-medium text-[var(--tech-text)]">{item.droneId}</span>
                        <span className="break-words text-[13px] text-[var(--tech-text-secondary)]">{item.issue}</span>
                        <span className="min-w-0 break-words text-[13px] text-[var(--tech-text-secondary)]">{item.batteryId}</span>
                        <span className="whitespace-nowrap text-[12px] tabular-nums text-[var(--tech-muted)]">{formatWorkOrderTimestamp(item.createdAt)}</span>
                        <span className="whitespace-nowrap text-[12px] tabular-nums text-[var(--tech-muted)]">{formatWorkOrderTimestamp(item.resolvedAt)}</span>
                        <span className="break-words text-[13px] text-[var(--tech-text-secondary)]">{item.actionTaken}</span>
                        <WorkOrderStatusText status="Completed" />
                        <HistoryDetailsButton onClick={() => setSelectedHistory(item)} />
                      </div>
                    ))}
                  </div>
                ) : !historyWarning ? (
                  <div className="px-5 py-12 text-center text-[14px] text-[var(--tech-muted)]">
                    No completed work orders yet.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
      {historyOpen && selectedHistory && <WorkOrderHistoryDetails key={selectedHistory.rawId} item={selectedHistory} onClose={() => setSelectedHistory(null)} formatTime={formatWorkOrderTimestamp} />}
      {/* CREATE WORK ORDER */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-[520px] overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[var(--tech-border)] px-6 py-5">
              <h2 className="text-[20px] font-semibold text-[var(--tech-text)]">
                Create work order
              </h2>
              <button
                type="button"
                onClick={() =>
                  setCreateModalOpen(
                    false,
                  )
                }
                className="text-[var(--tech-muted)] transition-colors hover:text-orange-500"
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={
                handleCreateWorkOrder
              }
            >
              <div className="space-y-4 px-6 py-5">
                <Field label="Drone model">
                  <input
                    readOnly
                    aria-readonly="true"
                    value={droneModel || (
                      !form.droneId.trim()
                        ? "Select a Drone ID below"
                        : modelLoading
                          ? "Loading drone model..."
                          : droneDetailQuery.isError
                            ? "Unable to load drone model"
                            : "Drone model unavailable"
                    )}
                    className="tech-control h-10 w-full cursor-default px-3 !text-[14px]"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Drone ID">
                    {droneLockedFromAlert ? (
                      <input
                        readOnly
                        aria-readonly="true"
                        value={form.droneId}
                        className="tech-control h-10 w-full cursor-default px-3 !text-[14px]"
                      />
                    ) : (
                      // Manual WO creation remains usable, but the technician
                      // must SELECT an existing hub drone, not type an arbitrary ID.
                      <select
                        required
                        value={form.droneId}
                        disabled={fleetQuery.isPending}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            droneId: event.target.value,
                            batteryId: "",
                          }))
                        }
                        className="tech-control h-10 w-full px-3 !text-[14px]"
                      >
                        <option value="">
                          {fleetQuery.isPending ? "Loading drones..." : "Select a drone"}
                        </option>
                        {(fleetQuery.data ?? []).map((drone) => (
                          <option key={drone.id} value={drone.id}>
                            {drone.id}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                  <Field label="Test battery ID (optional)">
                    <select
                      disabled={!droneModel || batteriesQuery.isPending || modelLoading}
                      value={selectedBatteryIsCompatible ? form.batteryId : ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          batteryId: event.target.value,
                        }))
                      }
                      className="tech-control h-10 w-full px-3 !text-[14px]"
                    >
                      <option value="">
                        {!droneModel
                          ? modelLoading
                            ? "Loading drone model..."
                            : "Enter a valid Drone ID first"
                          : batteriesQuery.isPending
                            ? "Loading Ready batteries..."
                            : "No battery needed / Select compatible Ready battery"}
                      </option>
                      {compatibleReadyBatteries.map((battery) => (
                        <option
                          key={battery.backendId ?? battery.id}
                          value={battery.backendId ?? battery.id}
                        >
                          {battery.backendId ?? battery.id} · {battery.chargeLevelPct}% · {battery.model ?? "Model not provided"}
                        </option>
                      ))}
                    </select>
                    {droneModel && !batteriesQuery.isPending && compatibleReadyBatteries.length === 0 && (
                      <p className="mt-1 text-[11px] text-orange-500">
                        No compatible Ready battery found; you can still create a Work Order without a test battery.
                      </p>
                    )}
                  </Field>
                </div>
                <Field label="Task / issue">
                  <input
                    required
                    value={form.title}
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (current) => ({
                          ...current,
                          title:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="Describe required maintenance..."
                    className="tech-control h-10 w-full px-3 !text-[14px]"
                  />
                </Field>
              </div>
              <div className="flex justify-end gap-2 border-t border-[var(--tech-border)] px-6 py-4">
                <Button
                  type="button"
                  onClick={() =>
                    setCreateModalOpen(
                      false,
                    )
                  }
                  className="
                    h-9 rounded-md
                    border border-[var(--tech-border)]
                    !bg-transparent px-4
                    text-[13px]
                    text-[var(--tech-text-secondary)]
                    hover:!border-orange-500/50
                    hover:!bg-transparent
                    hover:!text-orange-500
                  "
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createWorkOrderMutation.isPending ||
                    !form.droneId.trim() ||
                    (Boolean(form.batteryId.trim()) && !selectedBatteryIsCompatible) ||
                    !form.title.trim()
                  }
                  className="h-9 rounded-md bg-orange-500 px-4 text-[13px] font-medium text-black hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createWorkOrderMutation.isPending
                    ? "Creating..."
                    : "Create work order"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </TechnicianPageShell>
  );
}
function WorkOrderStatusText({
  status,
}: {
  status: WorkOrderStatus;
}) {
  const style =
    status === "Completed"
      ? "text-emerald-500"
      : status ===
          "In Progress"
        ? "text-blue-500"
        : "text-orange-500";
  return (
    <span
      className={`text-[13px] font-semibold ${style}`}
    >
      {status}
    </span>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--tech-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}
