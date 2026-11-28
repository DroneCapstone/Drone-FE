import { isRecord, pickString } from "../api/httpClient";

export type ProofChecklistItem = { item: string; checked?: boolean; note: string; status: string };
export type OrderProofImage = {
  stage: string; url: string; recordedAt: string; hubId: string; missionId: string;
  legId?: string; technicianId?: string; technicianName?: string; checklist?: ProofChecklistItem[];
};
export type HistoryProofFields = {
  proofImages?: OrderProofImage[];
  droneImageUrl?: string;
  batteryImageUrl?: string;
};

export function isProofImageUrl(url: string): boolean {
  return /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(url) || /^https:\/\//i.test(url);
}

function readProofImage(entry: unknown): OrderProofImage | null {
  if (!isRecord(entry)) return null;
  const url = pickString(entry, ["proof_image_url"], "");
  if (!isProofImageUrl(url)) return null;
  const checklist = Array.isArray(entry.checklist) ? entry.checklist.flatMap((row: unknown) => {
    if (!isRecord(row)) return [];
    const item = pickString(row, ["item"], "");
    if (!item) return [];
    return [{ item, checked: typeof row.checked === "boolean" ? row.checked : undefined,
      note: pickString(row, ["note"], ""), status: pickString(row, ["status"], "") }];
  }) : [];
  return {
    stage: pickString(entry, ["stage"], "Proof image"), url,
    recordedAt: pickString(entry, ["recorded_at", "timestamp"], ""),
    hubId: pickString(entry, ["hub_id"], ""), missionId: pickString(entry, ["mission_id"], ""),
    legId: pickString(entry, ["leg_id"], ""), technicianId: pickString(entry, ["technician_id"], ""),
    technicianName: pickString(entry, ["technician_name", "technician_full_name"], "").trim(), checklist,
  };
}

export function readOrderProofImages(raw: unknown): OrderProofImage[] {
  if (!isRecord(raw)) return [];
  // New history endpoints use proof_images; keep the existing live-list aliases.
  const entries = [raw.proof_images, raw.order_proof_images, raw.proof_images_json]
    .find((value): value is unknown[] => Array.isArray(value) && value.length > 0) ?? [];
  return entries.map(readProofImage).filter((image): image is OrderProofImage => image !== null);
}

export function readHistoryProofFields(raw: unknown, pickupOnly = false): HistoryProofFields {
  if (!isRecord(raw)) return {};
  const pickup = pickupOnly ? readProofImage(raw.customer_pickup_proof) : null;
  const images = pickupOnly ? (pickup ? [pickup] : []) : readOrderProofImages(raw);
  const drone = pickString(raw, ["drone_image_url"], "");
  const battery = pickString(raw, ["battery_image_url"], "");
  return { proofImages: images.sort((a, b) => (Date.parse(a.recordedAt) || 0) - (Date.parse(b.recordedAt) || 0)),
    droneImageUrl: isProofImageUrl(drone) ? drone : undefined,
    batteryImageUrl: isProofImageUrl(battery) ? battery : undefined };
}

export const proofStageLabel = (stage: string) => ({
  PACKAGE_RECEIVED_AT_ORIGIN_HUB: "Package received", PACKAGE_LOADED_TO_DRONE: "Package loaded",
  PACKAGE_UNLOADED_FROM_DRONE: "Package unloaded", CUSTOMER_PICKUP_CONFIRMED: "Customer pickup",
} as Record<string, string>)[stage] ?? stage.replace(/_/g, " ");
