import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowRight,
  BatteryCharging,
  ChevronDown,
  Check,
  CircleAlert,
  Clock3,
  Eye,
  History,
  Search,
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

import { TECHNICIAN_HUB } from "../utils/fleetStorage";
import { useNavigate } from "react-router-dom";

import {
  formatTransitTime,
  loadTransitMissionHistory,
  saveTransitMissionHistory,
  isContinuationMission,
  type TransitMission,
  type TransitMissionHistory,
  type TransitMissionPurpose,
  type TransitMissionStatus,
} from "../utils/transitMissionStorage";

import {
  useConfirmTransitArrivalMutation,
  useTransitMissionsQuery,
} from "../hooks/useTransitQueries";

import {
  useBatteriesQuery,
  useBatteryMutation,
} from "../hooks/useBatteryQueries";

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
  if (mission.droneCode) {
    return mission.droneCode;
  }

  return getDroneCode(
    mission.droneType,
    mission.currentDroneId,
  );
}

function getMissionDisplayId(
  missionId: string,
) {
  if (missionId.startsWith("MSN-")) {
    return missionId;
  }

  if (missionId.startsWith("MS-")) {
    return missionId.replace(
      /^MS-/,
      "MSN-",
    );
  }

  if (missionId.startsWith("MISSION-")) {
    return missionId.replace(
      /^MISSION-/,
      "MSN-",
    );
  }

  const suffix =
    missionId.match(/(\d+)$/)?.[1];

  return suffix
    ? `MSN-${suffix}`
    : `MSN-${missionId}`;
}

function getPurposeLabel(
  purpose: TransitMissionPurpose,
) {
  if (purpose === "BATTERY_STOP") {
    return "Battery stop";
  }

  if (
    purpose === "RETURN_TO_HUB"
  ) {
    return "Return to hub";
  }

  if (purpose === "INCIDENT_RETURN") return "Incident return";
  return "Needs classification";
}

function getMissionStateLabel(
  mission: TransitMission,
) {
  if (mission.missionState) {
    return mission.missionState;
  }

  if (mission.purpose === "BATTERY_STOP") {
    return "Active mission";
  }

  if (mission.purpose === "RETURN_TO_HUB") return "Mission completed";
  if (mission.purpose === "INCIDENT_RETURN") return "Incident return";
  return "Unknown mission state";
}

function getMissionStateHint(
  purpose: TransitMissionPurpose,
) {
  if (purpose === "BATTERY_STOP") {
    return "";
  }

  if (
    purpose === "RETURN_TO_HUB"
  ) {
    return "";
  }

  return "";
}

function getPurposeDescription(purpose: TransitMissionPurpose) {
  if (purpose === "BATTERY_STOP") {
    return "Active mission stopping at a transit hub. After arrival confirmation, Technician may select a Ready battery for the next leg. Departure remains Backend/Operator-controlled.";
  }
  if (purpose === "RETURN_TO_HUB") {
    return "Mission completed. Confirm the drone arrival, perform the initial inspection in Hub Fleet, and check Battery Management for detached/charging battery status. No battery replacement for this mission.";
  }
  if (purpose === "INCIDENT_RETURN") {
    return "Incident return. After confirming arrival, inspect the drone in Hub Fleet, handle the incident through Maintenance and check the battery in Battery Management. Do not continue this mission.";
  }
  return "Backend has not identified this arrival as a transit battery stop, completed return or incident return. Only confirm physical arrival; battery replacement and dispatch are blocked until the mission is classified.";
}

function getHistoryResultLabel(
  outcome:
    TransitMissionHistory["outcome"],
) {
  return outcome;
}

