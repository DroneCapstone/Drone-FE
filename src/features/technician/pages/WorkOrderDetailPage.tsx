import {
  ArrowLeft,
  Check,
  ClipboardCheck,
  TriangleAlert,
  UserRound,
  Wrench,
} from "lucide-react";

import { useEffect, useState } from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { Button } from "@/components/shadcn/ui/button";

import {
  Card,
  CardContent,
} from "@/components/shadcn/ui/card";

import { Textarea } from "@/components/shadcn/ui/textarea";

import { TechnicianPageShell } from "../components/TechnicianPageShell";

import {
  addMaintenanceRecord,
  appendWorkOrderLog,
  formatMaintenanceTime,
  type WorkOrderStatus,
} from "../utils/maintenanceStorage";

import {
  useCreateMaintenanceRecordMutation,
  useUpdateWorkOrderInspectionMutation,
  useUpdateWorkOrderMutation,
  useWorkOrderQuery,
} from "../hooks/useMaintenanceQueries";

import {
  type DroneStatus,
} from "../utils/fleetStorage";

import {
  useFleetQuery,
  useUpdateDroneStatusMutation,
} from "../hooks/useFleetQueries";

const inspectionItems = [
  "Visual inspection of drone body",
  "Propeller and motor condition",
  "Landing gear condition",
  "Battery level and connector check",
  "Power-on and operational test",
];

