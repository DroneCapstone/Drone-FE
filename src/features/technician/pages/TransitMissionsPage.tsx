import {
  useMemo,
  useState,
} from "react";

import {
  ArrowRight,
  BatteryCharging,
  Check,
  CircleAlert,
  Clock3,
  Eye,
  PlaneTakeoff,
  Search,
  Send,
  ShieldCheck,
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
  loadFleet,
  saveFleet,
  TECHNICIAN_HUB,
  type FleetDrone,
} from "../utils/fleetStorage";

import {
  formatTransitTime,
  loadTransitMissions,
  saveTransitMissions,
  type TransitMission,
  type TransitMissionStatus,
} from "../utils/transitMissionStorage";

import {
  createMaintenanceAlert,
} from "../utils/maintenanceAlertStorage";

type TransitFilter =
  | "All transit"
  | TransitMissionStatus;

function getIdNumber(
  droneId: string,
) {
  const match =
    droneId.match(/(\d+)$/);

  if (!match) {
    return droneId;
  }

  return String(
    Number(match[1]),
  ).padStart(2, "0");
}

function getDroneCode(
  type: string,
  droneId: string,
) {
  return `${type}-${getIdNumber(
    droneId,
  )}`;
}

function getMissionDroneCode(
  mission: TransitMission,
) {
  return getDroneCode(
    mission.droneType,
    mission.currentDroneId,
  );
}

