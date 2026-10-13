import {
  getBatteriesApi,
  markBatteryChargedApi,
  useBatteryApi,
} from "../api/batteryApi";

import {
  formatApiDateTime,
  isRecord,
  pickNumber,
  pickString,
  unwrapList,
} from "../api/httpClient";

export type BatteryStatus =
  | "Ready"
  | "Charging";

export type HubBattery = {
  /** Human-readable battery code/serial shown in the UI (for example BAT-001). */
  id: string;

  /** Real database id used by mutation endpoints such as /batteries/{battery_id}/use. */
  backendId?: string;

  serialNumber?: string;
  model?: string;
  capacityWh?: number;
  droneId?: string;
  hubId?: string;
  hub: string;

  chargeLevelPct: number;
  status: BatteryStatus;

  createdAt?: string;
  updatedAt: string;

  /*
   * Mock fields representing values that production backend would return.
   * Frontend should normally receive current charge + estimatedReadyAt
   * from backend rather than calculate charger physics itself.
   */
  chargingStartedAt?: string;
  chargingStartLevelPct?: number;
  estimatedReadyAt?: string;
};

export type ActiveFlightBattery = {
  id: string;
  droneId: string;

  missionId?: string;
  orderId?: string;

  chargeLevelPct: number;
  installedAt: string;
};

export type BatteryHistoryAction =
  | "Removed at hub"
  | "Charging completed"
  | "Taken for use"
  | "Battery replaced";

export type BatteryHistoryRecord = {
  id: string;

  batteryId: string;
  hub: string;

  action: BatteryHistoryAction;

  chargeLevelPct: number;

  missionId?: string;
  orderId?: string;
  droneId?: string;

  occurredAt: string;
  note?: string;
};

export type BatterySwapResult = {
  installedBattery: ActiveFlightBattery;
  removedBattery: HubBattery;
};

const TECHNICIAN_HUB =
  "Hub HCM-02";

/*
 * DEMO BACKEND CHARGING MODEL
 * ---------------------------------------------------------
 * For the frontend mock only:
 *
 * charge rate = 2% per minute
 *
 * 60% -> 20 minutes to full
 * 80% -> 10 minutes to full
 *
 * Production recommendation:
 * backend owns this formula and exposes:
 * - currentChargePct
 * - status
 * - estimatedReadyAt
 *
 * Frontend only renders / refreshes the returned values.
 */
export const CHARGE_RATE_PCT_PER_MINUTE =
  2;

function calculateChargeMinutes(
  chargeLevelPct: number,
) {
  const safeLevel =
    Math.max(
      0,
      Math.min(
        100,
        chargeLevelPct,
      ),
    );

  return Math.ceil(
    (100 - safeLevel) /
      CHARGE_RATE_PCT_PER_MINUTE,
  );
}

function formatBatteryTime(
  date = new Date(),
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  )
    .format(date)
    .replace(",", " ·");
}

function createChargingBattery({
  id,
  chargeLevelPct,
  hub = TECHNICIAN_HUB,
}: {
  id: string;
  chargeLevelPct: number;
  hub?: string;
}): HubBattery {
  const now =
    new Date();

  const minutes =
    calculateChargeMinutes(
      chargeLevelPct,
    );

  return {
    id,
    hub,
    chargeLevelPct,
    status: "Charging",
    updatedAt:
      formatBatteryTime(now),

    chargingStartedAt:
      now.toISOString(),

    chargingStartLevelPct:
      chargeLevelPct,

    estimatedReadyAt:
      new Date(
        now.getTime() +
          minutes *
            60_000,
      ).toISOString(),
  };
}

/*
 * Battery Management only contains batteries physically stored at Hub.
 *
 * Ready
 *   = 100%, waiting to be used.
 *
 * Charging
 *   = removed from an arrived drone and currently charging.
 *
 * When a Ready battery is used:
 *   it disappears from Hub inventory and its ID follows the flight.
 */
