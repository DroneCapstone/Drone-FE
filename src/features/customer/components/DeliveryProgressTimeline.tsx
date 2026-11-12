import { Check, Clock3 } from "lucide-react";

import type { CustomerOrderSummary } from "../services/customerDeliveryService";

export type TrackingEvent = {
  key: string;
  label: string;
  occurredAt: string | null;
  /** Explicit truth from tracking timeline; forecast events must never confirm a step. */
  completed?: boolean;
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

/** Only infer earlier milestones from a confirmed later backend status.

 * Arrival at the destination hub is NOT proof of recipient collection.

 */

/**
 * Use the BE tracking timeline as the source of truth when it supplies
 * `completed` flags. A future step with completed:false is NOT finished,
 * even if it has a label, a forecast, or the current date passes its ETA.
 */
export function getConfirmedMilestones(
  order: CustomerOrderSummary,
  events: TrackingEvent[] = [],
): Set<MilestoneKey> {
  const status = statusKey(order.orderStatus);
  const customerStatus = statusKey(order.customerStatus);
  const rawStatuses = [status, customerStatus];
  const has = (set: Set<string>) => rawStatuses.some((key) => set.has(key));
  const authoritative = events.some((event) => typeof event.completed === "boolean");
  const confirmedEvents = new Set(
    events.filter((event) => event.completed !== false && !event.key.startsWith("forecast_")).map((event) => event.key),
  );

  const collected = confirmedEvents.has("collected") || has(collectedStatuses);
  const arrived = collected || confirmedEvents.has("destination_arrived") ||
    (!authoritative && has(arrivalStatuses));
  const departed = arrived || confirmedEvents.has("departed") ||
    (!authoritative && has(inFlightStatuses));
  const scheduled = departed || confirmedEvents.has("scheduled") ||
    (!authoritative && has(scheduledStatuses));
  const received = scheduled || confirmedEvents.has("origin_received") ||
    (!authoritative && (has(receivedStatuses) || customerStatus === "PREPARING_DELIVERY"));
  const paid = confirmedEvents.has("paid") ||
    (!authoritative && order.paymentStatus === "paid");

  // The order exists, so its creation is known even when tracking is offline.
  const completed = new Set<MilestoneKey>(["created"]);
  if (paid) completed.add("paid");
  if (received) completed.add("origin_received");
  if (scheduled) completed.add("scheduled");
  if (departed) completed.add("departed");
  if (arrived) completed.add("destination_arrived");
  if (collected) completed.add("collected");
  return completed;
}

/**
 * Parse current GET /customer/orders/{id}/tracking format:
 * timeline[].step_key, completed, timestamp; and the top-level ETA fields.
 * The existing Detail page already passes this result to this function.
 */
export function parseTrackingEvents(value: unknown): TrackingEvent[] {
  const asRecord = (input: unknown): Record<string, unknown> | null =>
    input && typeof input === "object" && !Array.isArray(input)
      ? input as Record<string, unknown> : null;
  const root = asRecord(value);
  const candidates = [root, asRecord(root?.data), asRecord(root?.tracking)];
  const payload = candidates.find((item) => item && (
    Array.isArray(item.timeline) || Array.isArray(item.events) ||
    typeof item.order_created_at === "string" || typeof item.eta === "string"
  )) ?? root;
  if (!payload) return [];

  const aliases: Record<string, MilestoneKey> = {
    ORDER_CREATED: "created", CREATED: "created",
    PAYMENT_CONFIRMED: "paid", PAYMENT_PAID: "paid", PAID: "paid",
    PACKAGE_RECEIVED: "origin_received", PACKAGE_RECEIVED_AT_ORIGIN: "origin_received",
    RECEIVED_AT_ORIGIN: "origin_received", ORIGIN_HUB_RECEIVED: "origin_received",
    AT_HUB: "origin_received",
    MISSION_SCHEDULED: "scheduled", FLIGHT_SCHEDULED: "scheduled", SCHEDULED: "scheduled",
    FLIGHT_STARTED: "departed", DRONE_DEPARTED: "departed", IN_DELIVERY: "departed",
    IN_FLIGHT: "departed", IN_TRANSIT: "departed",
    ARRIVED_AT_HUB: "destination_arrived", ARRIVED_AT_DESTINATION: "destination_arrived",
    DESTINATION_HUB_ARRIVED: "destination_arrived", DELIVERED_TO_HUB: "destination_arrived",
    AT_DESTINATION_HUB: "destination_arrived", READY_FOR_PICKUP: "destination_arrived",
    // BE 'DELIVERED' means delivered AT HUB (ready for pickup), not recipient collection.
    DELIVERED: "destination_arrived",
    PICKED_UP: "collected", COLLECTED: "collected", RECIPIENT_PICKUP: "collected",
    RECIPIENT_COLLECTED: "collected", PACKAGE_COLLECTED: "collected",
    PACKAGE_PICKED_UP: "collected", RECEIVED_BY_RECIPIENT: "collected",
    HANDED_OVER_TO_RECIPIENT: "collected",
  };
  const timelineCandidates = [payload.timeline, payload.events, payload.history, payload.tracking_history];
  const list = timelineCandidates.find(Array.isArray) as unknown[] | undefined;
  const events: TrackingEvent[] = [];

  for (const raw of list ?? []) {
    const item = asRecord(raw);
    if (!item) continue;
    const type = [item.step_key, item.event_type, item.event, item.type, item.status, item.code]
      .find((candidate) => typeof candidate === "string");
    const key = aliases[statusKey(typeof type === "string" ? type : "")];
    if (!key) continue;
    const completed = typeof item.completed === "boolean" ? item.completed : undefined;
    const time = [item.timestamp, item.occurred_at, item.created_at, item.event_at]
      .find((candidate) => typeof candidate === "string" && validTimestamp(candidate));
    // No timestamp for an unfinished step, even if the server sends a future date.
    const occurredAt = completed === false ? null : typeof time === "string" ? time : null;
    const label = milestones.find((step) => step.key === key)?.label ?? key;
    const existing = events.find((event) => event.key === key);
    if (existing) {
      // The hub-delivered event may repeat ARRIVED_AT_HUB. Keep the actual
      // landing timestamp if present, rather than overwriting it.
      if (existing.completed !== true && completed === true) existing.completed = true;
      if (!existing.occurredAt && occurredAt) existing.occurredAt = occurredAt;
    } else {
      events.push({ key, label, occurredAt, completed });
    }
  }

  // Top-level actual timestamps as fallback for older/incomplete timeline arrays.
  // Do not overwrite an explicit completed:false step from the BE.
  const actualFields: Array<[MilestoneKey, string]> = [
    ["created", "order_created_at"], ["paid", "paid_at"],
    ["origin_received", "package_received_at"], ["departed", "departed_at"],
    ["destination_arrived", "arrived_at"],
  ];
  for (const [key, field] of actualFields) {
    const time = payload[field];
    if (typeof time !== "string" || !validTimestamp(time)) continue;
    const existing = events.find((event) => event.key === key);
    if (existing) {
      if (!existing.occurredAt && existing.completed !== false) existing.occurredAt = time;
    } else {
      events.push({ key, label: milestones.find((m) => m.key === key)?.label ?? key,
        occurredAt: time, completed: true });
    }
  }

  // `estimated_window_start` is an estimated window START, not an actual
  // takeoff timestamp. `eta` is the estimated destination arrival time.
  // These synthetic keys are never used to confirm a milestone.
  for (const [field, key] of [
    ["estimated_window_start", "forecast_departed"],
    ["eta", "forecast_destination_arrived"],
  ] as const) {
    const time = payload[field];
    if (typeof time === "string" && validTimestamp(time)) {
      events.push({ key, label: field, occurredAt: time, completed: false });
    }
  }

  return events;
}

/** Validate ISO timestamps with or without an offset. */
function validTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/i.test(value.trim()) &&
    !Number.isNaN(Date.parse(value));
}

