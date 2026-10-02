import {
  ArrowUpRight,
  Eye,
  History,
  Plus,
  Search,
  X,
} from "lucide-react";

import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
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
  isRecord,
  pickString,
  unwrapList,
} from "../api/httpClient";

import {
  useTechnicianUsersQuery,
} from "../hooks/useTechnicianMetaQueries";

import {
  loadWorkOrders,
  loadWorkOrderLogs,
  loadMaintenanceRecords,
  type CompletedMaintenanceRecord,
  type WorkOrder,
  type WorkOrderLog,
  type WorkOrderPriority,
  type WorkOrderStatus,
} from "../utils/maintenanceStorage";

import {
  useCreateWorkOrderMutation,
  useUpdateWorkOrderMutation,
  useWorkOrdersQuery,
} from "../hooks/useMaintenanceQueries";

type AlertSource =
  | "Schedule"
  | "Flight event"
  | "Incident";

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
  priority: WorkOrderPriority;
  assignedTo: string;
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
  priority: "Medium",
  assignedTo: "Technician Demo",
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

  const updateWorkOrderMutation =
    useUpdateWorkOrderMutation();

  const technicianUsersQuery =
    useTechnicianUsersQuery();

  const technicianOptions =
    useMemo(
      () =>
        unwrapList(
          technicianUsersQuery.data,
        )
          .filter(isRecord)
          .map((user) => {
            const name =
              pickString(
                user,
                [
                  "full_name",
                  "name",
                  "username",
                  "email",
                ],
                "",
              );

            const email =
              pickString(
                user,
                ["email"],
                "",
              );

            return {
              value:
                name ||
                email,
              label:
                email &&
                name &&
                email !== name
                  ? `${name} (${email})`
                  : name || email,
            };
          })
          .filter(
            (item) =>
              Boolean(item.value),
          ),
      [technicianUsersQuery.data],
    );

  const workOrders: WorkOrder[] =
    workOrdersQuery.data ?? [];

  const [
    workOrderLogs,
    setWorkOrderLogs,
  ] = useState<WorkOrderLog[]>(
    loadWorkOrderLogs,
  );

  const [query, setQuery] =
    useState("");

  const [
    historyOpen,
    setHistoryOpen,
  ] = useState(false);

  const [
    maintenanceRecords,
    setMaintenanceRecords,
  ] = useState<
    CompletedMaintenanceRecord[]
  >(loadMaintenanceRecords);

  const [
    selectedRecord,
    setSelectedRecord,
  ] =
    useState<CompletedMaintenanceRecord | null>(
      null,
    );

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    "all" | ActiveWorkOrderStatus
  >("all");

  const [
    priorityFilter,
    setPriorityFilter,
  ] = useState<
    "all" | WorkOrderPriority
  >("all");

  const [
    createModalOpen,
    setCreateModalOpen,
  ] = useState(false);

  const [form, setForm] =
    useState<WorkOrderForm>(
      initialForm,
    );

  const [apiError, setApiError] =
    useState("");



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
      priority: "Medium",
      assignedTo:
        "Technician Demo",
      relatedAlertId:
        searchParams.get(
          "alertId",
        ) ?? undefined,
      alertSource:
        sourceParam ??
        undefined,
    });

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
              order.drone
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

            const matchesPriority =
              priorityFilter ===
                "all" ||
              order.priority ===
                priorityFilter;

            return (
              matchesSearch &&
              matchesStatus &&
              matchesPriority
            );
          },
        ),
      [
        activeWorkOrders,
        normalizedQuery,
        statusFilter,
        priorityFilter,
      ],
    );

  const openCreateModal = () => {
    setForm(initialForm);
    setCreateModalOpen(true);
  };

  const openHistory = () => {
    setWorkOrderLogs(
      loadWorkOrderLogs(),
    );

    setMaintenanceRecords(
      loadMaintenanceRecords(),
    );

    setHistoryOpen(true);
  };



  const handleCreateWorkOrder = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    if (
      !form.droneId.trim() ||
      !form.batteryId.trim() ||
      !form.title.trim()
    ) {
      setApiError(
        "Drone ID, Battery ID and issue description are required by Backend.",
      );
      return;
    }

    try {
      setApiError("");
      await createWorkOrderMutation.mutateAsync({
        droneId: form.droneId,
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
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Unable to create work order.",
      );
    }
  };

  const handleStatusChange = async (
    orderId: string,
    nextStatus: ActiveWorkOrderStatus,
  ) => {
    try {
      setApiError("");
      await updateWorkOrderMutation.mutateAsync({
        workOrderId: orderId,
        payload: {
          status:
            nextStatus === "In Progress"
              ? "IN_PROGRESS"
              : "NOT_STARTED",
        },
      });
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Unable to update work order.",
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
            (workOrdersQuery.error instanceof Error
              ? workOrdersQuery.error.message
              : "")}
        </div>
      )}

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
            <option value="Not Started">
              Not started
            </option>
            <option value="In Progress">
              In progress
            </option>
          </select>

          <select
            value={priorityFilter}
            onChange={(event) =>
              setPriorityFilter(
                event.target
                  .value as
                  | "all"
                  | WorkOrderPriority,
              )
            }
            className="tech-control h-10 min-w-[170px] px-3 !text-[14px]"
          >
            <option value="all">
              All priority
            </option>
            <option value="High">
              High
            </option>
            <option value="Medium">
              Medium
            </option>
            <option value="Low">
              Low
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
              {filteredWorkOrders.length} work orders
            </span>

            <button
              type="button"
              onClick={openHistory}
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
            <div className="min-w-[1000px]">
              <div className="grid grid-cols-[120px_120px_1fr_120px_180px_170px_70px] items-center border-b border-[var(--tech-border)] px-5 py-3 text-center text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-muted)]">
                <span>Order</span>
                <span>Drone</span>
                <span>Task</span>
                <span>Priority</span>
                <span>Status</span>
                <span>Assigned to</span>
                <span />
              </div>

              {filteredWorkOrders.map(
                (order) => (
                  <div
                    key={order.id}
                    className="group grid grid-cols-[120px_120px_1fr_120px_180px_170px_70px] items-center border-b border-[var(--tech-border)] px-5 py-4 last:border-b-0 hover:bg-[var(--tech-surface-2)]"
                  >
                    <span className="text-center text-[14px] text-[var(--tech-muted)]">
                      {order.id}
                    </span>

                    <span className="text-center text-[15px] font-medium text-[var(--tech-text)]">
                      {order.drone}
                    </span>

                    <span className="px-4 text-[14px] text-[var(--tech-text-secondary)]">
                      {order.title}
                    </span>

                    <div className="flex justify-center">
                      <PriorityText
                        priority={
                          order.priority
                        }
                      />
                    </div>

                    <div className="flex justify-center">
                      <select
                        value={
                          order.status
                        }
                        onChange={(
                          event,
                        ) =>
                          handleStatusChange(
                            order.id,
                            event.target
                              .value as ActiveWorkOrderStatus,
                          )
                        }
                        className="tech-control h-8 w-[150px] px-2 !text-[13px]"
                      >
                        <option value="Not Started">
                          Not started
                        </option>
                        <option value="In Progress">
                          In progress
                        </option>
                      </select>
                    </div>

                    <span className="text-center text-[13px] text-[var(--tech-muted)]">
                      {
                        order.assignedTo
                      }
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/technician/maintenance/work-orders/${order.id}`,
                        )
                      }
                      className="mx-auto text-[var(--tech-subtle)] transition-colors hover:text-orange-500"
                    >
                      <ArrowUpRight
                        size={16}
                      />
                    </button>
                  </div>
                ),
              )}

              {filteredWorkOrders.length ===
                0 && (
                <div className="px-5 py-10 text-center text-[14px] text-[var(--tech-muted)]">
                  No work orders match the current filters.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>


      {historyOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4">
          <div className="flex max-h-[80vh] w-full max-w-[1050px] flex-col overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--tech-border)] px-5 py-4">
              <div>
                <h2 className="text-[20px] font-semibold text-[var(--tech-text)]">
                  Work order history
                </h2>

                
              </div>

              <button
                type="button"
                onClick={() =>
                  setHistoryOpen(false)
                }
                className="text-[var(--tech-muted)] transition-colors hover:text-orange-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <div className="min-w-[1030px]">
                <div className="sticky top-0 z-10 grid grid-cols-[125px_110px_1fr_135px_165px_165px_120px] items-center border-b border-[var(--tech-border)] bg-[var(--tech-surface)] px-5 py-3 text-center text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-muted)]">
                  <span>Work order</span>
                  <span>Drone</span>
                  <span>Activity</span>
                  <span>Status</span>
                  <span>Changed by</span>
                  <span>Changed at</span>
                  <span>Details</span>
                </div>

                {workOrderLogs.map(
                  (log) => {
                    const record =
                      maintenanceRecords.find(
                        (item) =>
                          item.workOrderId ===
                          log.workOrderId,
                      );

                    return (
                      <div
                        key={log.id}
                        className="grid grid-cols-[125px_110px_1fr_135px_165px_165px_120px] items-center border-b border-[var(--tech-border)] px-5 py-4 last:border-b-0"
                      >
                        <span className="text-center text-[14px] font-medium text-orange-500">
                          {log.workOrderId}
                        </span>

                        <span className="text-center text-[14px] text-[var(--tech-text)]">
                          {log.drone}
                        </span>

                        <span className="px-4 text-[14px] text-[var(--tech-text-secondary)]">
                          {log.action}
                        </span>

                        <div className="flex justify-center">
                          <WorkOrderStatusText
                            status={
                              log.status
                            }
                          />
                        </div>

                        <span className="text-center text-[13px] text-[var(--tech-muted)]">
                          {log.changedBy}
                        </span>

                        <span className="text-center text-[13px] text-[var(--tech-muted)]">
                          {log.changedAt}
                        </span>

                        <div className="flex justify-center">
                          {log.status ===
                            "Completed" &&
                          record ? (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedRecord(
                                  record,
                                )
                              }
                              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--tech-text-secondary)] transition-colors hover:text-orange-500"
                            >
                              <Eye
                                size={14}
                              />
                              View
                            </button>
                          ) : (
                            <span className="text-[13px] text-[var(--tech-subtle)]">
                              —
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  },
                )}

                {workOrderLogs.length === 0 && (
                  <div className="px-5 py-12 text-center text-[14px] text-[var(--tech-muted)]">
                    No work order history yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedRecord && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/65 px-4">
          <div className="flex max-h-[86vh] w-full max-w-[860px] flex-col overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[var(--tech-border)] px-6 py-5">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-[20px] font-semibold text-[var(--tech-text)]">
                    Work completed
                  </h2>

                  <span className="text-[13px] font-semibold text-emerald-500">
                    Completed
                  </span>
                </div>

                <p className="mt-1 text-[13px] text-[var(--tech-muted)]">
                  {selectedRecord.workOrderId} ·{" "}
                  {selectedRecord.drone}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedRecord(
                    null,
                  )
                }
                className="text-[var(--tech-muted)] transition-colors hover:text-orange-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <DetailMeta
                  label="Work order"
                  value={
                    selectedRecord.workOrderId
                  }
                />

                <DetailMeta
                  label="Drone"
                  value={
                    selectedRecord.drone
                  }
                />

                <DetailMeta
                  label="Priority"
                  value={
                    selectedRecord.priority
                  }
                />

                <DetailMeta
                  label="Resulting status"
                  value={
                    selectedRecord.resultingStatus
                  }
                />

                <DetailMeta
                  label="Technician"
                  value={
                    selectedRecord.assignedTo
                  }
                />

                <DetailMeta
                  label="Created"
                  value={
                    selectedRecord.createdAt
                  }
                />

                <DetailMeta
                  label="Scheduled"
                  value={
                    selectedRecord.scheduledAt ??
                    "Not scheduled"
                  }
                />

                <DetailMeta
                  label="Completed"
                  value={
                    selectedRecord.completedAt
                  }
                />
              </div>

              <div className="mt-6">
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-muted)]">
                  Task
                </h3>

                <p className="mt-2 text-[15px] leading-6 text-[var(--tech-text)]">
                  {selectedRecord.title}
                </p>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <DetailTextBlock
                  title="Diagnosis"
                  value={
                    selectedRecord.diagnosis
                  }
                />

                <DetailTextBlock
                  title="Corrective action"
                  value={
                    selectedRecord.correctiveAction
                  }
                />
              </div>

              <div className="mt-6">
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-muted)]">
                  Inspection completed
                </h3>

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {selectedRecord.inspectionItems.map(
                    (item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 rounded-md border border-[var(--tech-border)] bg-[var(--tech-surface-2)] px-3 py-2.5"
                      >
                        <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                          ✓
                        </span>

                        <span className="text-[13px] text-[var(--tech-text-secondary)]">
                          {item}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-[var(--tech-border)] px-6 py-4">
              <Button
                type="button"
                onClick={() =>
                  setSelectedRecord(
                    null,
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
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

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
                <Field label="Drone">
                  <input
                    required
                    value={form.drone}
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (current) => ({
                          ...current,
                          drone:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="CX-09"
                    className="tech-control h-10 w-full px-3 !text-[14px]"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Drone ID">
                    <input
                      required
                      value={form.droneId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          droneId: event.target.value,
                        }))
                      }
                      placeholder="DR-001"
                      className="tech-control h-10 w-full px-3 !text-[14px]"
                    />
                  </Field>

                  <Field label="Battery ID">
                    <input
                      required
                      value={form.batteryId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          batteryId: event.target.value,
                        }))
                      }
                      placeholder="BAT-001"
                      className="tech-control h-10 w-full px-3 !text-[14px]"
                    />
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

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Priority">
                    <select
                      value={
                        form.priority
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (current) => ({
                            ...current,
                            priority:
                              event.target
                                .value as WorkOrderPriority,
                          }),
                        )
                      }
                      className="tech-control h-10 w-full px-3 !text-[14px]"
                    >
                      <option value="High">
                        High
                      </option>
                      <option value="Medium">
                        Medium
                      </option>
                      <option value="Low">
                        Low
                      </option>
                    </select>
                  </Field>

                  <Field label="Assigned technician">
                    <input
                      list="technician-user-options"
                      value={
                        form.assignedTo
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (current) => ({
                            ...current,
                            assignedTo:
                              event.target
                                .value,
                          }),
                        )
                      }
                      className="tech-control h-10 w-full px-3 !text-[14px]"
                    />

                    <datalist id="technician-user-options">
                      {technicianOptions.map(
                        (technician) => (
                          <option
                            key={
                              technician.label
                            }
                            value={
                              technician.value
                            }
                          >
                            {
                              technician.label
                            }
                          </option>
                        ),
                      )}
                    </datalist>
                  </Field>
                </div>
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
                  className="h-9 rounded-md bg-orange-500 px-4 text-[13px] font-medium text-black hover:bg-orange-600"
                >
                  Create work order
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </TechnicianPageShell>
  );
}

function PriorityText({
  priority,
}: {
  priority: WorkOrderPriority;
}) {
  return (
    <span
      className={`text-[13px] font-medium ${
        priority === "High"
          ? "text-red-500"
          : priority ===
              "Medium"
            ? "text-orange-500"
            : "text-[var(--tech-muted)]"
      }`}
    >
      {priority}
    </span>
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

function DetailMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-[var(--tech-border)] bg-[var(--tech-surface-2)] p-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-subtle)]">
        {label}
      </span>

      <p className="mt-1.5 text-[14px] font-medium text-[var(--tech-text-secondary)]">
        {value}
      </p>
    </div>
  );
}

function DetailTextBlock({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-[var(--tech-border)] bg-[var(--tech-surface-2)] p-4">
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-muted)]">
        {title}
      </h3>

      <p className="mt-3 whitespace-pre-wrap text-[14px] leading-6 text-[var(--tech-text-secondary)]">
        {value}
      </p>
    </div>
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