let demoBatteries:
  HubBattery[] = [
  {
    id: "BAT-001",
    hub: TECHNICIAN_HUB,
    chargeLevelPct: 100,
    status: "Ready",
    updatedAt:
      "24 Sep 2026 · 08:00",
  },
  {
    id: "BAT-002",
    hub: TECHNICIAN_HUB,
    chargeLevelPct: 100,
    status: "Ready",
    updatedAt:
      "24 Sep 2026 · 08:05",
  },
  {
    id: "BAT-003",
    hub: TECHNICIAN_HUB,
    chargeLevelPct: 100,
    status: "Ready",
    updatedAt:
      "24 Sep 2026 · 08:10",
  },

  createChargingBattery({
    id: "BAT-004",
    chargeLevelPct: 72,
  }),

  createChargingBattery({
    id: "BAT-005",
    chargeLevelPct: 35,
  }),
];

/*
 * Temporary runtime association:
 * which Battery ID is currently installed on an active drone.
 *
 * This is NOT permanent battery ownership.
 */
const activeFlightBatteries:
  Record<
    string,
    ActiveFlightBattery
  > = {};

let demoBatteryHistory:
  BatteryHistoryRecord[] = [];

let fallbackBatterySequence = 8;

function notifyBatteryUpdate() {
  window.dispatchEvent(
    new Event(
      "technician-batteries-updated",
    ),
  );
}

function notifyHistoryUpdate() {
  window.dispatchEvent(
    new Event(
      "technician-battery-history-updated",
    ),
  );
}

