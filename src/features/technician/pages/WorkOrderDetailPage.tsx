import {
  ArrowLeft,
  Check,
  ClipboardCheck,
  TriangleAlert,
  UserRound,
  Wrench,
} from "lucide-react";

import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { useQueries } from "@tanstack/react-query";
import { getHubSupplyDetailApi } from "../api/hubSuppliesApi";
import {
  inventoryDetailKey,
  useHubSuppliesQuery,
  useUseHubPartsMutation,
} from "../hooks/useHubSuppliesQueries";

import { Button } from "@/components/shadcn/ui/button";

import {
  Card,
  CardContent,
} from "@/components/shadcn/ui/card";

import { Textarea } from "@/components/shadcn/ui/textarea";

import { TechnicianPageShell } from "../components/TechnicianPageShell";

import {
  appendWorkOrderLog,
  formatMaintenanceTime,
  type WorkOrderStatus,
} from "../utils/maintenanceStorage";

import {
  useUpdateWorkOrderInspectionMutation,
  useWorkOrderQuery,
} from "../hooks/useMaintenanceQueries";

// WorkOrder completion values as defined in WORK_ORDER_INSPECTION_GUIDE.md.
type WorkOrderResultingDroneStatus = "Ready" | "Maintenance" | "Retired";

import { TechnicianApiError } from "../utils/technicianApi";

import {
  useFleetQuery,
} from "../hooks/useFleetQueries";

// A punctuation-only or placeholder action must never be submitted to BE.
// Allow Vietnamese / English and count actual letters or numbers, not symbols.
function hasMeaningfulCorrectiveAction(value: string): boolean {
  const text = value.trim();
  const characters = text.match(/[\p{L}\p{N}]/gu) ?? [];
  return text.length >= 10 && characters.length >= 5;
}

