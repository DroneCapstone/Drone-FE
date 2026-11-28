import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link, useNavigate } from "react-router-dom";
import { NotificationDetailDialog, type NotificationDetailData } from "../../../components/common/NotificationDetailDialog";

import {
  customerApi,
  unwrapArray,
  type NotificationApi,
} from "../services/customerApi";

import {
  formatDateTime,
} from "../services/customerDeliveryService";

type NotificationFilter =
  | "all"
  | "unread"
  | "read";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  to: string;
  read: boolean;
  orderId?: string;
};

/**
 * BE notifications can omit order_id, but still include the order code in
 * reference_id, title or message, e.g. PACKAGE_RECEIVED_ORD-20261117-0001.
 * Only use an actual order code for fallback navigation; never treat a
 * mission_id/work_order_id as a delivery order id.
 */
const ORDER_CODE_PATTERN = /(?:^|[^A-Z0-9])(ORD-\d{8}-\d+)(?!\d)/i;

export function getNotificationOrderId(
  item: NotificationApi,
): string | undefined {
  // Preserve explicit identifiers supplied by the BE (existing behavior).
  for (const value of [item.order_id, item.delivery_id]) {
    if ((typeof value === "string" && value.trim()) ||
        (typeof value === "number" && Number.isFinite(value))) {
      return String(value).trim();
    }
  }

  // Older BE notifications only provide a reference such as
  // PACKAGE_RECEIVED_ORD-20261117-0001, or mention the order in their text.
  for (const value of [
    item.reference_id,
    item.title,
    item.message,
    item.description,
    item.content,
  ]) {
    if (typeof value !== "string") continue;
    const match = value.match(ORDER_CODE_PATTERN);
    if (match) return match[1].toUpperCase();
  }

  return undefined;
}

function normalizeNotification(
  item: NotificationApi,
): NotificationItem {
  const orderId = getNotificationOrderId(item);

  const read = Boolean(
    item.is_read ??
      item.read ??
      item.read_at,
  );

  return {
    id: String(item.id),
    title:
      item.title ??
      "Delivery update",
    description:
      item.message ??
      item.description ??
      item.content ??
      "Your delivery has a new update.",
    timestamp:
      item.created_at ??
      item.updated_at ??
      new Date().toISOString(),
    to: orderId
      ? `/customer/deliveries/${encodeURIComponent(orderId)}`
      : "/customer/notifications",
    read,
    orderId,
  };
}

const PAGE_SIZE = 50;

function readCounts(response: unknown) {
  const record =
    response && typeof response === "object"
      ? (response as Record<string, unknown>)
      : {};

  return {
    total:
      typeof record.total === "number" ? record.total : null,
    unread:
      typeof record.unread_count === "number"
        ? record.unread_count
        : null,
  };
}

