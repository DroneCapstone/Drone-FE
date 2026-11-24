import { ApiError, customerApi } from "./customerApi";

export type RatingLookup =
  | { kind: "rated"; rating: number }
  | { kind: "unrated" }
  | { kind: "error" };

const PREFIX = "droneoptai.customer.rating.v1";
const inFlightLookups = new Map<string, Promise<RatingLookup>>();

export function validRating(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

function ratingKey(userId: string, orderId: string): string {
  return `${PREFIX}.${encodeURIComponent(userId)}.${encodeURIComponent(orderId)}`;
}

/** A display fallback for successful POST ratings, scoped to the signed-in user.
 * The backend remains responsible for enforcing one rating per order.
 */
export function readSavedRating(userId: string, orderId: string): number | null {
  if (!userId || !orderId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ratingKey(userId, orderId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return validRating(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function rememberRating(userId: string, orderId: string, rating: number): void {
  if (!validRating(rating) || !userId || !orderId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ratingKey(userId, orderId), JSON.stringify(rating));
  } catch {
    // Saving a rating on the server succeeded. Storage failures must not undo it.
  }
  // Clear any stale "unrated" lookup in memory before another screen reads it.
  inFlightLookups.delete(ratingKey(userId, orderId));
}

/**
 * Read the cached POST result first so a 404 from an unsupported or empty
 * GET /rating endpoint cannot make a successfully rated order look unrated.
 * Only 404 is treated as "no retrievable rating"; other errors remain errors.
 * A 404 does not prove a rating has never been submitted: the BE must expose
 * an authenticated GET endpoint to recover older ratings on another device.
 */
export function loadCustomerRating(userId: string, orderId: string): Promise<RatingLookup> {
  const saved = readSavedRating(userId, orderId);
  if (saved !== null) return Promise.resolve({ kind: "rated", rating: saved });
  if (!userId || !orderId) return Promise.resolve({ kind: "error" });

  const key = ratingKey(userId, orderId);
  const existing = inFlightLookups.get(key);
  if (existing) return existing;

  const request: Promise<RatingLookup> = customerApi.getRating(orderId)
    .then((response): RatingLookup => {
      const rating = response?.rating;
      if (!validRating(rating)) return { kind: "error" };
      rememberRating(userId, orderId, rating);
      return { kind: "rated", rating };
    })
    .catch((error: unknown): RatingLookup => {
      if (error instanceof ApiError && error.status === 404) {
        return { kind: "unrated" };
      }
      return { kind: "error" };
    });

  // Deduplicate checks in the same tab; navigating to /rate won't create
  // another GET 404 for the same unrated order immediately afterward.
  inFlightLookups.set(key, request);
  return request;
}

export function refreshCustomerRatingLookup(userId: string, orderId: string): void {
  if (userId && orderId) inFlightLookups.delete(ratingKey(userId, orderId));
}

/** Include statuses after delivery, not just DELIVERED_TO_HUB.
 * In particular, COMPLETED must keep the saved rating visible.
 */
export function canShowDeliveryRating(...statuses: Array<string | null | undefined>): boolean {
  const eligible = new Set([
    "DELIVERED_TO_HUB", "COMPLETED", "DELIVERED", "AT_DESTINATION_HUB",
    "READY_FOR_PICKUP", "PICKUP_READY", "PICKED_UP", "COLLECTED",
    "PACKAGE_COLLECTED", "PACKAGE_PICKED_UP", "RECEIVED_BY_RECIPIENT",
    "HANDED_OVER_TO_RECIPIENT", "COMPLETED_PICKUP",
  ]);
  return statuses.some((status) =>
    eligible.has((status ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_")),
  );
}
