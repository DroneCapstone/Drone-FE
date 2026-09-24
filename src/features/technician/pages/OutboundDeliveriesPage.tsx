import {
  Check,
  History,
  PackageCheck,
  PlaneTakeoff,
  X,
} from "lucide-react";

import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import { Button } from "@/components/shadcn/ui/button";
import {
  Card,
  CardContent,
} from "@/components/shadcn/ui/card";

import { TechnicianPageShell } from "../components/TechnicianPageShell";
import { TECHNICIAN_HUB } from "../utils/fleetStorage";

import {
  applyOperatorMissionAssignment,
  confirmPackageAtHub,
  dispatchOutboundDelivery,
  loadOutboundDeliveries,
  loadOutboundDeliveryHistory,
  type OperatorAssignmentPayload,
  type OutboundDelivery,
  type OutboundDeliveryHistory,
} from "../utils/outboundDeliveryStorage";

export function OutboundDeliveriesPage() {
  const navigate = useNavigate();

  const [deliveries, setDeliveries] =
    useState<OutboundDelivery[]>(loadOutboundDeliveries);

  const [history, setHistory] =
    useState<OutboundDeliveryHistory[]>(
      loadOutboundDeliveryHistory,
    );

  const [historyOpen, setHistoryOpen] = useState(false);

  const refresh = () => {
    setDeliveries(loadOutboundDeliveries());
    setHistory(loadOutboundDeliveryHistory());
  };

  useEffect(() => {
    const sync = () => refresh();

    const onOperatorAssigned = (event: Event) => {
      const detail = (
        event as CustomEvent<OperatorAssignmentPayload>
      ).detail;

      if (!detail) {
        return;
      }

      applyOperatorMissionAssignment(detail);
      refresh();
    };

    window.addEventListener(
      "technician-outbound-deliveries-updated",
      sync,
    );

    window.addEventListener(
      "operator-outbound-assigned",
      onOperatorAssigned,
    );

    return () => {
      window.removeEventListener(
        "technician-outbound-deliveries-updated",
        sync,
      );

      window.removeEventListener(
        "operator-outbound-assigned",
        onOperatorAssigned,
      );
    };
  }, []);

  const visibleDeliveries = useMemo(
    () =>
      deliveries.filter(
        (delivery) => delivery.hub === TECHNICIAN_HUB,
      ),
    [deliveries],
  );

  const visibleHistory = useMemo(
    () =>
      history.filter(
        (item) => item.hub === TECHNICIAN_HUB,
      ),
    [history],
  );

  const handleReceiveAtHub = (orderId: string) => {
    confirmPackageAtHub(orderId);
    refresh();
  };

  const handleDispatch = (orderId: string) => {
    dispatchOutboundDelivery(orderId);
    refresh();
  };

  return (
    <TechnicianPageShell
      title="Outbound deliveries"
      description={`Paid customer orders assigned to ${TECHNICIAN_HUB}. Destination indicates the hub where the recipient will collect the parcel.`}
    >
      <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
        <CardContent className="flex justify-end border-b border-[var(--tech-border)] p-4">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-[var(--tech-border)] px-4 text-[13px] font-medium text-[var(--tech-text-secondary)] transition-colors hover:border-orange-500/50 hover:text-orange-500"
          >
            <History size={15} />
            View history
          </button>
        </CardContent>

        <div className="grid grid-cols-[130px_1fr_120px_120px_120px_160px_190px] gap-4 border-b border-[var(--tech-border)] px-5 py-3">
          <Header>Order</Header>
          <Header>Destination Hub</Header>
          <Header>Mission</Header>
          <Header>Drone</Header>
          <Header>Battery</Header>
          <Header>Status</Header>
          <Header alignRight>Action</Header>
        </div>

        <div className="divide-y divide-[var(--tech-border)]">
          {visibleDeliveries.map((delivery) => (
            <div
              key={delivery.orderId}
              className="grid grid-cols-[130px_1fr_120px_120px_120px_160px_190px] items-center gap-4 px-5 py-4"
            >
              <div>
                <p className="text-[14px] font-semibold text-[var(--tech-text)]">
                  {delivery.orderId}
                </p>

                <p className="mt-1 text-[11px] text-[var(--tech-muted)]">
                  {delivery.customerName}
                </p>
              </div>

              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[var(--tech-text-secondary)]">
                  {delivery.destination}
                </p>
              </div>

              <span className="text-[13px] text-[var(--tech-text-secondary)]">
                {delivery.missionId ?? "—"}
              </span>

              <span className="text-[13px] text-[var(--tech-text-secondary)]">
                {delivery.assignedDroneCode ?? "—"}
              </span>

              <span
                className={
                  delivery.installedBatteryId
                    ? "text-[13px] font-semibold text-orange-500"
                    : "text-[13px] text-[var(--tech-muted)]"
                }
              >
                {delivery.installedBatteryId ?? "—"}
              </span>

              <StatusText status={delivery.status} />

              <div className="flex justify-end">
                {delivery.status === "Awaiting Drop-off" && (
                  <Button
                    type="button"
                    onClick={() =>
                      handleReceiveAtHub(delivery.orderId)
                    }
                    className="h-9 rounded-md bg-orange-500 px-3 text-[12px] font-medium text-black hover:bg-orange-600"
                  >
                    <PackageCheck size={14} />
                    Receive at hub
                  </Button>
                )}

                {delivery.status === "At Hub" && (
                  <span className="text-[12px] text-[var(--tech-muted)]">
                    Waiting for Operator
                  </span>
                )}

                {delivery.status === "Mission Assigned" && (
                  <Button
                    type="button"
                    onClick={() =>
                      navigate("/technician/fleet/batteries")
                    }
                    className="h-9 rounded-md bg-orange-500 px-3 text-[12px] font-medium text-black hover:bg-orange-600"
                  >
                    Prepare battery
                  </Button>
                )}

                {delivery.status === "Ready" && (
                  <Button
                    type="button"
                    onClick={() =>
                      handleDispatch(delivery.orderId)
                    }
                    className="h-9 rounded-md bg-orange-500 px-3 text-[12px] font-medium text-black hover:bg-orange-600"
                  >
                    <PlaneTakeoff size={14} />
                    Dispatch
                  </Button>
                )}
              </div>
            </div>
          ))}

          {visibleDeliveries.length === 0 && (
            <div className="px-5 py-14 text-center">
              <PlaneTakeoff
                size={20}
                className="mx-auto text-[var(--tech-subtle)]"
              />

              <p className="mt-3 text-[14px] font-medium text-[var(--tech-text-secondary)]">
                No outbound deliveries waiting
              </p>

              <p className="mt-1 text-[12px] text-[var(--tech-muted)]">
                Dispatched missions are stored in View history.
              </p>
            </div>
          )}
        </div>
      </Card>

      {historyOpen && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 px-4 py-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setHistoryOpen(false);
            }
          }}
        >
          <div className="flex max-h-[82vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-xl border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--tech-border)] px-6 py-5">
              <div>
                <h2 className="text-[20px] font-semibold text-[var(--tech-text)]">
                  Outbound history
                </h2>

                <p className="mt-1 text-[13px] text-[var(--tech-muted)]">
                  Missions dispatched from {TECHNICIAN_HUB}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="rounded-md p-1.5 text-[var(--tech-muted)] transition-colors hover:text-orange-500"
                aria-label="Close outbound history"
              >
                <X size={19} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <div className="min-w-[1040px]">
                <div className="sticky top-0 z-10 grid grid-cols-[130px_130px_120px_120px_1fr_190px_120px] gap-4 border-b border-[var(--tech-border)] bg-[var(--tech-surface)] px-6 py-3">
                  <Header>Order</Header>
                  <Header>Mission</Header>
                  <Header>Drone</Header>
                  <Header>Battery</Header>
                  <Header>Destination Hub</Header>
                  <Header>Departed at</Header>
                  <Header>Result</Header>
                </div>

                {visibleHistory.length > 0 ? (
                  <div className="divide-y divide-[var(--tech-border)]">
                    {visibleHistory.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[130px_130px_120px_120px_1fr_190px_120px] items-center gap-4 px-6 py-4"
                      >
                        <span className="text-[13px] font-semibold text-[var(--tech-text)]">
                          {item.orderId}
                        </span>

                        <span className="text-[13px] text-[var(--tech-text-secondary)]">
                          {item.missionId}
                        </span>

                        <span className="text-[13px] text-[var(--tech-text-secondary)]">
                          {item.droneCode}
                        </span>

                        <span className="text-[13px] font-medium text-orange-500">
                          {item.batteryId}
                        </span>

                        <span className="truncate text-[12px] text-[var(--tech-muted)]">
                          {item.destination}
                        </span>

                        <span className="text-[12px] text-[var(--tech-muted)]">
                          {item.departedAt}
                        </span>

                        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-orange-500">
                          <Check size={14} />
                          {item.result}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-6 py-14 text-center">
                    <p className="text-[14px] text-[var(--tech-muted)]">
                      No outbound history yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </TechnicianPageShell>
  );
}

function StatusText({
  status,
}: {
  status: OutboundDelivery["status"];
}) {
  const style =
    status === "Ready"
      ? "text-orange-500"
      : status === "Mission Assigned"
        ? "text-[var(--tech-text-secondary)]"
        : "text-[var(--tech-muted)]";

  return (
    <span className={`text-[13px] font-medium ${style}`}>
      {status === "Ready"
        ? "Ready · not departed"
        : status}
    </span>
  );
}

function Header({
  children,
  alignRight = false,
}: {
  children: ReactNode;
  alignRight?: boolean;
}) {
  return (
    <span
      className={`text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-subtle)] ${
        alignRight ? "text-right" : ""
      }`}
    >
      {children}
    </span>
  );
}