export function WorkOrderDetailPage() {
  const navigate = useNavigate();

  const { workOrderId } =
    useParams();

  const workOrderQuery =
    useWorkOrderQuery(
      workOrderId,
    );

  const fleetQuery =
    useFleetQuery();

  const updateWorkOrderMutation =
    useUpdateWorkOrderMutation();

  const updateInspectionMutation =
    useUpdateWorkOrderInspectionMutation();

  const createMaintenanceRecordMutation =
    useCreateMaintenanceRecordMutation();

  const updateDroneStatusMutation =
    useUpdateDroneStatusMutation();

  const order =
    workOrderQuery.data;

  const loading =
    workOrderQuery.isPending &&
    !order;

  const [apiError, setApiError] = useState("");

  const [
    workOrderStatus,
    setWorkOrderStatus,
  ] = useState<WorkOrderStatus>(
    order?.status ??
      "Not Started",
  );

  const [
    checkedItems,
    setCheckedItems,
  ] = useState<string[]>([]);

  const [
    diagnosis,
    setDiagnosis,
  ] = useState("");

  const [
    correctiveAction,
    setCorrectiveAction,
  ] = useState("");

  const [
    droneStatus,
    setDroneStatus,
  ] = useState<DroneStatus>(
    "Maintenance",
  );

  useEffect(() => {
    if (order) {
      setWorkOrderStatus(
        order.status,
      );
    }
  }, [order]);


  const fleetDrone =
    order
      ? (fleetQuery.data ?? []).find(
          (item) =>
            item.id ===
            order.droneId,
        )
      : undefined;

  if (loading) {
    return (
      <TechnicianPageShell title="Work order" description="">
        <p className="text-[14px] text-[var(--tech-muted)]">Loading work order...</p>
      </TechnicianPageShell>
    );
  }

  if (!order) {
    return (
      <TechnicianPageShell
        title="Work order not found"
        description=""
      >
        <button
          type="button"
          onClick={() =>
            navigate(
              "/technician/maintenance/work-orders",
            )
          }
          className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--tech-muted)] transition-colors hover:text-orange-500"
        >
          <ArrowLeft size={14} />
          Back to work orders
        </button>
      </TechnicianPageShell>
    );
  }

  const persistStatus = async (
    nextStatus: WorkOrderStatus,
    action: string,
  ) => {
    try {
      setApiError("");
      await updateWorkOrderMutation.mutateAsync({
        workOrderId: order.id,
        payload: {
          status:
            nextStatus === "In Progress"
              ? "IN_PROGRESS"
              : nextStatus === "Completed"
                ? "COMPLETED"
                : "NOT_STARTED",
        },
      });

      appendWorkOrderLog({
        workOrderId: order.id,
        drone: order.drone,
        action,
        status: nextStatus,
        changedAt: formatMaintenanceTime(),
        changedBy: order.assignedTo,
      });

      setWorkOrderStatus(nextStatus);
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Unable to update work order status.",
      );
    }
  };

  const toggleInspection = (
    item: string,
  ) => {
    setCheckedItems((current) =>
      current.includes(item)
        ? current.filter(
            (value) =>
              value !== item,
          )
        : [...current, item],
    );

    if (
      workOrderStatus ===
      "Not Started"
    ) {
      void persistStatus(
        "In Progress",
        "Work order started",
      );
    }
  };

  const allInspectionCompleted =
    checkedItems.length ===
    inspectionItems.length;

  const canComplete =
    allInspectionCompleted &&
    diagnosis.trim().length > 0 &&
    correctiveAction.trim()
      .length > 0;

  const completeWorkOrder = async () => {
    if (!canComplete) return;

    try {
      setApiError("");

      await updateInspectionMutation.mutateAsync({
        workOrderId: order.id,
        payload: { status: "COMPLETED" },
      });

      await updateWorkOrderMutation.mutateAsync({
        workOrderId: order.id,
        payload: {
          status: "COMPLETED",
          diagnosis: diagnosis.trim(),
          corrective_action: correctiveAction.trim(),
        },
      });

      await createMaintenanceRecordMutation.mutateAsync({
        workOrderId: order.id,
        droneId: order.droneId,
        title: order.title,
        diagnosis: diagnosis.trim(),
        correctiveAction: correctiveAction.trim(),
        resultingDroneStatus: droneStatus,
        inspectionItems: [...checkedItems],
      });

      await updateDroneStatusMutation.mutateAsync({
        droneId: order.droneId,
        status: droneStatus,
      });

      const completedAt = formatMaintenanceTime();

      addMaintenanceRecord({
        id: `MR-${Date.now()}`,
        workOrderId: order.id,
        droneId: order.droneId,
        drone: order.drone,
        title: order.title,
        priority: order.priority,
        assignedTo: order.assignedTo,
        diagnosis: diagnosis.trim(),
        correctiveAction: correctiveAction.trim(),
        inspectionItems: [...checkedItems],
        resultingStatus: droneStatus,
        createdAt: order.createdAt,
        scheduledAt: order.scheduledAt,
        completedAt,
      });

      setWorkOrderStatus("Completed");
      navigate(
        "/technician/maintenance/work-orders",
        { replace: true },
      );
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Unable to complete work order.",
      );
    }
  };

  return (
    <TechnicianPageShell
      title={order.id}
      description={`${order.drone} · ${order.title}`}
      action={
        <Button
          type="button"
          disabled={
            !canComplete ||
            workOrderStatus ===
              "Completed"
          }
          onClick={
            completeWorkOrder
          }
          className="h-9 rounded-md bg-orange-500 px-4 text-[15px] font-medium text-black hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Check size={14} />

          {workOrderStatus ===
          "Completed"
            ? "Completed"
            : "Complete work order"}
        </Button>
      }
    >
      {(apiError || workOrderQuery.error instanceof Error) && (
        <div className="mb-4 rounded-md border border-red-500/25 px-4 py-3 text-[13px] text-red-500">
          {apiError ||
            (workOrderQuery.error instanceof Error
              ? workOrderQuery.error.message
              : "")}
        </div>
      )}

      {/* Back */}
      <button
        type="button"
        onClick={() =>
          navigate(
            "/technician/maintenance/work-orders",
          )
        }
        className="mb-4 inline-flex items-center gap-2 text-[14px] font-medium text-[var(--tech-muted)] transition-colors hover:!text-orange-500"
      >
        <ArrowLeft size={14} />

        Back to work orders
      </button>

      {/* Overview */}
      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <OverviewCard
          icon={ClipboardCheck}
          label="Status"
          value={workOrderStatus}
        />

        <OverviewCard
          icon={TriangleAlert}
          label="Priority"
          value={order.priority}
        />

        <OverviewCard
          icon={UserRound}
          label="Assigned technician"
          value={order.assignedTo}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_330px]">
        {/* Main */}
        <div className="space-y-5">
          {/* Inspection */}
          <Section
            icon={ClipboardCheck}
            title="Inspection"
          >
            <p className="mb-3 text-[13px] text-[var(--tech-muted)]">
              Complete each inspection
              item before closing the
              work order.
            </p>

            {inspectionItems.map(
              (item) => (
                <div key={item}>
                  <InspectionItem
                    label={item}
                    checked={checkedItems.includes(
                      item,
                    )}
                    onClick={() =>
                      toggleInspection(
                        item,
                      )
                    }
                  />
                </div>
              ),
            )}

            <div className="mt-3 flex justify-between text-[13px] text-[var(--tech-muted)]">
              <span>
                Inspection progress
              </span>

              <span>
                {
                  checkedItems.length
                }
                /
                {
                  inspectionItems.length
                }
              </span>
            </div>

            <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--tech-border)]">
              <div
                className="h-full rounded-full bg-orange-500 transition-all duration-200"
                style={{
                  width: `${
                    (checkedItems.length /
                      inspectionItems.length) *
                    100
                  }%`,
                }}
              />
            </div>
          </Section>

          {/* Diagnosis */}
          <Section
            icon={ClipboardCheck}
            title="Diagnosis"
          >
            <p className="mb-3 text-[13px] text-[var(--tech-muted)]">
              Record the technical
              findings identified
              during inspection.
            </p>

            <Textarea
              value={diagnosis}
              onChange={(event) =>
                setDiagnosis(
                  event.target.value,
                )
              }
              placeholder="Describe inspection findings and diagnosed issue..."
              className="min-h-[140px] resize-y overflow-auto border-[var(--tech-border)] bg-[var(--tech-surface-2)] text-[15px] leading-6 text-[var(--tech-text)]"
            />
          </Section>

          {/* Corrective Action */}
          <Section
            icon={Wrench}
            title="Corrective action"
          >
            <p className="mb-3 text-[13px] text-[var(--tech-muted)]">
              Record the maintenance
              or corrective action
              performed on the drone.
            </p>

            <Textarea
              value={
                correctiveAction
              }
              onChange={(event) =>
                setCorrectiveAction(
                  event.target.value,
                )
              }
              placeholder="Record repair, adjustment, replacement or other corrective action..."
              className="min-h-[140px] resize-y overflow-auto border-[var(--tech-border)] bg-[var(--tech-surface-2)] text-[15px] leading-6 text-[var(--tech-text)]"
            />
          </Section>

          {/* Update Drone Status */}
          <Section
            icon={Check}
            title="Update drone status"
          >
            <p className="mb-3 text-[13px] text-[var(--tech-muted)]">
              Select the resulting
              operational status after
              maintenance.
            </p>

            <select
              value={droneStatus}
              onChange={(event) =>
                setDroneStatus(
                  event.target
                    .value as DroneStatus,
                )
              }
              className="tech-control h-10 w-full px-3"
            >
              <option value="Available">
                Available
              </option>

              <option value="Maintenance">
                Maintenance
              </option>

            </select>
          </Section>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Work order info */}
          <Card className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
            <CardContent className="p-5">
              <h2 className="text-[18px] font-semibold text-[var(--tech-text)]">
                Work order information
              </h2>

              <div className="mt-5 space-y-4">
                <Meta
                  label="Work order"
                  value={order.id}
                />

                <Meta
                  label="Drone"
                  value={`${order.drone} · ${order.droneId}`}
                />

                <Meta
                  label="Model"
                  value={
                    fleetDrone?.model ??
                    "—"
                  }
                />

                <Meta
                  label="Priority"
                  value={
                    order.priority
                  }
                />

                <Meta
                  label="Assigned technician"
                  value={
                    order.assignedTo
                  }
                />

                <Meta
                  label="Created"
                  value={
                    order.createdAt
                  }
                />

                <Meta
                  label="Scheduled"
                  value={
                    order.scheduledAt ??
                    "Not scheduled"
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Workflow */}
          <Card className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
            <CardContent className="p-5">
              <h2 className="text-[18px] font-semibold text-[var(--tech-text)]">
                Work order progress
              </h2>

              <div className="mt-5">
                <TimelineItem
                  label="Work order created"
                  completed
                />

                <TimelineItem
                  label="Inspection"
                  completed={
                    allInspectionCompleted
                  }
                />

                <TimelineItem
                  label="Diagnosis"
                  completed={
                    diagnosis.trim()
                      .length > 0
                  }
                />

                <TimelineItem
                  label="Corrective action"
                  completed={
                    correctiveAction
                      .trim()
                      .length > 0
                  }
                />

                <TimelineItem
                  label="Completed"
                  completed={
                    workOrderStatus ===
                    "Completed"
                  }
                  last
                />
              </div>
            </CardContent>
          </Card>

          {/* Completion rule */}
          {!canComplete &&
            workOrderStatus !==
              "Completed" && (
              <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4">
                <div className="flex gap-3">
                  <TriangleAlert
                    size={15}
                    className="mt-0.5 shrink-0 text-orange-500"
                  />

                  <div>
                    <p className="text-[14px] font-medium text-[var(--tech-text)]">
                      Work order
                      incomplete
                    </p>

                    <p className="mt-1 text-[13px] leading-4 text-[var(--tech-muted)]">
                      Complete the
                      inspection,
                      diagnosis and
                      corrective action
                      before closing this
                      work order.
                    </p>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
    </TechnicianPageShell>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Wrench;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
      <CardContent className="p-5">
        <h2 className="flex items-center gap-2 text-[18px] font-semibold text-[var(--tech-text)]">
          <Icon
            size={15}
            className="text-orange-500"
          />

          {title}
        </h2>

        <div className="mt-4">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function InspectionItem({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-2 flex h-10 w-full items-center justify-between rounded-md border border-[var(--tech-border)] bg-[var(--tech-surface-2)] px-3 text-left transition-colors hover:border-orange-500/40"
    >
      <span className="text-[14px] text-[var(--tech-text-secondary)]">
        {label}
      </span>

      <span
        className={`grid h-5 w-5 place-items-center rounded border ${
          checked
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
            : "border-[var(--tech-border)] text-[var(--tech-subtle)]"
        }`}
      >
        {checked && (
          <Check size={12} />
        )}
      </span>
    </button>
  );
}

function OverviewCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wrench;
  label: string;
  value: string;
}) {
  return (
    <Card className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-orange-500/10 text-orange-500">
          <Icon size={16} />
        </div>

        <div>
          <p className="text-[13px] text-[var(--tech-muted)]">
            {label}
          </p>

          <p className="mt-1 text-[16px] font-semibold text-[var(--tech-text)]">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Meta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--tech-subtle)]">
        {label}
      </span>

      <p className="mt-1 text-[14px] text-[var(--tech-text-secondary)]">
        {value}
      </p>
    </div>
  );
}

function TimelineItem({
  label,
  completed,
  last = false,
}: {
  label: string;
  completed: boolean;
  last?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`grid h-5 w-5 place-items-center rounded-full border ${
            completed
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-[var(--tech-border)] bg-[var(--tech-surface-2)]"
          }`}
        >
          {completed && (
            <Check size={11} />
          )}
        </div>

        {!last && (
          <div className="h-8 w-px bg-[var(--tech-border)]" />
        )}
      </div>

      <span
        className={`pt-0.5 text-[13px] ${
          completed
            ? "text-[var(--tech-text-secondary)]"
            : "text-[var(--tech-subtle)]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}