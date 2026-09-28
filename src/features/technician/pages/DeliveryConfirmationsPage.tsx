import {
  type ReactNode,
  useMemo,
  useState,
} from "react";

import {
  CheckCircle2,
  Clock3,
  PackageCheck,
  XCircle,
} from "lucide-react";

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
  type DeliveryConfirmation,
} from "../utils/deliveryConfirmationStorage";

import {
  useConfirmPickupMutation,
  useDeliveryConfirmationsQuery,
} from "../hooks/useDeliveryQueries";

type DeliveryFilter =
  | "Pending confirmation"
  | "Completed"
  | "Cancelled";

function getRemainingPickupTime(
  deadlineIso: string,
) {
  const remainingMs =
    new Date(
      deadlineIso,
    ).getTime() -
    Date.now();

  if (
    remainingMs <= 0
  ) {
    return "Expired";
  }

  const totalMinutes =
    Math.ceil(
      remainingMs /
        60_000,
    );

  const hours =
    Math.floor(
      totalMinutes /
        60,
    );

  const minutes =
    totalMinutes % 60;

  if (
    hours >= 24
  ) {
    const days =
      Math.floor(
        hours / 24,
      );

    const remainingHours =
      hours % 24;

    return `${days}d ${remainingHours}h remaining`;
  }

  return `${hours}h ${minutes}m remaining`;
}

export function DeliveryConfirmationsPage() {
  const confirmationsQuery =
    useDeliveryConfirmationsQuery();

  const confirmPickupMutation =
    useConfirmPickupMutation();

  const deliveries: DeliveryConfirmation[] =
    confirmationsQuery.data ?? [];

  const [
    filter,
    setFilter,
  ] = useState<DeliveryFilter>(
    "Pending confirmation",
  );

  const visible =
    useMemo(
      () =>
        deliveries.filter(
          (delivery) => {
            if (
              filter ===
              "Pending confirmation"
            ) {
              return (
                delivery.status ===
                "Delivered"
              );
            }

            return (
              delivery.status ===
              filter
            );
          },
        ),
      [
        deliveries,
        filter,
      ],
    );

  const handleConfirm = async (
    orderId: string,
  ) => {
    try {
      await confirmPickupMutation.mutateAsync(
        orderId,
      );
    } catch (error) {
      console.error(
        "Failed to confirm customer pickup",
        error,
      );
    }
  };

  return (
    <TechnicianPageShell
      title="Delivery confirmations"
      description="Technician manually confirms customer receipt. Pickup countdown is calculated from backend arrival time."
    >
      {confirmationsQuery.error instanceof Error && (
        <div className="mb-4 rounded-md border border-red-500/25 px-4 py-3 text-[13px] text-red-500">
          {confirmationsQuery.error.message}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterButton
          active={
            filter ===
            "Pending confirmation"
          }
          onClick={() =>
            setFilter(
              "Pending confirmation",
            )
          }
        >
          Pending confirmation
        </FilterButton>

        <FilterButton
          active={
            filter ===
            "Completed"
          }
          onClick={() =>
            setFilter(
              "Completed",
            )
          }
        >
          Completed
        </FilterButton>

        <FilterButton
          active={
            filter ===
            "Cancelled"
          }
          onClick={() =>
            setFilter(
              "Cancelled",
            )
          }
        >
          Cancelled
        </FilterButton>
      </div>

      <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
        <CardContent className="p-0">
          <div className="grid grid-cols-[145px_145px_120px_1fr_220px_175px] gap-4 border-b border-[var(--tech-border)] px-5 py-3">
            <Header>
              Order
            </Header>

            <Header>
              Mission
            </Header>

            <Header>
              Drone
            </Header>

            <Header>
              Destination
            </Header>

            <Header>
              Status
            </Header>

            <Header alignRight>
              Action
            </Header>
          </div>

          <div className="divide-y divide-[var(--tech-border)]">
            {visible.map(
              (delivery) => (
                <div
                  key={
                    delivery.orderId
                  }
                  className="grid grid-cols-[145px_145px_120px_1fr_220px_175px] items-center gap-4 px-5 py-4"
                >
                  <span className="text-[14px] font-semibold text-[var(--tech-text)]">
                    {
                      delivery.orderId
                    }
                  </span>

                  <span className="text-[13px] text-[var(--tech-text-secondary)]">
                    {
                      delivery.missionId
                    }
                  </span>

                  <span className="text-[13px] text-[var(--tech-text-secondary)]">
                    {
                      delivery.droneId
                    }
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-[var(--tech-text-secondary)]">
                      {
                        delivery.destination
                      }
                    </p>

                    <p className="mt-1 text-[11px] text-[var(--tech-muted)]">
                      {
                        delivery.recipient
                      }
                    </p>
                  </div>

                  <DeliveryStatusBlock
                    delivery={
                      delivery
                    }
                  />

                  <div className="flex justify-end">
                    {delivery.status ===
                    "Delivered" ? (
                      <Button
                        type="button"
                        onClick={() =>
                          handleConfirm(
                            delivery.orderId,
                          )
                        }
                        className="h-9 rounded-md bg-orange-500 px-3 text-[12px] font-medium text-black hover:bg-orange-600"
                      >
                        <PackageCheck
                          size={14}
                        />
                        Confirm received
                      </Button>
                    ) : delivery.status ===
                      "Completed" ? (
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-orange-500">
                        <CheckCircle2
                          size={14}
                        />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-red-500">
                        <XCircle
                          size={14}
                        />
                        Auto cancelled
                      </span>
                    )}
                  </div>
                </div>
              ),
            )}

            {visible.length ===
              0 && (
              <div className="px-5 py-14 text-center">
                <p className="text-[14px] text-[var(--tech-muted)]">
                  No deliveries in this category.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TechnicianPageShell>
  );
}

function DeliveryStatusBlock({
  delivery,
}: {
  delivery:
    DeliveryConfirmation;
}) {
  if (
    delivery.status ===
    "Completed"
  ) {
    return (
      <div>
        <p className="text-[13px] font-medium text-orange-500">
          Completed
        </p>

        <p className="mt-1 text-[11px] text-[var(--tech-muted)]">
          {
            delivery.receivedConfirmedAt ??
            "—"
          }
        </p>
      </div>
    );
  }

  if (
    delivery.status ===
    "Cancelled"
  ) {
    return (
      <div>
        <p className="text-[13px] font-medium text-red-500">
          Cancelled
        </p>

        <p className="mt-1 text-[11px] text-[var(--tech-muted)]">
          {
            delivery.cancelledAt ??
            "—"
          }
        </p>

        <p className="mt-1 max-w-[210px] text-[10px] leading-4 text-[var(--tech-subtle)]">
          {
            delivery.cancelReason
          }
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[13px] font-medium text-[var(--tech-text-secondary)]">
        Delivered · waiting pickup
      </p>

      <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-orange-500">
        <Clock3
          size={12}
        />
        {getRemainingPickupTime(
          delivery
            .pickupDeadlineAtIso,
        )}
      </p>

      <p className="mt-1 text-[10px] text-[var(--tech-subtle)]">
        Deadline:{" "}
        {
          delivery.pickupDeadlineAt
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

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children:
    ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`rounded-md px-3 py-2 text-[12px] font-medium transition-colors ${
        active
          ? "bg-[var(--tech-surface-2)] text-orange-500"
          : "text-[var(--tech-muted)] hover:text-[var(--tech-text-secondary)]"
      }`}
    >
      {
        children
      }
    </button>
  );
}
