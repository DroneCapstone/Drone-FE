import {

  BatteryLow,

  Bell,

  CalendarClock,

  Check,

  CheckCheck,

  ChevronRight,

  ClipboardList,

  Clock3,

  LoaderCircle,

  Plane,

  Trash2,

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

  getNotificationsApi,

} from "../api/notificationApi";



import {

  useClearReadNotificationsMutation,

  useDeleteNotificationMutation,

  useMarkAllNotificationsReadMutation,

  useMarkNotificationReadMutation,

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

  backendId: string;

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

    backendId: id,

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



export function TechnicianNotificationsPage() {

  const navigate =

    useNavigate();



  const notificationsQuery =

    useNotificationsQuery();



  const markAllMutation =

    useMarkAllNotificationsReadMutation();

  const markOneMutation = useMarkNotificationReadMutation();

  const deleteMutation = useDeleteNotificationMutation();

  const clearReadMutation = useClearReadNotificationsMutation();

  const [readError, setReadError] = useState("");

  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);

  const [serverUnread, setServerUnread] = useState<number | null>(null);

  const [loadingMore, setLoadingMore] = useState(false);

  const [hasLoadedInitialNotifications, setHasLoadedInitialNotifications] = useState(false);



  const [

    notifications,

    setNotifications,

  ] = useState<

    TechnicianNotification[]

  >([]);



  const [

    filter,

    setFilter,

  ] = useState<NotificationFilter>(

    "all",

  );



  useEffect(() => {

    if (!notificationsQuery.isSuccess || notificationsQuery.data === undefined) {

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



    // Keep older pages that were loaded with "Load more" across refetches.

    setNotifications((current) =>

      current.length > next.length

        ? [

            ...next,

            ...current.filter(

              (old) => !next.some((item) => item.id === old.id),

            ),

          ]

        : next,

    );



    if (isRecord(notificationsQuery.data)) {

      const meta = notificationsQuery.data;

      setTotal(typeof meta.total === "number" ? meta.total : next.length);

      setServerUnread(

        typeof meta.unread_count === "number" ? meta.unread_count : null,

      );

    } else {

      setTotal(next.length);

      setServerUnread(null);

    }

    setHasLoadedInitialNotifications(true);
  }, [notificationsQuery.data, notificationsQuery.isSuccess]);



  const loadedUnread =

    notifications.filter(

      (item) => item.unread,

    ).length;



  // Prefer the Backend total, which also covers pages that are not loaded yet.

  const unreadCount = serverUnread ?? loadedUnread;



  const readCount = Math.max(

    (total || notifications.length) - unreadCount,

    0,

  );



  const hasLoadedRead = notifications.some((item) => !item.unread);



  const loadMore = async () => {

    if (loadingMore) return;

    setLoadingMore(true);

    try {

      setReadError("");

      const response = await getNotificationsApi(page + 1, 50);

      const next = unwrapList(response)

        .map(mapApiNotification)

        .filter((item): item is TechnicianNotification => Boolean(item));

      setNotifications((current) => [

        ...current,

        ...next.filter((item) => !current.some((old) => old.id === item.id)),

      ]);

      setPage(page + 1);

      if (isRecord(response) && typeof response.total === "number") {

        setTotal(response.total);

      }

    } catch  {

      setReadError("Unable to load more notifications.");

    } finally {

      setLoadingMore(false);

    }

  };



  const deleteOne = async (notification: TechnicianNotification) => {

    try {

      setReadError("");

      await deleteMutation.mutateAsync(notification.backendId);

      setNotifications((current) =>

        current.filter((item) => item.id !== notification.id),

      );

      setTotal((value) => Math.max(value - 1, 0));

      if (notification.unread) {

        setServerUnread((value) =>

          value === null ? value : Math.max(value - 1, 0),

        );

      }

    } catch  {

      setReadError("Unable to delete notification.");

    }

  };



  const clearRead = async () => {

    try {

      setReadError("");

      await clearReadMutation.mutateAsync();

      setNotifications((current) => current.filter((item) => item.unread));

    } catch  {

      setReadError("Unable to clear read notifications.");

    }

  };



  // Only show an empty state after the initial GET has actually completed and
  // its response has been mapped. Keep existing content during background refetches.
  const isInitialLoading = !hasLoadedInitialNotifications && !notificationsQuery.isError;
  const isInitialError = !hasLoadedInitialNotifications && notificationsQuery.isError;

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

  };



  const markAsRead = async (notification: TechnicianNotification) => {

    if (!notification.unread) return;

    try {

      setReadError("");

      await markOneMutation.mutateAsync(notification.backendId);

      // Update UI only after a successful Backend PATCH.

      saveNotifications(notifications.map((item) =>

        item.id === notification.id ? { ...item, unread: false } : item,

      ));

      setServerUnread((value) => value === null ? value : Math.max(value - 1, 0));

    } catch  {

      setReadError("Unable to mark notification as read.");

    }

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

    setServerUnread(0);

  };



  const handleViewDetail = async (

    notification: TechnicianNotification,

  ) => {

    if (notification.unread) {

      await markAsRead(notification);

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

      description=""

    >

      {readError && <div role="alert" className="mb-3 text-[13px] text-red-500">

        {readError}

        <button type="button" className="ml-2 underline" onClick={() => setReadError("")}>Dismiss</button>

      </div>}

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

              isInitialLoading ? "—" : total || notifications.length

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

              isInitialLoading ? "—" : unreadCount

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

              isInitialLoading ? "—" : readCount

            }

          />

        </div>



        <div className="flex items-center gap-2">

          {hasLoadedRead && (

            <Button

              type="button"

              onClick={() => void clearRead()}

              disabled={clearReadMutation.isPending}

              className="h-9 rounded-md border border-[var(--tech-border)] bg-transparent px-3 text-[12px] font-medium text-[var(--tech-text-secondary)] hover:bg-[var(--tech-surface-2)]"

            >

              <Trash2

                size={15}

              />

              Clear read

            </Button>

          )}



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



                    {/* DELETE */}

                    <button

                      type="button"

                      title="Delete notification"

                      aria-label="Delete notification"

                      disabled={deleteMutation.isPending}

                      onClick={() => void deleteOne(notification)}

                      className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--tech-subtle)] transition-colors hover:text-red-500 disabled:opacity-50"

                    >

                      <Trash2

                        size={15}

                      />

                    </button>

                  </div>

                );

              },

            )

          ) : isInitialLoading ? (
            <div role="status" aria-live="polite" className="flex min-h-[180px] flex-col items-center justify-center gap-3">
              <LoaderCircle size={25} className="animate-spin text-orange-500" aria-hidden="true" />
              <p className="text-[13px] font-medium text-[var(--tech-text-secondary)]">Loading notifications...</p>
              <p className="text-[11px] text-[var(--tech-subtle)]">Please wait a moment.</p>
            </div>
          ) : isInitialError ? (
            <div role="alert" className="flex min-h-[180px] flex-col items-center justify-center gap-3">
              <Bell size={22} className="text-[var(--tech-subtle)]" aria-hidden="true" />
              <p className="text-[13px] font-medium text-[var(--tech-text-secondary)]">Unable to load notifications</p>
              <button type="button" onClick={() => void notificationsQuery.refetch()}
                className="text-[12px] font-semibold text-orange-500 hover:underline">Retry</button>
            </div>
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



      {notifications.length < total && (

        <div className="mt-4 flex justify-center">

          <Button

            type="button"

            onClick={() => void loadMore()}

            disabled={loadingMore}

            className="h-9 rounded-md border border-[var(--tech-border)] bg-transparent px-3 text-[12px] font-medium text-[var(--tech-text-secondary)] hover:bg-[var(--tech-surface-2)]"

          >

            {loadingMore

              ? "Loading…"

              : `Load more (${total - notifications.length} remaining)`}

          </Button>

        </div>

      )}

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

  count: number | string;

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
