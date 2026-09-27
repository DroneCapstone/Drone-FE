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
  | "completed"
  | "rejected"
  | "cancelled";

export interface DeliveryHub {
  id: string;
  name: string;
  city: string;
  area: string;
  address: string;
}

export interface DeliveryDraft {
  senderName: string;
  senderPhone: string;

  recipientName: string;
  recipientPhone: string;

  packageCategory: PackageCategory;
  packageDescription: string;

  weightKg: number;
  packageSize: PackageSize;

  originArea: string;
  destinationArea: string;

  deliveryMode: DeliveryMode;

  requestedDepartureAt: string;
}

export interface DeliveryPrice {
  deliveryFee: number;
  serviceFee: number;
  total: number;
}

export interface DeliveryPreview {
  originHub: DeliveryHub;
  destinationHub: DeliveryHub;

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

  createdAt: string;

  handoverDeadlineAt: string;

  estimatedDepartureAt: string;
  estimatedArrivalAt: string;

  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;

  packageReceivedAtHub: boolean;

  price: DeliveryPrice;
}