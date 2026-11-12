import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";

import {
  ArrowRight,
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

import { useNavigate } from "react-router-dom";

import {
  isContinuationMission,
  isActiveTechnicianTransitMission,
  hasFinalHubMismatch,
  getTransitConfirmKind,
  type TransitMission,
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

import { TechnicianApiError } from "../api/httpClient";

type TransitFilter =
  | "All transit"
  | TransitMissionStatus;

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
  return "En route";
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

/** Show the exact mission lifecycle from Backend as the primary label.
 * Flight destination/relay is a separate, smaller line; it must never
 * replace the mission state or be confused with handling/landing status.
 * `purpose` is mapped by transitMissionStorage from Backend routing data.
 */
function getMissionFlightTypeHint(mission: TransitMission): string {
  if (mission.purpose === "BATTERY_STOP") return "Relay flight";
  if (mission.purpose === "RETURN_TO_HUB") return "Destination flight";
  if (mission.purpose === "INCIDENT_RETURN") return "Incident return";
  return "Flight type pending";
}

/** A clear, human-oriented arrival label beside the raw BE handling status. */
function getHandlingHint(mission: TransitMission, arrivalConfirmed: boolean) {
  if (mission.status === "Incoming") {
    return "Approaching hub · confirm after landing";
  }
  if (mission.status === "At Hub") {
    if (arrivalConfirmed && isContinuationMission(mission)) {
      return "Received at relay · battery change";
    }
    if (arrivalConfirmed) return "Arrival confirmed · follow-up pending";
    return "Landed at hub · awaiting Tech confirmation";
  }
  if (mission.status === "Ready") return "Prepared · ready for next leg";
  if (mission.status === "Cannot Continue") return "Incident · needs inspection";
  return "";
}

function getPurposeDescription(purpose: TransitMissionPurpose) {
  if (purpose === "BATTERY_STOP") {
    return "Relay: click Confirm after physical landing. Install the battery assigned by Operator, then click Dispatch. FE records swap-battery with that assigned ID before dispatch; no battery selection dropdown.";
  }
  if (purpose === "RETURN_TO_HUB") {
    return "Destination: click Confirm once after physically receiving the drone, including when Backend still reports Flying / Incoming. BE validates the request and finalizes the mission.";
  }
  if (purpose === "INCIDENT_RETURN") {
    return "Incident return + Cannot continue: confirm arrival once, then create/review the maintenance work order. Do not dispatch an unsafe drone.";
  }
  return "Incoming: Confirm appears for every arriving drone. FE selects relay or final API using drone_current_hub_id and destination_hub_id; click only after the drone actually lands.";
}

function getHistoryReasonLabel(purpose: TransitMissionPurpose): string {
  if (purpose === "BATTERY_STOP") return "Relay / battery stop";
  if (purpose === "RETURN_TO_HUB") return "Destination arrival";
  if (purpose === "INCIDENT_RETURN") return "Incident return";
  return "Not specified";
}

/** Render the actual Backend timestamp (including seconds).
 * Timestamps without Z/offset are timezone-naive; preserve their clock time.
 * With Z/offset, format in the Technician's Vietnam timezone. */
function formatHistoryTimestamp(value?: string): string {
  if (!value || value === "—") return "—";
  const raw = value.trim();
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  const naive = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (naive && !hasTimezone) {
    return `${naive[3]}/${naive[2]}/${naive[1]} · ${naive[4]}:${naive[5]}:${naive[6] ?? "00"}`;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(parsed).replace(",", " ·");
}
/** One click calls exactly the BE endpoint selected by mission + handling + leg. */
function canConfirmLandedMission(mission: TransitMission): boolean {
  return getTransitConfirmKind(mission) !== null;
}

// One shared grid keeps header and all mission rows aligned. Desktop screens
// with limited space scroll horizontally instead of clipping IDs/descriptions.
const transitTableGrid =
  "lg:grid-cols-[minmax(176px,1.1fr)_minmax(145px,0.9fr)_minmax(185px,1.1fr)_minmax(104px,0.65fr)_minmax(230px,1.35fr)_minmax(222px,1.3fr)] lg:items-center lg:gap-4";

export function TransitMissionsPage() {
  const navigate = useNavigate();
  const transitQuery =
    useTransitMissionsQuery();

  const confirmArrivalMutation =
    useConfirmTransitArrivalMutation();

  const batterySwapMutation = useTransitBatterySwapMutation();
  const dispatchMutation = useTransitDispatchMutation();
  const [dispatchedRelayMissionIds, setDispatchedRelayMissionIds] = useState<string[]>([]);
  const historyQuery = useTransitHistoryQuery();

  const [
    missions,
    setMissions,
  ] = useState<TransitMission[]>(() => transitQuery.data ?? []);

  // A mission may visit more than one relay; confirmations are scoped to leg.
  const [confirmedArrivalIds, setConfirmedArrivalIds] = useState<string[]>([]);
  const arrivalKey = (mission: TransitMission) => `${mission.backendMissionId ?? mission.id}:${mission.legId || mission.currentLegToHubId || "current"}`;

  // GET /fleet/history is the Backend's arrival/mission history source.
  // Do not filter by mission_state: a drone may land at a relay hub for a
  // battery swap, return after an incident, or reach the destination without
  // the mission being marked Completed. All records returned by Backend must
  // remain visible, even when destination_received_at is null.
  const missionHistory = historyQuery.data ?? [];

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

  // A swap may succeed while Dispatch fails. On retry, do not perform the
  // swap a second time, even if /incoming has not caught up yet.
  const [swappedMissionKeys, setSwappedMissionKeys] = useState<string[]>([]);
  const [dispatchingKey, setDispatchingKey] = useState<string | null>(null);

  const selectedMission =
    selectedMissionId
      ? missions.find(
          (mission) =>
            mission.id ===
            selectedMissionId,
        ) ?? null
      : null;

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
    const confirmationKey = arrivalKey(mission);
    if (mission.arrivalConfirmed || confirmedArrivalIds.includes(confirmationKey)) {
      pushActionMessage("Arrival was already confirmed by Backend; it cannot be confirmed twice.");
      return;
    }
    const confirmRoute = getTransitConfirmKind(mission);
    if (!confirmRoute) {
      pushActionMessage("Cannot select arrival API: Backend must provide drone_current_hub_id and destination_hub_id (or an explicit arrival purpose). Do not confirm until the drone has physically landed.");
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
      setConfirmedArrivalIds((ids) => ids.includes(confirmationKey) ? ids : [...ids, confirmationKey]);
      pushActionMessage(relay
        ? "Relay arrival confirmed. Install the battery specified by Operator, then press Dispatch."
        : "Arrival confirmation accepted by Backend. Transit, Hub Fleet and related information are refreshing.");
      void transitQuery.refetch();
      void historyQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not confirm arrival.";
      if (error instanceof TechnicianApiError && error.status === 400 &&
          /arrival\s+already\s+confirmed/i.test(message)) {
        // Backend, not the frontend, explicitly says it was already accepted.
        setConfirmedArrivalIds((ids) => ids.includes(confirmationKey) ? ids : [...ids, confirmationKey]);
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

  /** Technician physically installs the specific battery assigned by Operator.
   * One Dispatch click records that swap (if needed), then starts the next leg.
   * The currently installed battery_id is NOT a replacement assignment.
   */
  const dispatchMission = async (mission: TransitMission) => {
    const key = arrivalKey(mission);
    if (!mission.backendMissionId || !isContinuationMission(mission) ||
        dispatchedRelayMissionIds.includes(key) || dispatchingKey !== null ||
        (mission.status !== "At Hub" && mission.status !== "Ready")) {
      return;
    }
    if (mission.status === "At Hub" &&
        !(mission.arrivalConfirmed || confirmedArrivalIds.includes(key))) {
      pushActionMessage("Confirm arrival at this relay hub before Dispatch.");
      return;
    }
    // The backend may already have recorded the swap (handling Ready).
    // Otherwise the replacement battery must come explicitly from Operator.
    const needSwap = mission.status === "At Hub" && !swappedMissionKeys.includes(key);
    if (needSwap && !mission.assignedReplacementBatteryId) {
      pushActionMessage("Backend has not supplied the Operator-assigned replacement_battery_id. The installed battery_id is the old battery and cannot be used for swap. Ask BE to expose the assigned replacement battery before Dispatch.");
      return;
    }
    setDispatchingKey(key);
    try {
      if (needSwap) {
        const newBatteryId = mission.assignedReplacementBatteryId!;
        if (!/^BAT[-_]/i.test(newBatteryId)) {
          throw new Error("Operator-assigned replacement battery must have a BAT-... ID.");
        }
        await batterySwapMutation.mutateAsync({
          missionId: mission.backendMissionId,
          newBatteryId,
        });
        setSwappedMissionKeys((keys) => keys.includes(key) ? keys : [...keys, key]);
      }
      await dispatchMutation.mutateAsync(mission.backendMissionId);
      setDispatchedRelayMissionIds((keys) => keys.includes(key) ? keys : [...keys, key]);
      pushActionMessage("Relay Dispatch was accepted by Backend. Mission continues to the next hub; fleet and battery data are refreshing.");
      void transitQuery.refetch();
      void historyQuery.refetch();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Dispatch failed.";
      pushActionMessage(`Dispatch not completed: ${detail}. If battery swap was accepted, retry will not swap a second time.`);
      void transitQuery.refetch();
    } finally {
      setDispatchingKey(null);
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
            onClick={() => {
              // History is already fetched in parallel when Transit mounts.
              // Open instantly from React Query's cached data; if stale, refresh
              // in the background without hiding the existing history rows.
              setHistoryOpen(true);
              if (historyQuery.isStale && !historyQuery.isFetching) {
                void historyQuery.refetch();
              }
            }}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-[var(--tech-border)] px-4 text-[13px] font-medium text-[var(--tech-text-secondary)] transition-colors hover:border-orange-500/50 hover:text-orange-500"
          >
            <History size={15} />
            View history
          </button>
        </CardContent>

        {/* ACTIVE MISSIONS */}
        <div className="lg:overflow-x-auto">
          <div className="lg:min-w-[1190px]">
        <div className={`
          ${transitTableGrid}
          hidden
          border-b border-[var(--tech-border)]
          px-5 py-3
          lg:grid
        `}>

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
            Arrival / handling
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

              const batteryNeedsService =
                isContinuationMission(mission) &&
                mission.status === "At Hub" &&
                mission.batteryServiceRequired;
              const arrivalConfirmed = mission.arrivalConfirmed ||
                confirmedArrivalIds.includes(arrivalKey(mission));
              // React Query reports one in-flight mutation; only that mission's
              // button should say "Confirming..." (others remain "Confirm").
              const isConfirmingThisMission =
                confirmArrivalMutation.isPending &&
                confirmArrivalMutation.variables?.missionId === mission.backendMissionId;

              return (
                <div
                  key={mission.id}
                  className="px-5 py-4 transition-colors hover:bg-[var(--tech-surface-2)]/50"
                >
                  <div className={`grid gap-3 ${transitTableGrid}`}>

                    {/* MISSION */}
                    <div>
                      <p className="whitespace-nowrap text-[14px] font-semibold tracking-tight text-[var(--tech-text)]">
                        {getMissionDisplayId(mission.missionId)}
                      </p>
                    </div>

                    {/* DRONE */}
                    <div>
                      <p className="text-[15px] font-semibold text-[var(--tech-text)]">
                        {code}
                      </p>

                      <p className="mt-1 break-words text-[12px] leading-5 text-[var(--tech-muted)]">
                        {mission.droneModel}
                      </p>
                    </div>

                    {/* MISSION STATE */}
                    <div className="min-w-0">
                      <p
                        className={
                          mission.purpose === "INCIDENT_RETURN"
                            ? "text-[13px] font-semibold text-red-500"
                            : "text-[13px] font-medium text-[var(--tech-text-secondary)]"
                        }
                      >
                        {getMissionStateLabel(mission)}
                      </p>

                      <p className="mt-1 break-words text-[12px] leading-5 text-[var(--tech-muted)]">
                        {getMissionFlightTypeHint(mission)}
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
                    <div className="min-w-0">
                      <TransitStatus
                        status={mission.status}
                      />
                      <p className={`mt-1 break-words text-[12px] leading-5 ${
                        mission.status === "At Hub" && !arrivalConfirmed
                          ? "font-medium text-orange-500"
                          : "text-[var(--tech-muted)]"
                      }`}>
                        {getHandlingHint(mission, arrivalConfirmed)}
                      </p>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 lg:justify-end">
                      {(canConfirmLandedMission(mission) || mission.status === "Incoming") && !arrivalConfirmed && (
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
                          {isConfirmingThisMission ? "Confirming..." : "Confirm"}
                        </Button>
                      )}

                      {hasFinalHubMismatch(mission) && (
                        <span className="text-[12px] text-orange-500" title="drone_current_hub_id differs from destination_hub_id">
                          Hub location differs · verify
                        </span>
                      )}

                      {isContinuationMission(mission) &&
                        (mission.status === "At Hub" || mission.status === "Ready") && (
                        <div className="flex max-w-[178px] flex-col items-end gap-1">
                          <Button
                            type="button"
                            onClick={() => void dispatchMission(mission)}
                            disabled={!mission.backendMissionId ||
                              dispatchingKey !== null || batterySwapMutation.isPending || dispatchMutation.isPending ||
                              dispatchedRelayMissionIds.includes(arrivalKey(mission)) ||
                              (mission.status === "At Hub" && !arrivalConfirmed) ||
                              (mission.status === "At Hub" && !mission.assignedReplacementBatteryId && !swappedMissionKeys.includes(arrivalKey(mission)))}
                            title={mission.status === "At Hub" && !mission.assignedReplacementBatteryId
                              ? "Waiting for Operator-assigned replacement battery ID from Backend"
                              : "After physically installing the assigned battery, Dispatch records the swap if necessary and launches the next leg"}
                            className="h-9 rounded-md bg-orange-500 px-3 text-[13px] font-medium text-black hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <ArrowRight size={14} />
                            {dispatchedRelayMissionIds.includes(arrivalKey(mission))
                              ? "Dispatched · syncing"
                              : dispatchingKey === arrivalKey(mission)
                                ? "Dispatching..."
                                : "Dispatch"}
                          </Button>
                          {mission.status === "At Hub" && (
                            <span className="text-right text-[11px] text-[var(--tech-muted)]">
                              {mission.assignedReplacementBatteryId
                                ? `Install ${mission.assignedReplacementBatteryId} (Operator assigned)`
                                : swappedMissionKeys.includes(arrivalKey(mission))
                                  ? "Battery swap recorded · retry Dispatch"
                                  : "Awaiting Operator replacement battery ID"}
                            </span>
                          )}
                        </div>
                      )}

                      {mission.status === "Cannot Continue" && !canConfirmLandedMission(mission) && (
                        <Button type="button" variant="outline"
                          onClick={() => navigate("/technician/maintenance/alerts")}
                          className="h-9 shrink-0 text-[12px] text-orange-500"
                          title="Review incident and maintenance alerts; do not dispatch an unsafe drone">
                          <CircleAlert size={14} /> Review incident
                        </Button>
                      )}

                      {mission.purpose === "INCIDENT_RETURN" &&
                        arrivalConfirmed && !mission.intakeCompleted && (
                          <Button type="button"
                            onClick={() => navigate("/technician/maintenance/alerts")}
                            className="h-9 shrink-0 rounded-md bg-orange-500 px-3 text-[13px] font-medium text-black hover:bg-orange-600">
                            <ShieldCheck size={14} /> Open maintenance alerts
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
          </div>
        </div>
      </Card>

      {/* HISTORY — GET /technician/fleet/history; no synthetic completion records */}
      {historyOpen && (
        <div
          className="fixed inset-0 z-[135] flex items-center justify-center bg-black/65 px-3 py-5 sm:px-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setHistoryOpen(false);
          }}
        >
          <div className="flex max-h-[88vh] w-full max-w-[1320px] flex-col overflow-hidden rounded-xl border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-2xl">
            <div className="flex shrink-0 flex-wrap items-start justify-between gap-4 border-b border-[var(--tech-border)] px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-[20px] font-semibold text-[var(--tech-text)]">
                  Mission history
                </h2>
                
                {!historyQuery.isPending && !historyQuery.isError && (
                  <p className="mt-2 text-[12px] text-[var(--tech-text-secondary)]">
                    {missionHistory.length} mission history record{missionHistory.length === 1 ? "" : "s"}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="rounded-md p-1.5 text-[var(--tech-muted)] transition-colors hover:text-orange-500"
                aria-label="Close mission history"
              >
                <X size={19} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <div className="min-w-[1280px]">
                <div className="sticky top-0 z-10 grid grid-cols-[180px_160px_180px_115px_165px_165px_185px] items-center gap-3 border-b border-[var(--tech-border)] bg-[var(--tech-surface)] px-5 py-3 sm:px-6">
                  <HistoryHeader>Mission / Order</HistoryHeader>
                  <HistoryHeader>Drone / Model</HistoryHeader>
                  <HistoryHeader>Route / Arrival type</HistoryHeader>
                  <HistoryHeader>Battery</HistoryHeader>
                  <HistoryHeader>Arrived at hub</HistoryHeader>
                  <HistoryHeader>Arrival confirmed at</HistoryHeader>
                  <HistoryHeader>Destination received at</HistoryHeader>
                </div>

                {historyQuery.isPending ? (
                  <p className="p-8 text-center text-sm text-[var(--tech-muted)]">Loading mission history...</p>
                ) : historyQuery.isError ? (
                  <div className="p-8 text-center text-sm text-red-500">
                    Could not load history from Backend.
                    <button type="button" className="ml-2 underline" onClick={() => void historyQuery.refetch()}>Retry</button>
                  </div>
                ) : missionHistory.length > 0 ? (
                  <div className="divide-y divide-[var(--tech-border)]">
                    {missionHistory.map((item) => {
                      return (
                        <div
                          key={item.id}
                          className="grid grid-cols-[180px_160px_180px_115px_165px_165px_185px] items-center gap-3 px-5 py-4 transition-colors hover:bg-[var(--tech-surface-2)]/50 sm:px-6"
                        >
                          <div className="min-w-0">
                            <p className="whitespace-nowrap text-[13px] font-semibold text-[var(--tech-text)]">
                              {getMissionDisplayId(item.missionId)}
                            </p>
                            {item.orderId && (
                              <p className="mt-1 text-[11px] text-[var(--tech-muted)]">{item.orderId}</p>
                            )}
                            {item.legId && (
                              <p className="mt-1 text-[11px] text-[var(--tech-muted)]">Leg: {item.legId}</p>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-[var(--tech-text)]">{item.droneId || "—"}</p>
                            <p className="mt-1 break-words text-[11px] leading-4 text-[var(--tech-muted)]">
                              {item.droneModel && item.droneModel !== "—" ? item.droneModel : "Model not provided"}
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="break-words text-[12px] leading-5 text-[var(--tech-text-secondary)]">
                              {item.origin} <span className="text-[var(--tech-subtle)]">→</span> {item.destination}
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--tech-muted)]">
                              {getHistoryReasonLabel(item.purpose)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[12px] font-semibold text-[var(--tech-text-secondary)]">
                              {item.batteryId ?? "—"}
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--tech-muted)]">
                              {item.batteryLevelReported ? `${item.batteryLevelPct}%` : "Charge unavailable"}
                            </p>
                          </div>
                          <div>
                            <p className="whitespace-nowrap text-[12px] tabular-nums text-[var(--tech-text-secondary)]">
                              {formatHistoryTimestamp(item.arrivedAt)}
                            </p>
                            {!item.arrivedAt && <p className="mt-1 text-[11px] text-[var(--tech-muted)]"></p>}
                          </div>
                          <div>
                            <p className="whitespace-nowrap text-[12px] tabular-nums text-[var(--tech-text-secondary)]">
                              {formatHistoryTimestamp(item.arrivalConfirmedAt)}
                            </p>
                            {!item.arrivalConfirmedAt && <p className="mt-1 text-[11px] text-[var(--tech-muted)]"></p>}
                          </div>
                          <div>
                            <p className="whitespace-nowrap text-[12px] tabular-nums text-[var(--tech-text-secondary)]">
                              {formatHistoryTimestamp(item.destinationReceivedAt)}
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--tech-muted)]">
                              {item.destinationReceivedAt ? "" : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-6 py-14 text-center">
                    <p className="text-[14px] font-medium text-[var(--tech-text-secondary)]">No recorded hub arrivals yet</p>
                    <p className="mt-1 text-[12px] text-[var(--tech-muted)]">Hub arrivals appear here when returned by Backend, including relay stops and incident returns, even if destination receipt is not recorded.</p>
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

                  <DetailField label="Mission leg" value={selectedMission.legId || "—"} />
                  <DetailField label="Leg status" value={selectedMission.legStatus || "—"} />

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
                      label="Replacement battery (Operator)"
                      value={selectedMission.assignedReplacementBatteryId ?? "Not provided by Backend"}
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
                           confirmedArrivalIds.includes(arrivalKey(selectedMission)))
                          ? "Confirmed (time not provided by Backend)"
                          : "Waiting for arrival confirmation"
                    }
                    muted={
                      !selectedMission.arrivalConfirmed &&
                      !confirmedArrivalIds.includes(arrivalKey(selectedMission))
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
                        ? "Install the replacement battery chosen by Operator and click Dispatch. FE records the swap and continues the mission only after Backend accepts it."
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