function addHistory(
  record: Omit<
    BatteryHistoryRecord,
    "id"
  >,
) {
  const item:
    BatteryHistoryRecord = {
    ...record,

    id:
      `BH-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
  };

  demoBatteryHistory = [
    item,
    ...demoBatteryHistory,
  ];

  notifyHistoryUpdate();

  return item;
}

/*
 * Internal mock of backend charging calculation.
 *
 * Important:
 * Production frontend should NOT own this logic.
 * Backend should update chargeLevelPct/status and push/poll results.
 */
function refreshChargingState(
  notify = false,
) {
  const now =
    Date.now();

  const completed:
    HubBattery[] = [];

  let changed = false;

  demoBatteries =
    demoBatteries.map(
      (battery) => {
        if (
          battery.status !==
            "Charging" ||
          !battery
            .chargingStartedAt ||
          battery
            .chargingStartLevelPct ===
            undefined
        ) {
          return battery;
        }

        const startedAt =
          new Date(
            battery.chargingStartedAt,
          ).getTime();

        const elapsedMinutes =
          Math.max(
            0,
            (now - startedAt) /
              60_000,
          );

        const nextCharge =
          Math.min(
            100,
            Math.floor(
              battery
                .chargingStartLevelPct +
                elapsedMinutes *
                  CHARGE_RATE_PCT_PER_MINUTE,
            ),
          );

        if (
          nextCharge ===
            battery.chargeLevelPct &&
          nextCharge < 100
        ) {
          return battery;
        }

        changed = true;

        if (
          nextCharge >= 100
        ) {
          const ready:
            HubBattery = {
            ...battery,

            chargeLevelPct: 100,
            status: "Ready",

            updatedAt:
              formatBatteryTime(
                new Date(now),
              ),

            chargingStartedAt:
              undefined,

            chargingStartLevelPct:
              undefined,

            estimatedReadyAt:
              undefined,
          };

          completed.push(
            ready,
          );

          return ready;
        }

        return {
          ...battery,

          chargeLevelPct:
            nextCharge,

          updatedAt:
            formatBatteryTime(
              new Date(now),
            ),
        };
      },
    );

  for (
    const battery
    of completed
  ) {
    addHistory({
      batteryId:
        battery.id,

      hub:
        battery.hub,

      action:
        "Charging completed",

      chargeLevelPct:
        100,

      occurredAt:
        battery.updatedAt,

      note:
        "Backend charging timer reached the estimated completion time. Battery automatically moved to Ready.",
    });
  }

  if (
    notify &&
    changed
  ) {
    notifyBatteryUpdate();
  }

  return changed;
}

export function syncChargingBatteries() {
  return refreshChargingState(
    true,
  );
}

export function loadBatteries():
  HubBattery[] {
  /*
   * Keep mock state current even if another page reads the inventory.
   */
  refreshChargingState(
    false,
  );

  return demoBatteries.map(
    (battery) => ({
      ...battery,
    }),
  );
}

export function loadBatteryHistory():
  BatteryHistoryRecord[] {
  return demoBatteryHistory.map(
    (item) => ({
      ...item,
    }),
  );
}

export function getBatteryForDrone(
  droneId: string,
) {
  const battery =
    activeFlightBatteries[
      droneId
    ];

  return battery
    ? {
        ...battery,
      }
    : undefined;
}

/*
 * Drone arrives at Hub.
 * Exact battery ID is carried by Mission.
 *
 * Battery is removed and charging starts immediately.
 */
export function detachBatteryFromDrone({
  batteryId,
  droneId,
  hub,
  chargeLevelPct,
  missionId,
  orderId,
}: {
  batteryId?: string;
  droneId: string;
  hub: string;
  chargeLevelPct: number;
  missionId?: string;
  orderId?: string;
}) {
  const activeBattery =
    activeFlightBatteries[
      droneId
    ];

  if (activeBattery) {
    delete activeFlightBatteries[
      droneId
    ];
  }

  if (!batteryId) {
    fallbackBatterySequence += 1;
  }

  const resolvedBatteryId =
    batteryId ??
    activeBattery?.id ??
    `BAT-${String(
      fallbackBatterySequence,
    ).padStart(
      3,
      "0",
    )}`;

  const returned =
    createChargingBattery({
      id:
        resolvedBatteryId,

      hub,

      chargeLevelPct,
    });

  /*
   * One physical Battery ID = one inventory row.
   */
  demoBatteries = [
    returned,

    ...demoBatteries.filter(
      (battery) =>
        battery.id !==
        resolvedBatteryId,
    ),
  ];

  addHistory({
    batteryId:
      resolvedBatteryId,

    hub,

    action:
      "Removed at hub",

    chargeLevelPct,

    droneId,

    missionId:
      missionId ??
      activeBattery?.missionId,

    orderId:
      orderId ??
      activeBattery?.orderId,

    occurredAt:
      returned.updatedAt,

    note:
      `Battery removed at ${chargeLevelPct}%. Estimated full charge in ${calculateChargeMinutes(
        chargeLevelPct,
      )} minute(s).`,
  });

  notifyBatteryUpdate();

  return {
    ...returned,
  };
}

/*
 * Technician selects a Ready battery for an assigned mission.
 */
export function checkoutBatteryForFlight({
  batteryId,
  droneId,
  hub,
  missionId,
  orderId,
}: {
  batteryId: string;
  droneId: string;
  hub: string;
  missionId?: string;
  orderId?: string;
}) {
  refreshChargingState(
    false,
  );

  const battery =
    demoBatteries.find(
      (item) =>
        item.id ===
          batteryId &&
        item.hub === hub &&
        item.status ===
          "Ready" &&
        item.chargeLevelPct ===
          100,
    );

  if (!battery) {
    return undefined;
  }

  const now =
    formatBatteryTime();

  demoBatteries =
    demoBatteries.filter(
      (item) =>
        item.id !==
        batteryId,
    );

  const flightBattery:
    ActiveFlightBattery = {
    id:
      battery.id,

    droneId,

    missionId,
    orderId,

    chargeLevelPct:
      100,

    installedAt:
      now,
  };

  activeFlightBatteries[
    droneId
  ] = flightBattery;

  addHistory({
    batteryId:
      battery.id,

    hub,

    action:
      "Taken for use",

    chargeLevelPct:
      100,

    missionId,
    orderId,
    droneId,

    occurredAt:
      now,

    note:
      "Battery removed from Hub inventory and installed on the departing drone.",
  });

  notifyBatteryUpdate();

  return {
    ...flightBattery,
  };
}

/*
 * Compatibility helper used by replacement/outbound flow.
 */
export function installFullBatteryOnDrone({
  droneId,
  hub,
  missionId,
  orderId,
}: {
  droneId: string;
  hub: string;
  missionId?: string;
  orderId?: string;
}) {
  const existing =
    getBatteryForDrone(
      droneId,
    );

  if (existing) {
    return existing;
  }

  const readyBattery =
    loadBatteries().find(
      (battery) =>
        battery.hub === hub &&
        battery.status ===
          "Ready" &&
        battery.chargeLevelPct ===
          100,
    );

  if (!readyBattery) {
    return null;
  }

  return (
    checkoutBatteryForFlight({
      batteryId:
        readyBattery.id,

      droneId,
      hub,
      missionId,
      orderId,
    }) ?? null
  );
}

/*
 * Active long-distance mission battery stop.
 */
export function replaceBatteryForTransitStop({
  incomingBatteryId,
  droneId,
  hub,
  incomingChargeLevelPct,
  missionId,
}: {
  incomingBatteryId?: string;
  droneId: string;
  hub: string;
  incomingChargeLevelPct: number;
  missionId?: string;
}): BatterySwapResult | null {
  const readyBattery =
    loadBatteries().find(
      (battery) =>
        battery.hub === hub &&
        battery.status ===
          "Ready" &&
        battery.chargeLevelPct ===
          100,
    );

  if (!readyBattery) {
    return null;
  }

  const removedBattery =
    detachBatteryFromDrone({
      batteryId:
        incomingBatteryId,

      droneId,
      hub,

      chargeLevelPct:
        incomingChargeLevelPct,

      missionId,
    });

  const installedBattery =
    checkoutBatteryForFlight({
      batteryId:
        readyBattery.id,

      droneId,
      hub,
      missionId,
    });

  if (!installedBattery) {
    return null;
  }

  addHistory({
    batteryId:
      installedBattery.id,

    hub,

    action:
      "Battery replaced",

    chargeLevelPct:
      100,

    missionId,
    droneId,

    occurredAt:
      installedBattery.installedAt,

    note:
      incomingBatteryId
        ? `${incomingBatteryId} removed; ${installedBattery.id} installed for mission continuation.`
        : `${installedBattery.id} installed for mission continuation.`,
  });

  return {
    installedBattery,
    removedBattery,
  };
}

// ---------------------------------------------------------------------------
// Backend API integration
// ---------------------------------------------------------------------------


function normalizeApiBatteryStatus(
  value: string,
  chargeLevelPct: number,
): BatteryStatus {
  const key = value.trim().toUpperCase();

  if (
    key === "READY" ||
    key === "FULL" ||
    key === "CHARGED" ||
    key === "AVAILABLE"
  ) {
    return "Ready";
  }

  if (
    key === "CHARGING" ||
    key === "LOW" ||
    key === "DEPLETED"
  ) {
    return "Charging";
  }

  /*
   * Current Backend/DB screenshots use the generic lifecycle value
   * `Active`. Battery Management needs an operational state instead.
   * Until Backend exposes Ready/Charging explicitly, derive it from SOC.
   */
  if (key === "ACTIVE" || key === "IN_USE" || key === "INSTALLED") {
    return chargeLevelPct >= 100 ? "Ready" : "Charging";
  }

  return chargeLevelPct >= 100 ? "Ready" : "Charging";
}

function toBatteryDisplayId(value: string) {
  if (/^BAT-/i.test(value)) return value.toUpperCase();
  const match = value.match(/(\d+)$/);
  return match ? `BAT-${match[1].padStart(3, "0")}` : `BAT-${value}`;
}

function mapApiBattery(value: unknown): HubBattery | null {
  if (!isRecord(value)) return null;

  /*
   * Swagger currently returns both a numeric database `id` and a
   * human-readable `serial_number` such as BAT-001. Keep them separate:
   * - id          -> UI/display code
   * - backendId   -> path parameter for mutation APIs
   *
   * The previous mapper preferred numeric `id`, which could display the
   * wrong BAT-xxx code whenever database id and serial number diverged.
   */
  const serialNumber = pickString(
    value,
    ["serial_number", "battery_code", "code"],
    "",
  );

  const backendId = pickString(
    value,
    ["id", "battery_id", "batteryId"],
    "",
  );

  const displayId =
    serialNumber ||
    (backendId ? toBatteryDisplayId(backendId) : "");

  if (!displayId) return null;

  const rawStatus = pickString(
    value,
    ["status", "battery_status", "state"],
    "",
  );

  const statusKey = rawStatus.trim().toUpperCase();

  const chargeLevelPct = Math.max(
    0,
    Math.min(
      100,
      pickNumber(
        value,
        [
          "charge_level_pct",
          "battery_level_pct",
          "charge_pct",
          "charge_level",
          "level",
          "soc",
          "state_of_charge",
          "percentage",
        ],
        ["READY", "FULL", "CHARGED", "AVAILABLE"].includes(statusKey)
          ? 100
          : 0,
      ),
    ),
  );

  const status = normalizeApiBatteryStatus(
    rawStatus,
    chargeLevelPct,
  );

  const remainingMinutes = pickNumber(
    value,
    [
      "estimated_minutes_remaining",
      "minutes_remaining",
      "estimated_charge_minutes",
      "estimated_minutes",
    ],
    0,
  );

  const estimatedReadyAtRaw = pickString(
    value,
    [
      "estimated_ready_at",
      "ready_at",
      "estimated_full_at",
      "fully_charged_at",
    ],
    "",
  );

  let estimatedReadyAt: string | undefined;

  if (estimatedReadyAtRaw) {
    const parsed = new Date(estimatedReadyAtRaw);
    if (!Number.isNaN(parsed.getTime())) {
      estimatedReadyAt = parsed.toISOString();
    }
  } else if (status === "Charging" && remainingMinutes > 0) {
    estimatedReadyAt = new Date(
      Date.now() + remainingMinutes * 60_000,
    ).toISOString();
  }

  const hubId = pickString(
    value,
    ["current_hub_id", "hub_id"],
    "",
  );

  const hubName = pickString(
    value,
    ["hub_name", "hub", "hub_code"],
    "",
  );

  return {
    id: displayId,
    backendId: backendId || undefined,
    serialNumber: serialNumber || undefined,
    model:
      pickString(
        value,
        ["model", "battery_model", "model_code", "battery_model_code"],
        "",
      ) || undefined,
    capacityWh: pickNumber(value, ["capacity_wh", "energy_capacity_wh"], 0),
    droneId:
      pickString(value, ["drone_id", "installed_drone_id"], "") ||
      undefined,
    hubId: hubId || undefined,
    hub: hubName || (hubId ? `Hub #${hubId}` : TECHNICIAN_HUB),
    chargeLevelPct,
    status,
    createdAt: formatApiDateTime(
      pickString(value, ["created_at"], ""),
      "—",
    ),
    updatedAt: formatApiDateTime(
      pickString(value, ["updated_at", "charged_at", "created_at"], ""),
      "—",
    ),
    estimatedReadyAt,
  };
}

