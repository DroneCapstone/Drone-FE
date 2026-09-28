import {
  type ReactNode,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  BatteryCharging,
  BatteryFull,
  Clock3,
  History,
  X,
} from "lucide-react";

import {
  Button,
} from "@/components/shadcn/ui/button";

import {
  Card,
  CardContent,
} from "@/components/shadcn/ui/card";

import {
  DropdownSelect,
} from "@/components/ui/DropdownSelect";

import {
  TechnicianPageShell,
} from "../components/TechnicianPageShell";

import {
  type BatteryHistoryRecord,
  type BatteryStatus,
  type HubBattery,
} from "../utils/batteryStorage";

import {
  useBatteriesQuery,
  useBatteryHistoryQuery,
  useBatteryMutation as useBatteryApiMutation,
} from "../hooks/useBatteryQueries";

import {
  TECHNICIAN_HUB,
} from "../utils/fleetStorage";

import {
  type OutboundDelivery,
} from "../utils/outboundDeliveryStorage";

import {
  useOutboundDeliveriesQuery,
  usePrepareOutboundBatteryMutation,
} from "../hooks/useOutboundQueries";

type BatteryFilter =
  | "All status"
  | BatteryStatus;

function formatReadyTime(
  iso?: string,
) {
  if (!iso) {
    return "Ready now";
  }

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
    .format(
      new Date(iso),
    )
    .replace(",", " ·");
}

function getRemainingMinutes(
  iso?: string,
) {
  if (!iso) {
    return 0;
  }

  return Math.max(
    0,
    Math.ceil(
      (new Date(
        iso,
      ).getTime() -
        Date.now()) /
        60_000,
    ),
  );
}

