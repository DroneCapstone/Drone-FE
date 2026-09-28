import {
  BatteryLow,
  Bell,
  CalendarClock,
  Check,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  Clock3,
  Plane,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  Button,
} from "@/components/shadcn/ui/button";

import {
  Card,
  CardContent,
} from "@/components/shadcn/ui/card";

import {
  TechnicianPageShell,
} from "../components/TechnicianPageShell";

import {
  formatApiDateTime,
  isRecord,
  pickString,
  unwrapList,
} from "../api/httpClient";

import {
  useMarkAllNotificationsReadMutation,
  useNotificationsQuery,
} from "../hooks/useNotificationQueries";

type NotificationType =
  | "incoming"
  | "inspection"
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
};

/*
 * Notifications are informational events for Technician.
 *
 * IMPORTANT:
 * - Incoming notification only tells Technician that a drone is
 *   heading to this hub.
 * - Arrival confirmation is NOT performed here.
 * - Technician confirms arrival only in Transit Missions.
 *
 * Maintenance Alerts remain separate:
 * - Schedule / Incident / Hub inspection
 * - Alert -> Create Work Order
 *
 * Notification examples:
 * - Incoming drone
 * - Scheduled inspection reminder
 * - Low battery
 * - Work order assigned
 * - Overdue work order
 */
const NOTIFICATION_STORAGE_KEY =
  "droneoptai.technician.notifications.v4";

const defaultNotifications:
  TechnicianNotification[] = [
  {
    id: "NOT-001",
    type: "incoming",

    title:
      "CX-02 is heading to Hub HCM-02",

    message:
      "MS-1024 is approaching your hub. Open Transit Missions to monitor the arrival and confirm it after the drone physically reaches the hub.",

    time: "12 min ago",
    timestamp:
      "22 Sep 2026 · 21:48",

    unread: true,

    droneId: "DR-002",
  },

  {
    id: "NOT-002",
    type: "inspection",

    title:
      "CX-09 scheduled inspection is approaching",

    message:
      "CX-09 is due for its periodic inspection tomorrow at 09:00. Review the drone and prepare for the scheduled maintenance task.",

    time: "35 min ago",
    timestamp:
      "22 Sep 2026 · 21:25",

    unread: true,

    droneId: "DR-001",
  },

  {
    id: "NOT-003",
    type: "battery",

    title:
      "AX-04 battery dropped below 40%",

    message:
      "AX-04 crossed the low-battery attention threshold while at the hub. Check its battery condition before the next assignment.",

    time: "1 h ago",
    timestamp:
      "22 Sep 2026 · 21:00",

    unread: true,

    droneId: "DR-003",
  },

  {
    id: "NOT-004",
    type: "work_order",

    title:
      "WO-1055 was assigned to you",

    message:
      "A maintenance work order for AX-08 has been assigned to Technician Demo.",

    time: "2 h ago",
    timestamp:
      "22 Sep 2026 · 20:00",

    unread: false,

    droneId: "DR-004",
    workOrderId: "WO-1055",
  },

  {
    id: "NOT-005",
    type: "overdue",

    title:
      "WO-1054 is past its scheduled time",

    message:
      "The scheduled maintenance time for CX-09 has passed and the work order is still not completed.",

    time: "3 h ago",
    timestamp:
      "22 Sep 2026 · 19:00",

    unread: false,

    droneId: "DR-001",
    workOrderId: "WO-1054",
  },
];

function mapApiNotification(
  value: unknown,
): TechnicianNotification | null {
  if (!isRecord(value)) return null;

  const id = pickString(value, ["notification_id", "id"]);
  if (!id) return null;

  const rawType = pickString(value, ["type", "notification_type"], "incoming")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const type: NotificationType =
    rawType.includes("battery")
      ? "battery"
      : rawType.includes("work")
        ? "work_order"
        : rawType.includes("overdue")
          ? "overdue"
          : rawType.includes("inspection") || rawType.includes("maintenance")
            ? "inspection"
            : "incoming";

  const createdAt = pickString(value, ["created_at", "timestamp", "sent_at"], "");
  const readValue = value.is_read ?? value.read ?? false;

  return {
    id: /^NOT-/i.test(id) ? id : `NOT-${id}`,
    type,
    title: pickString(value, ["title", "subject"], "Notification"),
    message: pickString(value, ["message", "body", "content"], ""),
    time: formatApiDateTime(createdAt, "—"),
    timestamp: formatApiDateTime(createdAt, "—"),
    unread: typeof readValue === "boolean" ? !readValue : true,
    droneId: pickString(value, ["drone_id"], "") || undefined,
    workOrderId: pickString(value, ["work_order_id"], "") || undefined,
  };
}

