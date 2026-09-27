import type { DeliveryMode, Order, OrderStatus } from '../types/operator';
import { calculatePlanningAt } from '../utils/deliveryPlanning';

const isoFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();
const dateOnly = (iso: string) => iso.slice(0, 10);

function makeOrder(
  id: string,
  originHubId: string,
  destinationHubId: string,
  startInMinutes: number,
  payloadKg: number,
  packageLabel: string,
  customerName: string,
  packageType = 'Standard parcel',
  deliveryMode: DeliveryMode = 'Scheduled',
  packageReceived = false,
  status: OrderStatus = 'Pending',
): Order {
  const start = isoFromNow(startInMinutes);
  const end = isoFromNow(startInMinutes + 30);
  const createdAt = deliveryMode === 'Express' ? isoFromNow(-5) : isoFromNow(-45);
  const planningAt = calculatePlanningAt(deliveryMode, start, createdAt);
  const delivered = status === 'Delivered to Hub';

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
    status,
    originHubReceivedAt: packageReceived || status === 'In Delivery' || delivered ? isoFromNow(-20) : undefined,
    destinationHubReceivedAt: delivered ? isoFromNow(-10) : undefined,
    createdAt,
  };
}

export const defaultOrders: Order[] = [
  // Future Scheduled Order: visible to Operator immediately, but planning is not open yet.
  makeOrder('ORD-1101', 'HUB-HCM-01', 'HUB-HCM-03', 300, 2.2, 'Document parcel', 'Minh Nguyen'),

  // Express Order: planning is immediately available.
  makeOrder('ORD-1102', 'HUB-HCM-02', 'HUB-HCM-01', 50, 3.2, 'Medical supplies', 'Trang Le', 'Standard parcel', 'Express', true),

  // Scheduled Mission already exists; package has not reached Origin Hub yet.
  makeOrder('ORD-1103', 'HUB-HCM-02', 'HUB-HCM-03', 45, 4.1, 'Electronics parcel', 'Khoa Tran'),

  // Active delivery Missions.
  makeOrder('ORD-1104', 'HUB-HCM-01', 'HUB-HCM-02', 20, 4.8, 'Retail replenishment', 'Anh Pham', 'Standard parcel', 'Express', true, 'In Delivery'),

  // Delivery completed at Destination Hub. Operator scope ends here.
  makeOrder('ORD-1105', 'HUB-HCM-02', 'HUB-HCM-01', -60, 2.8, 'Consumer parcel', 'Linh Vo', 'Standard parcel', 'Scheduled', true, 'Delivered to Hub'),
  makeOrder('ORD-1106', 'HUB-HCM-01', 'HUB-HCM-03', -180, 1.9, 'Contract documents', 'Huy Bui', 'Standard parcel', 'Scheduled', true, 'Delivered to Hub'),
  makeOrder('ORD-1107', 'HUB-HCM-03', 'HUB-HCM-02', -180, 2.6, 'Fresh meal box', 'Mai Ho', 'Food & Beverage', 'Scheduled', true, 'Delivered to Hub'),
  makeOrder('ORD-1108', 'HUB-HCM-01', 'HUB-HCM-02', -260, 3.5, 'Cold beverage package', 'Nam Do', 'Food & Beverage', 'Scheduled', true, 'Delivered to Hub'),
  makeOrder('ORD-1109', 'HUB-HCM-02', 'HUB-HCM-03', -420, 2.4, 'Prepared food parcel', 'Bao Nguyen', 'Food & Beverage', 'Scheduled', true, 'Delivered to Hub'),

  makeOrder('ORD-1110', 'HUB-HCM-03', 'HUB-HCM-01', 25, 5.0, 'Network equipment', 'Tuan Lam', 'Standard parcel', 'Express', true, 'In Delivery'),
  makeOrder('ORD-1111', 'HUB-HCM-03', 'HUB-HCM-01', -360, 3.5, 'Consumer parcel', 'Vy Tran', 'Standard parcel', 'Scheduled', true, 'Delivered to Hub'),

  // Previous Mission was cancelled; the Order remains Pending and requires replanning.
  { ...makeOrder('ORD-1112', 'HUB-HCM-02', 'HUB-HCM-01', 180, 2.1, 'Document parcel', 'Quang Pham'), replanRequiredAt: isoFromNow(-15) },

  // Orders ready for a new Mission.
  makeOrder('ORD-1113', 'HUB-HCM-01', 'HUB-HCM-02', 35, 2.7, 'Urgent document package', 'Phuong Nguyen', 'Standard parcel', 'Express', true),
  makeOrder('ORD-1114', 'HUB-HCM-02', 'HUB-HCM-03', 45, 3.6, 'Camera equipment', 'Thanh Le', 'Standard parcel', 'Scheduled', true),
  // Demonstrates that a Mission can be assigned before physical package receipt.
  makeOrder('ORD-1115', 'HUB-HCM-03', 'HUB-HCM-01', 20, 4.3, 'Retail parcel', 'Gia Han', 'Standard parcel', 'Scheduled', false),

  makeOrder('ORD-1116', 'HUB-HCM-02', 'HUB-HCM-01', 22, 3.1, 'Priority medical parcel', 'Nhi Tran', 'Standard parcel', 'Express', true, 'In Delivery'),
  makeOrder('ORD-1117', 'HUB-HCM-01', 'HUB-HCM-03', 13, 4.6, 'Electronics shipment', 'Duc Nguyen', 'Standard parcel', 'Scheduled', true, 'In Delivery'),
  makeOrder('ORD-1118', 'HUB-HCM-03', 'HUB-HCM-02', 18, 5.4, 'Retail restock package', 'Lan Pham', 'Standard parcel', 'Express', true, 'In Delivery'),

  // Customer cancelled before Origin Hub received the package.
  makeOrder('ORD-1119', 'HUB-HCM-01', 'HUB-HCM-04', 240, 2.9, 'Personal parcel', 'My Nguyen', 'Standard parcel', 'Scheduled', false, 'Cancelled'),
];