// Compare the exact drone model, ignoring only case and repeated whitespace.
// A DJI Matrice part must not automatically match a DJI FlyCart model.
function normalizeDroneModel(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

const inspectionItems = [
  "Visual inspection of drone body",
  "Propeller and motor condition",
  "Landing gear condition",
  "Power connector and test battery check",
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

  const updateInspectionMutation =
    useUpdateWorkOrderInspectionMutation();

  // Replacement parts are consumed immediately via the existing hub inventory API.
  // They are NOT deducted again when the Work Order is completed.
  const inventoryQuery = useHubSuppliesQuery();
  const usePartsMutation = useUseHubPartsMutation();

  const order =
    workOrderQuery.data;

  const loading =
    workOrderQuery.isPending &&
    !order;

  const [apiError, setApiError] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionRequiresReview, setCompletionRequiresReview] = useState(false);
  const completionLock = useRef(false);
  const startLock = useRef(false);

  const [
    workOrderStatus,
    setWorkOrderStatus,
  ] = useState<WorkOrderStatus>(
    order?.status ??
      "Pending",
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
  ] = useState<WorkOrderResultingDroneStatus>(
    "Maintenance",
  );

  const [correctiveActionMode, setCorrectiveActionMode] =
    useState<"general" | "replace">("general");
  const [replacementInventoryId, setReplacementInventoryId] = useState("");
  const [replacementQuantity, setReplacementQuantity] = useState("1");
  const [recordedReplacements, setRecordedReplacements] = useState<string[]>([]);
  const [replacementFeedback, setReplacementFeedback] = useState("");
  const replacementLock = useRef(false);

  const partDetails = useQueries({
    queries: (inventoryQuery.data ?? []).map((item) => ({
      queryKey: inventoryDetailKey(item.id),
      queryFn: () => getHubSupplyDetailApi(item.id),
      enabled: correctiveActionMode === "replace",
      staleTime: 5 * 60_000,
      gcTime: 60 * 60_000,
      refetchOnWindowFocus: false,
    })),
  });
  const inventoryParts = (inventoryQuery.data ?? []).map((item, index) => ({
    ...item,
    partCategory: partDetails[index]?.data?.partCategory ?? item.partCategory,
  }));
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

  const workOrderDroneModel = (order?.model || fleetDrone?.model || "").trim();
  const normalizedDroneModel = normalizeDroneModel(workOrderDroneModel);

  // Show only in-stock parts whose Backend compatibility list explicitly
  // includes this Work Order's exact drone model. Unknown compatibility is
  // NOT treated as compatible.
  const compatibleInventoryParts = inventoryParts.filter((item) =>
    item.quantity > 0 &&
    normalizedDroneModel !== "" &&
    (item.partCategory?.compatibleDroneModels ?? []).some(
      (model) => normalizeDroneModel(model) === normalizedDroneModel,
    ),
  );
  const selectedInventory = compatibleInventoryParts.find(
    (item) => String(item.id) === replacementInventoryId,
  );

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

  const startWorkOrder = async () => {
    if (startLock.current || workOrderStatus !== "Pending") return;
    startLock.current = true;
    try {
      setApiError("");
      // Official workflow: PATCH /inspection also starts a Work Order.
      await updateInspectionMutation.mutateAsync({
        workOrderId: order.id,
        payload: {
          status: "In Progress",
          action_taken: "Bắt đầu kiểm tra drone",
        },
      });
      try {
        appendWorkOrderLog({
          workOrderId: order.id,
          drone: order.drone,
          action: "Work order started",
          status: "In Progress",
          changedAt: formatMaintenanceTime(),
          changedBy: order.assignedTo,
        });
      } catch {
        // Local history is best-effort; server PATCH already succeeded.
      }
      setWorkOrderStatus("In Progress");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Unable to start work order.");
      // If server may have accepted the PATCH, refresh rather than retry blindly.
      void workOrderQuery.refetch();
    } finally {
      startLock.current = false;
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
      "Pending"
    ) {
      void startWorkOrder();
    }
  };

  const allInspectionCompleted =
    checkedItems.length ===
    inspectionItems.length;

  // Preserve confirmed inventory usage in the Work Order action, even if
  // the free-text field is edited after the stock deduction.
  const actionTakenForServer = [
    correctiveAction.trim(),
    ...recordedReplacements.filter((note) => !correctiveAction.includes(note)),
  ].filter(Boolean).join("\n");
  const correctiveActionIsValid =
    hasMeaningfulCorrectiveAction(actionTakenForServer);

  // A selected replacement must actually be issued before this WO can close.
  const replacementConfirmed =
    correctiveActionMode !== "replace" || recordedReplacements.length > 0;

  const canComplete =
    workOrderStatus === "In Progress" &&
    allInspectionCompleted &&
    correctiveActionIsValid &&
    replacementConfirmed &&
    !usePartsMutation.isPending;

  const confirmPartReplacement = async () => {
    if (replacementLock.current || usePartsMutation.isPending || inventoryQuery.isFetching ||
        workOrderStatus !== "In Progress" || !selectedInventory) return;

    const quantity = Number(replacementQuantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1 ||
        quantity > selectedInventory.quantity) {
      setReplacementFeedback("Invalid quantity or insufficient inventory. Refresh and try again.");
      return;
    }

    const compatible = selectedInventory.partCategory?.compatibleDroneModels ?? [];
    if (!normalizedDroneModel ||
        !compatible.some((model) => normalizeDroneModel(model) === normalizedDroneModel)) {
      setReplacementFeedback("This part is not verified as compatible with this Work Order's drone model.");
      return;
    }

    replacementLock.current = true;
    setReplacementFeedback("");
    try {
      const updated = await usePartsMutation.mutateAsync({
        inventoryId: selectedInventory.id,
        quantityUsed: quantity,
      });
      const partName = selectedInventory.partCategory?.name ??
        `Part category #${selectedInventory.partCategoryId}`;
      const note = `Replaced ${quantity} x ${partName} (inventory #${selectedInventory.id})`;
      setRecordedReplacements((current) => [...current, note]);
      setCorrectiveAction((current) => [current.trim(), note].filter(Boolean).join("\n"));
      setReplacementQuantity("1");
      setReplacementFeedback(`Inventory updated: ${quantity} part(s) issued. Remaining: ${updated.quantity}.`);
      // Refresh for further replacements; not part of the confirmed write.
      void inventoryQuery.refetch();
    } catch (error) {
      setReplacementFeedback(
        `${error instanceof Error ? error.message : "Unable to issue parts."} ` +
        "If the request may have reached the server, check inventory before retrying to avoid double deduction.",
      );
    } finally {
      replacementLock.current = false;
    }
  };

  const completeWorkOrder = async () => {
    if (
      !canComplete ||
      completionLock.current ||
      completionRequiresReview ||
      isCompleting
    ) return;

    completionLock.current = true;
    setIsCompleting(true);
    try {
      setApiError("");

      // BE contract (confirmed on 2026-11-05): PATCH /inspection is the ONLY
      // write required to complete a Work Order. No Maintenance Record POST,
      // extra Work Order PUT, or separate Drone status update is necessary.
      // BE accepts Ready / Maintenance / Retired for resulting drone status.
      await updateInspectionMutation.mutateAsync({
        workOrderId: order.id,
        payload: {
          status: "Completed",
          action_taken: actionTakenForServer,
          ...(diagnosis.trim() ? { diagnosis: diagnosis.trim() } : {}),
          resulting_drone_status: droneStatus,
        },
      });

      try {
        appendWorkOrderLog({
          workOrderId: order.id,
          drone: order.drone,
          action: "Work order completed",
          status: "Completed",
          changedAt: formatMaintenanceTime(),
          changedBy: order.assignedTo,
        });
      } catch {
        // Local history is best-effort; server PATCH already succeeded.
      }

      setWorkOrderStatus("Completed");
      navigate("/technician/maintenance/work-orders", { replace: true });
    } catch (error) {
      let explanation: string;
      let mustVerifyServer = false;
      if (error instanceof TechnicianApiError) {
        if (error.status === 0) {
          mustVerifyServer = true;
          explanation =
            "The browser could not read the response (network/CORS). " +
            "The request may have reached the server; refresh and check its status.";
        } else if (error.status >= 500) {
          mustVerifyServer = true;
          explanation =
            `Backend returned HTTP ${error.status}. ` +
            "Check the server logs for this exact Work Order and request payload.";
        } else {
          explanation = `Backend returned HTTP ${error.status}: ${error.message}`;
        }
      } else {
        // React Query can also report a follow-up invalidation/refetch error
        // after the PATCH was applied: verify the BE state before retrying.
        mustVerifyServer = true;
        explanation = error instanceof Error ? error.message : "Unknown error.";
      }
      if (mustVerifyServer) setCompletionRequiresReview(true);
      setApiError(
        `Unable to confirm completion of Work Order ${order.id}. ${explanation}` +
        (mustVerifyServer ? " Check the server state before trying again." : ""),
      );
    } finally {
      completionLock.current = false;
      setIsCompleting(false);
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
            isCompleting ||
            completionRequiresReview ||
            updateInspectionMutation.isPending
          }
          onClick={
            completeWorkOrder
          }
          className="h-9 rounded-md bg-orange-500 px-4 text-[15px] font-medium text-black hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Check size={14} />

          {workOrderStatus === "Completed"
            ? "Completed"
            : isCompleting
              ? "Completing..."
              : completionRequiresReview
                ? "Check server state"
                : "Complete work order"}
        </Button>
      }
    >
      {(apiError || workOrderQuery.error instanceof Error) && (
        <div role="alert" className="mb-4 rounded-md border border-red-500/25 px-4 py-3 text-[13px] text-red-500">
          {apiError ||
            (workOrderQuery.error instanceof Error
              ? workOrderQuery.error.message
              : "")}
          {completionRequiresReview && (
            <button
              type="button"
              className="ml-3 font-semibold underline"
              onClick={() => window.location.reload()}
            >
              Reload work order
            </button>
          )}
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
      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <OverviewCard
          icon={ClipboardCheck}
          label="Status"
          value={workOrderStatus}
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
           

            {order.batteryId && (
              <div className="mb-3 rounded-md border border-[var(--tech-border)] bg-[var(--tech-surface-2)] px-3 py-2.5">
                <p className="text-[12px] font-medium text-[var(--tech-text-secondary)]">
                  Test battery: {order.batteryId}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-[var(--tech-muted)]">
                  Used temporarily for power-on and diagnostic testing. Battery inventory remains managed in Battery Management.
                </p>
              </div>
            )}

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
              during inspection (optional).
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
            

            <label className="mb-3 block text-[13px] text-[var(--tech-text-secondary)]">
              Corrective action type
              <select
                className="tech-control mt-1 h-10 w-full px-3"
                value={correctiveActionMode}
                onChange={(event) => {
                  setCorrectiveActionMode(event.target.value as "general" | "replace");
                  setReplacementFeedback("");
                }}
                disabled={workOrderStatus === "Completed" || usePartsMutation.isPending}
              >
                <option value="general">Repair / adjustment / other</option>
                <option value="replace">Replace parts (deduct from Hub inventory)</option>
              </select>
            </label>

            {correctiveActionMode === "replace" && (
              <div className="mb-4 space-y-3 rounded-md border border-[var(--tech-border)] bg-[var(--tech-surface-2)] p-3">
               
                {inventoryQuery.isError && (
                  <p role="alert" className="text-[12px] text-red-500">
                    {inventoryQuery.error instanceof Error ? inventoryQuery.error.message : "Unable to load parts."}
                    <button type="button" className="ml-2 underline"
                      onClick={() => void inventoryQuery.refetch()}>Retry</button>
                  </p>
                )}
                <label className="block text-[12px] text-[var(--tech-text-secondary)]">
                  Part in Hub inventory
                  <select
                    className="tech-control mt-1 h-10 w-full px-3"
                    value={selectedInventory ? replacementInventoryId : ""}
                    onChange={(event) => {
                      setReplacementInventoryId(event.target.value);
                      setReplacementQuantity("1");
                      setReplacementFeedback("");
                    }}
                    disabled={workOrderStatus !== "In Progress" || usePartsMutation.isPending}
                  >
                    <option value="">Select a part</option>
                    {compatibleInventoryParts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.partCategory?.name ?? `Category #${item.partCategoryId}`} · #{item.id} · {item.quantity} available
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-[11px] text-[var(--tech-muted)]">
                  {workOrderDroneModel
                    ? `Showing parts compatible with: ${workOrderDroneModel}`
                    : "Drone model unavailable. Parts cannot be selected until the model is known."}
                </p>
                {workOrderDroneModel && compatibleInventoryParts.length === 0 &&
                  !inventoryQuery.isPending && !partDetails.some((query) => query.isPending) && (
                    <p className="text-[12px] text-[var(--tech-muted)]">
                      No in-stock parts registered as compatible with this model at your Hub.
                    </p>
                  )}
                <label className="block text-[12px] text-[var(--tech-text-secondary)]">
                  Quantity to replace
                  <input
                    className="tech-control mt-1 h-10 w-full px-3"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={selectedInventory?.quantity}
                    step={1}
                    value={replacementQuantity}
                    onKeyDown={(event) => {
                      // Keep native number input spinner, but block decimal,
                      // negative and exponent characters when typing.
                      if ([".", ",", "-", "+", "e", "E"].includes(event.key)) {
                        event.preventDefault();
                      }
                    }}
                    onPaste={(event) => {
                      // Reject non-integer pasted values as well.
                      if (!/^[0-9]+$/.test(event.clipboardData.getData("text").trim())) {
                        event.preventDefault();
                      }
                    }}
                    onChange={(event) => {
                      const next = event.target.value;
                      if (/^[0-9]*$/.test(next)) {
                        setReplacementQuantity(next);
                      }
                    }}
                    disabled={workOrderStatus !== "In Progress" || usePartsMutation.isPending}
                  />
                </label>
                {selectedInventory?.partCategory?.compatibleDroneModels?.length ? (
                  <p className="text-[11px] text-[var(--tech-muted)]">
                    Compatible models: {selectedInventory.partCategory.compatibleDroneModels.join(", ")}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center rounded-md bg-orange-500 px-4 text-[12px] font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={workOrderStatus !== "In Progress" || usePartsMutation.isPending ||
                    inventoryQuery.isFetching || !selectedInventory || !Number.isSafeInteger(Number(replacementQuantity)) ||
                    Number(replacementQuantity) < 1 ||
                    Number(replacementQuantity) > (selectedInventory?.quantity ?? 0)}
                  onClick={() => void confirmPartReplacement()}
                >
                  {usePartsMutation.isPending ? "Updating inventory..." : "Confirm replacement & deduct stock"}
                </button>
                {replacementFeedback && <p role="status" className="text-[12px] text-[var(--tech-text-secondary)]">{replacementFeedback}</p>}
                {recordedReplacements.length > 0 && (
                  <div className="text-[12px] text-emerald-500">
                    <p className="font-medium">Parts already issued in this session:</p>
                    {recordedReplacements.map((note, index) => <p key={index}>• {note}</p>)}
                  </div>
                )}
              </div>
            )}

            <Textarea
              value={
                correctiveAction
              }
              onChange={(event) =>
                setCorrectiveAction(
                  event.target.value,
                )
              }
              aria-invalid={correctiveAction.trim().length > 0 && !correctiveActionIsValid}
              placeholder="Record repair, adjustment, replacement or other corrective action..."
              className="min-h-[140px] resize-y overflow-auto border-[var(--tech-border)] bg-[var(--tech-surface-2)] text-[15px] leading-6 text-[var(--tech-text)]"
            />
            {!correctiveActionIsValid && workOrderStatus !== "Completed" && (
              <p className="mt-2 text-[12px] text-[var(--tech-muted)]">
                Enter a meaningful corrective action (at least 10 characters,
                including 5 letters or numbers). Symbols such as "." alone
                are not accepted.
              </p>
            )}
          </Section>

          {/* Update Drone Status */}
          <Section
            icon={Check}
            title="Update drone status"
          >
            

            <select
              value={droneStatus}
              onChange={(event) =>
                setDroneStatus(
                  event.target
                    .value as WorkOrderResultingDroneStatus,
                )
              }
              className="tech-control h-10 w-full px-3"
            >
              <option value="Ready">Ready (Available)</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Retired">Retired</option>

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
                    order.model ??
                    fleetDrone?.model ??
                    "—"
                  }
                />

                <Meta
                  label="Test battery"
                  value={
                    order.batteryId ??
                    "Not specified"
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
                    correctiveActionIsValid
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
                      inspection and
                      corrective action
                      before closing this
                      work order. Diagnosis
                      is optional. The Work
                      Order must be In Progress.
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
  children: ReactNode;
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