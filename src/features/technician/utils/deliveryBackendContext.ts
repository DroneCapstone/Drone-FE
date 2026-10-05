import {
  isRecord,
  pickString,
  unwrapList,
  unwrapObject,
} from "../api/httpClient";

export type DeliveryMissionInfo = {
  missionId?: string;
  missionCode?: string;
  droneId?: string;
  droneCode?: string;
  batteryId?: string;
  originHub?: string;
  destinationHub?: string;
  arrivedAt?: string;
};

export type DeliveryBackendContext = {
  currentHubId?: string;
  currentHubName?: string;
  missionByOrderKey: Map<string, DeliveryMissionInfo>;
};

function clean(value: string | undefined | null) {
  return String(value ?? "").trim();
}

function keyFor(value: string) {
  const normalized = clean(value).toLowerCase();
  return normalized ? `order:${normalized}` : "";
}

function nestedRecord(
  record: Record<string, unknown>,
  keys: string[],
) {
  for (const key of keys) {
    const value = record[key];
    if (isRecord(value)) return value;
  }

  return undefined;
}

function getHubNameFromNested(
  record: Record<string, unknown>,
  keys: string[],
) {
  const nested = nestedRecord(record, keys);
  if (!nested) return "";

  return pickString(
    nested,
    ["name", "hub_name", "code", "hub_code", "label"],
    "",
  );
}

function getHubIdFromNested(
  record: Record<string, unknown>,
  keys: string[],
) {
  const nested = nestedRecord(record, keys);
  if (!nested) return "";

  return pickString(
    nested,
    ["id", "hub_id"],
    "",
  );
}

function missionOrderKeys(record: Record<string, unknown>) {
  const keys = new Set<string>();

  const rawOrderId = pickString(
    record,
    ["order_id", "orderId", "delivery_order_id"],
    "",
  );

  const rawOrderCode = pickString(
    record,
    ["order_code", "orderCode", "delivery_order_code"],
    "",
  );

  [rawOrderId, rawOrderCode]
    .map(keyFor)
    .filter(Boolean)
    .forEach((key) => keys.add(key));

  const nestedOrder = nestedRecord(record, ["order", "delivery_order"]);
  if (nestedOrder) {
    const nestedId = pickString(
      nestedOrder,
      ["id", "order_id"],
      "",
    );
    const nestedCode = pickString(
      nestedOrder,
      ["code", "order_code"],
      "",
    );

    [nestedId, nestedCode]
      .map(keyFor)
      .filter(Boolean)
      .forEach((key) => keys.add(key));
  }

  return [...keys];
}

function deliveryOrderKeys(record: Record<string, unknown>) {
  const keys = new Set<string>();

  const rawId = pickString(
    record,
    ["order_id", "orderId", "id"],
    "",
  );

  const rawCode = pickString(
    record,
    ["order_code", "orderCode", "code"],
    "",
  );

  [rawId, rawCode]
    .map(keyFor)
    .filter(Boolean)
    .forEach((key) => keys.add(key));

  return [...keys];
}

function mapMissionInfo(
  record: Record<string, unknown>,
): DeliveryMissionInfo {
  const missionId = pickString(
    record,
    ["mission_id", "missionId", "id"],
    "",
  );

  const missionCode = pickString(
    record,
    ["mission_code", "missionCode", "code"],
    "",
  );

  const drone = nestedRecord(record, ["drone", "assigned_drone"]);
  const droneId =
    pickString(
      record,
      ["drone_id", "assigned_drone_id", "droneId"],
      "",
    ) ||
    (drone
      ? pickString(drone, ["id", "drone_id"], "")
      : "");

  const droneCode =
    pickString(
      record,
      ["drone_code", "assigned_drone_code", "drone_name"],
      "",
    ) ||
    (drone
      ? pickString(
          drone,
          ["code", "name", "drone_code", "drone_name"],
          "",
        )
      : "");

  const battery = nestedRecord(record, ["battery", "installed_battery"]);
  const batteryId =
    pickString(
      record,
      ["battery_id", "installed_battery_id"],
      "",
    ) ||
    (battery
      ? pickString(battery, ["id", "battery_id"], "")
      : "");

  const originHub =
    pickString(
      record,
      ["origin_hub_name", "origin_name", "origin"],
      "",
    ) ||
    getHubNameFromNested(record, ["origin_hub", "originHub"]);

  const destinationHub =
    pickString(
      record,
      ["destination_hub_name", "destination_name", "destination"],
      "",
    ) ||
    getHubNameFromNested(record, ["destination_hub", "destinationHub"]);

  return {
    missionId: missionId || undefined,
    missionCode: missionCode || undefined,
    droneId: droneId || undefined,
    droneCode: droneCode || undefined,
    batteryId: batteryId || undefined,
    originHub: originHub || undefined,
    destinationHub: destinationHub || undefined,
    arrivedAt:
      pickString(
        record,
        ["arrived_at", "arrival_at", "delivered_at", "completed_at"],
        "",
      ) || undefined,
  };
}

