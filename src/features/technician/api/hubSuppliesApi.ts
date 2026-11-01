import { technicianApiRequest, isRecord, unwrapList } from "../utils/technicianApi";

/**
 * PARTS_MANAGEMENT_API.md — Technician, scoped to the hub assigned to the JWT.
 * Base URL (/api/v1) is already configured inside technicianApiRequest.
 */
const INVENTORY_PATH = "/technician/fleet/hub-inventories";
const REQUESTS_PATH = "/technician/fleet/parts-requests";

export type PartCategory = {
  id: number;
  name: string;
  categoryType: string;
  compatibleDroneModels: string[];
  unitCost: number | null;
  description: string;
  isActive: boolean;
  createdAt: string | null;
};

export type HubSupply = {
  id: number; // inventory_id, not part_category_id
  hubId: number;
  partCategoryId: number;
  quantity: number;
  minStockThreshold: number;
  isLowStock: boolean;
  updatedAt: string | null;
  partCategory?: PartCategory;
};

export type PartRequestStatus = "Pending" | "Approved" | "Rejected" | "Fulfilled";

export type PartsRequest = {
  id: number;
  requestedBy: string | null;
  hubId: number;
  partCategoryId: number;
  quantityNeeded: number;
  description: string;
  droneId: string | null;
  photoUrls: string[];
  status: PartRequestStatus;
  reviewedBy: string | null;
  adminNote: string | null;
  reviewedAt: string | null;
  actualCost: number | null;
  createdAt: string | null;
  fulfilledAt: string | null;
};

export type CreatePartsRequestInput = {
  part_category_id: number;
  quantity_needed: number;
  description: string;
  drone_id?: string;
  photo_urls?: string[];
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
};
const asText = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

function mapCategory(value: unknown): PartCategory | undefined {
  if (!isRecord(value)) return undefined;
  const id = asNumber(value.id);
  if (id === null || !Number.isInteger(id)) return undefined;
  return {
    id,
    name: asText(value.name) ?? `Part category #${id}`,
    categoryType: asText(value.category_type) ?? "",
    compatibleDroneModels: Array.isArray(value.compatible_drone_models)
      ? value.compatible_drone_models.filter((s): s is string => typeof s === "string")
      : [],
    unitCost: asNumber(value.unit_cost),
    description: asText(value.description) ?? "",
    isActive: value.is_active !== false,
    createdAt: asText(value.created_at),
  };
}

export function mapHubSupply(value: unknown): HubSupply | null {
  if (!isRecord(value)) return null;
  const id = asNumber(value.id);
  const hubId = asNumber(value.hub_id);
  const partCategory = mapCategory(value.part_category);
  const partCategoryId = asNumber(value.part_category_id) ?? partCategory?.id ?? null;
  const quantity = asNumber(value.quantity);
  const threshold = asNumber(value.min_stock_threshold) ?? 0;
  if (id === null || !Number.isInteger(id) || id < 1 ||
      partCategoryId === null || !Number.isInteger(partCategoryId) || partCategoryId < 1 ||
      quantity === null || quantity < 0) return null;
  return {
    id,
    hubId: hubId ?? 0,
    partCategoryId,
    quantity,
    minStockThreshold: threshold,
    isLowStock: typeof value.is_low_stock === "boolean" ? value.is_low_stock : quantity < threshold,
    updatedAt: asText(value.updated_at),
    partCategory,
  };
}

function ensureInventory(value: unknown): HubSupply {
  const result = mapHubSupply(value);
  if (!result) throw new Error("Backend returned an invalid HubInventory response.");
  return result;
}

