import { technicianApiRequest } from "../utils/technicianApi";

export { getDeliveryConfirmationsApi } from "../utils/technicianApi";

/** One POST per click; do not guess an ID or retry using a mission ID. */
export function confirmDeliveryPickupApi(orderId: string | number) {
  const id = String(orderId).trim();
  if (!id || /^(MSN|MISSION)[-_]/i.test(id)) {
    throw new Error("Confirm pickup requires the order ID, never a mission ID.");
  }
  return technicianApiRequest(
    `/technician/deliveries/confirmations/${encodeURIComponent(id)}/confirm-pickup`,
    { method: "POST" },
  );
}
