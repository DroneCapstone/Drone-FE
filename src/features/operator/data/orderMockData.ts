import type { DeliveryMode, Order } from '../types/operator';
import { calculatePlanningAt } from '../utils/deliveryPlanning';

const isoFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();
const dateOnly = (iso: string) => iso.slice(0, 10);

function pendingOrder(
  id: string,
  originHubId: string,
  destinationHubId: string,
  startInMinutes: number,
  payloadKg: number,
  packageLabel: string,
  customerName: string,
  packageType = 'Standard parcel',
  deliveryMode: DeliveryMode = 'Scheduled',
  packageReceived = true,
): Order {
  const start = isoFromNow(startInMinutes);
  const end = isoFromNow(startInMinutes + 30);
  const createdAt = deliveryMode === 'Express' ? isoFromNow(-5) : isoFromNow(-45);
  const planningAt = calculatePlanningAt(deliveryMode, start, createdAt);

  return {
    id,
    customerName,
    customerPhone: '090 123 4567',
    packageLabel,
    packageType,
    payloadKg,
    originHubId,
    destinationHubId,
    deliveryMode,
    requestedDeliveryAt: start,
    requestedDate: dateOnly(start),
    initialEstimatedWindow: { start, end },
    currentEstimatedWindow: { start, end },
    planningAt,
    status: 'Pending',
    originHubReceivedAt: packageReceived ? isoFromNow(-20) : undefined,
    charges: { deliveryFee: 65000, currency: 'VND' },
    createdAt,
  };
}