export function TransitMissionsPage() {
  const navigate = useNavigate();
  const transitQuery =
    useTransitMissionsQuery();

  const confirmArrivalMutation =
    useConfirmTransitArrivalMutation();

  const batteriesQuery =
    useBatteriesQuery();

  const batteryUseMutation =
    useBatteryMutation();

  const [
    missions,
    setMissions,
  ] = useState<TransitMission[]>([]);

  const [
    missionHistory,
    setMissionHistory,
  ] = useState<
    TransitMissionHistory[]
  >(loadTransitMissionHistory);

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

  const [
    historyOpen,
    setHistoryOpen,
  ] = useState(false);

  const [
    openBatteryDropdownMissionId,
    setOpenBatteryDropdownMissionId,
  ] = useState<string | null>(null);

  const selectedMission =
    selectedMissionId
      ? missions.find(
          (mission) =>
            mission.id ===
            selectedMissionId,
        ) ?? null
      : null;

  const readyBatteries =
    (batteriesQuery.data ?? []).filter(
      (battery) =>
        battery.status === "Ready" &&
        battery.chargeLevelPct >= 100,
    );

  const persistHistory = (
    next:
      TransitMissionHistory[],
  ) => {
    setMissionHistory(next);
    saveTransitMissionHistory(
      next,
    );
  };


  useEffect(() => {
    if (transitQuery.data) {
      setMissions(transitQuery.data);
    }
  }, [transitQuery.data]);

  useEffect(() => {
    if (transitQuery.error instanceof Error) {
      pushActionMessage(transitQuery.error.message);
    }
  }, [transitQuery.error]);


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

          const displayMissionId =
            getMissionDisplayId(
              mission.missionId,
            ).toLowerCase();

          const matchesSearch =
            !query ||
            mission.missionId
              .toLowerCase()
              .includes(query) ||
            displayMissionId.includes(
              query,
            ) ||
            code.includes(query);

          const matchesStatus =
            statusFilter ===
              "All transit" ||
            mission.status ===
              statusFilter;

          // The Backend incoming endpoint is already scoped to the
          // authenticated Technician's hub. Do not apply a hard-coded
          // Hub HCM-02 filter on top of the server result.
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



  const addHistory = (
    mission: TransitMission,
    outcome:
      TransitMissionHistory["outcome"],
    handledAt: string,
    batteryLevelPct:
      number = mission.batteryLevelPct,
  ) => {
    const historyItem:
      TransitMissionHistory = {
      id: `HIST-${mission.id}-${Date.now()}`,
      missionId:
        mission.missionId,
      legId:
        mission.legId,

      purpose:
        mission.purpose,

      droneId:
        mission.currentDroneId,
      droneType:
        mission.droneType,
      droneModel:
        mission.droneModel,

      origin:
        mission.origin,
      hub:
        mission.hub,
      destination:
        mission.destination,

      batteryId:
        mission.batteryId,
      batteryLevelPct,

      handledAt,
      outcome,
    };

    persistHistory([
      historyItem,
      ...missionHistory,
    ]);
  };

  const confirmArrival = async (
    mission: TransitMission,
  ) => {
    if (mission.backendMissionId === null) {
      pushActionMessage(
        `${getMissionDisplayId(
          mission.missionId,
        )} is missing backend mission_id. Confirm Arrival cannot be sent until /technician/fleet/incoming returns mission_id.`,
      );
      return;
    }

    try {
      await confirmArrivalMutation.mutateAsync(
        mission.backendMissionId,
      );

      if (!isContinuationMission(mission)) {
        // This records the confirmed arrival, not an unverified inspection
        // or battery detachment/charging operation.
        addHistory(
          mission,
          "Arrival confirmed",
          formatTransitTime(),
          mission.batteryLevelPct,
        );
      }

      setSelectedMissionId(null);
      pushActionMessage(
        isContinuationMission(mission)
          ? `${getMissionDisplayId(mission.missionId)} arrival confirmed. Check the drone before replacing its mission battery.`
          : `${getMissionDisplayId(mission.missionId)} arrival confirmed. Inspect the drone in Hub Fleet and verify battery handling in Battery Management.`,
      );
    } catch (error) {
      pushActionMessage(
        error instanceof Error
          ? error.message
          : "Unable to confirm mission arrival.",
      );
    }
  };

  const replaceBattery = async (
    mission: TransitMission,
    batteryId: string,
  ) => {
    if (!isContinuationMission(mission) || mission.status !== "At Hub") {
      pushActionMessage("Only an active transit stop at hub can replace a mission battery.");
      return;
    }
    if (!batteryId) return;
    if (!mission.backendMissionId) {
      pushActionMessage("Backend mission_id is missing; cannot safely assign a battery to this mission.");
      return;
    }

    const selectedBattery = readyBatteries.find(
      (battery) => battery.id === batteryId,
    );

    if (!selectedBattery) {
      pushActionMessage(
        "The selected battery is no longer Ready. Refresh the battery list and choose another battery.",
      );
      return;
    }

    try {
      await batteryUseMutation.mutateAsync({
        batteryId: selectedBattery.id,
        missionId: mission.backendMissionId,
      });

      // A 2xx from /batteries/{id}/use confirms the assignment request;
      // it does not guarantee Backend has approved departure or marked Ready.
      setOpenBatteryDropdownMissionId(null);
      const refreshed = await transitQuery.refetch();
      pushActionMessage(
        refreshed.isError
          ? `Battery assignment was accepted for ${getMissionDisplayId(mission.missionId)}, but the latest mission status could not be loaded. Please refresh.`
          : `Battery assignment was accepted for ${getMissionDisplayId(mission.missionId)}. Readiness is based on the Backend status.`,
      );
    } catch (error) {
      pushActionMessage(
        error instanceof Error
          ? error.message
          : "Unable to replace the mission battery.",
      );
    }
  };

  // No Technician dispatch/continue/cannot-continue endpoint exists in the
  // supplied Swagger. Do not mutate local fleet/mission state as if a flight
  // or maintenance escalation happened on Backend.


  return (
    <TechnicianPageShell
      title="Transit missions"
      description={``}
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

      {/* SEARCH + FILTER + ACTIVE MISSIONS */}
      <Card className="overflow-visible rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
        <CardContent className="flex flex-wrap items-center gap-3 border-b border-[var(--tech-border)] p-4">
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
              placeholder="Search mission or drone..."
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
            ]}
            ariaLabel="Transit mission status"
            className="min-w-[230px]"
          />

          <button
            type="button"
            onClick={() =>
              setHistoryOpen(true)
            }
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-[var(--tech-border)] px-4 text-[13px] font-medium text-[var(--tech-text-secondary)] transition-colors hover:border-orange-500/50 hover:text-orange-500"
          >
            <History size={15} />
            View history
          </button>
        </CardContent>

        {/* ACTIVE MISSIONS */}
        <div className="
          hidden
          border-b border-[var(--tech-border)]
          px-5 py-3
          lg:grid
          lg:grid-cols-[minmax(115px,0.9fr)_minmax(145px,1.05fr)_minmax(155px,1.15fr)_minmax(90px,0.65fr)_minmax(155px,1.05fr)_minmax(220px,1.45fr)]
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
            Mission state
          </span>

          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-subtle)]">
            Battery
          </span>

          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-subtle)]">
            Handling status
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
                isContinuationMission(mission) &&
                mission.status ===
                  "At Hub" &&
                mission.batteryServiceRequired;

              return (
                <div
                  key={mission.id}
                  className="px-5 py-4 transition-colors hover:bg-[var(--tech-surface-2)]/50"
                >
                  <div className="
                    grid
                    gap-3
                    lg:grid-cols-[minmax(115px,0.9fr)_minmax(145px,1.05fr)_minmax(155px,1.15fr)_minmax(90px,0.65fr)_minmax(155px,1.05fr)_minmax(220px,1.45fr)]
                    lg:items-center
                    lg:gap-4
                  ">
                    {/* MISSION */}
                    <div>
                      <p className="text-[16px] font-semibold text-[var(--tech-text)]">
                        {getMissionDisplayId(mission.missionId)}
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

                    {/* MISSION STATE */}
                    <div className="min-w-0">
                      <p
                        className={
                          mission.purpose ===
                          "INCIDENT_RETURN"
                            ? "text-[13px] font-semibold text-red-500"
                            : isContinuationMission(mission)
                              ? "text-[13px] font-medium text-orange-500"
                              : "text-[13px] font-medium text-[var(--tech-text-secondary)]"
                        }
                      >
                        {getMissionStateLabel(
                          mission,
                        )}
                      </p>

                      <p className="mt-1 truncate text-[11px] text-[var(--tech-muted)]">
                        {getMissionStateHint(
                          mission.purpose,
                        )}
                      </p>
                    </div>

                    {/* BATTERY */}
                    <div>
                      <p className="text-[13px] font-semibold text-[var(--tech-text-secondary)]">
                        {
                          mission.batteryId ??
                          "—"
                        }
                      </p>

                      <span
                        className={
                          batteryNeedsService &&
                          mission.status ===
                            "At Hub"
                            ? "mt-1 block text-[12px] font-semibold text-orange-500"
                            : "mt-1 block text-[12px] text-[var(--tech-muted)]"
                        }
                      >
                        {mission.batteryId || mission.batteryLevelPct > 0
                          ? `${mission.batteryLevelPct}%`
                          : "—"}
                      </span>

                      {batteryNeedsService &&
                        mission.status ===
                          "At Hub" && (
                          <p className="mt-1 text-[11px] font-medium text-orange-500">
                            Replacement required
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
                          disabled={
                            mission.backendMissionId ===
                              null ||
                            confirmArrivalMutation.isPending
                          }
                          title={
                            mission.backendMissionId ===
                            null
                              ? "Backend response is missing mission_id"
                              : undefined
                          }
                          className="h-9 shrink-0 rounded-md bg-orange-500 px-3 text-[13px] font-medium text-black hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Check
                            size={14}
                          />
                          Confirm
                        </Button>
                      )}

                      {isContinuationMission(mission) &&
                        mission.status ===
                          "At Hub" &&
                        mission.batteryServiceRequired && (
                          <div className="relative inline-flex shrink-0">
                            <Button
                              type="button"
                              onClick={() =>
                                setOpenBatteryDropdownMissionId(
                                  (current) =>
                                    current === mission.id
                                      ? null
                                      : mission.id,
                                )
                              }
                              disabled={
                                batteriesQuery.isPending ||
                                batteryUseMutation.isPending ||
                                readyBatteries.length === 0 ||
                                !mission.backendMissionId
                              }
                              aria-expanded={
                                openBatteryDropdownMissionId ===
                                mission.id
                              }
                              aria-haspopup="listbox"
                              aria-label={`Replace battery for ${getMissionDisplayId(
                                mission.missionId,
                              )}`}
                              title={
                                !mission.backendMissionId
                                  ? "Backend mission_id is missing"
                                  : readyBatteries.length === 0
                                    ? "No Ready battery available"
                                    : "Choose a Ready battery"
                              }
                              className="h-9 shrink-0 rounded-md bg-orange-500 px-3 text-[13px] font-medium text-black hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <BatteryCharging size={14} />
                              {batteryUseMutation.isPending
                                ? "Replacing..."
                                : "Replace battery"}
                              <ChevronDown
                                size={13}
                                className={`transition-transform ${
                                  openBatteryDropdownMissionId ===
                                  mission.id
                                    ? "rotate-180"
                                    : ""
                                }`}
                              />
                            </Button>

                            {openBatteryDropdownMissionId ===
                              mission.id && (
                              <div
                                role="listbox"
                                aria-label={`Ready batteries for ${getMissionDisplayId(
                                  mission.missionId,
                                )}`}
                                className="absolute right-0 top-[calc(100%+6px)] z-50 max-h-64 min-w-[230px] overflow-y-auto rounded-md border border-zinc-700 bg-[#121419] p-1.5 shadow-xl"
                              >
                                {readyBatteries.map((battery) => (
                                  <button
                                    key={battery.id}
                                    type="button"
                                    role="option"
                                    onClick={() =>
                                      void replaceBattery(
                                        mission,
                                        battery.id,
                                      )
                                    }
                                    disabled={
                                      batteryUseMutation.isPending
                                    }
                                    className="flex w-full items-center justify-between gap-4 rounded px-3 py-2 text-left hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <span className="min-w-0">
                                      <span className="block truncate text-[12px] font-semibold text-zinc-100">
                                        {battery.id}
                                      </span>
                                      <span className="block truncate text-[10px] text-zinc-500">
                                        {battery.model ||
                                          "Model not provided"}
                                      </span>
                                    </span>

                                    <span className="shrink-0 text-right">
                                      <span className="block text-[11px] font-semibold text-orange-500">
                                        {battery.chargeLevelPct}%
                                      </span>
                                      <span className="block text-[9px] text-zinc-500">
                                        Ready
                                      </span>
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                      {isContinuationMission(mission) &&
                        mission.status === "At Hub" &&
                        !mission.batteryServiceRequired && (
                          <span className="text-[12px] text-[var(--tech-muted)]">
                            Waiting for Backend readiness
                          </span>
                        )}

                      {mission.status === "Cannot Continue" && (
                        <span className="text-[12px] text-[var(--tech-muted)]">
                          Needs Operator / Maintenance
                        </span>
                      )}

                      {isContinuationMission(mission) &&
                        mission.status === "Ready" && (
                        <span className="text-[12px] text-[var(--tech-muted)]">
                          Ready · waiting for Operator
                        </span>
                      )}

                      {mission.status === "At Hub" &&
                        !isContinuationMission(mission) && (
                          <Button
                            type="button"
                            onClick={() => navigate("/technician/fleet")}
                            className="h-9 shrink-0 rounded-md bg-orange-500 px-3 text-[13px] font-medium text-black hover:bg-orange-600"
                          >
                            <ShieldCheck size={14} />
                            Inspect in Hub Fleet
                          </Button>
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
                No incoming missions found
              </p>

              <p className="mt-1 text-[13px] text-[var(--tech-muted)]">
                No drones currently require handling at this hub.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* HISTORY */}
      {historyOpen && (
        <div
          className="fixed inset-0 z-[135] flex items-center justify-center bg-black/60 px-4 py-6"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setHistoryOpen(false);
            }
          }}
        >
          <div className="flex max-h-[82vh] w-full max-w-[1080px] flex-col overflow-hidden rounded-xl border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--tech-border)] px-6 py-5">
              <div>
                <h2 className="text-[20px] font-semibold text-[var(--tech-text)]">
                  Mission history
                </h2>

                <p className="mt-1 text-[13px] text-[var(--tech-muted)]">
                  Inbound missions already handled at{" "}
                  {TECHNICIAN_HUB}.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setHistoryOpen(false)
                }
                className="rounded-md p-1.5 text-[var(--tech-muted)] transition-colors hover:text-orange-500"
                aria-label="Close mission history"
              >
                <X size={19} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <div className="min-w-[940px]">
                <div className="sticky top-0 z-10 grid grid-cols-[130px_145px_160px_100px_190px_1fr] items-center gap-4 border-b border-[var(--tech-border)] bg-[var(--tech-surface)] px-6 py-3">
                  <HistoryHeader>
                    Mission
                  </HistoryHeader>

                  <HistoryHeader>
                    Drone
                  </HistoryHeader>

                  <HistoryHeader>
                    Reason
                  </HistoryHeader>

                  <HistoryHeader>
                    Battery
                  </HistoryHeader>

                  <HistoryHeader>
                    Handled at
                  </HistoryHeader>

                  <HistoryHeader>
                    Result
                  </HistoryHeader>
                </div>

                {missionHistory.length >
                0 ? (
                  <div className="divide-y divide-[var(--tech-border)]">
                    {missionHistory.map(
                      (item) => (
                        <div
                          key={
                            item.id
                          }
                          className="grid grid-cols-[130px_145px_160px_100px_190px_1fr] items-center gap-4 px-6 py-4"
                        >
                          <span className="text-[14px] font-semibold text-[var(--tech-text)]">
                            {getMissionDisplayId(item.missionId)}
                          </span>

                          <div>
                            <p className="text-[14px] font-semibold text-[var(--tech-text)]">
                              {getDroneCode(
                                item.droneType,
                                item.droneId,
                              )}
                            </p>

                            <p className="mt-1 text-[11px] text-[var(--tech-muted)]">
                              {
                                item.droneModel
                              }
                            </p>
                          </div>

                          <span className="text-[12px] text-[var(--tech-text-secondary)]">
                            {getPurposeLabel(
                              item.purpose,
                            )}
                          </span>

                          <div>
                            <p className="text-[12px] font-semibold text-[var(--tech-text-secondary)]">
                              {
                                item.batteryId ??
                                "—"
                              }
                            </p>

                            <p className="mt-1 text-[11px] text-[var(--tech-muted)]">
                              {
                                item.batteryLevelPct
                              }
                              %
                            </p>
                          </div>

                          <span className="text-[12px] text-[var(--tech-muted)]">
                            {
                              item.handledAt
                            }
                          </span>

                          <span className="text-[12px] font-medium text-[var(--tech-text-secondary)]">
                            {getHistoryResultLabel(
                              item.outcome,
                            )}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="px-6 py-14 text-center">
                    <p className="text-[14px] font-medium text-[var(--tech-text-secondary)]">
                      No mission history yet
                    </p>

                    <p className="mt-1 text-[12px] text-[var(--tech-muted)]">
                      Confirmed arrivals for completed and incident-return missions appear here during this session.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAILS */}
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
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--tech-border)] bg-[var(--tech-surface)] px-6 py-5">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-[21px] font-semibold text-[var(--tech-text)]">
                    {getMissionDisplayId(selectedMission.missionId)}
                  </h2>

                  <TransitStatus
                    status={
                      selectedMission.status
                    }
                  />
                </div>

                <p className="mt-1 text-[13px] text-[var(--tech-muted)]">
                  {getPurposeLabel(
                    selectedMission.purpose,
                  )}
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
                <X size={19} />
              </button>
            </div>

            <div className="space-y-6 px-6 py-5">
              {/* OVERVIEW */}
              <section>
                <h3 className="text-[15px] font-semibold text-[var(--tech-text)]">
                  Mission overview
                </h3>

                <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                  <DetailField
                    label="Mission"
                    value={getMissionDisplayId(selectedMission.missionId)}
                  />

                  <DetailField
                    label="Backend mission ID"
                    value={
                      selectedMission.backendMissionId !==
                      null
                        ? String(
                            selectedMission.backendMissionId,
                          )
                        : "Not provided"
                    }
                    danger={
                      selectedMission.backendMissionId ===
                      null
                    }
                  />

                  <DetailField
                    label="Mission leg"
                    value={
                      selectedMission.legId
                    }
                  />

                  <DetailField
                    label="Mission state"
                    value={getMissionStateLabel(
                      selectedMission,
                    )}
                  />

                  <DetailField
                    label="Handling status"
                    value={
                      selectedMission.status
                    }
                  />

                  <DetailField
                    label="Battery ID"
                    value={
                      selectedMission.batteryId ??
                      "—"
                    }
                  />

                  <DetailField
                    label="Battery level"
                    value={`${selectedMission.batteryLevelPct}%`}
                    danger={
                      selectedMission.purpose ===
                        "BATTERY_STOP" &&
                      selectedMission.batteryLevelPct <
                        selectedMission.requiredDepartureBatteryPct
                    }
                  />
                </div>

                <p className="mt-4 rounded-md border border-[var(--tech-border)] bg-[var(--tech-surface-2)] px-4 py-3 text-[13px] leading-5 text-[var(--tech-muted)]">
                  {getPurposeDescription(
                    selectedMission.purpose,
                  )}
                </p>
              </section>

              {/* DRONE */}
              <section className="border-t border-[var(--tech-border)] pt-5">
                <h3 className="text-[15px] font-semibold text-[var(--tech-text)]">
                  Drone
                </h3>

                <div className="mt-4 rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface-2)] p-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <DetailField
                      label="Drone"
                      value={
                        getMissionDroneCode(
                          selectedMission,
                        )
                      }
                    />

                    <DetailField
                      label="Model"
                      value={
                        selectedMission.droneModel
                      }
                    />

                    <DetailField
                      label="Arrival handling"
                      value={
                        selectedMission.status
                      }
                    />

                    <DetailField
                      label="Target hub"
                      value={
                        selectedMission.hub
                      }
                    />
                  </div>
                </div>
              </section>

              {/* ROUTE */}
              <section className="border-t border-[var(--tech-border)] pt-5">
                <h3 className="text-[15px] font-semibold text-[var(--tech-text)]">
                  Route
                </h3>

                {selectedMission.purpose ===
                "BATTERY_STOP" ? (
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
                ) : (
                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                    <RoutePoint
                      label={
                        selectedMission.purpose ===
                        "RETURN_TO_HUB"
                          ? "Last delivery point"
                          : "Incident location / previous point"
                      }
                      value={
                        selectedMission.origin
                      }
                    />

                    <ArrowRight
                      size={18}
                      className="hidden text-[var(--tech-subtle)] md:block"
                    />

                    <RoutePoint
                      label="Return hub"
                      value={
                        selectedMission.hub
                      }
                      active
                    />
                  </div>
                )}
              </section>

              {/* BATTERY STOP HANDLING */}
              {selectedMission.purpose ===
                "BATTERY_STOP" && (
                <section className="border-t border-[var(--tech-border)] pt-5">
                  <h3 className="text-[15px] font-semibold text-[var(--tech-text)]">
                    Mission handling
                  </h3>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <DetailField
                      label="Battery swap policy"
                      value="Transit stops only"
                    />

                    <DetailField
                      label="Battery service"
                      value={
                        selectedMission.batteryServiceRequired
                          ? "Required"
                          : "Not required / reported complete"
                      }
                      danger={
                        selectedMission.batteryServiceRequired
                      }
                    />

                    <DetailField
                      label="Can continue"
                      value={
                        selectedMission.status === "Ready"
                          ? "Ready, awaiting Operator"
                          : selectedMission.status === "Cannot Continue"
                            ? "No"
                            : "Pending Backend verification"
                      }
                      danger={
                        selectedMission.status ===
                          "Cannot Continue"
                      }
                    />
                  </div>

                  {selectedMission.cannotContinueReason && (
                    <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/5 px-4 py-3">
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
              )}

              {/* INCIDENT */}
              {selectedMission.purpose ===
                "INCIDENT_RETURN" && (
                <section className="border-t border-[var(--tech-border)] pt-5">
                  <h3 className="text-[15px] font-semibold text-[var(--tech-text)]">
                    Incident handling
                  </h3>

                  <div className="mt-4 rounded-lg border border-orange-500/20 bg-orange-500/5 p-4">
                    <p className="text-[14px] font-semibold text-[var(--tech-text)]">
                      Review maintenance alerts after arrival
                    </p>

                    <p className="mt-1 text-[13px] leading-5 text-[var(--tech-muted)]">
                      Confirm Arrival records physical arrival with Backend. Carry out initial inspection in Hub Fleet, check maintenance status and verify battery removal/charging in Battery Management. These inventory changes must be confirmed by Backend; the FE does not perform them automatically.
                    </p>

                    {selectedMission.incidentAlertId && (
                      <p className="mt-3 text-[13px] font-medium text-orange-500">
                        Alert:{" "}
                        {
                          selectedMission.incidentAlertId
                        }
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* RETURN TO HUB */}
              {selectedMission.purpose ===
                "RETURN_TO_HUB" && (
                <section className="border-t border-[var(--tech-border)] pt-5">
                  <h3 className="text-[15px] font-semibold text-[var(--tech-text)]">
                    Return handling
                  </h3>

                  <p className="mt-3 text-[13px] leading-5 text-[var(--tech-muted)]">
                    This mission is completed. Confirm Arrival first, then perform initial inspection in Hub Fleet and verify battery removal and charging in Battery Management. The arrival appears in local history, but actual drone and battery records remain Backend-controlled.
                  </p>
                </section>
              )}

              {/* REPLACEMENT */}
              {selectedMission.purpose ===
                "BATTERY_STOP" &&
                (selectedMission.status ===
                  "Cannot Continue" ||
                  selectedMission.replacementDroneId ||
                  selectedMission.replacementRequestedAt ||
                  selectedMission.replacementAssignedAt) && (
                  <section className="border-t border-[var(--tech-border)] pt-5">
                    <h3 className="text-[15px] font-semibold text-[var(--tech-text)]">
                      Replacement coordination
                    </h3>

                    <div className="mt-4 rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface-2)] p-4">
                      {selectedMission.status ===
                        "Cannot Continue" &&
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
                                The mission requires Operator review. Replacement assignment must be recorded by Backend before the Technician can proceed.
                              </p>
                            </div>
                          </div>
                        )}

                      {selectedMission.replacementDroneId && (
                        <div className="grid gap-4 sm:grid-cols-3">
                          <DetailField
                            label="Replacement drone ID"
                            value={
                              selectedMission.replacementDroneId
                            }
                          />

                          <DetailField
                            label="Assigned by"
                            value="Operator"
                          />

                          <DetailField
                            label="State"
                            value="Assigned"
                          />
                        </div>
                      )}
                    </div>
                  </section>
                )}

              {/* ACTIVITY */}
              <section className="border-t border-[var(--tech-border)] pt-5">
                <h3 className="text-[15px] font-semibold text-[var(--tech-text)]">
                  Activity
                </h3>

                <div className="mt-4">
                  <ActivityRow
                    label="Arrival"
                    value={
                      selectedMission.arrivalConfirmedAt
                        ? selectedMission.arrivalConfirmedAt
                        : "Waiting for arrival confirmation"
                    }
                    muted={
                      !selectedMission.arrivalConfirmedAt
                    }
                  />

                  {selectedMission.purpose ===
                    "BATTERY_STOP" &&
                    selectedMission.batteryServiceRequired && (
                      <ActivityRow
                        label="Battery service"
                        value="Required before continuation"
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

                  {isContinuationMission(selectedMission) &&
                    selectedMission.status === "Ready" && (
                    <ActivityRow
                      label="Readiness"
                      value="Ready to continue"
                    />
                  )}
                </div>
              </section>

              {/* HUB INSPECTION / EXCEPTION SUPPORT */}
              <section className="border-t border-[var(--tech-border)] pt-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-[15px] font-semibold text-[var(--tech-text)]">
                      {isContinuationMission(selectedMission)
                        ? "Hub readiness & inspection"
                        : "Initial inspection"}
                    </h3>
                    <p className="mt-1 max-w-[620px] text-[13px] leading-5 text-[var(--tech-muted)]">
                      {isContinuationMission(selectedMission)
                        ? "For a technical fault, use Maintenance Alerts/Work Orders. Flight continuation and drone replacement require Backend/Operator actions."
                        : "Inspect the arrived drone in Hub Fleet and verify the removed battery in Battery Management. Arrival confirmation alone does not certify inspection or charging."}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => navigate(
                      isContinuationMission(selectedMission)
                        ? "/technician/maintenance/alerts"
                        : "/technician/fleet",
                    )}
                    className="h-9 rounded-md bg-orange-500 px-4 text-[13px] font-medium text-black hover:bg-orange-600"
                  >
                    {isContinuationMission(selectedMission)
                      ? "Open maintenance alerts"
                      : "Open Hub Fleet"}
                  </Button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </TechnicianPageShell>
  );
}

function HistoryHeader({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-subtle)]">
      {children}
    </span>
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
    status === "Incoming";

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
