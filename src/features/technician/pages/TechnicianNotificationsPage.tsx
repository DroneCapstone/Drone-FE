import {
  BatteryLow,
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  Clock3,
  Plane,
} from "lucide-react";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/shadcn/ui/button";
import {
  Card,
  CardContent,
} from "@/components/shadcn/ui/card";

import { TechnicianPageShell } from "../components/TechnicianPageShell";
import {
  loadFleet,
  saveFleet,
  TECHNICIAN_HUB,
} from "../utils/fleetStorage";

type NotificationType =
  | "incoming"
  | "battery"
  | "work_order"
  | "overdue";

type NotificationFilter =
  | "all"
  | "unread"
  | "read";

type TechnicianNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  timestamp: string;
  unread: boolean;
  droneId?: string;
  workOrderId?: string;
  arrivalConfirmed?: boolean;
};

/*
 * v3 separates Notifications from Maintenance Alerts.
 *
 * Notifications now represent events that require attention:
 * - incoming drone
 * - low battery threshold event
 * - work order assigned to technician
 * - overdue work order
 *
 * Maintenance alerts remain in the Maintenance module.
 */
const NOTIFICATION_STORAGE_KEY =
  "droneoptai.technician.notifications.v3";

const defaultNotifications: TechnicianNotification[] = [
  {
    id: "NOT-001",
    type: "incoming",
    title: "CX-12 is heading to your hub",
    message:
      "CX-12 is heading to Hub HCM-02. Confirm its arrival in the system once the drone physically reaches your hub.",
    time: "12 min ago",
    timestamp: "20 Sep 2026 · 10:48",
    unread: true,
    droneId: "DR-002",
    arrivalConfirmed: false,
  },
  {
    id: "NOT-002",
    type: "battery",
    title: "AX-04 battery dropped below 40%",
    message:
      "AX-04 has crossed the low-battery threshold. Check the drone before its next mission and replace the battery if required.",
    time: "1 h ago",
    timestamp: "20 Sep 2026 · 10:00",
    unread: true,
    droneId: "DR-003",
  },

  {
    id: "NOT-004",
    type: "overdue",
    title: "WO-1054 is past its scheduled time",
    message:
      "The scheduled maintenance time for CX-09 has passed and the work order is not completed yet.",
    time: "3 h ago",
    timestamp: "20 Sep 2026 · 08:00",
    unread: false,
    droneId: "DR-001",
    workOrderId: "WO-1054",
  },
]

function loadNotifications(): TechnicianNotification[] {
  try {
    const stored = localStorage.getItem(
      NOTIFICATION_STORAGE_KEY,
    );

    if (!stored) {
      return defaultNotifications;
    }

    const parsed = JSON.parse(
      stored,
    ) as TechnicianNotification[];

    return Array.isArray(parsed)
      ? parsed
      : defaultNotifications;
  } catch {
    return defaultNotifications;
  }
}