export const defaultOrders: Order[] = [
  // CASE 1 — Future scheduled order. No Mission is created yet and the package has not reached the hub.
  pendingOrder(
    'ORD-1101',
    'HUB-HCM-01',
    'HUB-HCM-03',
    300,
    2.2,
    'Document parcel',
    'Minh Nguyen',
    'Standard parcel',
    'Scheduled',
    false,
  ),

  // CASE 2 — Express order. planningAt is immediate and package handoff is already confirmed.
  pendingOrder(
    'ORD-1102',
    'HUB-HCM-02',
    'HUB-HCM-01',
    50,
    3.2,
    'Medical supplies',
    'Trang Le',
    'Standard parcel',
    'Express',
    true,
  ),

  // CASE 3 — Mission already scheduled; pre-flight happens close to plannedStartAt.
  pendingOrder('ORD-1103', 'HUB-HCM-02', 'HUB-HCM-03', 45, 4.1, 'Electronics parcel', 'Khoa Tran'),

  // CASE 4 — Delivery Mission currently in progress.
  pendingOrder('ORD-1104', 'HUB-HCM-01', 'HUB-HCM-02', 20, 4.8, 'Retail replenishment', 'Anh Pham', 'Standard parcel', 'Express'),

  // CASE 5 — Package reached destination hub and customer is not due yet.
  {
    ...pendingOrder('ORD-1105', 'HUB-HCM-02', 'HUB-HCM-01', -60, 2.8, 'Consumer parcel', 'Linh Vo'),
    status: 'Ready for Pickup',
    readyForPickupAt: isoFromNow(-20),
    expectedPickupAt: isoFromNow(40),
    pickupDeadline: isoFromNow(2 * 24 * 60 - 20),
    contactHistory: [],
  },

  // CASE 6 — Expected pickup time passed; Operator should contact the customer once.
  {
    ...pendingOrder('ORD-1106', 'HUB-HCM-01', 'HUB-HCM-03', -180, 1.9, 'Contract documents', 'Huy Bui'),
    status: 'Ready for Pickup',
    readyForPickupAt: isoFromNow(-150),
    expectedPickupAt: isoFromNow(-30),
    pickupDeadline: isoFromNow(2 * 24 * 60 - 150),
    contactHistory: [],
  },

  // CASE 7 — Food / beverage order: 3-hour hold, now inside final-reminder window.
  {
    ...pendingOrder('ORD-1107', 'HUB-HCM-03', 'HUB-HCM-02', -180, 2.6, 'Fresh meal box', 'Mai Ho', 'Food & Beverage'),
    status: 'Ready for Pickup',
    readyForPickupAt: isoFromNow(-145),
    expectedPickupAt: isoFromNow(-110),
    pickupDeadline: isoFromNow(35),
    contactHistory: [
      {
        id: 'CONTACT-1107-1',
        channel: 'Phone',
        result: 'No Answer',
        contactedAt: isoFromNow(-95),
        note: 'First pickup reminder call.',
      },
      {
        id: 'CONTACT-1107-2',
        channel: 'SMS',
        result: 'Sent',
        contactedAt: isoFromNow(-90),
        note: 'Pickup reminder sent by SMS.',
      },
    ],
  },

  // CASE 8 — Hold deadline passed. Package still exists physically; disposal confirmation is required.
  {
    ...pendingOrder('ORD-1108', 'HUB-HCM-01', 'HUB-HCM-02', -260, 3.5, 'Cold beverage package', 'Nam Do', 'Food & Beverage'),
    status: 'Ready for Pickup',
    readyForPickupAt: isoFromNow(-205),
    expectedPickupAt: isoFromNow(-190),
    pickupDeadline: isoFromNow(-25),
    contactHistory: [
      {
        id: 'CONTACT-1108-1',
        channel: 'Phone',
        result: 'No Answer',
        contactedAt: isoFromNow(-170),
      },
      {
        id: 'CONTACT-1108-2',
        channel: 'SMS',
        result: 'Sent',
        contactedAt: isoFromNow(-160),
        note: 'Final pickup reminder sent.',
      },
    ],
  },

  // CASE 9 — Disposal physically confirmed after the pickup hold deadline.
  {
    ...pendingOrder('ORD-1109', 'HUB-HCM-02', 'HUB-HCM-03', -420, 2.4, 'Prepared food parcel', 'Bao Nguyen', 'Food & Beverage'),
    status: 'Disposed',
    readyForPickupAt: isoFromNow(-300),
    expectedPickupAt: isoFromNow(-275),
    pickupDeadline: isoFromNow(-120),
    packageDisposition: 'Disposed',
    disposedAt: isoFromNow(-95),
    disposalConfirmedBy: 'Hub staff · HUB-HCM-03',
  },

  // CASE 10 — Active Mission with a replacement-drone history / serious technical incident.
  pendingOrder('ORD-1110', 'HUB-HCM-03', 'HUB-HCM-01', 25, 5.0, 'Network equipment', 'Tuan Lam', 'Standard parcel', 'Express'),

  // CASE 11 — Express order ready to create a Mission immediately.
  // Package is already at the Origin Hub, planningAt = createdAt, and no Mission exists yet.
  pendingOrder(
    'ORD-1113',
    'HUB-HCM-01',
    'HUB-HCM-02',
    35,
    2.7,
    'Urgent document package',
    'Phuong Nguyen',
    'Standard parcel',
    'Express',
    true,
  ),

  // CASE 12 — Scheduled order whose planning window is already open.
  // startInMinutes = 45 => planningAt is 15 minutes ago, so Operator can Create Mission now.
  pendingOrder(
    'ORD-1114',
    'HUB-HCM-02',
    'HUB-HCM-03',
    45,
    3.6,
    'Camera equipment',
    'Thanh Le',
    'Standard parcel',
    'Scheduled',
    true,
  ),

  // CASE 13 — Scheduled order with overdue planning to demonstrate priority handling.
  // startInMinutes = 20 => planningAt was 40 minutes ago.
  pendingOrder(
    'ORD-1115',
    'HUB-HCM-03',
    'HUB-HCM-01',
    20,
    4.3,
    'Retail parcel',
    'Gia Han',
    'Standard parcel',
    'Scheduled',
    true,
  ),

  // CASE 14 — Active Express delivery currently in progress.
  pendingOrder(
    'ORD-1116',
    'HUB-HCM-02',
    'HUB-HCM-01',
    22,
    3.1,
    'Priority medical parcel',
    'Nhi Tran',
    'Standard parcel',
    'Express',
    true,
  ),

  // CASE 15 — Active Scheduled delivery currently in progress.
  pendingOrder(
    'ORD-1117',
    'HUB-HCM-01',
    'HUB-HCM-03',
    13,
    4.6,
    'Electronics shipment',
    'Duc Nguyen',
    'Standard parcel',
    'Scheduled',
    true,
  ),

  // CASE 16 — Active Express delivery currently in progress.
  pendingOrder(
    'ORD-1118',
    'HUB-HCM-03',
    'HUB-HCM-02',
    18,
    5.4,
    'Retail restock package',
    'Lan Pham',
    'Standard parcel',
    'Express',
    true,
  ),

  // Prototype-ready Orders for the rest of the hub network. Each package is
  // already received and its planning window is open, so every hub can be
  // exercised from Ready for Planning -> Create Mission without extra setup.
  pendingOrder('ORD-1119', 'HUB-HCM-04', 'HUB-HCM-06', 42, 3.4, 'Design sample kit', 'Hoang Vu', 'Standard parcel', 'Express', true),
  pendingOrder('ORD-1120', 'HUB-HCM-05', 'HUB-HCM-07', 38, 4.2, 'Store supplies', 'Yen Nguyen', 'Standard parcel', 'Express', true),
  pendingOrder('ORD-1121', 'HUB-HCM-06', 'HUB-HCM-08', 50, 2.9, 'Legal documents', 'Son Pham', 'Standard parcel', 'Scheduled', true),
  pendingOrder('ORD-1122', 'HUB-HCM-07', 'HUB-HCM-04', 45, 5.1, 'Replacement components', 'Thao Le', 'Standard parcel', 'Scheduled', true),
  pendingOrder('ORD-1123', 'HUB-HCM-08', 'HUB-HCM-05', 32, 3.8, 'Medical test kit', 'Quynh Tran', 'Standard parcel', 'Express', true),

  // Closed examples for filters and audit-like detail pages.
  {
    ...pendingOrder('ORD-1111', 'HUB-HCM-03', 'HUB-HCM-01', -360, 3.5, 'Consumer parcel', 'Vy Tran'),
    status: 'Completed',
    packageDisposition: 'Delivered',
  },
  {
    ...pendingOrder('ORD-1112', 'HUB-HCM-02', 'HUB-HCM-01', -420, 2.1, 'Document parcel', 'Quang Pham'),
    status: 'Cancelled',
  },
];