function resolveBackendBatteryId(batteryId: string) {
  const battery = demoBatteries.find(
    (item) => item.id === batteryId,
  );

  return battery?.backendId || batteryId;
}

export async function refreshBatteriesFromApi() {
  const payload = await getBatteriesApi();
  demoBatteries = unwrapList(payload)
    .map(mapApiBattery)
    .filter((item): item is HubBattery => Boolean(item));

  window.dispatchEvent(new Event("technician-batteries-updated"));
  return loadBatteries();
}

export async function getBatteryDetailFromApi(
  batteryId: string,
) {
  // Swagger exposes only GET /technician/fleet/batteries for Technician.
  // Resolve detail data from that list instead of calling a non-existent
  // GET /technician/fleet/batteries/{battery_id} endpoint.
  const batteries = await refreshBatteriesFromApi();

  return (
    batteries.find(
      (battery) =>
        battery.backendId === batteryId ||
        battery.id === batteryId ||
        battery.serialNumber === batteryId,
    ) ?? null
  );
}

export async function useBatteryOnServer(
  batteryId: string,
  missionId: string,
) {
  const result = await useBatteryApi(
    resolveBackendBatteryId(batteryId),
    missionId,
  );
  await refreshBatteriesFromApi();
  return result;
}

export async function markBatteryChargedOnServer(
  batteryId: string,
) {
  const result = await markBatteryChargedApi(
    resolveBackendBatteryId(batteryId),
  );
  await refreshBatteriesFromApi();
  return result;
}

export async function useFirstReadyBatteryForMissionOnServer(
  missionId: string,
) {
  const batteries = await refreshBatteriesFromApi();
  const ready = batteries.find(
    (battery) =>
      battery.status === "Ready" &&
      battery.chargeLevelPct >= 100,
  );

  if (!ready) {
    return null;
  }

  await useBatteryOnServer(ready.id, missionId);
  return ready;
}
