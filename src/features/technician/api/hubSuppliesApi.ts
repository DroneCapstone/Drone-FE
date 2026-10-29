import { technicianApiRequest, isRecord, unwrapList } from "../utils/technicianApi";

/** Hub Supplies API (Swagger route: /api/v1/technician/fleet/supplies). Technician scope is the authenticated hub. */
export type HubSupply = {
  id: number;
  hubId: number;
  itemName: string;
  quantity: number;
  unit: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type HubSupplyInput = {
  item_name: string;
  quantity: number;
  unit: string;
};

function mapSupply(value: unknown): HubSupply | null {
  if (!isRecord(value)) return null;
  const id = Number(value.id);
  const hubId = Number(value.hub_id);
  const quantity = Number(value.quantity);
  if (!Number.isInteger(id) || !Number.isFinite(quantity)) return null;
  return {
    id,
    hubId: Number.isInteger(hubId) ? hubId : 0,
    itemName: typeof value.item_name === "string" ? value.item_name : "Unknown supply",
    quantity,
    unit: typeof value.unit === "string" ? value.unit : "",
    createdAt: typeof value.created_at === "string" ? value.created_at : null,
    updatedAt: typeof value.updated_at === "string" ? value.updated_at : null,
  };
}

function ensureSupply(value: unknown): HubSupply {
  const mapped = mapSupply(value);
  if (!mapped) throw new Error("Backend returned an invalid hub supply response.");
  return mapped;
}

/** Never send hub_id for Technician: the Backend derives it from the login. */
export async function getHubSuppliesApi(): Promise<HubSupply[]> {
  const result = await technicianApiRequest("/technician/fleet/supplies");
  return unwrapList(result).map(mapSupply).filter((item): item is HubSupply => item !== null);
}

export async function createHubSupplyApi(payload: HubSupplyInput): Promise<HubSupply> {
  return ensureSupply(await technicianApiRequest("/technician/fleet/supplies", {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export async function updateHubSupplyApi(
  id: number,
  payload: Partial<HubSupplyInput>,
): Promise<HubSupply> {
  return ensureSupply(await technicianApiRequest(`/technician/fleet/supplies/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }));
}

export async function adjustHubSupplyApi(id: number, delta: number): Promise<HubSupply> {
  if (!Number.isInteger(delta) || delta === 0) {
    throw new Error("Quantity adjustment must be a non-zero integer.");
  }
  return ensureSupply(await technicianApiRequest(
    `/technician/fleet/supplies/${id}/adjust?delta=${encodeURIComponent(String(delta))}`,
    { method: "PATCH" },
  ));
}

/** Backend responds 204 No Content; no JSON body should be parsed. */
export async function deleteHubSupplyApi(id: number): Promise<void> {
  await technicianApiRequest(`/technician/fleet/supplies/${id}`, { method: "DELETE" });
}
