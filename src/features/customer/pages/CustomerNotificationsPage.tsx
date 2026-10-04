import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";

import {
  customerDeliveryService,
  formatDateTime,
} from "../services/customerDeliveryService";

type Delivery = ReturnType<
  typeof customerDeliveryService.getByCustomer
>[number];

type NotificationFilter = "all" | "unread" | "read";

type NotificationItem = {
  id: string;
  deliveryId: string;
  title: string;
  description: string;
  timestamp: string;
  to: string;
  priority: number;
};

/* =========================================================
   CUSTOMER NOTIFICATIONS
========================================================= */

export function CustomerNotificationsPage() {
  const { user } = useAuth();

  const deliveries = user
    ? customerDeliveryService.getByCustomer(user.id)
    : [];

  const notifications = useMemo(
    () => buildNotifications(deliveries),
    [deliveries],
  );

  const [filter, setFilter] =
    useState<NotificationFilter>("all");

  const [readIds, setReadIds] = useState<Set<string>>(
    () => new Set(),
  );

  const storageKey = `droneoptai-customer-notifications-read:${
    user?.id ?? "guest"
  }`;

  /* =======================================================
     LOAD READ STATE
  ======================================================== */

  useEffect(() => {
    if (!user) {
      setReadIds(new Set());
      return;
    }

    try {
      const stored =
        window.localStorage.getItem(storageKey);

      if (!stored) {
        setReadIds(new Set());
        return;
      }

      const parsed = JSON.parse(stored);

      if (!Array.isArray(parsed)) {
        setReadIds(new Set());
        return;
      }

      setReadIds(
        new Set(
          parsed.filter(
            (value): value is string =>
              typeof value === "string",
          ),
        ),
      );
    } catch {
      setReadIds(new Set());
    }
  }, [storageKey, user]);

  /* =======================================================
     COUNTS
  ======================================================== */

  const unreadCount = notifications.filter(
    (item) => !readIds.has(item.id),
  ).length;

  const readCount =
    notifications.length - unreadCount;

  const visibleNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter(
        (item) => !readIds.has(item.id),
      );
    }

    if (filter === "read") {
      return notifications.filter((item) =>
        readIds.has(item.id),
      );
    }

    return notifications;
  }, [filter, notifications, readIds]);

  /* =======================================================
     READ ACTIONS
  ======================================================== */

  function persistReadIds(next: Set<string>) {
    setReadIds(next);

    if (!user) {
      return;
    }

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(Array.from(next)),
      );
    } catch {
      // Keep the page usable if localStorage is unavailable.
    }
  }

  function markAsRead(id: string) {
    if (readIds.has(id)) {
      return;
    }

    const next = new Set(readIds);
    next.add(id);

    persistReadIds(next);
  }

  function markAllAsRead() {
    persistReadIds(
      new Set(
        notifications.map(
          (notification) => notification.id,
        ),
      ),
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 pb-16 pt-12 lg:px-10">
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <section>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[38px] font-semibold leading-none tracking-[-0.045em] text-white sm:text-[42px]">
              Notifications
            </h1>

          
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="w-fit text-[13px] font-medium text-white/[0.52] transition hover:text-orange-400"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* ===================================================
            FILTER TABS
        ==================================================== */}

        <div className="mt-11 flex items-center gap-10 border-b border-white/[0.08]">
          <FilterTab
            label="All"
            count={notifications.length}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />

          <FilterTab
            label="Unread"
            count={unreadCount}
            active={filter === "unread"}
            onClick={() => setFilter("unread")}
          />

          <FilterTab
            label="Read"
            count={readCount}
            active={filter === "read"}
            onClick={() => setFilter("read")}
          />
        </div>
      </section>

      {/* =====================================================
          NOTIFICATION PANEL
      ====================================================== */}

      <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.10] bg-[#161217] shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
        {visibleNotifications.length === 0 ? (
          <EmptyNotifications filter={filter} />
        ) : (
          <div>
            {visibleNotifications.map((item) => {
              const unread = !readIds.has(item.id);

              return (
                <NotificationRow
                  key={item.id}
                  item={item}
                  unread={unread}
                  onOpen={() => markAsRead(item.id)}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* =========================================================
   FILTER TAB
========================================================= */

function FilterTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-2 pb-4 text-[15px] font-semibold transition ${
        active
          ? "text-orange-400"
          : "text-white/[0.52] hover:text-white/[0.82]"
      }`}
    >
      <span>{label}</span>

      <span
        className={`text-[12px] ${
          active
            ? "text-orange-400"
            : "text-white/[0.28]"
        }`}
      >
        {count}
      </span>

      {active && (
        <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-orange-500" />
      )}
    </button>
  );
}

/* =========================================================
   NOTIFICATION ROW
========================================================= */

function NotificationRow({
  item,
  unread,
  onOpen,
}: {
  item: NotificationItem;
  unread: boolean;
  onOpen: () => void;
}) {
  return (
    <Link
      to={item.to}
      onClick={onOpen}
      className={`group relative block border-b border-white/[0.075] px-7 py-6 last:border-b-0 transition ${
        unread
          ? "bg-white/[0.018]"
          : "bg-transparent"
      } hover:bg-white/[0.028]`}
    >
      <div className="flex items-start gap-4">
        {/* Unread indicator only */}
        <div className="flex w-2 shrink-0 justify-center pt-[9px]">
          {unread ? (
            <span className="h-2 w-2 rounded-full bg-orange-500" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-white/[0.12]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <p
                className={`text-[17px] leading-6 ${
                  unread
                    ? "font-semibold text-white"
                    : "font-medium text-white/[0.72]"
                }`}
              >
                {item.title}
              </p>

              <p
                className={`mt-2 max-w-[820px] text-[14px] leading-6 ${
                  unread
                    ? "text-white/[0.52]"
                    : "text-white/[0.36]"
                }`}
              >
                {item.description}
              </p>
            </div>

            <p className="shrink-0 text-[12px] leading-6 text-white/[0.30]">
              {formatDateTime(item.timestamp)}
            </p>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <span className="text-[12px] font-medium text-white/[0.30]">
              {item.deliveryId}
            </span>

            <span className="text-white/[0.16]">
              ·
            </span>

            <span className="text-[12px] font-medium text-white/[0.42] transition group-hover:text-orange-400">
              View details →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyNotifications({
  filter,
}: {
  filter: NotificationFilter;
}) {
  const title =
    filter === "unread"
      ? "No unread notifications"
      : filter === "read"
        ? "No read notifications"
        : "No notifications";

  const description =
    filter === "all"
      ? "Order updates and delivery notifications will appear here."
      : "There are no notifications in this category.";

  return (
    <div className="flex min-h-[300px] items-center justify-center px-6 py-16 text-center">
      <div>
        <p className="text-[17px] font-semibold text-white/[0.82]">
          {title}
        </p>

        <p className="mt-2 text-[14px] leading-6 text-white/[0.34]">
          {description}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   NOTIFICATION DATA
========================================================= */

function buildNotifications(
  deliveries: Delivery[],
): NotificationItem[] {
  return deliveries
    .flatMap((delivery) => {
      const notifications: NotificationItem[] = [];

      const detailTo = `/customer/deliveries/${delivery.id}`;

      /* -----------------------------------------------------
         ORDER CREATED
      ----------------------------------------------------- */

      notifications.push({
        id: `${delivery.id}-created`,
        deliveryId: delivery.id,
        title: "Delivery order created",
        description: `${delivery.id} has been created successfully. You can follow its status from your delivery details.`,
        timestamp: getEventTimestamp(
          delivery,
          "createdAt",
        ),
        to: detailTo,
        priority: 10,
      });

      /* -----------------------------------------------------
         PAYMENT
      ----------------------------------------------------- */

      if (delivery.paymentStatus === "paid") {
        notifications.push({
          id: `${delivery.id}-payment-success`,
          deliveryId: delivery.id,
          title: "Payment successful",
          description: `Payment for ${delivery.id} has been confirmed successfully.`,
          timestamp: getEventTimestamp(
            delivery,
            "paymentConfirmedAt",
            "paidAt",
            "paymentPaidAt",
            "updatedAt",
            "createdAt",
          ),
          to: detailTo,
          priority: 60,
        });
      }

      if (delivery.paymentStatus === "pending") {
        notifications.push({
          id: `${delivery.id}-payment-pending`,
          deliveryId: delivery.id,
          title: "Payment required",
          description: `Complete payment for ${delivery.id} to continue processing your delivery.`,
          timestamp: getEventTimestamp(
            delivery,
            "updatedAt",
            "createdAt",
          ),
          to: `/customer/payment/${delivery.id}`,
          priority: 85,
        });
      }

      /* -----------------------------------------------------
         PACKAGE HANDOVER
      ----------------------------------------------------- */

      if (
        delivery.paymentStatus === "paid" &&
        !delivery.packageReceivedAtHub
      ) {
        notifications.push({
          id: `${delivery.id}-handover-required`,
          deliveryId: delivery.id,
          title: "Bring your package to the origin hub",
          description: `Please hand over your package at ${delivery.originHub.name} before ${formatDateTime(
            delivery.handoverDeadlineAt,
          )}.`,
          timestamp: getEventTimestamp(
            delivery,
            "updatedAt",
            "createdAt",
          ),
          to: detailTo,
          priority: 90,
        });
      }

      if (delivery.packageReceivedAtHub) {
        notifications.push({
          id: `${delivery.id}-origin-received`,
          deliveryId: delivery.id,
          title: "Package received at origin hub",
          description: `${delivery.originHub.name} has received the package for ${delivery.id}.`,
          timestamp: getEventTimestamp(
            delivery,
            "packageReceivedAtHubAt",
            "originHubReceivedAt",
            "updatedAt",
            "createdAt",
          ),
          to: detailTo,
          priority: 65,
        });
      }

      /* -----------------------------------------------------
         ORDER STATUS
      ----------------------------------------------------- */

      if (
        delivery.orderStatus === "accepted" ||
        delivery.orderStatus === "in_delivery" ||
        delivery.orderStatus === "completed"
      ) {
        notifications.push({
          id: `${delivery.id}-accepted`,
          deliveryId: delivery.id,
          title: "Delivery order accepted",
          description: `${delivery.id} has been accepted and is being prepared for delivery.`,
          timestamp: getEventTimestamp(
            delivery,
            "acceptedAt",
            "updatedAt",
            "createdAt",
          ),
          to: detailTo,
          priority: 50,
        });
      }

      if (
        delivery.orderStatus === "in_delivery" ||
        delivery.orderStatus === "completed"
      ) {
        notifications.push({
          id: `${delivery.id}-in-delivery`,
          deliveryId: delivery.id,
          title: "Delivery in progress",
          description: `${delivery.id} is on the way from ${delivery.originHub.name} to ${delivery.destinationHub.name}. Estimated arrival: ${formatDateTime(
            delivery.estimatedArrivalAt,
          )}.`,
          timestamp: getEventTimestamp(
            delivery,
            "inDeliveryAt",
            "startedAt",
            "updatedAt",
            "createdAt",
          ),
          to: detailTo,
          priority: 75,
        });
      }

      if (delivery.orderStatus === "completed") {
        notifications.push({
          id: `${delivery.id}-completed`,
          deliveryId: delivery.id,
          title: "Package arrived at destination hub",
          description: `${delivery.id} has arrived at ${delivery.destinationHub.name}.`,
          timestamp: getEventTimestamp(
            delivery,
            "completedAt",
            "destinationHubReceivedAt",
            "updatedAt",
            "createdAt",
          ),
          to: detailTo,
          priority: 100,
        });
      }

      if (delivery.orderStatus === "rejected") {
        notifications.push({
          id: `${delivery.id}-rejected`,
          deliveryId: delivery.id,
          title: "Delivery order rejected",
          description: `${delivery.id} could not be accepted. Open the delivery details to review the latest information.`,
          timestamp: getEventTimestamp(
            delivery,
            "rejectedAt",
            "updatedAt",
            "createdAt",
          ),
          to: detailTo,
          priority: 100,
        });
      }

      if (delivery.orderStatus === "cancelled") {
        notifications.push({
          id: `${delivery.id}-cancelled`,
          deliveryId: delivery.id,
          title: "Delivery cancelled",
          description: `${delivery.id} has been cancelled.`,
          timestamp: getEventTimestamp(
            delivery,
            "cancelledAt",
            "updatedAt",
            "createdAt",
          ),
          to: detailTo,
          priority: 100,
        });
      }

      return notifications;
    })
    .sort((a, b) => {
      const timeDifference =
        toTimestamp(b.timestamp) -
        toTimestamp(a.timestamp);

      if (timeDifference !== 0) {
        return timeDifference;
      }

      return b.priority - a.priority;
    });
}

/* =========================================================
   TIMESTAMP HELPERS

   Uses backend event timestamps when they exist, while still
   working with the current customer delivery mock/service.
========================================================= */

function getEventTimestamp(
  delivery: Delivery,
  ...keys: string[]
) {
  const record =
    delivery as unknown as Record<
      string,
      unknown
    >;

  for (const key of keys) {
    const value = record[key];

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value;
    }
  }

  return delivery.createdAt;
}

function toTimestamp(value: string) {
  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}