export function TechnicianNotificationsPage() {
  const navigate = useNavigate();

  const [notifications, setNotifications] =
    useState<TechnicianNotification[]>(
      loadNotifications,
    );

  const [filter, setFilter] =
    useState<NotificationFilter>("all");

  const [arrivalConfirmTarget, setArrivalConfirmTarget] =
    useState<TechnicianNotification | null>(null);

  const unreadCount = notifications.filter(
    (item) => item.unread,
  ).length;

  const readCount =
    notifications.length - unreadCount;

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter(
        (item) => item.unread,
      );
    }

    if (filter === "read") {
      return notifications.filter(
        (item) => !item.unread,
      );
    }

    return notifications;
  }, [filter, notifications]);

  const saveNotifications = (
    next: TechnicianNotification[],
  ) => {
    setNotifications(next);

    localStorage.setItem(
      NOTIFICATION_STORAGE_KEY,
      JSON.stringify(next),
    );
  };

  const markAsRead = (
    notificationId: string,
  ) => {
    const next = notifications.map(
      (notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              unread: false,
            }
          : notification,
    );

    saveNotifications(next);
  };

  const markAllAsRead = () => {
    const next = notifications.map(
      (notification) => ({
        ...notification,
        unread: false,
      }),
    );

    saveNotifications(next);
  };

  const handleViewDetail = (
    notification: TechnicianNotification,
  ) => {
    if (notification.unread) {
      markAsRead(notification.id);
    }

    if (
      (notification.type === "work_order" ||
        notification.type === "overdue") &&
      notification.workOrderId
    ) {
      navigate(
        `/technician/maintenance/work-orders/${notification.workOrderId}`,
      );

      return;
    }

    if (notification.droneId) {
      navigate(
        `/technician/fleet/${notification.droneId}`,
      );
    }
  };

  const handleConfirmArrival = (
    notification: TechnicianNotification,
  ) => {
    if (!notification.droneId) {
      return;
    }

    setArrivalConfirmTarget(notification);
  };

  const confirmArrival = () => {
    if (
      !arrivalConfirmTarget ||
      !arrivalConfirmTarget.droneId
    ) {
      return;
    }

    const fleet = loadFleet();

    const drone = fleet.find(
      (item) =>
        item.id === arrivalConfirmTarget.droneId,
    );

    if (!drone) {
      setArrivalConfirmTarget(null);
      return;
    }

    const nextFleet = fleet.map((item) =>
      item.id === arrivalConfirmTarget.droneId
        ? {
            ...item,
            location: TECHNICIAN_HUB,
          }
        : item,
    );

    saveFleet(nextFleet);

    const nextNotifications = notifications.map(
      (item) =>
        item.id === arrivalConfirmTarget.id
          ? {
              ...item,
              title: `${drone.name} arrived at your hub`,
              message: `Arrival confirmed at ${TECHNICIAN_HUB}. ${drone.name} is now listed as an at-hub drone in your fleet.`,
              unread: false,
              arrivalConfirmed: true,
            }
          : item,
    );

    saveNotifications(nextNotifications);
    setArrivalConfirmTarget(null);
  };

  const getIcon = (
    type: NotificationType,
  ) => {
    switch (type) {
      case "incoming":
        return Plane;
      case "battery":
        return BatteryLow;
      case "work_order":
        return ClipboardList;
      case "overdue":
        return Clock3;
      default:
        return Bell;
    }
  };

  const getTypeLabel = (
    type: NotificationType,
    arrivalConfirmed?: boolean,
  ) => {
    if (
      type === "incoming" &&
      arrivalConfirmed
    ) {
      return "Arrived";
    }

    switch (type) {
      case "incoming":
        return "Incoming";
      case "battery":
        return "Battery";
      case "work_order":
        return "Work order";
      case "overdue":
        return "Overdue";
    }
  };

  const getTypeStyle = (
    type: NotificationType,
    arrivalConfirmed?: boolean,
  ) => {
    if (
      type === "incoming" &&
      arrivalConfirmed
    ) {
      return "border-emerald-900/60 bg-emerald-500/10 text-emerald-500";
    }

    switch (type) {
      case "incoming":
        return "border-orange-900/60 bg-orange-500/10 text-orange-500";
      case "battery":
        return "border-red-900/60 bg-red-500/10 text-red-500";
      case "work_order":
        return "border-blue-500/30 bg-blue-500/10 text-blue-500";
      case "overdue":
        return "border-red-500/30 bg-red-500/10 text-red-500";
    }
  };

  const getIconColor = (
    type: NotificationType,
    arrivalConfirmed?: boolean,
  ) => {
    if (
      type === "incoming" &&
      arrivalConfirmed
    ) {
      return "text-emerald-500";
    }

    switch (type) {
      case "incoming":
        return "text-orange-500";
      case "battery":
        return "text-red-500";
      case "work_order":
        return "text-blue-500";
      case "overdue":
        return "text-red-500";
    }
  };

  return (
    <TechnicianPageShell
      title="Notifications"
      description=""
    >
      {/* Filters */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FilterButton
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="All"
            count={notifications.length}
          />

          <FilterButton
            active={filter === "unread"}
            onClick={() =>
              setFilter("unread")
            }
            label="Unread"
            count={unreadCount}
          />

          <FilterButton
            active={filter === "read"}
            onClick={() => setFilter("read")}
            label="Read"
            count={readCount}
          />
        </div>

        {unreadCount > 0 && (
          <Button
            type="button"
            onClick={markAllAsRead}
            className="h-9 rounded-md border border-[var(--tech-border)] bg-transparent px-3 text-[12px] font-medium text-[var(--tech-text-secondary)] hover:bg-[var(--tech-surface-2)]"
          >
            <CheckCheck size={15} />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notification list */}
      <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
        <CardContent className="p-0">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map(
              (notification, index) => {
                const NotificationIcon =
                  getIcon(notification.type);

                const isPendingArrival =
                  notification.type ===
                    "incoming" &&
                  !notification.arrivalConfirmed;

                return (
                  <div
                    key={notification.id}
                    className={`
                      flex w-full items-start gap-4
                      px-5 py-5 text-left
                      transition-colors
                      hover:bg-[var(--tech-surface-2)]
                      ${
                        notification.unread
                          ? "bg-orange-500/[0.035]"
                          : ""
                      }
                      ${
                        index !==
                        filteredNotifications.length -
                          1
                          ? "border-b border-[var(--tech-border)]"
                          : ""
                      }
                    `}
                  >
                    {/* Icon */}
                    <div
                      className={`
                        mt-0.5 flex h-9 w-9 shrink-0
                        items-center justify-center
                        rounded-md border
                        border-[var(--tech-border)]
                        bg-[var(--tech-surface-2)]
                        ${getIconColor(
                          notification.type,
                          notification.arrivalConfirmed,
                        )}
                      `}
                    >
                      <NotificationIcon
                        size={16}
                      />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={`text-[14px] font-semibold ${
                            notification.unread
                              ? "text-[var(--tech-text)]"
                              : "text-[var(--tech-text-secondary)]"
                          }`}
                        >
                          {notification.title}
                        </p>

                        <span
                          className={`
                            rounded border px-2 py-0.5
                            text-[10px] font-semibold uppercase
                            tracking-[0.05em]
                            ${getTypeStyle(
                              notification.type,
                              notification.arrivalConfirmed,
                            )}
                          `}
                        >
                          {getTypeLabel(
                            notification.type,
                            notification.arrivalConfirmed,
                          )}
                        </span>

                        {notification.unread && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-orange-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                            Unread
                          </span>
                        )}
                      </div>

                      <p className="mt-2 max-w-[900px] text-[12px] leading-[1.6] text-[var(--tech-muted)]">
                        {notification.message}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <span className="text-[11px] text-[var(--tech-subtle)]">
                          {notification.time}
                        </span>

                        <span className="h-1 w-1 rounded-full bg-[var(--tech-border)]" />

                        <span className="text-[11px] text-[var(--tech-subtle)]">
                          {notification.timestamp}
                        </span>

                        {!notification.unread && (
                          <>
                            <span className="h-1 w-1 rounded-full bg-[var(--tech-border)]" />

                            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--tech-muted)]">
                              <Check size={11} />
                              Read
                            </span>
                          </>
                        )}
                      </div>

                      {/* Arrival confirmation */}
                      {isPendingArrival && (
                        <div className="mt-4 flex items-center gap-2">
                          <Button
                            type="button"
                            onClick={() =>
                              handleConfirmArrival(
                                notification,
                              )
                            }
                            className="h-8 rounded-md bg-orange-500 px-3 text-[12px] font-medium text-black hover:bg-orange-600"
                          >
                            <Check size={14} />
                            Confirm arrival
                          </Button>

                          <span className="text-[11px] text-[var(--tech-subtle)]">
                            Confirm only after the
                            drone physically reaches
                            your hub.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* View detail */}
                    {(notification.droneId ||
                      notification.workOrderId) && (
                      <button
                        type="button"
                        title={
                          notification.workOrderId
                            ? "View work order"
                            : "View drone details"
                        }
                        aria-label={
                          notification.workOrderId
                            ? "View work order"
                            : "View drone details"
                        }
                        onClick={() =>
                          handleViewDetail(
                            notification,
                          )
                        }
                        className="group mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--tech-subtle)] transition-colors hover:text-orange-500"
                      >
                        <ChevronRight
                          size={16}
                        />
                      </button>
                    )}
                  </div>
                );
              },
            )
          ) : (
            <div className="flex min-h-[180px] flex-col items-center justify-center">
              <Bell
                size={22}
                className="text-[var(--tech-subtle)]"
              />

              <p className="mt-3 text-[13px] font-medium text-[var(--tech-text-secondary)]">
                No notifications
              </p>

              <p className="mt-1 text-[11px] text-[var(--tech-subtle)]">
                There are no notifications
                in this category.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
  {arrivalConfirmTarget && (
    <motion.div
      initial={{ x: 420, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 420, opacity: 0 }}
      transition={{
        duration: 0.22,
        ease: "easeOut",
      }}
      className="
        fixed bottom-6 right-6 z-[9999]
        w-[360px]
        overflow-hidden
        rounded-lg
        border border-[var(--tech-border)]
        bg-[var(--tech-surface)]
        p-4
        shadow-2xl
      "
    >
      {/* Animated orange gradient border */}
      <svg
        className="pointer-events-none absolute inset-0 z-20 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="arrival-confirm-border-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop
              offset="0%"
              stopColor="rgba(255,123,0,0)"
            />

            <stop
              offset="18%"
              stopColor="rgba(255,123,0,0.35)"
            />

            <stop
              offset="55%"
              stopColor="rgba(255,123,0,1)"
            />

            <stop
              offset="100%"
              stopColor="rgba(255,123,0,0)"
            />
          </linearGradient>
        </defs>

        <motion.rect
          x="0.8"
          y="0.8"
          width="98.4"
          height="98.4"
          rx="2.6"
          ry="2.6"
          fill="none"
          stroke="url(#arrival-confirm-border-gradient)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          initial={{
            pathLength: 0,
            pathOffset: 0,
            opacity: 0,
          }}
          animate={{
            pathLength: [0, 0.18, 0.18, 0],
            pathOffset: [0, 0, 0.82, 1],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 3,
            times: [0, 0.14, 0.82, 1],
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "loop",
          }}
        />
      </svg>

      {/* Content */}
      <div className="relative z-10 flex items-start gap-3">
        <div
          className="
            mt-0.5 flex h-8 w-8 shrink-0
            items-center justify-center
            rounded-md
            border border-orange-500/30
            bg-orange-500/10
            text-orange-500
          "
        >
          <Plane size={16} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[var(--tech-text)]">
            Confirm drone arrival
          </p>

          <p className="mt-1 text-[12px] leading-4 text-[var(--tech-muted)]">
            Confirm{" "}
            {arrivalConfirmTarget.title.split(" is ")[0]}{" "}
            has arrived at {TECHNICIAN_HUB}?
          </p>

          <p className="mt-1 text-[11px] text-[var(--tech-subtle)]">
            Only confirm after the drone has physically reached your hub.
          </p>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              onClick={() =>
                setArrivalConfirmTarget(null)
              }
              className="
                h-8 rounded-md
                border border-[var(--tech-border)]
                bg-transparent
                px-3
                text-[12px]
                text-[var(--tech-text-secondary)]
                hover:bg-[var(--tech-surface-2)]
              "
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={confirmArrival}
              className="
                h-8 rounded-md
                bg-orange-500
                px-4
                text-[12px]
                font-medium
                text-black
                hover:bg-orange-600
              "
            >
              OK
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>
    </TechnicianPageShell>
  );
}

function FilterButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group relative inline-flex items-center gap-2
        bg-transparent px-3 py-2
        text-[12px] font-medium
        transition-colors duration-150

        after:absolute
        after:left-0
        after:bottom-0
        after:h-[2px]
        after:w-full
        after:origin-left
        after:scale-x-0
        after:rounded-full
        after:bg-gradient-to-r
        after:from-orange-500
        after:via-orange-400
        after:to-orange-300
        after:transition-transform
        after:duration-200

        hover:text-orange-500
        hover:after:scale-x-100

        ${
          active
            ? "text-orange-500 after:scale-x-100"
            : "text-[var(--tech-muted)]"
        }
      `}
    >
      <span>{label}</span>

      <span
        className={`text-[10px] leading-none ${
          active
            ? "text-orange-400"
            : "text-[var(--tech-subtle)] group-hover:text-orange-400"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