export function TransitMissionsPage() {
  const [
    missions,
    setMissions,
  ] = useState<
    TransitMission[]
  >(loadTransitMissions);

  const [
    fleet,
    setFleet,
  ] = useState<
    FleetDrone[]
  >(loadFleet);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<TransitFilter>(
    "All transit",
  );

  const [
    actionMessages,
    setActionMessages,
  ] = useState<string[]>([]);

  const actionMessage =
    actionMessages[0] ?? "";

  const pushActionMessage = (
    message: string,
  ) => {
    setActionMessages(
      (current) => [
        ...current,
        message,
      ],
    );
  };

  const dismissActionMessage = () => {
    setActionMessages(
      (current) =>
        current.slice(1),
    );
  };

  const [
    selectedMissionId,
    setSelectedMissionId,
  ] = useState<string | null>(
    null,
  );

  const selectedMission =
    selectedMissionId
      ? missions.find(
          (mission) =>
            mission.id ===
            selectedMissionId,
        ) ?? null
      : null;

  const persistMissions = (
    next: TransitMission[],
  ) => {
    setMissions(next);
    saveTransitMissions(next);
  };

  const persistFleet = (
    next: FleetDrone[],
  ) => {
    setFleet(next);
    saveFleet(next);
  };

  const visibleMissions =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      return missions.filter(
        (mission) => {
          const code =
            getMissionDroneCode(
              mission,
            ).toLowerCase();

          const matchesSearch =
            !query ||
            mission.missionId
              .toLowerCase()
              .includes(query) ||
            mission.legId
              .toLowerCase()
              .includes(query) ||
            mission.destination
              .toLowerCase()
              .includes(query) ||
            code.includes(query);

          const matchesStatus =
            statusFilter ===
              "All transit" ||
            mission.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        },
      );
    }, [
      missions,
      searchQuery,
      statusFilter,
    ]);

  const confirmArrival = (
    mission: TransitMission,
  ) => {
    const now =
      formatTransitTime();

    const nextMissions =
      missions.map(
        (item) =>
          item.id ===
          mission.id
            ? {
                ...item,
                status:
                  "At Hub" as const,
                batteryServiceRequired:
                  item.batteryLevelPct <
                  item.requiredDepartureBatteryPct,
                arrivalConfirmedAt:
                  now,
              }
            : item,
      );

    const existing =
      fleet.find(
        (drone) =>
          drone.id ===
          mission.currentDroneId,
      );

    const nextFleet:
      FleetDrone[] =
      existing
        ? fleet.map(
            (drone) =>
              drone.id ===
              mission.currentDroneId
                ? {
                    ...drone,
                    location:
                      TECHNICIAN_HUB,
                    battery:
                      mission.batteryLevelPct,
                  }
                : drone,
          )
        : [
            ...fleet,
            {
              id:
                mission.currentDroneId,
              name:
                getMissionDroneCode(
                  mission,
                ),
              model:
                mission.droneModel,
              status:
                "Available",
              battery:
                mission.batteryLevelPct,
              utilization: 0,
              lastFlight:
                mission.missionId,
              location:
                TECHNICIAN_HUB,
            },
          ];

    persistMissions(
      nextMissions,
    );

    persistFleet(
      nextFleet,
    );

    pushActionMessage(
      `${getMissionDroneCode(
        mission,
      )} arrival confirmed at ${TECHNICIAN_HUB}.`,
    );
  };

  const replaceBattery = (
    mission: TransitMission,
  ) => {
    const nextFleet =
      fleet.map(
        (drone) =>
          drone.id ===
          mission.currentDroneId
            ? {
                ...drone,
                battery: 100,
                status:
                  "Available" as const,
              }
            : drone,
      );

    const nextMissions =
      missions.map(
        (item) =>
          item.id ===
          mission.id
            ? {
                ...item,
                batteryLevelPct:
                  100,
                batteryServiceRequired:
                  false,
                status:
                  "Ready" as const,
              }
            : item,
      );

    persistFleet(
      nextFleet,
    );

    persistMissions(
      nextMissions,
    );

    pushActionMessage(
      `${getMissionDroneCode(
        mission,
      )} battery replaced. Drone is ready to continue.`,
    );
  };

  const markReady = (
    mission: TransitMission,
  ) => {
    const fleetDrone =
      fleet.find(
        (drone) =>
          drone.id ===
          mission.currentDroneId,
      );

    if (
      !fleetDrone ||
      fleetDrone.status !==
        "Available"
    ) {
      pushActionMessage(
        "Drone must be Available before it can continue the mission.",
      );

      return;
    }

    if (
      fleetDrone.battery <
      mission.requiredDepartureBatteryPct
    ) {
      pushActionMessage(
        `Battery must be at least ${mission.requiredDepartureBatteryPct}% for the next mission leg. Replace the battery before departure.`,
      );

      return;
    }

    persistMissions(
      missions.map(
        (item) =>
          item.id ===
          mission.id
            ? {
                ...item,
                batteryLevelPct:
                  fleetDrone.battery,
                status:
                  "Ready" as const,
              }
            : item,
      ),
    );

    pushActionMessage(
      `${getMissionDroneCode(
        mission,
      )} passed the technician readiness check.`,
    );
  };

  const markCannotContinue = (
    mission: TransitMission,
  ) => {
    const nextFleet =
      fleet.map(
        (drone) =>
          drone.id ===
          mission.currentDroneId
            ? {
                ...drone,
                status:
                  "Maintenance" as const,
              }
            : drone,
      );

    const nextMissions =
      missions.map(
        (item) =>
          item.id ===
          mission.id
            ? {
                ...item,
                status:
                  "Cannot Continue" as const,
                cannotContinueReason:
                  "Technical condition prevents the current drone from safely continuing the mission.",
              }
            : item,
      );

    persistFleet(
      nextFleet,
    );

    persistMissions(
      nextMissions,
    );

    const maintenanceAlert =
      createMaintenanceAlert({
        drone:
          getMissionDroneCode(
            mission,
          ),
        droneId:
          mission.currentDroneId,
        title:
          "Failed hub readiness inspection",
        source:
          "Hub inspection",
        missionId:
          mission.missionId,
        legId:
          mission.legId,
        reason:
          "Drone failed the technician hub readiness check and requires maintenance before further flight.",
      });

    pushActionMessage(
      `${getMissionDroneCode(
        mission,
      )} moved to Maintenance. ${maintenanceAlert.id} was created. Send a replacement request to Operator.`,
    );
  };

  const requestReplacement = (
    mission: TransitMission,
  ) => {
    const now =
      formatTransitTime();

    const nextMissions =
      missions.map(
        (item) =>
          item.id ===
          mission.id
            ? {
                ...item,
                status:
                  "Replacement Requested" as const,
                replacementRequestedAt:
                  now,
                replacementReason:
                  "TECHNICAL_FAILURE",
              }
            : item,
      );

    persistMissions(
      nextMissions,
    );

    /*
     * Frontend mock only.
     * Later replace this with:
     * POST /technician/mission-legs/:legId/replacement-request
     *
     * Operator receives this request and chooses the replacement drone.
     */
    window.dispatchEvent(
      new CustomEvent(
        "operator-replacement-requested",
        {
          detail: {
            missionId:
              mission.missionId,
            legId:
              mission.legId,
            hub:
              mission.hub,
            failedDroneId:
              mission.originalDroneId,
            reason:
              "TECHNICAL_FAILURE",
            requestedAt:
              now,
          },
        },
      ),
    );

    pushActionMessage(
      `Replacement request for ${mission.missionId} sent to Operator.`,
    );
  };

  const confirmReplacementReady = (
    mission: TransitMission,
  ) => {
    if (
      !mission.replacementDroneId
    ) {
      pushActionMessage(
        "Operator has not assigned a replacement drone yet.",
      );

      return;
    }

    markReady(mission);
  };

  const dispatchMission = (
    mission: TransitMission,
  ) => {
    const currentDrone =
      fleet.find(
        (drone) =>
          drone.id ===
          mission.currentDroneId,
      );

    if (!currentDrone) {
      pushActionMessage(
        "Current mission drone was not found in the hub fleet.",
      );

      return;
    }

    if (
      currentDrone.status !==
      "Available"
    ) {
      pushActionMessage(
        "Only an Available drone can be dispatched.",
      );

      return;
    }

    if (
      currentDrone.battery <
      mission.requiredDepartureBatteryPct
    ) {
      pushActionMessage(
        `Battery must be at least ${mission.requiredDepartureBatteryPct}% before dispatch.`,
      );

      return;
    }

    const now =
      formatTransitTime();

    const nextFleet =
      fleet.map(
        (drone) =>
          drone.id ===
          mission.currentDroneId
            ? {
                ...drone,
                location: `In transit to ${mission.destination}`,
              }
            : drone,
      );

    const nextMissions =
      missions.map(
        (item) =>
          item.id ===
          mission.id
            ? {
                ...item,
                status:
                  "In Transit" as const,
                batteryLevelPct:
                  currentDrone.battery,
                departedAt:
                  now,
              }
            : item,
      );

    persistFleet(
      nextFleet,
    );

    persistMissions(
      nextMissions,
    );

    /*
     * Later backend/WebSocket sends this update to Operator.
     */
    window.dispatchEvent(
      new CustomEvent(
        "operator-mission-updated",
        {
          detail: {
            missionId:
              mission.missionId,
            legId:
              mission.legId,
            droneId:
              mission.currentDroneId,
            status:
              "IN_TRANSIT",
            departedAt:
              now,
          },
        },
      ),
    );

    pushActionMessage(
      `${getMissionDroneCode(
        mission,
      )} dispatched and removed from the Hub fleet view.`,
    );
  };

  return (
    <TechnicianPageShell
      title="Transit missions"
      description=""
    >
      {/* FEEDBACK */}
      {actionMessage && (
        <div className="mb-4 flex items-start justify-between gap-4 rounded-lg border border-orange-500/25 bg-[var(--tech-surface)] px-4 py-3">
          <div className="flex items-start gap-3">
            <CircleAlert
              size={17}
              className="mt-0.5 shrink-0 text-orange-500"
            />

            <p className="text-[14px] leading-5 text-[var(--tech-text-secondary)]">
              {actionMessage}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {actionMessages.length >
              1 && (
              <span className="text-[11px] text-[var(--tech-subtle)]">
                +
                {
                  actionMessages.length -
                  1
                }{" "}
                pending
              </span>
            )}

            <button
              type="button"
              onClick={
                dismissActionMessage
              }
              className="text-[13px] font-medium text-[var(--tech-muted)] transition-colors hover:text-orange-500"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* SEARCH + FILTER */}
      <Card className="mb-4 rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[320px] flex-1">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tech-subtle)]"
            />

            <input
              type="search"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value,
                )
              }
              placeholder="Search mission, drone or destination..."
              className="tech-control h-11 w-full pl-10 pr-3 !text-[14px]"
            />
          </div>

          <DropdownSelect
            value={statusFilter}
            onChange={(value) =>
              setStatusFilter(
                value as TransitFilter,
              )
            }
            options={[
              "All transit",
              "Incoming",
              "At Hub",
              "Ready",
              "Cannot Continue",
              "Replacement Requested",
              "Replacement Assigned",
              "In Transit",
            ]}
            ariaLabel="Transit mission status"
            className="min-w-[230px]"
          />
        </CardContent>
      </Card>

      {/* COMPACT MISSION LIST */}
      <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
        <div className="
          hidden
          border-b border-[var(--tech-border)]
          px-5 py-3
          lg:grid
          lg:grid-cols-[minmax(120px,1fr)_minmax(150px,1.15fr)_minmax(90px,0.7fr)_minmax(170px,1.2fr)_minmax(230px,1.55fr)]
          lg:items-center
          lg:gap-4
        ">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-subtle)]">
            Mission
          </span>

          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-subtle)]">
            Drone
          </span>

          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-subtle)]">
            Battery
          </span>

          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-subtle)]">
            Status
          </span>

          <span className="text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-subtle)]">
            Action
          </span>
        </div>

        <div className="divide-y divide-[var(--tech-border)]">
          {visibleMissions.map(
            (mission) => {
              const code =
                getMissionDroneCode(
                  mission,
                );

              const batteryNeedsService =
                mission.batteryLevelPct <
                mission.requiredDepartureBatteryPct;

              return (
                <div
                  key={mission.id}
                  className="px-5 py-4 transition-colors hover:bg-[var(--tech-surface-2)]/50"
                >
                  <div className="
                    grid
                    gap-3
                    lg:grid-cols-[minmax(120px,1fr)_minmax(150px,1.15fr)_minmax(90px,0.7fr)_minmax(170px,1.2fr)_minmax(230px,1.55fr)]
                    lg:items-center
                    lg:gap-4
                  ">
                    {/* MISSION */}
                    <div>
                      <p className="text-[16px] font-semibold text-[var(--tech-text)]">
                        {mission.missionId}
                      </p>
                    </div>

                    {/* DRONE */}
                    <div>
                      <p className="text-[15px] font-semibold text-[var(--tech-text)]">
                        {code}
                      </p>

                      <p className="mt-1 truncate text-[12px] text-[var(--tech-muted)]">
                        {mission.droneModel}
                      </p>
                    </div>

                    {/* BATTERY */}
                    <div>
                      <span
                        className={
                          batteryNeedsService &&
                          mission.status ===
                            "At Hub"
                            ? "text-[14px] font-semibold text-orange-500"
                            : "text-[14px] font-medium text-[var(--tech-text-secondary)]"
                        }
                      >
                        {
                          mission.batteryLevelPct
                        }
                        %
                      </span>

                      {batteryNeedsService &&
                        mission.status ===
                          "At Hub" && (
                          <p className="mt-1 text-[11px] font-medium text-orange-500">
                            Service required
                          </p>
                        )}
                    </div>

                    {/* STATUS */}
                    <div>
                      <TransitStatus
                        status={
                          mission.status
                        }
                      />
                    </div>

                    {/* ACTIONS */}
                    <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 lg:justify-end">
                      {mission.status ===
                        "Incoming" && (
                        <Button
                          type="button"
                          onClick={() =>
                            confirmArrival(
                              mission,
                            )
                          }
                          className="h-9 shrink-0 rounded-md bg-orange-500 px-3 text-[13px] font-medium text-black hover:bg-orange-600"
                        >
                          <Check
                            size={14}
                          />
                          Confirm
                        </Button>
                      )}

                      {mission.status ===
                        "At Hub" &&
                        mission.batteryServiceRequired && (
                          <Button
                            type="button"
                            onClick={() =>
                              replaceBattery(
                                mission,
                              )
                            }
                            className="h-9 shrink-0 rounded-md bg-orange-500 px-3 text-[13px] font-medium text-black hover:bg-orange-600"
                          >
                            <BatteryCharging
                              size={14}
                            />
                            Replace battery
                          </Button>
                        )}

                      {mission.status ===
                        "At Hub" &&
                        !mission.batteryServiceRequired && (
                          <Button
                            type="button"
                            onClick={() =>
                              markReady(
                                mission,
                              )
                            }
                            className="h-9 shrink-0 rounded-md bg-orange-500 px-3 text-[13px] font-medium text-black hover:bg-orange-600"
                          >
                            <ShieldCheck
                              size={14}
                            />
                            Ready
                          </Button>
                        )}

                      {mission.status ===
                        "Cannot Continue" && (
                        <Button
                          type="button"
                          onClick={() =>
                            requestReplacement(
                              mission,
                            )
                          }
                          className="h-9 shrink-0 rounded-md bg-orange-500 px-3 text-[13px] font-medium text-black hover:bg-orange-600"
                        >
                          <Send
                            size={14}
                          />
                          Request replacement
                        </Button>
                      )}

                      {mission.status ===
                        "Replacement Requested" && (
                        <span className="text-[13px] font-medium text-[var(--tech-muted)]">
                          Waiting for Operator
                        </span>
                      )}

                      {mission.status ===
                        "Replacement Assigned" && (
                        <Button
                          type="button"
                          onClick={() =>
                            confirmReplacementReady(
                              mission,
                            )
                          }
                          className="h-9 shrink-0 rounded-md bg-orange-500 px-3 text-[13px] font-medium text-black hover:bg-orange-600"
                        >
                          <ShieldCheck
                            size={14}
                          />
                          Confirm ready
                        </Button>
                      )}

                      {mission.status ===
                        "Ready" && (
                        <Button
                          type="button"
                          onClick={() =>
                            dispatchMission(
                              mission,
                            )
                          }
                          className="h-9 shrink-0 rounded-md bg-orange-500 px-3 text-[13px] font-medium text-black hover:bg-orange-600"
                        >
                          <PlaneTakeoff
                            size={14}
                          />
                          Continue
                        </Button>
                      )}

                      {mission.status ===
                        "In Transit" && (
                        <span className="text-[13px] font-medium text-[var(--tech-muted)]">
                          Departed
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedMissionId(
                            mission.id,
                          )
                        }
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-[var(--tech-border)] px-3 text-[13px] font-medium text-[var(--tech-text-secondary)] transition-colors hover:border-orange-500/50 hover:text-orange-500"
                      >
                        <Eye
                          size={14}
                        />
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            },
          )}

          {visibleMissions.length ===
            0 && (
            <div className="px-5 py-14 text-center">
              <p className="text-[15px] font-medium text-[var(--tech-text-secondary)]">
                No transit missions found
              </p>

              <p className="mt-1 text-[13px] text-[var(--tech-muted)]">
                Try changing the search or status filter.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* DETAILS MODAL */}
      {selectedMission && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 px-4 py-6"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedMissionId(
                null,
              );
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-[900px] overflow-y-auto rounded-xl border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-2xl">
            {/* HEADER */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--tech-border)] bg-[var(--tech-surface)] px-6 py-5">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-[21px] font-semibold text-[var(--tech-text)]">
                    {
                      selectedMission.missionId
                    }
                  </h2>

                  <TransitStatus
                    status={
                      selectedMission.status
                    }
                  />
                </div>

                <p className="mt-1 text-[13px] text-[var(--tech-muted)]">
                  Mission leg{" "}
                  {
                    selectedMission.legId
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedMissionId(
                    null,
                  )
                }
                className="rounded-md p-1.5 text-[var(--tech-muted)] transition-colors hover:text-orange-500"
                aria-label="Close mission details"
              >
                <X
                  size={19}
                />
              </button>
            </div>

            <div className="space-y-6 px-6 py-5">
              {/* MISSION OVERVIEW */}
              <section>
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-[15px] font-semibold text-[var(--tech-text)]">
                    Mission overview
                  </h3>

                  <span className="text-[12px] text-[var(--tech-muted)]">
                    Current hub:{" "}
                    <strong className="font-medium text-[var(--tech-text-secondary)]">
                      {
                        selectedMission.hub
                      }
                    </strong>
                  </span>
                </div>

                <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                  <DetailField
                    label="Mission"
                    value={
                      selectedMission.missionId
                    }
                  />

                  <DetailField
                    label="Mission leg"
                    value={
                      selectedMission.legId
                    }
                  />

                  <DetailField
                    label="Current status"
                    value={
                      selectedMission.status
                    }
                  />

                  <DetailField
                    label="Battery"
                    value={`${selectedMission.batteryLevelPct}%`}
                    danger={
                      selectedMission.batteryLevelPct <
                      selectedMission.requiredDepartureBatteryPct
                    }
                  />
                </div>
              </section>

              {/* DRONE */}
              <section className="border-t border-[var(--tech-border)] pt-5">
                <h3 className="text-[15px] font-semibold text-[var(--tech-text)]">
                  Drone assignment
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface-2)] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--tech-subtle)]">
                      Current mission drone
                    </p>

                    <p className="mt-2 text-[18px] font-semibold text-[var(--tech-text)]">
                      {
                        getMissionDroneCode(
                          selectedMission,
                        )
                      }
                    </p>

                    <p className="mt-1 text-[13px] text-[var(--tech-muted)]">
                      {
                        selectedMission.droneModel
                      }
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <DetailField
                        label="Battery"
                        value={`${selectedMission.batteryLevelPct}%`}
                        danger={
                          selectedMission.batteryLevelPct <
                          selectedMission.requiredDepartureBatteryPct
                        }
                      />

                      <DetailField
                        label="Required for next leg"
                        value={`${selectedMission.requiredDepartureBatteryPct}%`}
                      />

                      <DetailField
                        label="Battery service"
                        value={
                          selectedMission.batteryServiceRequired
                            ? "Required"
                            : "Not required"
                        }
                        danger={
                          selectedMission.batteryServiceRequired
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-[var(--tech-border)] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--tech-subtle)]">
                      Original drone
                    </p>

                    <p className="mt-2 text-[18px] font-semibold text-[var(--tech-text)]">
                      {
                        getDroneCode(
                          selectedMission.originalDroneType ??
                            selectedMission.droneType,
                          selectedMission.originalDroneId,
                        )
                      }
                    </p>

                    <p className="mt-1 text-[13px] text-[var(--tech-muted)]">
                      {
                        selectedMission.originalDroneModel ??
                        selectedMission.droneModel
                      }
                    </p>

                    <div className="mt-4">
                      <DetailField
                        label="Replacement"
                        value={
                          selectedMission.replacementDroneId
                            ? "Assigned by Operator"
                            : selectedMission.status ===
                                "Replacement Requested"
                              ? "Requested — awaiting Operator"
                              : "Not required"
                        }
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* ROUTE */}
              <section className="border-t border-[var(--tech-border)] pt-5">
                <h3 className="text-[15px] font-semibold text-[var(--tech-text)]">
                  Full route
                </h3>

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
                  <RoutePoint
                    label="Origin"
                    value={
                      selectedMission.origin
                    }
                  />

                  <ArrowRight
                    size={18}
                    className="hidden text-[var(--tech-subtle)] md:block"
                  />

                  <RoutePoint
                    label="Transit hub"
                    value={
                      selectedMission.hub
                    }
                    active
                  />

                  <ArrowRight
                    size={18}
                    className="hidden text-[var(--tech-subtle)] md:block"
                  />

                  <RoutePoint
                    label="Destination"
                    value={
                      selectedMission.destination
                    }
                  />
                </div>
              </section>

              {/* TECHNICAL HANDLING */}
              <section className="border-t border-[var(--tech-border)] pt-5">
                <h3 className="text-[15px] font-semibold text-[var(--tech-text)]">
                  Technical handling
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <DetailField
                    label="Battery service required"
                    value={
                      selectedMission.batteryServiceRequired
                        ? `Yes — next leg requires ${selectedMission.requiredDepartureBatteryPct}%`
                        : "No"
                    }
                    danger={
                      selectedMission.batteryServiceRequired
                    }
                  />

                  <DetailField
                    label="Can current drone continue"
                    value={
                      selectedMission.status ===
                        "Cannot Continue" ||
                      selectedMission.status ===
                        "Replacement Requested"
                        ? "No"
                        : "Yes"
                    }
                    danger={
                      selectedMission.status ===
                        "Cannot Continue" ||
                      selectedMission.status ===
                        "Replacement Requested"
                    }
                  />
                </div>

                {selectedMission.cannotContinueReason && (
                  <div className="mt-4 rounded-md border border-[var(--tech-border)] bg-[var(--tech-surface-2)] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-red-500">
                      Cannot continue reason
                    </p>

                    <p className="mt-1 text-[13px] leading-5 text-[var(--tech-text-secondary)]">
                      {
                        selectedMission.cannotContinueReason
                      }
                    </p>
                  </div>
                )}
              </section>

              {/* OPERATOR REPLACEMENT */}
              {(selectedMission.status ===
                "Replacement Requested" ||
                selectedMission.replacementDroneId ||
                selectedMission.replacementRequestedAt ||
                selectedMission.replacementAssignedAt) && (
                  <section className="border-t border-[var(--tech-border)] pt-5">
                    <h3 className="text-[15px] font-semibold text-[var(--tech-text)]">
                      Replacement coordination
                    </h3>

                    <div className="mt-4 rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface-2)] p-4">
                      {selectedMission.status ===
                        "Replacement Requested" &&
                        !selectedMission.replacementDroneId && (
                          <div className="flex items-start gap-3">
                            <Clock3
                              size={17}
                              className="mt-0.5 shrink-0 text-orange-500"
                            />

                            <div>
                              <p className="text-[14px] font-semibold text-[var(--tech-text)]">
                                Waiting for Operator assignment
                              </p>

                              <p className="mt-1 text-[13px] leading-5 text-[var(--tech-muted)]">
                                Technician has requested a replacement.
                                Operator is responsible for selecting the next drone for this mission leg.
                              </p>
                            </div>
                          </div>
                        )}

                      {selectedMission.replacementDroneId && (
                        <div className="grid gap-4 sm:grid-cols-3">
                          <DetailField
                            label="Replacement drone"
                            value={
                              getMissionDroneCode(
                                selectedMission,
                              )
                            }
                          />

                          <DetailField
                            label="Assigned by"
                            value="Operator"
                          />

                          <DetailField
                            label="Assignment status"
                            value="Assigned"
                          />
                        </div>
                      )}

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        {selectedMission.replacementRequestedAt && (
                          <DetailField
                            label="Requested at"
                            value={
                              selectedMission.replacementRequestedAt
                            }
                          />
                        )}

                        {selectedMission.replacementAssignedAt && (
                          <DetailField
                            label="Assigned at"
                            value={
                              selectedMission.replacementAssignedAt
                            }
                          />
                        )}
                      </div>
                    </div>
                  </section>
                )}

              {/* ACTIVITY / AUDIT */}
              <section className="border-t border-[var(--tech-border)] pt-5">
                <h3 className="text-[15px] font-semibold text-[var(--tech-text)]">
                  Activity
                </h3>

                <div className="mt-4 space-y-0">
                  <ActivityRow
                    label="Mission available at transit hub"
                    value={
                      selectedMission.arrivalConfirmedAt
                        ? "Arrival confirmed"
                        : "Waiting for arrival confirmation"
                    }
                    muted={
                      !selectedMission.arrivalConfirmedAt
                    }
                  />

                  {selectedMission.arrivalConfirmedAt && (
                    <ActivityRow
                      label="Arrival confirmed"
                      value={
                        selectedMission.arrivalConfirmedAt
                      }
                    />
                  )}

                  {selectedMission.batteryServiceRequired && (
                    <ActivityRow
                      label="Battery check"
                      value="Battery service required before next leg"
                    />
                  )}

                  {selectedMission.replacementRequestedAt && (
                    <ActivityRow
                      label="Replacement requested"
                      value={
                        selectedMission.replacementRequestedAt
                      }
                    />
                  )}

                  {selectedMission.replacementAssignedAt && (
                    <ActivityRow
                      label="Replacement assigned"
                      value={
                        selectedMission.replacementAssignedAt
                      }
                    />
                  )}

                  {selectedMission.status ===
                    "Ready" && (
                    <ActivityRow
                      label="Readiness"
                      value="Drone ready for next leg"
                    />
                  )}

                  {selectedMission.departedAt && (
                    <ActivityRow
                      label="Departed"
                      value={
                        selectedMission.departedAt
                      }
                    />
                  )}
                </div>
              </section>

              {/* TECHNICIAN ACTION */}
              {(selectedMission.status ===
                "At Hub" ||
                selectedMission.status ===
                  "Ready") &&
                !selectedMission.replacementDroneId && (
                  <section className="border-t border-[var(--tech-border)] pt-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h3 className="text-[15px] font-semibold text-[var(--tech-text)]">
                          Hub readiness check
                        </h3>

                        <p className="mt-1 text-[13px] text-[var(--tech-muted)]">
                          Perform a quick safety check before departure. If the drone fails, mark it Cannot continue; the system will create a Maintenance Alert automatically.
                        </p>
                      </div>

                      <Button
                        type="button"
                        onClick={() =>
                          markCannotContinue(
                            selectedMission,
                          )
                        }
                        className="h-9 rounded-md border border-[var(--tech-border)] !bg-transparent px-4 text-[13px] font-medium text-[var(--tech-text-secondary)] hover:!border-red-500/50 hover:!bg-transparent hover:!text-red-500"
                      >
                        Cannot continue
                      </Button>
                    </div>
                  </section>
                )}
            </div>
          </div>
        </div>
      )}
    </TechnicianPageShell>
  );
}

