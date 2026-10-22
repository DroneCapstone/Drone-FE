export type PackageSize = "S" | "M" | "L" | "XL";

export type PackageCategory =
  | "food"
  | "documents"
  | "electronics"
  | "medical"
  | "clothing"
  | "household"
  | "fragile"
  | "other";

export type DeliveryMode =
  | "normal"
  | "express"
  | "scheduled";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded";

export type OrderStatus =
  | "pending_review"
  | "accepted"
  | "in_delivery"
  | "arrived_at_destination"
  | "collected"
  | "completed"
  | "rejected"
  | "cancelled";

export interface DeliveryHub {
  id: string | number;
  name: string;
  address: string;
  city?: string;
  area?: string;
}

export interface DeliveryDraft {
  senderName: string;
  senderPhone: string;

  recipientName: string;
  recipientEmail: string;

  packageCategory: PackageCategory;
  packageDescription: string;

  weightKg: number;
  packageSize: PackageSize;

  /**
   * Customer hub IDs are stored as strings in the form so native
   * <select> controls remain simple. The API adapter converts them
   * back to string | number when sending requests.
   */
  originArea: string;
  destinationArea: string;

  deliveryMode: DeliveryMode;
  requestedDepartureAt: string;

  /**
   * Customer insurance selection.
   * Sent to both estimate and create-order APIs as has_insurance.
   */
  hasInsurance?: boolean;
  draftVersion?: number;
}

export interface DeliveryFeeDetails {
  baseFee: number;
  distanceFee: number;
  payloadFee: number;
  insuranceFee: number;
  expressSurcharge: number;
  fragileSurcharge: number;
}

export interface DeliveryPrice {
  /**
   * Backend delivery subtotal.
   */
  deliveryFee: number;

  /**
   * Backend service fee. In the current contract this normally matches
   * expressSurcharge for Express orders.
   */
  serviceFee: number;

  total: number;

  /**
   * Present on the updated estimate response.
   * Optional so older locally cached deliveries remain readable.
   */
  feeDetails?: DeliveryFeeDetails;
}

export interface DeliveryPreview {
  originHub: DeliveryHub;
  destinationHub: DeliveryHub;

  /** Hub-to-hub distance from backend estimate, in kilometers. */
  distanceKm?: number;

  handoverDeadlineAt: string;
  estimatedDepartureAt: string;
  estimatedArrivalAt: string;

  price: DeliveryPrice;
}

export interface CustomerDelivery
  extends DeliveryDraft {
  id: string;
  customerId: string;

  originHub: DeliveryHub;
  destinationHub: DeliveryHub;

  /** Persisted from the quotation used to create this order. */
  distanceKm?: number;

  createdAt: string;

  handoverDeadlineAt: string;
  estimatedDepartureAt: string;
  estimatedArrivalAt: string;

  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;

  packageReceivedAtHub: boolean;
  price: DeliveryPrice;

  /** Raw backend status is kept for debugging / future mapping. */
  backendStatus?: string;
}