export function mapPartsRequest(value: unknown): PartsRequest | null {
  if (!isRecord(value)) return null;
  const id = asNumber(value.id);
  const categoryId = asNumber(value.part_category_id);
  const needed = asNumber(value.quantity_needed);
  if (id === null || !Number.isInteger(id) || id < 1 ||
      categoryId === null || !Number.isInteger(categoryId) || categoryId < 1 ||
      needed === null) return null;
  const statusRaw = (asText(value.status) ?? "Pending").toLowerCase();
  const status: PartRequestStatus = statusRaw === "approved" ? "Approved"
    : statusRaw === "rejected" ? "Rejected"
    : statusRaw === "fulfilled" ? "Fulfilled" : "Pending";
  return {
    id,
    requestedBy: asText(value.requested_by),
    hubId: asNumber(value.hub_id) ?? 0,
    partCategoryId: categoryId,
    quantityNeeded: needed,
    description: asText(value.description) ?? "",
    droneId: asText(value.drone_id),
    photoUrls: Array.isArray(value.photo_urls)
      ? value.photo_urls.filter((s): s is string => typeof s === "string")
      : [],
    status,
    reviewedBy: asText(value.reviewed_by),
    adminNote: asText(value.admin_note),
    reviewedAt: asText(value.reviewed_at),
    actualCost: asNumber(value.actual_cost),
    createdAt: asText(value.created_at),
    fulfilledAt: asText(value.fulfilled_at),
  };
}

function ensureRequest(value: unknown): PartsRequest {
  const result = mapPartsRequest(value);
  if (!result) throw new Error("Backend returned an invalid PartsRequest response.");
  return result;
}

const validateId = (id: number): number => {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Invalid record ID.");
  return id;
};

/** GET current hub inventory; BE gets the hub from the Technician account. */
export async function getHubSuppliesApi(): Promise<HubSupply[]> {
  const result = await technicianApiRequest(INVENTORY_PATH);
  return unwrapList(result).map(mapHubSupply).filter((x): x is HubSupply => x !== null);
}

/** GET inventory detail, including part_category.name and compatibility. */
export async function getHubSupplyDetailApi(inventoryId: number): Promise<HubSupply> {
  return ensureInventory(await technicianApiRequest(`${INVENTORY_PATH}/${validateId(inventoryId)}`));
}

/**
 * Technician can only CONSUME parts. Positive adjustment must not be used to
 * bypass Admin approval; new stock comes exclusively from fulfillPartsRequestApi.
 */
export async function useHubSupplyApi(inventoryId: number, quantityUsed: number): Promise<HubSupply> {
  if (!Number.isSafeInteger(quantityUsed) || quantityUsed < 1) {
    throw new Error("Quantity used must be a positive whole number.");
  }
  return ensureInventory(await technicianApiRequest(
    `${INVENTORY_PATH}/${validateId(inventoryId)}/adjust?delta=${encodeURIComponent(String(-quantityUsed))}`,
    { method: "PATCH" },
  ));
}

export async function createPartsRequestApi(input: CreatePartsRequestInput): Promise<PartsRequest> {
  if (!Number.isSafeInteger(input.part_category_id) || input.part_category_id < 1) {
    throw new Error("Select a valid part category ID.");
  }
  if (!Number.isSafeInteger(input.quantity_needed) || input.quantity_needed < 1) {
    throw new Error("Quantity needed must be a positive whole number.");
  }
  if (!input.description.trim()) throw new Error("Please provide a reason for the request.");
  const payload: CreatePartsRequestInput = {
    part_category_id: input.part_category_id,
    quantity_needed: input.quantity_needed,
    description: input.description.trim(),
  };
  if (input.drone_id?.trim()) payload.drone_id = input.drone_id.trim();
  if (input.photo_urls?.length) payload.photo_urls = input.photo_urls;
  return ensureRequest(await technicianApiRequest(REQUESTS_PATH, {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

/** GET requests of currently signed-in Technician. */
export async function getMyPartsRequestsApi(): Promise<PartsRequest[]> {
  const result = await technicianApiRequest(`${REQUESTS_PATH}/my`);
  return unwrapList(result).map(mapPartsRequest).filter((x): x is PartsRequest => x !== null);
}

export async function getPartsRequestDetailApi(requestId: number): Promise<PartsRequest> {
  return ensureRequest(await technicianApiRequest(`${REQUESTS_PATH}/${validateId(requestId)}`));
}

/** Approved only; BE atomically adds quantity and moves request to Fulfilled. */
export async function fulfillPartsRequestApi(requestId: number): Promise<PartsRequest> {
  return ensureRequest(await technicianApiRequest(`${REQUESTS_PATH}/${validateId(requestId)}/fulfill`, {
    method: "POST",
    body: JSON.stringify({}),
  }));
}
