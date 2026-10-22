import { Check, Clock3 } from "lucide-react";

import type { CustomerOrderSummary } from "../services/customerDeliveryService";
import { formatDateTime } from "../services/customerDeliveryService";

export type TrackingEvent = {
  key: string;
  label: string;
  occurredAt: string | null;
};

type MilestoneKey =
  | "created"
  | "paid"
  | "origin_received"
  | "scheduled"
  | "departed"
  | "destination_arrived"
  | "collected";

const milestones: { key: MilestoneKey; label: string }[] = [
  { key: "created", label: "Order created" },
  { key: "paid", label: "Payment confirmed" },
  { key: "origin_received", label: "Package received at origin hub" },
  { key: "scheduled", label: "Flight scheduled" },
  { key: "departed", label: "Drone departed / In delivery" },
  { key: "destination_arrived", label: "Arrived at destination hub" },
  { key: "collected", label: "Package collected by recipient" },
];

function statusKey(raw: string | null | undefined): string {
  return (raw ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

const arrivalStatuses = new Set([
  "DELIVERED_TO_HUB", "AT_DESTINATION_HUB", "ARRIVED_AT_DESTINATION",
  "READY_FOR_PICKUP", "PICKUP_READY", "PICKED_UP", "COLLECTED",
  "RECEIVED_BY_RECIPIENT", "HANDED_OVER_TO_RECIPIENT", "COMPLETED_PICKUP",
]);
const collectedStatuses = new Set([
  "PICKED_UP", "COLLECTED", "RECEIVED_BY_RECIPIENT",
  "HANDED_OVER_TO_RECIPIENT", "COMPLETED_PICKUP", "PACKAGE_COLLECTED", "PACKAGE_PICKED_UP",
]);
const inFlightStatuses = new Set(["IN_DELIVERY", "IN_TRANSIT", "FLYING", "IN_FLIGHT"]);
const receivedStatuses = new Set(["AT_HUB", "PACKAGE_RECEIVED_AT_ORIGIN", "RECEIVED_AT_ORIGIN", "AT_ORIGIN_HUB"]);
const scheduledStatuses = new Set(["SCHEDULED", "MISSION_SCHEDULED", "ASSIGNED", "READY_FOR_DEPARTURE"]);

/** Only infer earlier milestones from a confirmed *later* backend status.
 * Arrival at the destination hub is NOT proof of recipient collection.
 */
export function getConfirmedMilestones(
  order: CustomerOrderSummary,
  events: TrackingEvent[] = [],
): Set<MilestoneKey> {
  const status = statusKey(order.orderStatus);
  const customerStatus = statusKey(order.customerStatus);
  const raw = [status, customerStatus];
  const has = (set: Set<string>) => raw.some((key) => set.has(key));
  const eventKeys = new Set(events.map((event) => event.key));

  const collected = has(collectedStatuses) || eventKeys.has("collected");
  const arrived = collected || has(arrivalStatuses) || eventKeys.has("destination_arrived");
  const departed = arrived || has(inFlightStatuses) || eventKeys.has("departed");
  const scheduled = departed || has(scheduledStatuses) || eventKeys.has("scheduled");
  const received = scheduled || has(receivedStatuses) ||
    ["PACKAGE_RECEIVED_AT_ORIGIN", "PREPARING_DELIVERY"].includes(customerStatus) ||
    eventKeys.has("origin_received");
  const paid = order.paymentStatus === "paid" || eventKeys.has("paid");

  const completed = new Set<MilestoneKey>(["created"]);
  if (paid) completed.add("paid");
  if (received) completed.add("origin_received");
  if (scheduled) completed.add("scheduled");
  if (departed) completed.add("departed");
  if (arrived) completed.add("destination_arrived");
  if (collected) completed.add("collected");
  return completed;
}

/** Parse only recognizable, explicit event fields from BE tracking response.
 * Unknown payloads are ignored instead of inventing timestamps or events.
 */
export function parseTrackingEvents(value: unknown): TrackingEvent[] {
  const record = (value && typeof value === "object" && !Array.isArray(value))
    ? value as Record<string, unknown> : null;
  const nested = record?.data && typeof record.data === "object" && !Array.isArray(record.data)
    ? record.data as Record<string, unknown> : null;
  const tracking = record?.tracking && typeof record.tracking === "object" && !Array.isArray(record.tracking)
    ? record.tracking as Record<string, unknown> : null;
  const candidates = [record, nested, tracking];
  const events = candidates.map((item) => item?.events ?? item?.timeline ?? item?.history ?? item?.tracking_history)
    .find(Array.isArray);
  if (!Array.isArray(events)) return [];

  const aliases: Record<string, MilestoneKey> = {
    ORDER_CREATED: "created", CREATED: "created",
    PAYMENT_CONFIRMED: "paid", PAYMENT_PAID: "paid", PAID: "paid",
    PACKAGE_RECEIVED_AT_ORIGIN: "origin_received", RECEIVED_AT_ORIGIN: "origin_received",
    ORIGIN_HUB_RECEIVED: "origin_received", AT_HUB: "origin_received",
    MISSION_SCHEDULED: "scheduled", SCHEDULED: "scheduled",
    FLIGHT_STARTED: "departed", DRONE_DEPARTED: "departed",
    IN_DELIVERY: "departed", IN_FLIGHT: "departed",
    DELIVERED_TO_HUB: "destination_arrived", ARRIVED_AT_DESTINATION: "destination_arrived",
    DESTINATION_HUB_ARRIVED: "destination_arrived", READY_FOR_PICKUP: "destination_arrived",
    PICKED_UP: "collected", COLLECTED: "collected",
    RECEIVED_BY_RECIPIENT: "collected", HANDED_OVER_TO_RECIPIENT: "collected",
    PACKAGE_COLLECTED: "collected", PACKAGE_PICKED_UP: "collected",
  };
  return events.flatMap((raw): TrackingEvent[] => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const item = raw as Record<string, unknown>;
    const type = [item.event_type, item.event, item.type, item.status, item.code]
      .find((candidate) => typeof candidate === "string");
    const key = aliases[statusKey(typeof type === "string" ? type : "")];
    if (!key) return [];
    const time = [item.occurred_at, item.timestamp, item.created_at, item.event_at]
      .find((candidate) => typeof candidate === "string" && !Number.isNaN(Date.parse(candidate)));
    const label = milestones.find((step) => step.key === key)?.label ?? key;
    return [{ key, label, occurredAt: typeof time === "string" ? time : null }];
  });
}

export function DeliveryProgressTimeline({
  order,
  events = [],
}: {
  order: CustomerOrderSummary;
  events?: TrackingEvent[];
}) {
  const done = getConfirmedMilestones(order, events);
  const byKey = new Map(events.map((event) => [event.key, event]));
  return (
    <section className="rounded-2xl border border-white/[0.10] bg-[#161217]/95 p-5 shadow-[0_12px_32px_rgba(0,0,0,0.22)] sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-500">Delivery progress</p>
      <h2 className="mt-2 text-[18px] font-semibold text-white">Track your order</h2>
      
      <div className="mt-6">
        {milestones.map((milestone, index) => {
          const complete = done.has(milestone.key);
          const time = milestone.key === "created"
            ? order.createdAt
            : byKey.get(milestone.key)?.occurredAt;
          return (
            <div key={milestone.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${complete
                  ? "border-orange-500 bg-orange-500 text-black"
                  : "border-white/[0.15] bg-[#161217] text-white/35"}`}>
                  {complete ? <Check size={13} /> : <Clock3 size={12} />}
                </div>
                {index < milestones.length - 1 && (
                  <div className={`h-12 w-px ${complete ? "bg-orange-500/40" : "bg-white/[0.09]"}`} />
                )}
              </div>
              <div className="min-w-0 pt-0.5">
                <p className={`text-[13px] ${complete ? "font-medium text-white/90" : "text-white/40"}`}>
                  {milestone.label}
                </p>
                {complete && time && (
                  <p className="mt-1 text-[11px] text-white/45">{formatDateTime(time)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
     
    </section>
  );
}