function ActivityRow({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="grid gap-1 border-b border-[var(--tech-border)] py-3 last:border-b-0 sm:grid-cols-[220px_1fr] sm:gap-6">
      <span className="text-[12px] font-medium text-[var(--tech-muted)]">
        {label}
      </span>

      <span
        className={
          muted
            ? "text-[13px] text-[var(--tech-subtle)]"
            : "text-[13px] text-[var(--tech-text-secondary)]"
        }
      >
        {value}
      </span>
    </div>
  );
}

function DetailField({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--tech-subtle)]">
        {label}
      </p>

      <p
        className={
          danger
            ? "mt-1 text-[14px] font-semibold text-red-500"
            : "mt-1 text-[14px] font-medium text-[var(--tech-text-secondary)]"
        }
      >
        {value}
      </p>
    </div>
  );
}

function RoutePoint({
  label,
  value,
  active = false,
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div className="rounded-md border border-[var(--tech-border)] bg-[var(--tech-surface-2)] px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--tech-subtle)]">
        {label}
      </p>

      <p
        className={
          active
            ? "mt-1 text-[14px] font-semibold text-orange-500"
            : "mt-1 text-[14px] font-medium text-[var(--tech-text)]"
        }
      >
        {value}
      </p>
    </div>
  );
}

function TransitStatus({
  status,
}: {
  status: TransitMissionStatus;
}) {
  const isCritical =
    status ===
    "Cannot Continue";

  const needsAttention =
    status === "Incoming" ||
    status ===
      "Replacement Requested";

  const style =
    isCritical
      ? "border-red-500/25 text-red-500"
      : needsAttention
        ? "border-orange-500/30 text-orange-500"
        : "border-[var(--tech-border)] text-[var(--tech-text-secondary)]";

  return (
    <span
      className={`inline-flex max-w-full whitespace-nowrap rounded-md border bg-transparent px-2 py-1 text-[11px] font-medium 2xl:px-2.5 2xl:text-[12px] ${style}`}
    >
      {status}
    </span>
  );
}
