import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useRef,
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
  isContinuationMission,
  isActiveTechnicianTransitMission,
  hasFinalHubMismatch,
  type TransitMission,
  type TransitMissionHistory,
  type TransitMissionPurpose,
  type TransitMissionStatus,
} from "../utils/transitMissionStorage";

import {
  useConfirmTransitArrivalMutation,
  useTransitMissionsQuery,
  useTransitHistoryQuery,
  useTransitBatterySwapMutation,
  useTransitDispatchMutation,
} from "../hooks/useTransitQueries";

import {
  useBatteriesQuery,
} from "../hooks/useBatteryQueries";
import type { HubBattery } from "../utils/batteryStorage";
import { TechnicianApiError } from "../api/httpClient";

type TransitFilter =
  | "All transit"
  | TransitMissionStatus;

/** Only Backend-verified drone ↔ battery compatibility may enable assignment. */
function compatibleBatteryForTransit(battery: HubBattery, mission: TransitMission) {
  const norm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");
  const droneModel = norm(mission.droneModel);
  if (!droneModel || droneModel === "—") return false;
  const compatibility = battery.compatibleDroneModels ?? [];
  if (compatibility.length) return compatibility.some((m) => norm(m) === droneModel);
  // Only exact names qualify when a separate compatibility map is absent.
  const batteryModel = battery.model;
  if (!batteryModel) return false;
  return norm(batteryModel) === droneModel;
}

/** Preserve the real drone_id from GET /technician/fleet/incoming.
 * drone_code is the drone's name, NOT its identifier. */