function getCurrentHub(authPayload: unknown) {
  const candidates: Record<string, unknown>[] = [];

  const addCandidate = (value: unknown) => {
    if (!isRecord(value)) return;
    if (!candidates.includes(value)) candidates.push(value);
  };

  addCandidate(authPayload);

  if (isRecord(authPayload)) {
    [
      "data",
      "auth",
      "technician",
      "user",
      "profile",
    ].forEach((key) => addCandidate(authPayload[key]));

    const data = authPayload.data;
    if (isRecord(data)) {
      ["auth", "technician", "user", "profile"].forEach((key) =>
        addCandidate(data[key]),
      );
    }
  }

  addCandidate(unwrapObject(authPayload));

  let currentHubId = "";
  let currentHubName = "";

  for (const record of candidates) {
    const nestedHub = nestedRecord(record, [
      "hub",
      "assigned_hub",
      "current_hub",
    ]);

    if (!currentHubId) {
      currentHubId =
        pickString(
          record,
          ["hub_id", "assigned_hub_id", "current_hub_id"],
          "",
        ) ||
        (nestedHub
          ? pickString(nestedHub, ["id", "hub_id"], "")
          : "");
    }

    if (!currentHubName) {
      const directHubName = pickString(
        record,
        ["hub_name", "control_center"],
        "",
      );

      const stringHub =
        typeof record.hub === "string" ? record.hub : "";

      currentHubName =
        directHubName ||
        stringHub ||
        (nestedHub
          ? pickString(
              nestedHub,
              ["name", "hub_name", "code", "hub_code", "label"],
              "",
            )
          : "");
    }

    if (currentHubId && currentHubName) break;
  }

  return {
    currentHubId: currentHubId || undefined,
    currentHubName: currentHubName || undefined,
  };
}

export function buildDeliveryBackendContext(
  missionsPayload: unknown,
  authPayload: unknown,
): DeliveryBackendContext {
  const missionByOrderKey = new Map<string, DeliveryMissionInfo>();

  unwrapList(missionsPayload).forEach((value) => {
    if (!isRecord(value)) return;

    const info = mapMissionInfo(value);
    missionOrderKeys(value).forEach((key) => {
      missionByOrderKey.set(key, info);
    });
  });

  return {
    ...getCurrentHub(authPayload),
    missionByOrderKey,
  };
}

export function getMissionInfoForDelivery(
  record: Record<string, unknown>,
  context?: DeliveryBackendContext,
) {
  if (!context) return undefined;

  for (const key of deliveryOrderKeys(record)) {
    const match = context.missionByOrderKey.get(key);
    if (match) return match;
  }

  return undefined;
}

export function resolveHubLabel(
  record: Record<string, unknown>,
  type: "origin" | "destination",
  context?: DeliveryBackendContext,
  missionFallback?: string,
  preferCurrentHub = false,
) {
  const isOrigin = type === "origin";

  const directName = pickString(
    record,
    isOrigin
      ? ["origin_hub_name", "origin_name", "origin"]
      : ["destination_hub_name", "destination_name", "destination"],
    "",
  );

  if (directName) return directName;

  const nestedName = getHubNameFromNested(
    record,
    isOrigin
      ? ["origin_hub", "originHub"]
      : ["destination_hub", "destinationHub"],
  );

  if (nestedName) return nestedName;

  if (clean(missionFallback)) return clean(missionFallback);

  const directId = pickString(
    record,
    isOrigin
      ? ["origin_hub_id", "originHubId"]
      : ["destination_hub_id", "destinationHubId"],
    "",
  );

  const nestedId = getHubIdFromNested(
    record,
    isOrigin
      ? ["origin_hub", "originHub"]
      : ["destination_hub", "destinationHub"],
  );

  const hubId = directId || nestedId;

  if (
    hubId &&
    context?.currentHubId &&
    String(hubId) === String(context.currentHubId) &&
    context.currentHubName
  ) {
    return context.currentHubName;
  }

  /*
   * Outbound origin and delivery-confirmation destination are scoped to the
   * Technician's own hub. Some auth responses expose hub_name without hub_id;
   * in those two known scopes, the authenticated hub name is still the most
   * accurate Backend label available.
   */
  if (
    preferCurrentHub &&
    context?.currentHubName &&
    (!hubId || !context.currentHubId)
  ) {
    return context.currentHubName;
  }

  if (hubId) return `Hub #${hubId}`;

  if (preferCurrentHub && context?.currentHubName) {
    return context.currentHubName;
  }

  return "—";
}