export function BatteryManagementPage() {
  const navigate =
    useNavigate();

  const batteriesQuery =
    useBatteriesQuery();

  const historyQuery =
    useBatteryHistoryQuery();

  const outboundQuery =
    useOutboundDeliveriesQuery();

  const batteryUseMutation =
    useBatteryApiMutation();

  const prepareBatteryMutation =
    usePrepareOutboundBatteryMutation();

  const batteries: HubBattery[] =
    batteriesQuery.data ?? [];

  const history: BatteryHistoryRecord[] =
    historyQuery.data ?? [];

  const outboundDeliveries: OutboundDelivery[] =
    outboundQuery.data ?? [];

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<BatteryFilter>(
    "All status",
  );

  const [
    historyOpen,
    setHistoryOpen,
  ] = useState(false);

  const [
    selectedBatteryId,
    setSelectedBatteryId,
  ] = useState<
    string | null
  >(null);

  const [
    selectedOrderId,
    setSelectedOrderId,
  ] = useState("");

  const [
    actionError,
    setActionError,
  ] = useState("");

  const hubBatteries =
    useMemo(
      () =>
        batteries.filter(
          (battery) =>
            battery.hub ===
            TECHNICIAN_HUB,
        ),
      [batteries],
    );

  const visibleBatteries =
    useMemo(
      () =>
        hubBatteries.filter(
          (battery) =>
            statusFilter ===
              "All status" ||
            battery.status ===
              statusFilter,
        ),
      [
        hubBatteries,
        statusFilter,
      ],
    );

  const batteryTargets =
    useMemo(
      () =>
        outboundDeliveries.filter(
          (delivery) =>
            delivery.hub ===
              TECHNICIAN_HUB &&
            delivery.status ===
              "Mission Assigned" &&
            Boolean(
              delivery.missionId,
            ) &&
            Boolean(
              delivery.assignedDroneId,
            ),
        ),
      [outboundDeliveries],
    );

  const selectedBattery =
    selectedBatteryId
      ? hubBatteries.find(
          (battery) =>
            battery.id ===
            selectedBatteryId,
        )
      : undefined;

  const selectedDelivery =
    selectedOrderId
      ? batteryTargets.find(
          (delivery) =>
            delivery.orderId ===
            selectedOrderId,
        )
      : undefined;

  const readyCount =
    hubBatteries.filter(
      (battery) =>
        battery.status ===
          "Ready",
    ).length;

  const chargingCount =
    hubBatteries.filter(
      (battery) =>
        battery.status ===
          "Charging",
    ).length;

  const openUseBattery = (
    batteryId: string,
  ) => {
    setSelectedBatteryId(
      batteryId,
    );

    setSelectedOrderId(
      batteryTargets[0]
        ?.orderId ?? "",
    );

    setActionError("");
  };

  const closeUseBattery = () => {
    setSelectedBatteryId(
      null,
    );

    setSelectedOrderId(
      "",
    );

    setActionError("");
  };

  const handleUseBattery = async () => {
    if (
      !selectedBattery ||
      !selectedDelivery ||
      !selectedDelivery.missionId
    ) {
      setActionError(
        "Select an Operator-assigned mission before using this battery.",
      );
      return;
    }

    try {
      setActionError("");

      await batteryUseMutation.mutateAsync({
        batteryId: selectedBattery.id,
        missionId: selectedDelivery.missionId,
      });

      await prepareBatteryMutation.mutateAsync({
        orderId: selectedDelivery.orderId,
        installedBatteryId: selectedBattery.id,
      });

      closeUseBattery();
      navigate(
        "/technician/deliveries/outbound",
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to assign this battery to the mission.",
      );
    }
  };

  return (
    <TechnicianPageShell
      title="Battery management"
      description={`Shared battery inventory at ${TECHNICIAN_HUB}. Charge level and estimated full time are loaded from the backend.`}
    >
      {(batteriesQuery.error instanceof Error ||
        outboundQuery.error instanceof Error) && (
        <div className="mb-4 rounded-md border border-red-500/25 px-4 py-3 text-[13px] text-red-500">
          {batteriesQuery.error instanceof Error
            ? batteriesQuery.error.message
            : outboundQuery.error instanceof Error
              ? outboundQuery.error.message
              : "Unable to load battery data."}
        </div>
      )}

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <StatCard
          label="Ready"
          value={
            readyCount
          }
          helper="100% · Waiting for use"
        />

        <StatCard
          label="Charging"
          value={
            chargingCount
          }
          helper="Automatically becomes Ready when charging completes"
        />

        <StatCard
          label="Total at hub"
          value={
            hubBatteries.length
          }
          helper="Physical batteries in inventory"
        />
      </div>

      <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--tech-border)] p-4">
          <DropdownSelect
            value={
              statusFilter
            }
            onChange={(
              value,
            ) =>
              setStatusFilter(
                value as BatteryFilter,
              )
            }
            options={[
              "All status",
              "Ready",
              "Charging",
            ]}
            ariaLabel="Battery status"
            className="min-w-[190px]"
          />

          <button
            type="button"
            onClick={() =>
              setHistoryOpen(
                true,
              )
            }
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-[var(--tech-border)] px-4 text-[13px] font-medium text-[var(--tech-text-secondary)] transition-colors hover:border-orange-500/50 hover:text-orange-500"
          >
            <History
              size={15}
            />
            View history
          </button>
        </CardContent>

        <div className="grid grid-cols-[160px_130px_160px_1fr_190px] gap-4 border-b border-[var(--tech-border)] px-5 py-3">
          <Header>
            Battery ID
          </Header>

          <Header>
            Charge
          </Header>

          <Header>
            Status
          </Header>

          <Header>
            Estimated full
          </Header>

          <Header alignRight>
            Action
          </Header>
        </div>

        <div className="divide-y divide-[var(--tech-border)]">
          {visibleBatteries.map(
            (battery) => {
              const remaining =
                getRemainingMinutes(
                  battery
                    .estimatedReadyAt,
                );

              return (
                <div
                  key={
                    battery.id
                  }
                  className="grid grid-cols-[160px_130px_160px_1fr_190px] items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--tech-surface-2)]/50"
                >
                  <span className="text-[14px] font-semibold text-[var(--tech-text)]">
                    {
                      battery.id
                    }
                  </span>

                  <div className="flex items-center gap-2">
                    {battery.status ===
                    "Ready" ? (
                      <BatteryFull
                        size={16}
                        className="text-orange-500"
                      />
                    ) : (
                      <BatteryCharging
                        size={16}
                        className="text-[var(--tech-muted)]"
                      />
                    )}

                    <span className="text-[14px] font-medium text-[var(--tech-text-secondary)]">
                      {
                        battery.chargeLevelPct
                      }
                      %
                    </span>
                  </div>

                  <BatteryStatusText
                    status={
                      battery.status
                    }
                  />

                  <div>
                    {battery.status ===
                    "Charging" ? (
                      <>
                        <p className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--tech-text-secondary)]">
                          <Clock3
                            size={14}
                          />
                          About{" "}
                          {
                            remaining
                          }{" "}
                          min
                        </p>

                        <p className="mt-1 text-[11px] text-[var(--tech-muted)]">
                          {
                            formatReadyTime(
                              battery
                                .estimatedReadyAt,
                            )
                          }
                        </p>
                      </>
                    ) : (
                      <span className="text-[12px] font-medium text-orange-500">
                        Ready now
                      </span>
                    )}
                  </div>

                  <div className="flex justify-end">
                    {battery.status ===
                    "Ready" ? (
                      <Button
                        type="button"
                        onClick={() =>
                          openUseBattery(
                            battery.id,
                          )
                        }
                        className="h-9 rounded-md bg-orange-500 px-3 text-[12px] font-medium text-black hover:bg-orange-600"
                      >
                        <BatteryFull
                          size={14}
                        />
                        Use battery
                      </Button>
                    ) : (
                      <span className="text-[12px] text-[var(--tech-muted)]">
                        Auto charging
                      </span>
                    )}
                  </div>
                </div>
              );
            },
          )}

          {visibleBatteries.length ===
            0 && (
            <div className="px-5 py-14 text-center">
              <p className="text-[14px] text-[var(--tech-muted)]">
                No batteries match this status.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* USE BATTERY FOR ASSIGNED MISSION */}
      {selectedBattery && (
        <div
          className="fixed inset-0 z-[145] flex items-center justify-center bg-black/60 px-4"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeUseBattery();
            }
          }}
        >
          <div className="w-full max-w-[620px] overflow-hidden rounded-xl border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--tech-border)] px-6 py-5">
              <div>
                <h2 className="text-[19px] font-semibold text-[var(--tech-text)]">
                  Use{" "}
                  {
                    selectedBattery.id
                  }
                </h2>

                <p className="mt-1 text-[13px] text-[var(--tech-muted)]">
                  Attach this Battery ID to an Operator-assigned outbound mission.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeUseBattery
                }
                className="rounded-md p-1.5 text-[var(--tech-muted)] transition-colors hover:text-orange-500"
              >
                <X
                  size={18}
                />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {batteryTargets.length >
              0 ? (
                <>
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-muted)]">
                      Assigned mission
                    </p>

                    <DropdownSelect
                      value={
                        selectedOrderId
                      }
                      onChange={
                        setSelectedOrderId
                      }
                      options={batteryTargets.map(
                        (
                          delivery,
                        ) =>
                          delivery.orderId,
                      )}
                      ariaLabel="Assigned outbound mission"
                      className="w-full"
                    />
                  </div>

                  {selectedDelivery && (
                    <div className="grid gap-4 rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface-2)] p-4 sm:grid-cols-2">
                      <DetailField
                        label="Order"
                        value={
                          selectedDelivery
                            .orderId
                        }
                      />

                      <DetailField
                        label="Mission"
                        value={
                          selectedDelivery
                            .missionId ??
                          "—"
                        }
                      />

                      <DetailField
                        label="Drone"
                        value={
                          selectedDelivery
                            .assignedDroneCode ??
                          selectedDelivery
                            .assignedDroneId ??
                          "—"
                        }
                      />

                      <DetailField
                        label="Destination"
                        value={
                          selectedDelivery
                            .destination
                        }
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface-2)] px-4 py-5">
                  <p className="text-[13px] text-[var(--tech-muted)]">
                    No outbound mission is currently waiting for battery installation.
                  </p>
                </div>
              )}

              {actionError && (
                <p className="text-[12px] text-red-500">
                  {
                    actionError
                  }
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-[var(--tech-border)] px-6 py-4">
              <Button
                type="button"
                onClick={
                  closeUseBattery
                }
                className="h-9 rounded-md border border-[var(--tech-border)] !bg-transparent px-4 text-[13px] text-[var(--tech-text-secondary)] hover:!border-orange-500/50 hover:!bg-transparent hover:!text-orange-500"
              >
                Cancel
              </Button>

              <Button
                type="button"
                disabled={
                  !selectedDelivery
                }
                onClick={
                  handleUseBattery
                }
                className="h-9 rounded-md bg-orange-500 px-4 text-[13px] font-medium text-black hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Confirm use
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {historyOpen && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 px-4 py-6"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setHistoryOpen(
                false,
              );
            }
          }}
        >
          <div className="flex max-h-[82vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-xl border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--tech-border)] px-6 py-5">
              <div>
                <h2 className="text-[20px] font-semibold text-[var(--tech-text)]">
                  Battery history
                </h2>

                <p className="mt-1 text-[13px] text-[var(--tech-muted)]">
                  Battery removal, automatic charging completion and mission usage history.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setHistoryOpen(
                    false,
                  )
                }
                className="rounded-md p-1.5 text-[var(--tech-muted)] transition-colors hover:text-orange-500"
              >
                <X
                  size={19}
                />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <div className="min-w-[1040px]">
                <div className="sticky top-0 z-10 grid grid-cols-[130px_170px_120px_130px_130px_190px_1fr] gap-4 border-b border-[var(--tech-border)] bg-[var(--tech-surface)] px-6 py-3">
                  <Header>
                    Battery
                  </Header>

                  <Header>
                    Action
                  </Header>

                  <Header>
                    Charge
                  </Header>

                  <Header>
                    Mission
                  </Header>

                  <Header>
                    Drone
                  </Header>

                  <Header>
                    Time
                  </Header>

                  <Header>
                    Note
                  </Header>
                </div>

                {history.length >
                0 ? (
                  <div className="divide-y divide-[var(--tech-border)]">
                    {history.map(
                      (record) => (
                        <div
                          key={
                            record.id
                          }
                          className="grid grid-cols-[130px_170px_120px_130px_130px_190px_1fr] items-center gap-4 px-6 py-4"
                        >
                          <span className="text-[13px] font-semibold text-[var(--tech-text)]">
                            {
                              record.batteryId
                            }
                          </span>

                          <span className="text-[13px] text-[var(--tech-text-secondary)]">
                            {
                              record.action
                            }
                          </span>

                          <span className="text-[13px] text-[var(--tech-text-secondary)]">
                            {
                              record.chargeLevelPct
                            }
                            %
                          </span>

                          <span className="text-[12px] text-[var(--tech-muted)]">
                            {
                              record.missionId ??
                              "—"
                            }
                          </span>

                          <span className="text-[12px] text-[var(--tech-muted)]">
                            {
                              record.droneId ??
                              "—"
                            }
                          </span>

                          <span className="text-[12px] text-[var(--tech-muted)]">
                            {
                              record.occurredAt
                            }
                          </span>

                          <span className="text-[12px] leading-5 text-[var(--tech-muted)]">
                            {
                              record.note ??
                              "—"
                            }
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="px-6 py-14 text-center text-[13px] text-[var(--tech-muted)]">
                    No battery history yet.
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

function BatteryStatusText({
  status,
}: {
  status:
    BatteryStatus;
}) {
  return (
    <span
      className={
        status === "Ready"
          ? "inline-flex items-center gap-2 text-[13px] font-medium text-orange-500"
          : "inline-flex items-center gap-2 text-[13px] font-medium text-[var(--tech-text-secondary)]"
      }
    >
      {status ===
      "Ready" ? (
        <BatteryFull
          size={14}
        />
      ) : (
        <BatteryCharging
          size={14}
        />
      )}

      {status}
    </span>
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <Card className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
      <CardContent className="p-5">
        <p className="text-[12px] font-medium text-[var(--tech-muted)]">
          {label}
        </p>

        <p className="mt-2 text-[26px] font-semibold text-[var(--tech-text)]">
          {
            value
          }
        </p>

        <p className="mt-1 text-[12px] text-[var(--tech-subtle)]">
          {
            helper
          }
        </p>
      </CardContent>
    </Card>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--tech-subtle)]">
        {
          label
        }
      </p>

      <p className="mt-1 text-[14px] font-medium text-[var(--tech-text-secondary)]">
        {
          value
        }
      </p>
    </div>
  );
}

function Header({
  children,
  alignRight = false,
}: {
  children:
    ReactNode;
  alignRight?: boolean;
}) {
  return (
    <span
      className={`text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-subtle)] ${
        alignRight
          ? "text-right"
          : ""
      }`}
    >
      {
        children
      }
    </span>
  );
}