export function CustomerNotificationsPage() {
  const navigate = useNavigate();
  const [detailId, setDetailId] = useState<number | string | null>(null);
  const [filter, setFilter] =
    useState<NotificationFilter>("all");

  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);

  const [serverUnread, setServerUnread] =
    useState<number | null>(null);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const load = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError("");
    }

    try {
      const response =
        await customerApi.getNotifications(1, PAGE_SIZE);

      const items = unwrapArray<NotificationApi>(
        response,
      )
        .map(normalizeNotification)
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() -
            new Date(a.timestamp).getTime(),
        );

      const meta = readCounts(response);

      // Silent refreshes keep older pages the user already loaded.
      setNotifications((current) =>
        silent && current.length > items.length
          ? [
              ...items,
              ...current.filter(
                (old) =>
                  !items.some((item) => item.id === old.id),
              ),
            ]
          : items,
      );
      if (!silent) setPage(1);
      setTotal(meta.total ?? items.length);
      setServerUnread(meta.unread);
    } catch (requestError) {
      if (!silent) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load notifications.",
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    // Read actual BE notifications. Refresh while the page is visible;
    // status transitions / recipient email notifications must be produced by BE.
    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load(true);
    }, 45000);
    const onFocus = () => {
      if (!document.hidden) void load(true);
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const loadedUnread =
    notifications.filter(
      (item) => !item.read,
    ).length;

  // Prefer the BE total, which also covers pages that are not loaded yet.
  const unreadCount = serverUnread ?? loadedUnread;

  const readCount = Math.max(
    (total || notifications.length) - unreadCount,
    0,
  );

  const hasLoadedRead = notifications.some(
    (item) => item.read,
  );

  const notifyHeader = () => {
    window.dispatchEvent(
      new Event("customer-notifications-updated"),
    );
  };

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);

    try {
      const response =
        await customerApi.getNotifications(
          page + 1,
          PAGE_SIZE,
        );

      const next = unwrapArray<NotificationApi>(
        response,
      ).map(normalizeNotification);

      setNotifications((current) => [
        ...current,
        ...next.filter(
          (item) =>
            !current.some((old) => old.id === item.id),
        ),
      ]);
      setPage(page + 1);
      setTotal(readCounts(response).total ?? total);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load notifications.",
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const deleteOne = async (id: string) => {
    const previous = notifications;
    const target = notifications.find(
      (item) => item.id === id,
    );

    setNotifications((items) =>
      items.filter((item) => item.id !== id),
    );
    setTotal((value) => Math.max(value - 1, 0));
    if (target && !target.read) {
      setServerUnread((value) =>
        value === null ? value : Math.max(value - 1, 0),
      );
    }

    try {
      await customerApi.deleteNotification(id);
      notifyHeader();
    } catch {
      setNotifications(previous);
      void load(true);
    }
  };

  const clearRead = async () => {
    const previous = notifications;

    setNotifications((items) =>
      items.filter((item) => !item.read),
    );

    try {
      await customerApi.clearReadNotifications();
      void load(true);
      notifyHeader();
    } catch {
      setNotifications(previous);
    }
  };

  const visibleNotifications =
    useMemo(() => {
      if (filter === "unread") {
        return notifications.filter(
          (item) => !item.read,
        );
      }

      if (filter === "read") {
        return notifications.filter(
          (item) => item.read,
        );
      }

      return notifications;
    }, [filter, notifications]);

  const markAsRead = async (
    id: string,
  ) => {
    const current =
      notifications.find(
        (item) => item.id === id,
      );

    if (!current || current.read) {
      return;
    }

    setNotifications((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              read: true,
            }
          : item,
      ),
    );

    setServerUnread((value) =>
      value === null ? value : Math.max(value - 1, 0),
    );

    try {
      await customerApi.markNotificationRead(
        id,
      );
      notifyHeader();
    } catch {
      void load();
    }
  };

  const markAllAsRead = async () => {
    const previous = notifications;

    setNotifications((items) =>
      items.map((item) => ({
        ...item,
        read: true,
      })),
    );

    const previousUnread = serverUnread;
    setServerUnread(0);

    try {
      await customerApi.markAllNotificationsRead();
      notifyHeader();
    } catch {
      setNotifications(previous);
      setServerUnread(previousUnread);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-16 pt-9 sm:px-6 sm:pt-12 lg:px-10">
      <section>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-[34px] font-semibold leading-none tracking-[-0.045em] text-white sm:text-[42px]">
            Notifications
          </h1>

          <div className="flex items-center gap-6">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="w-fit text-[13px] font-medium text-white/[0.52] transition hover:text-orange-400"
              >
                Mark all as read
              </button>
            )}

            {hasLoadedRead && (
              <button
                type="button"
                onClick={clearRead}
                className="w-fit text-[13px] font-medium text-white/[0.52] transition hover:text-orange-400"
              >
                Clear read
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 flex items-center gap-8 border-b border-white/[0.08] sm:mt-11 sm:gap-10">
          <FilterTab
            label="All"
            count={total || notifications.length}
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

      <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.10] bg-[#161217] shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
        {loading ? (
          <EmptyState title="Loading notifications…" />
        ) : error ? (
          <div className="px-6 py-12 text-center">
            <p className="text-[14px] text-red-300">
              {error}
            </p>
            <button
              type="button"
              onClick={() => { void load(); }}
              className="mt-4 text-[13px] font-medium text-orange-400"
            >
              Try again
            </button>
          </div>
        ) : visibleNotifications.length === 0 ? (
          <EmptyState
            title={
              filter === "unread"
                ? "No unread notifications"
                : filter === "read"
                  ? "No read notifications"
                  : "No notifications"
            }
          />
        ) : (
          visibleNotifications.map(
            (item) => (
              <div
                key={item.id}
                className="relative"
              >
              <Link
                to={item.to}
                onClick={(event) => {
                  event.preventDefault();
                  markAsRead(item.id);
                  setDetailId(item.id);
                }}
                className={`group relative block border-b border-white/[0.075] px-5 py-5 last:border-b-0 transition sm:px-7 sm:py-6 ${
                  !item.read
                    ? "bg-white/[0.018]"
                    : "bg-transparent"
                } hover:bg-white/[0.028]`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex w-2 shrink-0 justify-center pt-[9px]">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        !item.read
                          ? "bg-orange-500"
                          : "bg-white/[0.12]"
                      }`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                      <div className="min-w-0">
                        <p
                          className={`text-[16px] leading-6 sm:text-[17px] ${
                            !item.read
                              ? "font-semibold text-white"
                              : "font-medium text-white/[0.72]"
                          }`}
                        >
                          {item.title}
                        </p>

                        <p className="mt-2 max-w-[820px] text-[13px] leading-6 text-white/[0.45] sm:text-[14px]">
                          {item.description}
                        </p>
                      </div>

                      <p className="shrink-0 text-[11px] leading-6 text-white/[0.30] sm:text-[12px]">
                        {formatDateTime(
                          item.timestamp,
                        )}
                      </p>
                    </div>

                    {item.orderId && (
                      <div className="mt-4 flex items-center gap-3">
                        <span className="text-[12px] font-medium text-white/[0.30]">
                          {item.orderId}
                        </span>
                        <span className="text-white/[0.16]">
                          ·
                        </span>
                        <span className="text-[12px] font-medium text-white/[0.42] transition group-hover:text-orange-400">
                          View details →
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
              {detailId === item.id && (
                <NotificationDetailDialog
                  key={item.id}
                  load={() => customerApi.getNotificationDetail(item.id) as Promise<NotificationDetailData>}
                  relatedLabel="Open order"
                  onOpenRelated={item.to ? () => { setDetailId(null); navigate(item.to); } : undefined}
                  onClose={() => setDetailId(null)}
                />
              )}
              <button
                type="button"
                aria-label="Delete notification"
                onClick={() => {
                  void deleteOne(item.id);
                }}
                className="absolute bottom-3 right-4 text-[12px] font-medium text-white/[0.30] transition hover:text-red-300 sm:right-6"
              >
                Delete
              </button>
              </div>
            ),
          )
        )}

        {!loading &&
          !error &&
          notifications.length < total && (
            <div className="flex justify-center border-t border-white/[0.075] px-6 py-5">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => {
                  void loadMore();
                }}
                className="text-[13px] font-medium text-orange-400 disabled:opacity-50"
              >
                {loadingMore
                  ? "Loading…"
                  : `Load more (${total - notifications.length} remaining)`}
              </button>
            </div>
          )}
      </section>
    </div>
  );
}

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
      className={`relative flex items-center gap-2 pb-4 text-[14px] font-semibold transition sm:text-[15px] ${
        active
          ? "text-orange-400"
          : "text-white/[0.52] hover:text-white/[0.82]"
      }`}
    >
      <span>{label}</span>
      <span className="text-[11px] opacity-60 sm:text-[12px]">
        {count}
      </span>
      {active && (
        <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-orange-500" />
      )}
    </button>
  );
}

function EmptyState({
  title,
}: {
  title: string;
}) {
  return (
    <div className="flex min-h-[260px] items-center justify-center px-6 py-16 text-center">
      <p className="text-[15px] font-medium text-white/[0.50]">
        {title}
      </p>
    </div>
  );
}