function loadNotifications():
  TechnicianNotification[] {
  try {
    const stored =
      localStorage.getItem(
        NOTIFICATION_STORAGE_KEY,
      );

    if (!stored) {
      return defaultNotifications;
    }

    const parsed =
      JSON.parse(
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
  const navigate =
    useNavigate();

  const notificationsQuery =
    useNotificationsQuery();

  const markAllMutation =
    useMarkAllNotificationsReadMutation();

  const [
    notifications,
    setNotifications,
  ] = useState<
    TechnicianNotification[]
  >(loadNotifications);

  const [
    filter,
    setFilter,
  ] = useState<NotificationFilter>(
    "all",
  );

  useEffect(() => {
    if (!notificationsQuery.data) {
      return;
    }

    const next = unwrapList(
      notificationsQuery.data,
    )
      .map(mapApiNotification)
      .filter(
        (item): item is TechnicianNotification =>
          Boolean(item),
      );

    setNotifications(next);

    localStorage.setItem(
      NOTIFICATION_STORAGE_KEY,
      JSON.stringify(next),
    );
  }, [notificationsQuery.data]);


  const unreadCount =
    notifications.filter(
      (item) => item.unread,
    ).length;

  const readCount =
    notifications.length -
    unreadCount;

  const filteredNotifications =
    useMemo(() => {
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
    }, [
      filter,
      notifications,
    ]);

  const saveNotifications = (
    next:
      TechnicianNotification[],
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
    const next =
      notifications.map(
        (notification) =>
          notification.id ===
          notificationId
            ? {
                ...notification,
                unread: false,
              }
            : notification,
      );

    saveNotifications(next);
  };

  const markAllAsRead = async () => {
    try {
      await markAllMutation.mutateAsync();
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
      return;
    }

    const next = notifications.map((notification) => ({
      ...notification,
      unread: false,
    }));

    saveNotifications(next);
  };

  const handleViewDetail = (
    notification:
      TechnicianNotification,
  ) => {
    if (notification.unread) {
      markAsRead(
        notification.id,
      );
    }

    /*
     * Incoming:
     * Only navigate to Transit Missions.
     * Confirm Arrival is performed there.
     */
    if (
      notification.type ===
      "incoming"
    ) {
      navigate(
        "/technician/fleet/transit",
      );

      return;
    }

    /*
     * Work order / overdue:
     * Go directly to Work Order Detail.
     */
    if (
      (notification.type ===
        "work_order" ||
        notification.type ===
          "overdue") &&
      notification.workOrderId
    ) {
      navigate(
        `/technician/maintenance/work-orders/${notification.workOrderId}`,
      );

      return;
    }

    /*
     * Inspection reminder / battery:
     * Open Drone Detail.
     */
    if (notification.droneId) {
      navigate(
        `/technician/fleet/${notification.droneId}`,
      );
    }
  };

  const getIcon = (
    type: NotificationType,
  ) => {
    switch (type) {
      case "incoming":
        return Plane;

      case "inspection":
        return CalendarClock;

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
  ) => {
    switch (type) {
      case "incoming":
        return "Incoming";

      case "inspection":
        return "Inspection";

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
  ) => {
    switch (type) {
      case "incoming":
        return "border-orange-500/30 text-orange-500";

      case "inspection":
        return "border-[var(--tech-border)] text-[var(--tech-text-secondary)]";

      case "battery":
        return "border-red-500/30 text-red-500";

      case "work_order":
        return "border-[var(--tech-border)] text-[var(--tech-text-secondary)]";

      case "overdue":
        return "border-red-500/30 text-red-500";
    }
  };

  const getIconColor = (
    type: NotificationType,
  ) => {
    switch (type) {
      case "incoming":
        return "text-orange-500";

      case "inspection":
        return "text-[var(--tech-text-secondary)]";

      case "battery":
        return "text-red-500";

      case "work_order":
        return "text-[var(--tech-text-secondary)]";

      case "overdue":
        return "text-red-500";
    }
  };

  const getActionTitle = (
    notification:
      TechnicianNotification,
  ) => {
    if (
      notification.type ===
      "incoming"
    ) {
      return "View transit mission";
    }

    if (
      notification.type ===
        "work_order" ||
      notification.type ===
        "overdue"
    ) {
      return "View work order";
    }

    return "View drone details";
  };

  return (
    <TechnicianPageShell
      title="Notifications"
      description="Operational updates and reminders that require Technician awareness."
    >
      {/* FILTERS */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FilterButton
            active={
              filter === "all"
            }
            onClick={() =>
              setFilter("all")
            }
            label="All"
            count={
              notifications.length
            }
          />

          <FilterButton
            active={
              filter === "unread"
            }
            onClick={() =>
              setFilter("unread")
            }
            label="Unread"
            count={
              unreadCount
            }
          />

          <FilterButton
            active={
              filter === "read"
            }
            onClick={() =>
              setFilter("read")
            }
            label="Read"
            count={
              readCount
            }
          />
        </div>

        {unreadCount > 0 && (
          <Button
            type="button"
            onClick={
              markAllAsRead
            }
            className="h-9 rounded-md border border-[var(--tech-border)] bg-transparent px-3 text-[12px] font-medium text-[var(--tech-text-secondary)] hover:bg-[var(--tech-surface-2)]"
          >
            <CheckCheck
              size={15}
            />
            Mark all as read
          </Button>
        )}
      </div>

      {/* NOTIFICATION LIST */}
      <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
        <CardContent className="p-0">
          {filteredNotifications.length >
          0 ? (
            filteredNotifications.map(
              (
                notification,
                index,
              ) => {
                const NotificationIcon =
                  getIcon(
                    notification.type,
                  );

                return (
                  <div
                    key={
                      notification.id
                    }
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
                    {/* ICON */}
                    <div
                      className={`
                        mt-0.5 flex h-9 w-9 shrink-0
                        items-center justify-center
                        rounded-md border
                        border-[var(--tech-border)]
                        bg-[var(--tech-surface-2)]
                        ${getIconColor(
                          notification.type,
                        )}
                      `}
                    >
                      <NotificationIcon
                        size={16}
                      />
                    </div>

                    {/* CONTENT */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={`text-[14px] font-semibold ${
                            notification.unread
                              ? "text-[var(--tech-text)]"
                              : "text-[var(--tech-text-secondary)]"
                          }`}
                        >
                          {
                            notification.title
                          }
                        </p>

                        <span
                          className={`
                            rounded border
                            bg-transparent
                            px-2 py-0.5
                            text-[10px] font-semibold
                            uppercase tracking-[0.05em]
                            ${getTypeStyle(
                              notification.type,
                            )}
                          `}
                        >
                          {getTypeLabel(
                            notification.type,
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
                        {
                          notification.message
                        }
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <span className="text-[11px] text-[var(--tech-subtle)]">
                          {
                            notification.time
                          }
                        </span>

                        <span className="h-1 w-1 rounded-full bg-[var(--tech-border)]" />

                        <span className="text-[11px] text-[var(--tech-subtle)]">
                          {
                            notification.timestamp
                          }
                        </span>

                        {!notification.unread && (
                          <>
                            <span className="h-1 w-1 rounded-full bg-[var(--tech-border)]" />

                            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--tech-muted)]">
                              <Check
                                size={
                                  11
                                }
                              />
                              Read
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* VIEW DETAIL */}
                    <button
                      type="button"
                      title={getActionTitle(
                        notification,
                      )}
                      aria-label={getActionTitle(
                        notification,
                      )}
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
                There are no
                notifications in this
                category.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
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
        after:bottom-0
        after:left-0
        after:h-[2px]
        after:w-full
        after:origin-left
        after:scale-x-0
        after:rounded-full
        after:bg-orange-500
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
      <span>
        {label}
      </span>

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
