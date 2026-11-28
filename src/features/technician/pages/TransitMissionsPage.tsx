import { HistoryDetailsButton, TechnicianHistoryDetails } from "../components/TechnicianHistoryDetails";
import { ProofActionDialog } from "../components/TechnicianProofImage";
import { TechnicianLoadingState } from "../components/TechnicianLoadingState";
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

/** The next-leg battery is assigned by Operator in GET /fleet/incoming.
 * Technician cannot select a different battery from this screen.
 */
function operatorAssignedBatteryId(mission: TransitMission): string {
  return mission.assignedReplacementBatteryId?.trim() ?? "";
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

      return "Arrival confirmed";

    }

    if (arrivalConfirmed) return "Arrival confirmed · follow-up pending";

    return "Landed at hub · awaiting Tech confirmation";

  }

  if (mission.status === "Ready") return "Ready · next leg can be dispatched";

  if (mission.status === "Cannot Continue") return "Incident · needs inspection";

  return "";

}



function getPurposeDescription(purpose: TransitMissionPurpose) {

  if (purpose === "BATTERY_STOP") {

    return "Relay steps: Confirm arrival → install Operator-assigned Leg 2 battery → Ready → Dispatch. Incoming contains the planned battery; Ready records the physical change.";

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

/** A successful POST /confirm-relay-arrival is the proof of relay receipt.
 * GET /incoming currently keeps handling_status=At hub, arrival_confirmed_at=null
 * even after a 200. Keep this narrow receipt across navigation / browser tabs.
 * BE must still validate swap-battery and dispatch; this is UI state only.
 */
const RELAY_RECEIPT_STORAGE_KEY = "droneoptai.tech.transit.confirmed-relay.v2";
const RELAY_RECEIPT_MAX_AGE_MS = 48 * 60 * 60 * 1000;

type RelayConfirmationReceipt = {
  missionId: string;
  droneId: string;
  hubId: number;
  confirmedAt: number;
};

function isValidRelayReceipt(value: unknown): value is RelayConfirmationReceipt {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return typeof row.missionId === "string" && row.missionId.length > 0 &&
    typeof row.droneId === "string" && row.droneId.length > 0 &&
    typeof row.hubId === "number" && Number.isFinite(row.hubId) &&
    typeof row.confirmedAt === "number" && Number.isFinite(row.confirmedAt) &&
    row.confirmedAt <= Date.now() && Date.now() - row.confirmedAt < RELAY_RECEIPT_MAX_AGE_MS;
}

function readRelayReceipts(): RelayConfirmationReceipt[] {
  try {
    const raw = window.localStorage.getItem(RELAY_RECEIPT_STORAGE_KEY);
    const values: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(values) ? values.filter(isValidRelayReceipt) : [];
  } catch {
    return [];
  }
}

function relayReceiptFromMission(mission: TransitMission): RelayConfirmationReceipt | null {
  if (mission.purpose !== "BATTERY_STOP" || !mission.backendMissionId ||
      !mission.currentDroneId || mission.droneCurrentHubId === undefined) return null;
  return {
    missionId: mission.backendMissionId,
    droneId: mission.currentDroneId,
    hubId: mission.droneCurrentHubId,
    confirmedAt: Date.now(),
  };
}

function hasRelayReceipt(mission: TransitMission, receipts: RelayConfirmationReceipt[]): boolean {
  if (mission.purpose !== "BATTERY_STOP" ||
      mission.status !== "At Hub" || !mission.backendMissionId) return false;
  return receipts.some(row => isValidRelayReceipt(row) &&
    row.missionId === mission.backendMissionId &&
    row.droneId === mission.currentDroneId &&
    row.hubId === mission.droneCurrentHubId);
}

function saveRelayReceipt(receipt: RelayConfirmationReceipt): RelayConfirmationReceipt[] {
  const rest = readRelayReceipts().filter(row =>
    !(row.missionId === receipt.missionId && row.droneId === receipt.droneId &&
      row.hubId === receipt.hubId));
  const next = [...rest, receipt];
  try {
    window.localStorage.setItem(RELAY_RECEIPT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Browser storage may be unavailable: local React state still remembers it.
  }
  return next;
}

/** Record a successful swap separately so navigation cannot accidentally
 * offer the same inventory deduction again while GET /incoming is stale. */
const RELAY_SWAP_STORAGE_KEY = "droneoptai.tech.transit.swapped-relay.v2";
type RelaySwapReceipt = RelayConfirmationReceipt & { batteryId: string };

function readRelaySwapReceipts(): RelaySwapReceipt[] {
  try {
    const raw = window.localStorage.getItem(RELAY_SWAP_STORAGE_KEY);
    const values: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(values)
      ? values.filter((value): value is RelaySwapReceipt =>
        isValidRelayReceipt(value) &&
        typeof (value as RelaySwapReceipt).batteryId === "string" &&
        (value as RelaySwapReceipt).batteryId.length > 0)
      : [];
  } catch {
    return [];
  }
}

function saveRelaySwapReceipt(receipt: RelaySwapReceipt): RelaySwapReceipt[] {
  const rest = readRelaySwapReceipts().filter(row =>
    !(row.missionId === receipt.missionId && row.droneId === receipt.droneId &&
      row.hubId === receipt.hubId));
  const next = [...rest, receipt];
  try {
    window.localStorage.setItem(RELAY_SWAP_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Remains tracked in React state if browser storage is not available.
  }
  return next;
}

/** Final-hub arrival may still be pending while Backend reports Flying and
 * next_leg.status=IN_PROGRESS. A completed relay leg does NOT mean that final
 * arrival has been confirmed. Never infer a confirmation from leg 1 alone.
 */
function isFinalHubPendingArrival(mission: TransitMission): boolean {
  const missionState = (mission.missionState ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  const lastLegState = (mission.nextLegStatus ?? mission.legStatus ?? "")
    .trim().toUpperCase().replace(/[\s-]+/g, "_");
  return mission.droneCurrentHubId !== undefined &&
    mission.destinationHubId !== undefined &&
    mission.droneCurrentHubId === mission.destinationHubId &&
    mission.status === "At Hub" &&
    !["COMPLETED", "MISSION_COMPLETED", "CANCELLED", "CANCELED", "FAILED"].includes(missionState) &&
    !mission.arrivalConfirmed && !mission.arrivalConfirmedAt &&
    lastLegState === "IN_PROGRESS";
}

/** Confirm the physical landing once; keep final and relay routing separate. */
function canConfirmLandedMission(mission: TransitMission): boolean {
  return isFinalHubPendingArrival(mission) || getTransitConfirmKind(mission) !== null;
}



// One shared grid keeps header and all mission rows aligned. Desktop screens

// with limited space scroll horizontally instead of clipping IDs/descriptions.

const transitTableGrid =

  // Balanced columns; battery IDs and handling notes have room to wrap naturally.
  "lg:grid-cols-[minmax(185px,1.12fr)_minmax(175px,1.05fr)_minmax(170px,1fr)_minmax(170px,1fr)_minmax(260px,1.58fr)_minmax(175px,1.03fr)] lg:items-center lg:gap-5";



export function TransitMissionsPage() {

  const navigate = useNavigate();

  const transitQuery =

    useTransitMissionsQuery();



  const confirmArrivalMutation =

    useConfirmTransitArrivalMutation();



  const batterySwapMutation = useTransitBatterySwapMutation();
  const dispatchMutation = useTransitDispatchMutation();

  const [dispatchedRelayMissionIds, setDispatchedRelayMissionIds] = useState<string[]>([]);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDetailId, setHistoryDetailId] = useState<string | null>(null);
  const historyQuery = useTransitHistoryQuery(historyOpen);
  const closeHistory = () => { setHistoryDetailId(null); setHistoryOpen(false); };



  const [

    missions,

    setMissions,

  ] = useState<TransitMission[]>(() => transitQuery.data ?? []);
  const [hasLoadedTransit, setHasLoadedTransit] = useState(() => transitQuery.data !== undefined);
  const isInitialTransitLoading = !hasLoadedTransit && !transitQuery.isError;



  // Keep ONLY successful Backend confirmation receipts in the current tab.
  // /incoming may still report "At hub" with arrival_confirmed_at=null after
  // Technician confirmation; that field is not the Technician receipt flag.
  // A page refresh must not force a duplicate confirm-relay-arrival request.
  const [confirmedArrivalIds, setConfirmedArrivalIds] = useState<string[]>(() => {
    try {
      const raw = window.sessionStorage.getItem("droneoptai.tech.transit.confirmed.v1");
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        "droneoptai.tech.transit.confirmed.v1",
        JSON.stringify(confirmedArrivalIds),
      );
    } catch {
      // Storage may be disabled; in-memory confirmation still works.
    }
  }, [confirmedArrivalIds]);

  const arrivalKey = (mission: TransitMission) => `${mission.backendMissionId ?? mission.id}:${mission.legId || mission.currentLegToHubId || "current"}`;

  // A relay receipt belongs to its leg; final arrival belongs to the mission
  // and destination hub. The Backend can keep reporting old current_leg=Leg 1
  // even while next_leg=IN_PROGRESS at the final hub.
  const isFinalHubMission = (mission: TransitMission): boolean =>
    mission.purpose !== "BATTERY_STOP" || (
      mission.droneCurrentHubId !== undefined &&
      mission.destinationHubId !== undefined &&
      mission.droneCurrentHubId === mission.destinationHubId
    );
  const arrivalConfirmationKey = (mission: TransitMission): string =>
    isFinalHubMission(mission)
      ? `${mission.backendMissionId ?? mission.id}:final-hub:${mission.destinationHubId ?? "unknown"}`
      : arrivalKey(mission);

  // Unlike a leg-based UI key, this server-confirmation receipt is stable if
  // POST confirmation completes leg 1 and GET /incoming later points to leg 2.
  const [relayReceipts, setRelayReceipts] = useState<RelayConfirmationReceipt[]>(readRelayReceipts);
  const [relaySwapReceipts, setRelaySwapReceipts] = useState<RelaySwapReceipt[]>(readRelaySwapReceipts);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === RELAY_RECEIPT_STORAGE_KEY) setRelayReceipts(readRelayReceipts());
      if (event.key === RELAY_SWAP_STORAGE_KEY) setRelaySwapReceipts(readRelaySwapReceipts());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Ignore legacy per-leg confirmations at the FINAL hub. Those can refer
  // to Leg 1 (relay) while Leg 2 is still IN_PROGRESS at destination.
  const arrivalConfirmedFor = (mission: TransitMission): boolean => {
    if (isFinalHubMission(mission)) {
      return mission.arrivalConfirmed || Boolean(mission.arrivalConfirmedAt) ||
        confirmedArrivalIds.includes(arrivalConfirmationKey(mission));
    }
    return (isContinuationMission(mission) && mission.status === "Ready") ||
      mission.relayArrivalConfirmedByLeg === true ||
      mission.arrivalConfirmed || confirmedArrivalIds.includes(arrivalKey(mission)) ||
      // The old :current session key is valid only for relay handling.
      (mission.purpose === "BATTERY_STOP" && mission.status === "At Hub" &&
        !!mission.backendMissionId &&
        confirmedArrivalIds.includes(`${mission.backendMissionId}:current`)) ||
      hasRelayReceipt(mission, relayReceipts);
  };

  const batterySwappedFor = (mission: TransitMission): boolean =>
    // BE handling_status=Ready signals the swap was completed by Backend.
    (isContinuationMission(mission) && mission.status === "Ready") ||
    swappedMissionKeys.includes(arrivalKey(mission)) ||
    hasRelayReceipt(
      mission,
      relaySwapReceipts.filter(receipt =>
        receipt.batteryId.toUpperCase() === operatorAssignedBatteryId(mission).toUpperCase() &&
        Boolean(operatorAssignedBatteryId(mission)),
      ),
    );





  // GET /fleet/history is the Backend's arrival/mission history source.

  // Do not filter by mission_state: a drone may land at a relay hub for a

  // battery swap, return after an incident, or reach the destination without

  // the mission being marked Completed. All records returned by Backend must

  // remain visible, even when destination_received_at is null.

  const missionHistory = historyQuery.data ?? [];
  const historyDetail = missionHistory.find(row => row.id === historyDetailId);



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







  // A swap may succeed while Dispatch fails. On retry, do not perform the

  // swap a second time, even if /incoming has not caught up yet.

  const [swappedMissionKeys, setSwappedMissionKeys] = useState<string[]>([]);

  // Ready sends the Operator-assigned battery to the existing Backend
  // swap-battery action; there is no extra battery-picker UI.
  const [swappingKey, setSwappingKey] = useState<string | null>(null);

  const [dispatchingKey, setDispatchingKey] = useState<string | null>(null);
  type ProofAction = "arrival" | "ready" | "dispatch";
  const proofIdentity = (mission: TransitMission, action: ProofAction) => JSON.stringify([
    mission.id, mission.backendMissionId, arrivalConfirmationKey(mission),
    mission.droneCurrentHubId, mission.currentDroneId,
    action === "ready" ? operatorAssignedBatteryId(mission) : mission.batteryId,
    action === "arrival" ? (isFinalHubPendingArrival(mission) ? "FINAL" : getTransitConfirmKind(mission)) : null,
  ]);
  const [proofTarget, setProofTarget] = useState<{ id: string; key: string; action: ProofAction } | null>(null);
  const openProof = (mission: TransitMission, action: ProofAction) => {
    if (action === "arrival" && !canConfirmLandedMission(mission)) {
      pushActionMessage("Cannot select arrival API: Backend must provide drone_current_hub_id and destination_hub_id (or an explicit arrival purpose). Do not confirm until the drone has physically landed.");
      return;
    }
    setProofTarget({ id: mission.id, key: proofIdentity(mission, action), action });
  };
  const proofMission = proofTarget ? missions.find(m => m.id === proofTarget.id && proofIdentity(m, proofTarget.action) === proofTarget.key) : undefined;



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
      setHasLoadedTransit(true);

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



  const requestConfirm = async (mission: TransitMission, proofImageUrl: string) => {

    const missionKey = mission.backendMissionId;

    if (!missionKey) {

      pushActionMessage("Backend mission ID is missing; cannot confirm arrival.");

      return;

    }

    const confirmationKey = arrivalConfirmationKey(mission);

    if (arrivalConfirmedFor(mission)) {

      pushActionMessage("Arrival was already confirmed by Backend; it cannot be confirmed twice.");

      return;

    }

    // The final hub can still require confirmation even with an old
    // current_leg=COMPLETED and a next_leg=IN_PROGRESS.
    const confirmRoute = isFinalHubPendingArrival(mission)
      ? "FINAL"
      : getTransitConfirmKind(mission);

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
        proofImageUrl,

        // The mission already identifies an incident. Do not invent an

        // inspection result or fault description if Backend has none.

        hasIssue: mission.purpose === "INCIDENT_RETURN",

        notes: mission.purpose === "INCIDENT_RETURN"

          ? (mission.cannotContinueReason ?? "")

          : "",

      });

      setSelectedMissionId(null);

      setConfirmedArrivalIds((ids) => ids.includes(confirmationKey) ? ids : [...ids, confirmationKey]);
      // Persist immediately, BEFORE React Query refetch can change the active leg.
      // Only a successful Backend response is allowed to create this receipt.
      if (relay) {
        const receipt = relayReceiptFromMission(mission);
        if (receipt) setRelayReceipts(saveRelayReceipt(receipt));
      }

      pushActionMessage(relay
        ? "Relay arrival confirmed. Install the Operator-assigned next-leg battery, then press Ready."
        : "Arrival confirmation accepted by Backend. Transit, Hub Fleet and related information are refreshing.");

      void transitQuery.refetch();

      if (historyOpen) void historyQuery.refetch();

    } catch (error) {

      const message = error instanceof Error ? error.message : "Could not confirm arrival.";

      if (error instanceof TechnicianApiError && error.status === 400 &&

          /arrival\s+already\s+confirmed/i.test(message)) {

        // Backend, not the frontend, explicitly says it was already accepted.

        setConfirmedArrivalIds((ids) => ids.includes(confirmationKey) ? ids : [...ids, confirmationKey]);
        // Explicit BE 'already confirmed' is valid proof; generic HTTP 400 is NOT.
        if (relay) {
          const receipt = relayReceiptFromMission(mission);
          if (receipt) setRelayReceipts(saveRelayReceipt(receipt));
        }

        pushActionMessage("Backend reports that arrival was already confirmed. Refreshing missions and history.");

        void transitQuery.refetch();

        if (historyOpen) void historyQuery.refetch();

      } else {

        pushActionMessage(message);

      }

    } finally {

      confirmingArrivalIds.current.delete(missionKey);

    }

  };



  /** Technician physically installs the EXACT battery assigned by Operator for leg 2.
   * Clicking Ready calls the existing swap-battery endpoint. Only a successful
   * Backend response is evidence of the Ready transition; no synthetic state.
   */
  const markRelayReady = async (mission: TransitMission, proofImageUrl: string) => {
    const key = arrivalKey(mission);
    if (!mission.backendMissionId || !isContinuationMission(mission) ||
        mission.status !== "At Hub" || !arrivalConfirmedFor(mission) ||
        batterySwappedFor(mission) || batterySwapMutation.isPending ||
        swappingKey !== null || dispatchedRelayMissionIds.includes(key)) return;

    const assignedBatteryId = operatorAssignedBatteryId(mission);
    if (!assignedBatteryId) {
      pushActionMessage("No next-leg battery was assigned by Operator. Ask Operator to assign a battery before marking Ready.");
      return;
    }
    if (assignedBatteryId.toUpperCase() === mission.batteryId?.trim().toUpperCase()) {
      pushActionMessage("The next-leg battery matches the current installed battery. Verify Operator's assignment before proceeding.");
      return;
    }
    if (mission.assignedReplacementBatteryPct !== undefined &&
        mission.assignedReplacementBatteryPct < mission.requiredDepartureBatteryPct) {
      pushActionMessage("The Operator-assigned battery does not meet the minimum departure charge. Ask Operator to review the assignment.");
      return;
    }

    setSwappingKey(key);
    try {
      await batterySwapMutation.mutateAsync({
        missionId: mission.backendMissionId,
        newBatteryId: assignedBatteryId,
        proofImageUrl,
      });
      // Store receipts only after BE confirms the swap, to prevent duplicate
      // inventory operations when /incoming has not refreshed yet.
      setSwappedMissionKeys(keys => keys.includes(key) ? keys : [...keys, key]);
      const confirmedReceipt = relayReceiptFromMission(mission);
      if (confirmedReceipt) {
        setRelaySwapReceipts(saveRelaySwapReceipt({
          ...confirmedReceipt,
          batteryId: assignedBatteryId,
        }));
      }
      pushActionMessage(`Backend confirmed installation of ${assignedBatteryId}. The relay is Ready; you can now Dispatch.`);
      void transitQuery.refetch();
      // useTransitBatterySwapMutation already invalidates Hub Batteries.
    } catch (error) {
      pushActionMessage(error instanceof Error
        ? `Could not mark Ready: ${error.message}`
        : "Could not mark Ready. No change was recorded in the UI.");
      void transitQuery.refetch();
    } finally {
      setSwappingKey(null);
    }
  };

  /** Dispatch is an independent action after a successful battery swap. */
  const dispatchMission = async (mission: TransitMission, proofImageUrl: string) => {
    const key = arrivalKey(mission);
    if (!mission.backendMissionId || !isContinuationMission(mission) ||
        dispatchedRelayMissionIds.includes(key) || dispatchingKey !== null ||
        (mission.status !== "At Hub" && mission.status !== "Ready")) return;

    if (!arrivalConfirmedFor(mission)) {
      pushActionMessage("Confirm relay arrival before Dispatch.");
      return;
    }
    if (mission.status !== "Ready" && !batterySwappedFor(mission)) {
      pushActionMessage("The Operator-assigned replacement must be confirmed Ready by Backend before Dispatch.");
      return;
    }

    setDispatchingKey(key);
    try {
      await dispatchMutation.mutateAsync({ missionId: mission.backendMissionId, proofImageUrl });
      // Keep the scoped v2 receipt while GET /incoming may still be stale,
      // but clear the unspecific old :current session key after Dispatch.
      setConfirmedArrivalIds(keys => keys.filter(item =>
        item !== `${mission.backendMissionId}:current`));
      setDispatchedRelayMissionIds(keys => keys.includes(key) ? keys : [...keys, key]);
      pushActionMessage("Relay Dispatch was accepted by Backend. Mission continues to the next hub; fleet and battery data are refreshing.");
      void transitQuery.refetch();
      if (historyOpen) void historyQuery.refetch();
    } catch (error) {
      pushActionMessage(`Dispatch not completed: ${error instanceof Error ? error.message : "Dispatch failed."}. The battery swap will not be submitted a second time.`);
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

              setHistoryOpen(true);
            }}

            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-[var(--tech-border)] px-4 text-[13px] font-medium text-[var(--tech-text-secondary)] transition-colors hover:border-orange-500/50 hover:text-orange-500"

          >

            <History size={15} />

            View history

          </button>

        </CardContent>



        {/* ACTIVE MISSIONS */}

        <div className="lg:overflow-x-auto">

          <div className="lg:min-w-[1320px]">

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

              const arrivalConfirmed = arrivalConfirmedFor(mission);

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

                    <div className="min-w-0">

                      <p className="break-all text-[13px] font-semibold leading-5 text-[var(--tech-text-secondary)]">

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
                        {batterySwappedFor(mission) && mission.status === "At Hub"
                          ? "Ready confirmed · dispatch available"
                          : getHandlingHint(mission, arrivalConfirmed)}
                      </p>

                    </div>



                    {/* ACTIONS */}

                    <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 lg:justify-end">

                      {!isContinuationMission(mission) &&
                        (isFinalHubPendingArrival(mission) || canConfirmLandedMission(mission) || mission.status === "Incoming") &&
                        !arrivalConfirmed && (

                        <Button

                          type="button"

                          onClick={() =>

                            openProof(mission, "arrival")

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



                      {/* Relay steps: Confirm arrival → physically replace assigned battery → Ready → Dispatch. */}
                      {isContinuationMission(mission) &&
                        (mission.status === "Incoming" || mission.status === "At Hub" || mission.status === "Ready") && (
                        <div className="flex min-w-0 flex-col items-start gap-2 lg:items-end">
                          {!arrivalConfirmed && mission.status !== "Ready" ? (
                            <Button
                              type="button"
                              onClick={() => openProof(mission, "arrival")}
                              disabled={!mission.backendMissionId || !canConfirmLandedMission(mission) || confirmArrivalMutation.isPending}
                              title="Confirm only after the drone has physically landed at this relay hub"
                              className="h-9 min-w-[142px] rounded-md bg-orange-500 px-3 text-[12px] font-semibold text-black hover:bg-orange-600 disabled:opacity-50"
                            >
                              <Check size={14} />
                              {isConfirmingThisMission ? "Confirming..." : "Confirm arrival"}
                            </Button>
                          ) : batterySwappedFor(mission) || mission.status === "Ready" ? (
                            <Button
                              type="button"
                              onClick={() => openProof(mission, "dispatch")}
                              disabled={!mission.backendMissionId || dispatchingKey !== null ||
                                batterySwapMutation.isPending || dispatchMutation.isPending ||
                                dispatchedRelayMissionIds.includes(arrivalKey(mission)) ||
                                !arrivalConfirmed}
                              title="Dispatch next leg after Backend confirms Ready"
                              className="h-9 min-w-[142px] rounded-md bg-orange-500 px-3 text-[12px] font-semibold text-black hover:bg-orange-600 disabled:opacity-50"
                            >
                              <ArrowRight size={14} />
                              {dispatchedRelayMissionIds.includes(arrivalKey(mission)) ? "Dispatched · syncing"
                                : dispatchingKey === arrivalKey(mission) ? "Dispatching..." : "Dispatch"}
                            </Button>
                          ) : null}
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

                  {/* After Confirm arrival, show only the Operator-assigned battery and Ready. */}
                  {isContinuationMission(mission) && arrivalConfirmed &&
                    mission.status === "At Hub" && !batterySwappedFor(mission) && (
                    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface-2)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-[var(--tech-muted)]">
                          Replace battery
                        </p>
                        <p className="mt-1 break-all text-[15px] font-semibold text-orange-500">
                          {operatorAssignedBatteryId(mission) || "Not assigned"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => openProof(mission, "ready")}
                        disabled={!mission.backendMissionId || !operatorAssignedBatteryId(mission) ||
                          operatorAssignedBatteryId(mission).toUpperCase() === mission.batteryId?.trim().toUpperCase() ||
                          (mission.assignedReplacementBatteryPct !== undefined &&
                            mission.assignedReplacementBatteryPct < mission.requiredDepartureBatteryPct) ||
                          swappingKey !== null || batterySwapMutation.isPending}
                        title="Confirm the Operator-assigned battery is physically installed before marking Ready"
                        className="h-9 min-w-[118px] shrink-0 rounded-md bg-orange-500 px-4 text-[12px] font-semibold text-black hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Check size={14} />
                        {swappingKey === arrivalKey(mission) ? "Setting Ready..." : "Ready"}
                      </Button>
                    </div>
                  )}


                </div>

              );

            },

          )}



          {isInitialTransitLoading ? (
            <TechnicianLoadingState label="Loading transit missions..." />
          ) : visibleMissions.length === 0 && (

            <div className="px-5 py-14 text-center">

              <p className="text-[15px] font-medium text-[var(--tech-text-secondary)]">

                {transitQuery.isError ? "Unable to load transit missions" : "No incoming missions found"}

              </p>



              <p className="mt-1 text-[13px] text-[var(--tech-muted)]">

                {transitQuery.isError ? "Check the Backend connection and retry." : "No drones currently require handling at this hub."}

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

            if (event.target === event.currentTarget) closeHistory();

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

                onClick={closeHistory}

                className="rounded-md p-1.5 text-[var(--tech-muted)] transition-colors hover:text-orange-500"

                aria-label="Close mission history"

              >

                <X size={19} />

              </button>

            </div>



            <div className="min-h-0 flex-1 overflow-auto">

              <div className="min-w-[1400px]">

                <div className="sticky top-0 z-10 grid grid-cols-[180px_160px_180px_115px_165px_165px_185px_100px] items-center gap-3 border-b border-[var(--tech-border)] bg-[var(--tech-surface)] px-5 py-3 sm:px-6">

                  <HistoryHeader>Mission / Order</HistoryHeader>

                  <HistoryHeader>Drone / Model</HistoryHeader>

                  <HistoryHeader>Route / Arrival type</HistoryHeader>

                  <HistoryHeader>Battery</HistoryHeader>

                  <HistoryHeader>Arrived at hub</HistoryHeader>

                  <HistoryHeader>Arrival confirmed at</HistoryHeader>

                  <HistoryHeader>Destination received at</HistoryHeader>

                  <HistoryHeader>Action</HistoryHeader>

                </div>



                {historyQuery.isPending ? (

                  <TechnicianLoadingState label="Loading mission history..." />

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

                          className="grid grid-cols-[180px_160px_180px_115px_165px_165px_185px_100px] items-center gap-3 px-5 py-4 transition-colors hover:bg-[var(--tech-surface-2)]/50 sm:px-6"

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

                          <div><HistoryDetailsButton onClick={() => setHistoryDetailId(item.id)} /></div>

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



      {historyOpen && historyDetail && <TechnicianHistoryDetails key={historyDetail.id} title="Transit mission details" record={historyDetail} onClose={() => setHistoryDetailId(null)} note="Proof images are shown as returned for this history record. Hub and leg are displayed when provided by Backend." fields={[
        { label: "Mission ID", value: getMissionDisplayId(historyDetail.missionId) }, { label: "Order ID", value: historyDetail.orderId },
        { label: "Drone ID", value: historyDetail.droneId }, { label: "Battery ID", value: historyDetail.batteryId },
        { label: "Leg ID", value: historyDetail.legId }, { label: "Origin hub", value: historyDetail.origin },
        { label: "Current hub", value: historyDetail.hub }, { label: "Destination hub", value: historyDetail.destination },
        { label: "Arrival type", value: getHistoryReasonLabel(historyDetail.purpose) },
        { label: "Drone departed", value: formatHistoryTimestamp(historyDetail.departedAt) },
        { label: "Arrived at hub", value: formatHistoryTimestamp(historyDetail.arrivedAt) },
        { label: "Arrival confirmed at", value: formatHistoryTimestamp(historyDetail.arrivalConfirmedAt) },
        { label: "Destination received at", value: formatHistoryTimestamp(historyDetail.destinationReceivedAt) },
      ]} />}

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

                      label="Next-leg battery (Operator assigned)"
                      value={operatorAssignedBatteryId(selectedMission) || "Not assigned"}

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

                        : arrivalConfirmedFor(selectedMission)

                          ? "Confirmed (time not provided by Backend)"

                          : "Waiting for arrival confirmation"

                    }

                    muted={

                      !arrivalConfirmedFor(selectedMission)

                    }

                  />



                  {selectedMission.purpose ===

                    "BATTERY_STOP" &&

                    selectedMission.batteryServiceRequired && (

                      <ActivityRow
                        label="Battery service"
                        value={batterySwappedFor(selectedMission)
                          ? "Ready confirmed by Backend"
                          : `Install Operator-assigned battery: ${operatorAssignedBatteryId(selectedMission) || "Not assigned"}`}
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

                        ? "Confirm arrival, install the battery assigned by Operator for leg 2, press Ready to register the swap, and then Dispatch."

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

      {proofTarget && (
        <ProofActionDialog key={`${proofTarget.key}:${proofTarget.action}`} title={proofTarget.action === "arrival" ? "Confirm arrival" : proofTarget.action === "ready" ? "Replace battery" : "Confirm dispatch"}
          reference={proofMission?.missionId ?? proofTarget.id} description={proofTarget.action === "arrival"
            ? (proofMission && isContinuationMission(proofMission) ? "Attach a photo of the drone after landing at this hub." : "Attach a photo of the landed drone and parcel at this hub.")
            : proofTarget.action === "ready" ? `Attach a photo of the installed battery${proofMission ? ` (${operatorAssignedBatteryId(proofMission) || "assigned by Operator"})` : ""}.` : "Attach a photo of the drone ready to depart this hub."}
          confirmLabel={proofTarget.action === "arrival" ? "Confirm arrival" : proofTarget.action === "ready" ? "Ready" : "Dispatch"}
          disabled={!proofMission || !proofMission.backendMissionId ||
            (proofTarget.action === "arrival" && (confirmArrivalMutation.isPending || arrivalConfirmedFor(proofMission) || !canConfirmLandedMission(proofMission))) ||
            (proofTarget.action === "ready" && (!isContinuationMission(proofMission) || swappingKey !== null || batterySwapMutation.isPending || !arrivalConfirmedFor(proofMission) || batterySwappedFor(proofMission) || proofMission.status !== "At Hub" || dispatchedRelayMissionIds.includes(arrivalKey(proofMission)) || !operatorAssignedBatteryId(proofMission) || operatorAssignedBatteryId(proofMission).toUpperCase() === proofMission.batteryId?.trim().toUpperCase() || (proofMission.assignedReplacementBatteryPct !== undefined && proofMission.assignedReplacementBatteryPct < proofMission.requiredDepartureBatteryPct))) ||
            (proofTarget.action === "dispatch" && (!isContinuationMission(proofMission) || dispatchingKey !== null || batterySwapMutation.isPending || dispatchMutation.isPending || dispatchedRelayMissionIds.includes(arrivalKey(proofMission)) || !["At Hub", "Ready"].includes(proofMission.status) || !arrivalConfirmedFor(proofMission) || (!batterySwappedFor(proofMission) && proofMission.status !== "Ready")))}
          onCancel={() => setProofTarget(null)} onConfirm={image => {
            const current = proofMission; const action = proofTarget.action; setProofTarget(null);
            if (!current) return;
            if (action === "arrival") void requestConfirm(current, image);
            else if (action === "ready") void markRelayReady(current, image);
            else void dispatchMission(current, image);
          }}>
          {!proofMission && <p role="status" className="text-[13px] text-orange-500">Mission information changed. Close this dialog and reopen the action.</p>}
        </ProofActionDialog>
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