/**
 * Tracking API sends time-zone-free local timestamps, e.g. 11:46:25.
 * Preserve that wall-clock value (11:46), do NOT add 7 hours.
 * Explicit Z / +offset timestamps are converted to Asia/Ho_Chi_Minh.
 */
function compactMilestoneTime(value: string | null | undefined): string | null {
  if (!value || !validTimestamp(value)) return null;
  const trimmed = value.trim();
  const offsetProvided = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  if (!offsetProvided) {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(trimmed);
    if (!match) return null;
    const [, year, month, day, hour, minute] = match;
    const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(month) - 1];
    return `${day} ${monthName} · ${hour}:${minute}`;
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    hourCycle: "h23", timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(trimmed)).replace(", ", " · ");
}

function getMilestoneTime(
  key: MilestoneKey,
  order: CustomerOrderSummary,
  confirmed: boolean,
  events: Map<string, TrackingEvent>,
): { value: string; estimated: boolean; windowStart?: boolean } | null {
  const actualFromOrder: Partial<Record<MilestoneKey, string | null>> = {
    created: order.createdAt, paid: order.paidAt, origin_received: order.originReceivedAt,
    scheduled: order.scheduledAt, departed: order.departedAt,
    destination_arrived: order.destinationReceivedAt, collected: order.collectedAt,
  };
  if (confirmed) {
    // Use the Tracking timestamp before any Order Detail timestamp.
    const actual = events.get(key)?.occurredAt ?? actualFromOrder[key];
    const formatted = compactMilestoneTime(actual);
    return formatted ? { value: formatted, estimated: false } : null;
  }

  // Do not show future forecasts as confirmed events. Forecasts from the
  // tracking endpoint are preferred to potentially stale order-detail ETAs.
  const trackingForecast = key === "departed"
    ? events.get("forecast_departed")?.occurredAt
    : key === "destination_arrived"
      ? events.get("forecast_destination_arrived")?.occurredAt : null;
  const fallbackForecast = key === "departed" ? order.estimatedDepartureAt
    : key === "destination_arrived" ? order.estimatedArrivalAt : null;
  const formatted = compactMilestoneTime(trackingForecast ?? fallbackForecast);
  return formatted ? { value: formatted, estimated: true, windowStart: key === "departed" && Boolean(trackingForecast) } : null;
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

  // The glowing dot is always the LAST milestone confirmed by BE.

  // It never advances just because time passes or because an animation loops.

  const currentIndex = milestones.reduce(

    (last, step, index) => (done.has(step.key) ? index : last),

    0,

  );

  const orderFinished = done.has("collected");

  return (

    <section

      aria-label="Delivery progress"

      className="rounded-2xl border border-white/[0.10] bg-[#161217]/95 p-5 shadow-[0_12px_32px_rgba(0,0,0,0.22)] sm:p-6"

    >

      {/* All animation rules are scoped to this component; no extra CSS file needed. */}

      <style>{`

        @keyframes droneoptai-progress-ring {

          0% { transform: scale(.80); opacity: .70; }

          75%, 100% { transform: scale(1.75); opacity: 0; }

        }

        @keyframes droneoptai-progress-flow {

          0% { transform: translateY(-110%); opacity: 0; }

          20% { opacity: .90; }

          75% { opacity: .90; }

          100% { transform: translateY(260%); opacity: 0; }

        }

        @keyframes droneoptai-progress-reveal {

          from { transform: scaleY(0); }

          to { transform: scaleY(1); }

        }

        .droneoptai-progress-ring {

          animation: droneoptai-progress-ring 2.4s ease-out infinite;

        }

        .droneoptai-progress-flow {

          animation: droneoptai-progress-flow 2s linear infinite;

        }

        .droneoptai-progress-reveal {

          transform-origin: top center;

          animation: droneoptai-progress-reveal .65s ease-out both;

        }

        @media (prefers-reduced-motion: reduce) {

          .droneoptai-progress-ring,

          .droneoptai-progress-flow,

          .droneoptai-progress-reveal { animation: none !important; }

          .droneoptai-progress-reveal { transform: none !important; }

        }

      `}</style>

      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-500">

        Delivery progress

      </p>

      <h2 className="mt-2 text-[18px] font-semibold text-white">Track your order</h2>

      <ol className="mt-6" aria-label="Order tracking milestones">

        {milestones.map((milestone, index) => {

          const complete = done.has(milestone.key);

          const current = complete && index === currentIndex;

          const next = milestones[index + 1];

          // Highlight only a fully confirmed connection; the path to an

          // unconfirmed milestone remains dark, even while the light moves.

          const confirmedConnection = next ? complete && done.has(next.key) : false;

          const time = getMilestoneTime(milestone.key, order, complete, byKey);

          return (

            <li

              key={milestone.key}

              className="flex gap-4"

              aria-current={current && !orderFinished ? "step" : undefined}

            >

              <div className="flex w-6 shrink-0 flex-col items-center">

                <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center">

                  {current && (

                    <>

                      <span

                        aria-hidden="true"

                        className="pointer-events-none absolute -inset-[5px] rounded-full bg-orange-500/25 blur-[5px]"

                      />

                      {!orderFinished && (

                        <span

                          aria-hidden="true"

                          className="droneoptai-progress-ring pointer-events-none absolute -inset-[4px] rounded-full border border-orange-400/70"

                        />

                      )}

                    </>

                  )}

                  <span

                    className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border transition-colors duration-500 ${

                      current

                        ? "border-orange-300 bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.65)]"

                        : complete

                          ? "border-orange-500 bg-orange-500 text-black"

                          : "border-white/[0.16] bg-[#161217] text-white/35"

                    }`}

                  >

                    {complete ? <Check size={13} strokeWidth={2.5} /> : <Clock3 size={12} />}

                  </span>

                </div>

                {next && (

                  <div

                    aria-hidden="true"

                    className={`relative h-10 w-[2px] overflow-hidden ${

                      confirmedConnection ? "bg-orange-500/30" : "bg-white/[0.10]"

                    }`}

                  >

                    {confirmedConnection && (

                      <>

                        <span className="droneoptai-progress-reveal absolute inset-0 bg-gradient-to-b from-orange-500/70 via-orange-400 to-orange-500/70" />

                        {!orderFinished && (

                          <span

                            className="droneoptai-progress-flow pointer-events-none absolute left-0 top-0 h-[45%] w-full bg-gradient-to-b from-transparent via-amber-100 to-transparent shadow-[0_0_9px_rgba(251,146,60,0.95)]"

                            style={{ animationDelay: `${index * -0.28}s` }}

                          />

                        )}

                      </>

                    )}

                  </div>

                )}

              </div>

              <div className="min-w-0 flex-1 pt-0.5">

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">

                  <p

                    className={`text-[13px] leading-5 ${

                      current

                        ? "font-semibold text-white"

                        : complete

                          ? "font-medium text-white/90"

                          : "text-white/40"

                    }`}

                  >

                    {milestone.label}

                  </p>

                </div>

                {time && (
                  <p className={`mt-0.5 text-[11px] leading-4 ${time.estimated ? "text-orange-300/65" : "text-white/45"}`}>
                    {time.estimated ? (time.windowStart ? "Est. " : "Est. ") : ""}{time.value}
                  </p>
                )}

              </div>

            </li>

          );

        })}

      </ol>

    </section>

  );

}