function getMissionDroneId(mission: TransitMission): string {
  return mission.currentDroneId && mission.currentDroneId !== "0"
    ? mission.currentDroneId
    : "—";
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

function getMissionStateHint(purpose: TransitMissionPurpose) {
  if (purpose === "BATTERY_STOP") return "Relay hub · battery stop";
  if (purpose === "INCIDENT_RETURN") return "Incident · technical inspection";
  if (purpose === "RETURN_TO_HUB") return "Final hub · completed flight";
  return "Unclassified arrival";
}

function getPurposeDescription(purpose: TransitMissionPurpose) {
  if (purpose === "BATTERY_STOP") {
    return "Relay Hub flow: Confirm Relay Arrival → Swap Battery → Dispatch. The Backend changes mission to Flying and notifies Operator.";
  }
  if (purpose === "RETURN_TO_HUB") {
    return "At destination Hub: click Confirm once after the drone has physically landed. Inspection and hub inventory follow Backend workflow.";
  }
  if (purpose === "INCIDENT_RETURN") {
    return "For a landed incident: click Confirm once. Backend receives the incident flag; inspection and maintenance are handled separately.";
  }
  return "Backend did not provide an arrival reason. When the drone current hub matches the destination hub, Technician can confirm physical receipt using the final-destination API. Otherwise, Backend must classify the stop first.";
}

function getHistoryResultLabel(
  outcome:
    TransitMissionHistory["outcome"],
) {
  return outcome;
}

/**
 * Choose the confirm API using BE data, never by parsing drone names.
 * A match of the current hub and destination hub can identify the FINAL
 * destination for an unclassified Incoming record. The Technician's single
 * Confirm click attests physical receipt; BE must still validate eligibility.
 * Without such evidence, do NOT guess relay/final or fake a confirmation.
 */
function getArrivalConfirmRoute(mission: TransitMission): "RELAY" | "FINAL" | null {
  if (!isActiveTechnicianTransitMission(mission) ||
      mission.arrivalConfirmed || mission.intakeCompleted ||
      hasFinalHubMismatch(mission)) return null;

  const handling = (mission.handlingStatus ?? "")
    .trim().toUpperCase().replace(/[\s-]+/g, "_");

  if (isContinuationMission(mission) && handling === "AT_RELAY_HUB") {
    return "RELAY";
  }

  if (mission.purpose === "INCIDENT_RETURN" &&
      ["CANNOT_CONTINUE", "AT_HUB", "ARRIVED_AT_HUB"].includes(handling) &&
      mission.droneCurrentHubId !== undefined) {
    return "FINAL";
  }

  if (mission.purpose === "RETURN_TO_HUB" &&
      ["AT_HUB", "ARRIVED_AT_HUB"].includes(handling)) {
    return "FINAL";
  }

  // BE has not sent purpose, but current hub matches the destination hub.
  // This picks the final-destination API, not a relay continuation API.
  // 'Incoming/Flying' by itself is NOT proof of landing; the user click
  // confirms physical receipt, and the backend is authoritative on success.
  if (mission.purpose === "UNKNOWN" && handling === "INCOMING" &&
      mission.droneCurrentHubId !== undefined &&
      mission.destinationHubId !== undefined &&
      mission.droneCurrentHubId === mission.destinationHubId) {
    return "FINAL";
  }

  return null;
}

function canConfirmLandedMission(mission: TransitMission): boolean {
  return getArrivalConfirmRoute(mission) !== null;
}

export function TransitMissionsPage() {
  const navigate = useNavigate();
  const transitQuery =
    useTransitMissionsQuery();

  const confirmArrivalMutation =
    useConfirmTransitArrivalMutation();

  const batteriesQuery =
    useBatteriesQuery();

  const batterySwapMutation = useTransitBatterySwapMutation();
  const dispatchMutation = useTransitDispatchMutation();
  const [dispatchedRelayMissionIds, setDispatchedRelayMissionIds] = useState<string[]>([]);
  const historyQuery = useTransitHistoryQuery();

  const [
    missions,
    setMissions,
  ] = useState<TransitMission[]>(() => transitQuery.data ?? []);

  // Server-verified arrival acknowledgment for the current session.
  // Unlike intake completion, it must NOT remove the mission from this list.
  const [confirmedArrivalIds, setConfirmedArrivalIds] = useState<string[]>([]);

  const missionHistory = historyQuery.data ?? [];
  const [oldBatteryHasIssue, setOldBatteryHasIssue] = useState(false);
  const [oldBatteryIssueNotes, setOldBatteryIssueNotes] = useState("");

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
        Boolean(battery.backendId) &&
        battery.status === "Ready" &&
        battery.chargeReportedByBackend === true &&
        battery.chargeLevelPct >= 100 &&
        !battery.droneId &&
        !/^(IN_USE|INSTALLED|ASSIGNED|RESERVED|MAINTENANCE|CHARGING)$/i.test(battery.backendStatus ?? ""),
    );

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
          // Incoming API can contain Scheduled/Ready preflight missions.
          // Active Transit is ONLY Relay Stop, Incident, or completed arrival.
          if (!isActiveTechnicianTransitMission(mission)) return false;
          const code =
            getMissionDroneId(
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



  // One click = one confirmation API request. No Arrival type dropdown,
  // second confirmation button, or synthetic success in the frontend.
  const confirmingArrivalIds = useRef<Set<string>>(new Set());

  const requestConfirm = async (mission: TransitMission) => {
    const missionKey = mission.backendMissionId;
    if (!missionKey) {
      pushActionMessage("Backend mission ID is missing; cannot confirm arrival.");
      return;
    }
    if (mission.arrivalConfirmed || confirmedArrivalIds.includes(mission.id)) {
      pushActionMessage("Arrival was already confirmed by Backend; it cannot be confirmed twice.");
      return;
    }
    const confirmRoute = getArrivalConfirmRoute(mission);
    if (!confirmRoute) {
      pushActionMessage(hasFinalHubMismatch(mission)
        ? "Drone's current hub differs from destination hub. Ask Backend to correct the hub assignment before confirming arrival."
        : "This incoming record does not identify a safe destination/relay arrival yet. Check the drone's actual hub and Backend handling status.");
      return;
    }
    if (confirmingArrivalIds.current.has(missionKey) || confirmArrivalMutation.isPending) return;

    const relay = confirmRoute === "RELAY";
    confirmingArrivalIds.current.add(missionKey);
    try {
      await confirmArrivalMutation.mutateAsync({
        missionId: missionKey,
        relay,
        // The mission already identifies an incident. Do not invent an
        // inspection result or fault description if Backend has none.
        hasIssue: mission.purpose === "INCIDENT_RETURN",
        notes: mission.purpose === "INCIDENT_RETURN"
          ? (mission.cannotContinueReason ?? "")
          : "",
      });
      setSelectedMissionId(null);
      setConfirmedArrivalIds((ids) => ids.includes(mission.id) ? ids : [...ids, mission.id]);
      pushActionMessage(relay
        ? "Drone arrival confirmed by Backend. Continue with battery replacement when available."
        : "Arrival confirmation accepted by Backend. Transit, Hub Fleet and related information are refreshing.");
      void transitQuery.refetch();
      void historyQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not confirm arrival.";
      if (error instanceof TechnicianApiError && error.status === 400 &&
          /arrival\s+already\s+confirmed/i.test(message)) {
        // Backend, not the frontend, explicitly says it was already accepted.
        setConfirmedArrivalIds((ids) => ids.includes(mission.id) ? ids : [...ids, mission.id]);
        pushActionMessage("Backend reports that arrival was already confirmed. Refreshing missions and history.");
        void transitQuery.refetch();
        void historyQuery.refetch();
      } else {
        pushActionMessage(message);
      }
    } finally {
      confirmingArrivalIds.current.delete(missionKey);
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

    if (!selectedBattery || !compatibleBatteryForTransit(selectedBattery, mission)) {
      pushActionMessage(
        "Battery is not verified as Ready, fully charged and compatible with this drone. Check Backend battery model/compatibility data.",
      );
      return;
    }

    try {
      // New API expects a REAL internal numeric battery ID, not BAT- display code.
      const backendId = selectedBattery.backendId;
      if (!backendId || !/^\d+$/.test(backendId)) {
        throw new Error("Backend must provide a numeric battery ID for swap-battery.");
      }
      await batterySwapMutation.mutateAsync({
        missionId: mission.backendMissionId,
        newBatteryId: Number(backendId),
        oldBatteryHasIssue,
        issueNotes: oldBatteryHasIssue ? oldBatteryIssueNotes.trim() : "",
      });
      setOldBatteryHasIssue(false);
      setOldBatteryIssueNotes("");
      setOpenBatteryDropdownMissionId(null);
      const refreshed = await transitQuery.refetch();
      pushActionMessage(
        refreshed.isError
          ? "Battery swap accepted. Refresh Transit Missions to check READY_FOR_RELAUNCH."
          : "Battery swapped. Technician may Dispatch once Backend returns READY_FOR_RELAUNCH.",
      );
    } catch (error) {
      pushActionMessage(
        error instanceof Error
          ? error.message
          : "Unable to replace the mission battery.",
      );
    }
  };

  const dispatchMission = async (mission: TransitMission) => {
    if (!mission.backendMissionId || !isContinuationMission(mission) ||
        dispatchedRelayMissionIds.includes(mission.backendMissionId) ||
        mission.handlingStatus?.toUpperCase() !== "READY_FOR_RELAUNCH") {
      pushActionMessage("Mission must be READY_FOR_RELAUNCH before Dispatch.");
      return;
    }
    try {
      await dispatchMutation.mutateAsync(mission.backendMissionId);
      setDispatchedRelayMissionIds((ids) => ids.includes(mission.backendMissionId!)
        ? ids : [...ids, mission.backendMissionId!]);
      setOpenBatteryDropdownMissionId(null);
      pushActionMessage("Relay Dispatch accepted. Drone and new battery leave the relay hub; old battery stays in Battery Management. Fleet and battery inventories are refreshing from Backend.");
    } catch (error) {
      pushActionMessage(error instanceof Error ? error.message : "Dispatch failed.");
    }
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

      {transitQuery.isError && (
        <div className="mb-4 rounded-md border border-red-500/25 px-4 py-3 text-[13px] text-red-500">
          Cannot load transit missions.
          <button type="button" className="ml-3 font-semibold underline" onClick={() => void transitQuery.refetch()}>Retry</button>
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
            Drone ID
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
                getMissionDroneId(
                  mission,
                );

              const compatibleReadyBatteries = readyBatteries.filter(
                (battery) => compatibleBatteryForTransit(battery, mission),
              );
              const batteryNeedsService =
                isContinuationMission(mission) &&
                mission.status === "At Hub" &&
                mission.batteryServiceRequired;
              const arrivalConfirmed = mission.arrivalConfirmed ||
                confirmedArrivalIds.includes(mission.id);
              // Incident handling stays visible; confirmation uses its
              // Backend-classified purpose without any extra selection.
              const incidentAtRelay = mission.purpose === "INCIDENT_RETURN" &&
                ["AT_RELAY_HUB", "WAITING_BATTERY_SWAP", "READY_FOR_RELAUNCH"].includes(
                  (mission.handlingStatus ?? "").toUpperCase(),
                );

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
                        status={mission.status}
                      />
                      {arrivalConfirmed && !mission.intakeCompleted &&
                        !isContinuationMission(mission) && (
                          <p className="mt-1 text-[11px] text-[var(--tech-muted)]">
                            Arrival confirmed · follow-up pending
                          </p>
                        )}
                    </div>

                    {/* ACTIONS */}
                    <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 lg:justify-end">
                      {canConfirmLandedMission(mission) && !arrivalConfirmed && (
                        <Button
                          type="button"
                          onClick={() =>
                            void requestConfirm(mission)
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
                          {confirmArrivalMutation.isPending ? "Confirming..." : "Confirm"}
                        </Button>
                      )}

                      {mission.status === "Incoming" &&
                        (mission.handlingStatus ?? "").trim().toUpperCase() === "INCOMING" && !arrivalConfirmed && (
                          <span className="text-[11px] text-[var(--tech-muted)]" title="Only click Confirm after the drone has physically landed and been received">
                            Confirm after landing
                          </span>
                        )}

                      {hasFinalHubMismatch(mission) && (
                        <span className="text-[12px] text-orange-500" title="drone_current_hub_id differs from destination_hub_id">
                          Hub mismatch · verify
                        </span>
                      )}

                      {incidentAtRelay && !canConfirmLandedMission(mission) && (
                        <Button
                          type="button"
                          onClick={() => navigate("/technician/maintenance/alerts")}
                          className="h-9 shrink-0 rounded-md border border-orange-500/40 px-3 text-[13px] font-medium text-orange-500"
                          title="Incident at relay hub: review the alert. A separate BE intake endpoint is required before confirming this type of arrival."
                        >
                          <CircleAlert size={14} />
                          Review incident
                        </Button>
                      )}

                      {isContinuationMission(mission) &&
                        mission.status ===
                          "At Hub" &&
                        mission.batteryServiceRequired && (
                          <div className="relative inline-flex shrink-0 flex-col gap-1">
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
                                batterySwapMutation.isPending ||
                                compatibleReadyBatteries.length === 0 ||
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
                                  : compatibleReadyBatteries.length === 0
                                    ? "No Ready battery available"
                                    : "Choose a Ready battery"
                              }
                              className="h-9 shrink-0 rounded-md bg-orange-500 px-3 text-[13px] font-medium text-black hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <BatteryCharging size={14} />
                              {batterySwapMutation.isPending
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
                                <label className="flex items-center gap-2 px-2 py-2 text-[11px] text-zinc-100">
                                  <input type="checkbox" checked={oldBatteryHasIssue}
                                    onChange={(event) => setOldBatteryHasIssue(event.target.checked)} />
                                  Old battery has an issue
                                </label>
                                {oldBatteryHasIssue && (
                                  <textarea value={oldBatteryIssueNotes}
                                    onChange={(event) => setOldBatteryIssueNotes(event.target.value)}
                                    placeholder="Issue notes" rows={2}
                                    className="mb-2 w-full rounded border border-zinc-600 bg-zinc-900 p-2 text-[12px] text-white" />
                                )}
                                {compatibleReadyBatteries.map((battery) => (
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
                                      batterySwapMutation.isPending
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

                      {mission.status === "Cannot Continue" && !canConfirmLandedMission(mission) && (
                        <Button type="button" variant="outline"
                          onClick={() => navigate("/technician/maintenance/alerts")}
                          className="h-9 shrink-0 text-[12px] text-orange-500"
                          title="Review incident and maintenance alerts; do not dispatch an unsafe drone">
                          <CircleAlert size={14} /> Review incident
                        </Button>
                      )}

                      {isContinuationMission(mission) &&
                        mission.status === "Ready" && (
                        <Button type="button" onClick={() => void dispatchMission(mission)}
                          disabled={dispatchMutation.isPending || !mission.backendMissionId ||
                            dispatchedRelayMissionIds.includes(mission.backendMissionId ?? "") ||
                            mission.handlingStatus?.toUpperCase() !== "READY_FOR_RELAUNCH"}
                          className="h-9 rounded-md bg-orange-500 px-3 text-[13px] font-medium text-black hover:bg-orange-600 disabled:opacity-50">
                          <ArrowRight size={14}/>{dispatchedRelayMissionIds.includes(mission.backendMissionId ?? "")
                            ? "Dispatched · syncing" : dispatchMutation.isPending ? "Dispatching..." : "Dispatch"}
                        </Button>
                      )}

                      {!isContinuationMission(mission) &&
                        arrivalConfirmed &&
                        !mission.intakeCompleted && (
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

          {visibleMissions.length === 0 && (
            <div className="px-5 py-14 text-center">
              <p className="text-[15px] font-medium text-[var(--tech-text-secondary)]">
                {transitQuery.isPending ? "Loading transit missions..." : transitQuery.isError ? "Unable to load transit missions" : "No incoming missions found"}
              </p>

              <p className="mt-1 text-[13px] text-[var(--tech-muted)]">
                {transitQuery.isPending ? "Fetching data from Backend." : transitQuery.isError ? "Check the Backend connection and retry." : "No drones currently require handling at this hub."}
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
                    Drone ID
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

                {historyQuery.isPending ? (
                  <p className="p-8 text-center text-sm text-[var(--tech-muted)]">Loading mission history...</p>
                ) : historyQuery.isError ? (
                  <div className="p-8 text-center text-sm text-red-500">
                    Could not load history from Backend.
                    <button className="ml-2 underline" onClick={() => void historyQuery.refetch()}>Retry</button>
                  </div>
                ) : missionHistory.length >
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
                              {item.droneId || "—"}
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
                      No completed transit records returned by Backend.
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
                      label="Drone ID"
                      value={
                        getMissionDroneId(
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
                          ? "Ready for Dispatch"
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
                    When the drone has physically landed, click Confirm once to record its arrival. Inspection and hub inventory are handled in the subsequent Backend workflow.
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
                        : (selectedMission.arrivalConfirmed ||
                           confirmedArrivalIds.includes(selectedMission.id))
                          ? "Confirmed (time not provided by Backend)"
                          : "Waiting for arrival confirmation"
                    }
                    muted={
                      !selectedMission.arrivalConfirmed &&
                      !confirmedArrivalIds.includes(selectedMission.id)
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
                        ? "After swapping a compatible battery, Technician can dispatch the next leg. Backend notifies Operator."
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
