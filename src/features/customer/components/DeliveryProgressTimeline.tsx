import { Check, Clock3 } from "lucide-react";

import type { CustomerOrderSummary } from "../services/customerDeliveryService";

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

/** Only infer earlier milestones from a confirmed later backend status.

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

/** Only read recognizable events from the backend tracking response. */

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

/** Display only a compact local date/time; never treat a forecast as an event. */
function compactMilestoneTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  // Timezone-free backend strings are ambiguous: show the supplied wall time,
  // rather than silently assuming UTC or converting it twice.
  const date = new Date(withOffset ? trimmed : `${trimmed}Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    hourCycle: "h23", timeZone: withOffset ? "Asia/Ho_Chi_Minh" : "UTC",
  }).format(date).replace(", ", " · ");
}

function getMilestoneTime(
  key: MilestoneKey,
  order: CustomerOrderSummary,
  confirmed: boolean,
  events: Map<string, TrackingEvent>,
): { value: string; estimated: boolean } | null {
  const actualFromOrder: Partial<Record<MilestoneKey, string | null>> = {
    created: order.createdAt,
    paid: order.paidAt,
    origin_received: order.originReceivedAt,
    scheduled: order.scheduledAt,
    departed: order.departedAt,
    destination_arrived: order.destinationReceivedAt,
    collected: order.collectedAt,
  };
  if (confirmed) {
    const actual = events.get(key)?.occurredAt ?? actualFromOrder[key];
    const formatted = compactMilestoneTime(actual);
    return formatted ? { value: formatted, estimated: false } : null;
  }
  // Only these two future milestones correspond to known backend forecasts.
  const forecast = key === "departed" ? order.estimatedDepartureAt
    : key === "destination_arrived" ? order.estimatedArrivalAt : null;
  const formatted = compactMilestoneTime(forecast);
  return formatted ? { value: formatted, estimated: true } : null;
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
                    {time.estimated ? "Est. " : ""}{time.value}
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
