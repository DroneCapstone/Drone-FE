import {
  type ReactNode,
  useEffect,
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
  History,
  PlaneTakeoff,
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

import {
  loadFleet,
  saveFleet,
  TECHNICIAN_HUB,
  type FleetDrone,
} from "../utils/fleetStorage";

import {
  formatTransitTime,
  loadTransitMissionHistory,
  loadTransitMissions,
  saveTransitMissionHistory,
  saveTransitMissions,
  type TransitMission,
  type TransitMissionHistory,
  type TransitMissionPurpose,
  type TransitMissionStatus,
} from "../utils/transitMissionStorage";

import {
  createMaintenanceAlert,
  loadMaintenanceAlerts,
} from "../utils/maintenanceAlertStorage";

import {
  detachBatteryFromDrone,
  getBatteryForDrone,
  installFullBatteryOnDrone,
  replaceBatteryForTransitStop,
} from "../utils/batteryStorage";

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

  return "Incident return";
}

function getMissionStateLabel(
  purpose: TransitMissionPurpose,
) {
  if (purpose === "BATTERY_STOP") {
    return "Active mission";
  }

  if (
    purpose === "RETURN_TO_HUB"
  ) {
    return "Mission completed";
  }

  return "Incident return";
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

function getPurposeDescription(
  purpose: TransitMissionPurpose,
) {
  if (purpose === "BATTERY_STOP") {
    return "Active delivery mission. The drone is stopping at this hub for battery service before continuing.";
  }

  if (
    purpose === "RETURN_TO_HUB"
  ) {
    return "Delivery mission is already complete. After arrival confirmation, the current battery is removed for charging and the drone is stored in Hub Fleet without a battery installed.";
  }

  return "Operator/System reported an in-flight incident. After arrival confirmation, the current battery is removed and the drone enters Hub Fleet with Maintenance status and no battery installed.";
}

function getHistoryResultLabel(
  outcome:
    TransitMissionHistory["outcome"],
) {
  return outcome;
}

export function TransitMissionsPage() {
  const [
    missions,
    setMissions,
  ] = useState<
    TransitMission[]
  >(() =>
    loadTransitMissions().map(
      (mission) =>
        mission.status ===
        "Replacement Requested"
          ? {
              ...mission,
              status:
                "Cannot Continue" as const,
            }
          : mission,
    ),
  );

  const [
    fleet,
    setFleet,
  ] = useState<
    FleetDrone[]
  >(loadFleet);

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
    const stored =
      loadTransitMissions();

    if (
      stored.some(
        (mission) =>
          mission.status ===
          "Replacement Requested",
      )
    ) {
      saveTransitMissions(
        stored.map(
          (mission) =>
            mission.status ===
            "Replacement Requested"
              ? {
                  ...mission,
                  status:
                    "Cannot Continue" as const,
                }
              : mission,
        ),
      );
    }
  }, []);

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

          const belongsToThisHub =
            mission.hub ===
            TECHNICIAN_HUB;

          return (
            belongsToThisHub &&
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

  const upsertDroneAtHub = (
    mission: TransitMission,
    status:
      FleetDrone["status"],
    batteryLevelPct:
      number = mission.batteryLevelPct,
  ) => {
    const existing =
      fleet.find(
        (drone) =>
          drone.id ===
          mission.currentDroneId,
      );

    if (existing) {
      return fleet.map(
        (drone) =>
          drone.id ===
          mission.currentDroneId
            ? {
                ...drone,
                location:
                  TECHNICIAN_HUB,
                battery:
                  batteryLevelPct,
                status,
                lastFlight:
                  mission.missionId,
              }
            : drone,
      );
    }

    const newDrone:
      FleetDrone = {
      id:
        mission.currentDroneId,
      name:
        getMissionDroneCode(
          mission,
        ),
      model:
        mission.droneModel,
      status,
      battery:
        batteryLevelPct,
      utilization: 0,
      lastFlight:
        mission.missionId,
      location:
        TECHNICIAN_HUB,
    };

    return [
      ...fleet,
      newDrone,
    ];
  };

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

  const confirmArrival = (
    mission: TransitMission,
  ) => {
    const now =
      formatTransitTime();

    /*
     * CASE 1:
     * Active mission stops at this hub for battery service.
     *
     * Keep the row in Transit Missions.
     */
    if (
      mission.purpose ===
      "BATTERY_STOP"
    ) {
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
                    true,
                  arrivalConfirmedAt:
                    now,
                }
              : item,
        );

      persistFleet(
        upsertDroneAtHub(
          mission,
          "Available",
        ),
      );

      persistMissions(
        nextMissions,
      );

      pushActionMessage(
        `${getMissionDroneCode(
          mission,
        )} arrival confirmed. Battery replacement is required before the mission continues.`,
      );

      return;
    }

    /*
     * CASE 2:
     * Delivery already completed.
     * Drone returns to this hub.
     *
     * Confirm -> add to Hub Fleet -> remove from active Transit Missions.
     */
    if (
      mission.purpose ===
      "RETURN_TO_HUB"
    ) {
      detachBatteryFromDrone({
        batteryId:
          mission.batteryId,
        droneId:
          mission.currentDroneId,
        hub:
          TECHNICIAN_HUB,
        chargeLevelPct:
          mission.batteryLevelPct,
        missionId:
          mission.missionId,
      });

      persistFleet(
        upsertDroneAtHub(
          mission,
          "Available",
          0,
        ),
      );

      persistMissions(
        missions.filter(
          (item) =>
            item.id !==
            mission.id,
        ),
      );

      addHistory(
        mission,
        "Returned to hub",
        now,
        mission.batteryLevelPct,
      );

      setSelectedMissionId(null);

      window.dispatchEvent(
        new CustomEvent(
          "operator-mission-updated",
          {
            detail: {
              eventType:
                "DRONE_RETURNED_TO_HUB",
              missionId:
                mission.missionId,
              droneId:
                mission.currentDroneId,
              hub:
                mission.hub,
              arrivedAt:
                now,
            },
          },
        ),
      );

      pushActionMessage(
        `${getMissionDroneCode(
          mission,
        )} return confirmed. Battery removed for charging and drone stored in Hub Fleet without a battery installed.`,
      );

      return;
    }

    /*
     * CASE 3:
     * Operator/System already detected an Incident.
     *
     * The Incident must already exist in Maintenance Alerts.
     * Technician only confirms physical arrival here.
     */
    detachBatteryFromDrone({
      batteryId:
        mission.batteryId,
      droneId:
        mission.currentDroneId,
      hub:
        TECHNICIAN_HUB,
      chargeLevelPct:
        mission.batteryLevelPct,
      missionId:
        mission.missionId,
    });

    persistFleet(
      upsertDroneAtHub(
        mission,
        "Maintenance",
        0,
      ),
    );

    persistMissions(
      missions.filter(
        (item) =>
          item.id !==
          mission.id,
      ),
    );

    addHistory(
      mission,
      "Sent to maintenance",
      now,
      mission.batteryLevelPct,
    );

    setSelectedMissionId(null);

    const existingIncidentAlert =
      loadMaintenanceAlerts().find(
        (alert) =>
          alert.id ===
            mission.incidentAlertId ||
          (alert.source ===
            "Incident" &&
            alert.droneId ===
              mission.currentDroneId &&
            alert.missionId ===
              mission.missionId),
      );

    window.dispatchEvent(
      new CustomEvent(
        "operator-mission-updated",
        {
          detail: {
            eventType:
              "INCIDENT_DRONE_ARRIVED",
            missionId:
              mission.missionId,
            droneId:
              mission.currentDroneId,
            batteryId:
              mission.batteryId,
            hub:
              mission.hub,
            arrivedAt:
              now,
          },
        },
      ),
    );

    pushActionMessage(
      existingIncidentAlert
        ? `${getMissionDroneCode(
            mission,
          )} arrival confirmed and moved to Maintenance. Open ${existingIncidentAlert.id} in Maintenance Alerts.`
        : `${getMissionDroneCode(
            mission,
          )} arrival confirmed and moved to Maintenance. Review the related Incident in Maintenance Alerts.`,
    );
  };

  const replaceBattery = (
    mission: TransitMission,
  ) => {
    if (
      mission.purpose !==
      "BATTERY_STOP"
    ) {
      return;
    }

    const batterySwap =
      replaceBatteryForTransitStop({
        incomingBatteryId:
          mission.batteryId,
        droneId:
          mission.currentDroneId,
        hub:
          TECHNICIAN_HUB,
        incomingChargeLevelPct:
          mission.batteryLevelPct,
        missionId:
          mission.missionId,
      });

    if (!batterySwap) {
      pushActionMessage(
        "No fully charged battery is available at this hub.",
      );

      return;
    }

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
                batteryId:
                  batterySwap.installedBattery.id,
                batteryLevelPct:
                  100,
                batteryServiceRequired:
                  false,
                status:
                  "Ready" as const,
              }
            : item,
      );

    persistFleet(nextFleet);
    persistMissions(nextMissions);

    pushActionMessage(
      `${getMissionDroneCode(
        mission,
      )} battery replaced with ${batterySwap.installedBattery.id} at 100%. Drone is ready to continue.`,
    );
  };

  const markReady = (
    mission: TransitMission,
  ) => {
    if (
      mission.purpose !==
      "BATTERY_STOP"
    ) {
      return;
    }

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

    const installedBattery =
      getBatteryForDrone(
        fleetDrone.id,
      );

    if (
      !installedBattery ||
      installedBattery.chargeLevelPct !==
        100
    ) {
      pushActionMessage(
        "A fully charged battery must be installed before the mission can continue.",
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
                batteryId:
                  installedBattery.id,
                batteryLevelPct:
                  installedBattery.chargeLevelPct,
                status:
                  "Ready" as const,
              }
            : item,
      ),
    );

    pushActionMessage(
      `${getMissionDroneCode(
        mission,
      )} passed the hub readiness check.`,
    );
  };

  const markCannotContinue = (
    mission: TransitMission,
  ) => {
    if (
      mission.purpose !==
      "BATTERY_STOP"
    ) {
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
                  "Drone failed the technician hub readiness check and cannot safely continue this active mission.",
                replacementRequestedAt:
                  now,
                replacementReason:
                  "TECHNICAL_FAILURE",
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
              mission.currentDroneId,
            reason:
              "TECHNICAL_FAILURE",
            requestedAt:
              now,
          },
        },
      ),
    );

    pushActionMessage(
      `${getMissionDroneCode(
        mission,
      )} moved to Maintenance. ${maintenanceAlert.id} was created and Operator was automatically notified to assign a replacement drone.`,
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

    const replacementDrone =
      fleet.find(
        (drone) =>
          drone.id ===
          mission.replacementDroneId,
      );

    if (!replacementDrone) {
      pushActionMessage(
        "Assigned replacement drone was not found in this Hub Fleet.",
      );

      return;
    }

    if (
      replacementDrone.status !==
      "Available"
    ) {
      pushActionMessage(
        "Assigned replacement drone must be Available.",
      );

      return;
    }

    let installedBattery =
      getBatteryForDrone(
        replacementDrone.id,
      );

    if (!installedBattery) {
      installedBattery =
        installFullBatteryOnDrone({
          droneId:
            replacementDrone.id,
          hub:
            TECHNICIAN_HUB,
          missionId:
            mission.missionId,
        }) ?? undefined;
    }

    if (
      !installedBattery ||
      installedBattery.chargeLevelPct !==
        100
    ) {
      pushActionMessage(
        "No fully charged battery is available for the replacement drone.",
      );

      return;
    }

    const replacementType =
      replacementDrone.name
        .match(/[A-Za-z]+/)?.[0]
        ?.toUpperCase() ??
      mission.droneType;

    persistFleet(
      fleet.map(
        (drone) =>
          drone.id ===
          replacementDrone.id
            ? {
                ...drone,
                battery: 100,
              }
            : drone,
      ),
    );

    persistMissions(
      missions.map(
        (item) =>
          item.id ===
          mission.id
            ? {
                ...item,
                currentDroneId:
                  replacementDrone.id,
                droneType:
                  replacementType,
                droneModel:
                  replacementDrone.model,
                batteryId:
                  installedBattery.id,
                batteryLevelPct:
                  100,
                batteryServiceRequired:
                  false,
                status:
                  "Ready" as const,
              }
            : item,
      ),
    );

    pushActionMessage(
      `${getDroneCode(
        replacementType,
        replacementDrone.id,
      )} confirmed ready with ${installedBattery.id} at 100%.`,
    );
  };

  const dispatchMission = (
    mission: TransitMission,
  ) => {
    if (
      mission.purpose !==
      "BATTERY_STOP"
    ) {
      return;
    }

    const currentDrone =
      fleet.find(
        (drone) =>
          drone.id ===
          mission.currentDroneId,
      );

    if (!currentDrone) {
      pushActionMessage(
        "Current mission drone was not found in the Hub Fleet.",
      );

      return;
    }

    if (
      currentDrone.status !==
      "Available"
    ) {
      pushActionMessage(
        "Only an Available drone can continue the mission.",
      );

      return;
    }

    const installedBattery =
      getBatteryForDrone(
        currentDrone.id,
      );

    if (
      !installedBattery ||
      installedBattery.chargeLevelPct !==
        100
    ) {
      pushActionMessage(
        "Drone must have a fully charged battery installed before continuing the mission.",
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
      missions.filter(
        (item) =>
          item.id !==
          mission.id,
      );

    persistFleet(
      nextFleet,
    );

    persistMissions(
      nextMissions,
    );

    addHistory(
      mission,
      "Continued",
      now,
      installedBattery.chargeLevelPct,
    );

    setSelectedMissionId(null);

    /*
     * Manual Dispatch by Technician:
     * - the Ready mission leaves the active Transit list immediately;
     * - the drone continues the flight without waiting for Operator approval;
     * - Operator is notified at the same time through MISSION_CONTINUED.
     */
    window.dispatchEvent(
      new CustomEvent(
        "operator-mission-updated",
        {
          detail: {
            eventType:
              "MISSION_CONTINUED",
            missionId:
              mission.missionId,
            legId:
              mission.legId,
            droneId:
              mission.currentDroneId,
            batteryId:
              installedBattery.id,
            hub:
              mission.hub,
            destination:
              mission.destination,
            status:
              "IN_TRANSIT",
            departedAt:
              now,
            message:
              `${getMissionDisplayId(
                mission.missionId,
              )} dispatched from ${mission.hub} and continued toward ${mission.destination}.`,
          },
        },
      ),
    );

    pushActionMessage(
      `${getMissionDisplayId(
        mission.missionId,
      )} dispatched from ${TECHNICIAN_HUB}. Operator has been notified.`,
    );
  };


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
      <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
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
                mission.purpose ===
                  "BATTERY_STOP" &&
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
                            : mission.purpose ===
                                "BATTERY_STOP"
                              ? "text-[13px] font-medium text-orange-500"
                              : "text-[13px] font-medium text-[var(--tech-text-secondary)]"
                        }
                      >
                        {getMissionStateLabel(
                          mission.purpose,
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
                        {
                          mission.batteryLevelPct
                        }
                        %
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
                          className="h-9 shrink-0 rounded-md bg-orange-500 px-3 text-[13px] font-medium text-black hover:bg-orange-600"
                        >
                          <Check
                            size={14}
                          />
                          Confirm
                        </Button>
                      )}

                      {mission.purpose ===
                        "BATTERY_STOP" &&
                        mission.status ===
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

                      {mission.purpose ===
                        "BATTERY_STOP" &&
                        mission.status ===
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
                        "Cannot Continue" &&
                        !mission.replacementDroneId && (
                          <span className="text-[13px] font-medium text-[var(--tech-muted)]">
                            Waiting for Operator
                          </span>
                        )}

                      {mission.status ===
                        "Cannot Continue" &&
                        mission.replacementDroneId && (
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
                          Dispatch
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
                      Confirmed returns and dispatched transit missions will appear here.
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
                    label="Mission leg"
                    value={
                      selectedMission.legId
                    }
                  />

                  <DetailField
                    label="Mission state"
                    value={getMissionStateLabel(
                      selectedMission.purpose,
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
                      label="Status"
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
                      value="Required on every hub arrival"
                    />

                    <DetailField
                      label="Battery service"
                      value={
                        selectedMission.batteryServiceRequired
                          ? "Required"
                          : "Completed"
                      }
                      danger={
                        selectedMission.batteryServiceRequired
                      }
                    />

                    <DetailField
                      label="Can continue"
                      value={
                        selectedMission.status ===
                          "Cannot Continue"
                          ? "No"
                          : "Yes"
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
                      Maintenance Alert already created by Operator/System
                    </p>

                    <p className="mt-1 text-[13px] leading-5 text-[var(--tech-muted)]">
                      Confirm Arrival confirms the drone is physically at this hub. The battery ID carried by the mission is verified, the battery is removed and added to Battery Management as Charging. The drone enters Hub Fleet with Maintenance status and no battery installed.
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
                    This delivery mission is already completed. After Confirm Arrival, Technician verifies the mission battery ID, removes that battery into Battery Management as Charging, stores the drone in Hub Fleet without a battery, and moves this row to Mission History.
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
                                Operator was notified automatically when Technician marked Cannot Continue. Operator selects the next drone.
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

                  {selectedMission.status ===
                    "Ready" && (
                    <ActivityRow
                      label="Readiness"
                      value="Ready to continue"
                    />
                  )}
                </div>
              </section>

              {/* HUB READINESS EXCEPTION */}
              {selectedMission.purpose ===
                "BATTERY_STOP" &&
                (selectedMission.status ===
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

                        <p className="mt-1 max-w-[620px] text-[13px] leading-5 text-[var(--tech-muted)]">
                          Use Cannot continue only if Technician discovers a technical problem while this active mission is stopped at the hub. The system will create a Hub inspection Maintenance Alert.
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
