import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionButton } from '../../../components/ui/ActionButton';
import { listOperatorNotificationsApi, type OperatorNotification } from '../api/notificationApi';
import { OperatorPanel } from '../components/OperatorPanel';
import { PageHeader } from '../components/PageHeader';
import {
  OPERATOR_NOTIFICATION_PAGE_SIZE,
  useClearReadOperatorNotificationsMutation,
  useDeleteOperatorNotificationMutation,
  useMarkAllOperatorNotificationsReadMutation,
  useMarkOperatorNotificationReadMutation,
  useOperatorNotificationsQuery,
} from '../hooks/useNotificationQueries';
import type { Tone } from '../types/operator';

type Category = 'Mission' | 'Alerts' | 'Maintenance' | 'Payment';

const FILTERS = ['All', 'Unread', 'Mission', 'Alerts', 'Maintenance'] as const;

const ORDER_CODE_PATTERN = /(?:^|[^A-Z0-9])(ORD-\d{8}-\d+)(?!\d)/i;

function categoryOf(type: string): Category {
  switch (type) {
    case 'Mission_Status':
      return 'Mission';
    case 'Maintenance':
      return 'Maintenance';
    case 'Payment':
      return 'Payment';
    default:
      return 'Alerts';
  }
}

function toneOf(type: string): Tone {
  switch (type) {
    case 'System_Alert':
      return 'danger';
    case 'AI_Warning':
    case 'Maintenance':
      return 'warning';
    case 'Payment':
      return 'success';
    default:
      return 'info';
  }
}

function targetOf(item: OperatorNotification): string | undefined {
  if (item.mission_id) return `/operator/missions/${encodeURIComponent(item.mission_id)}`;
  for (const value of [item.reference_id, item.title, item.message]) {
    const match = typeof value === 'string' ? value.match(ORDER_CODE_PATTERN) : null;
    if (match) return `/operator/orders/${match[1].toUpperCase()}`;
  }
  return undefined;
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-GB');
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const query = useOperatorNotificationsQuery();
  const markOne = useMarkOperatorNotificationReadMutation();
  const markAll = useMarkAllOperatorNotificationsReadMutation();
  const deleteOne = useDeleteOperatorNotificationMutation();
  const clearRead = useClearReadOperatorNotificationsMutation();

  const [items, setItems] = useState<OperatorNotification[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [serverUnread, setServerUnread] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

  useEffect(() => {
    const data = query.data;
    if (!data) return;
    const next = Array.isArray(data.items) ? data.items : [];
    // Keep older pages loaded with "Load more" across refetches.
    setItems((current) =>
      current.length > next.length
        ? [...next, ...current.filter((old) => !next.some((item) => item.id === old.id))]
        : next,
    );
    setTotal(typeof data.total === 'number' ? data.total : next.length);
    setServerUnread(typeof data.unread_count === 'number' ? data.unread_count : null);
  }, [query.data]);

  const loadedUnread = items.filter((item) => !item.is_read).length;
  const unreadCount = serverUnread ?? loadedUnread;
  const hasRead = items.some((item) => item.is_read);

  const visibleItems = items.filter((item) => {
    if (filter === 'All') return true;
    if (filter === 'Unread') return !item.is_read;
    return categoryOf(item.notifications_type) === filter;
  });

  const showError = (cause: unknown, fallback: string) =>
    setError(cause instanceof Error ? cause.message : fallback);

  const handleOpen = async (item: OperatorNotification) => {
    if (!item.is_read) {
      try {
        setError('');
        await markOne.mutateAsync(item.id);
        setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, is_read: true } : entry)));
        setServerUnread((value) => (value === null ? value : Math.max(value - 1, 0)));
      } catch (cause) {
        showError(cause, 'Unable to mark notification as read.');
        return;
      }
    }
    const target = targetOf(item);
    if (target) navigate(target);
  };

  const handleMarkAll = async () => {
    try {
      setError('');
      await markAll.mutateAsync();
      setItems((current) => current.map((entry) => ({ ...entry, is_read: true })));
      setServerUnread(0);
    } catch (cause) {
      showError(cause, 'Unable to mark notifications as read.');
    }
  };

  const handleDelete = async (item: OperatorNotification) => {
    try {
      setError('');
      await deleteOne.mutateAsync(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setTotal((value) => Math.max(value - 1, 0));
      if (!item.is_read) setServerUnread((value) => (value === null ? value : Math.max(value - 1, 0)));
    } catch (cause) {
      showError(cause, 'Unable to delete notification.');
    }
  };

  const handleClearRead = async () => {
    try {
      setError('');
      await clearRead.mutateAsync();
      setItems((current) => current.filter((entry) => !entry.is_read));
    } catch (cause) {
      showError(cause, 'Unable to clear read notifications.');
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      setError('');
      const data = await listOperatorNotificationsApi(page + 1, OPERATOR_NOTIFICATION_PAGE_SIZE);
      const next = Array.isArray(data.items) ? data.items : [];
      setItems((current) => [...current, ...next.filter((item) => !current.some((old) => old.id === item.id))]);
      setPage(page + 1);
      if (typeof data.total === 'number') setTotal(data.total);
    } catch (cause) {
      showError(cause, 'Unable to load more notifications.');
    } finally {
      setLoadingMore(false);
    }
  };

  const queryError = query.isError && !query.data
    ? (query.error instanceof Error ? query.error.message : 'Unable to load notifications.')
    : '';

  return (
    <>
      <PageHeader
        section="notifications"
        action={(
          <>
            {hasRead && (
              <ActionButton variant="secondary" onClick={() => void handleClearRead()}>Clear read</ActionButton>
            )}
            <ActionButton variant="secondary" onClick={() => void handleMarkAll()} disabled={unreadCount === 0}>
              Mark all as read
            </ActionButton>
          </>
        )}
      />
      <div className="notification-layout" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
        <OperatorPanel className="flush-panel">
          <div className="notification-filter">
            {FILTERS.map((name) => (
              <button type="button" className={filter === name ? 'active' : ''} onClick={() => setFilter(name)} key={name}>
                {name}
                {name === 'All' && <span>{total || items.length}</span>}
                {name === 'Unread' && <span>{unreadCount}</span>}
              </button>
            ))}
          </div>
          {(error || queryError) && (
            <p role="alert" className="text-sm text-red-500" style={{ padding: '12px 16px' }}>
              {error || queryError}
              {queryError && !error && (
                <button type="button" className="ml-2 underline" onClick={() => void query.refetch()}>Retry</button>
              )}
            </p>
          )}
          <div className="notification-list">
            {query.isLoading && <p style={{ padding: '16px' }}>Loading notifications…</p>}
            {!query.isLoading && !queryError && visibleItems.length === 0 && (
              <p style={{ padding: '16px' }}>No notifications.</p>
            )}
            {visibleItems.map((item) => (
              <button
                type="button"
                className={`${!item.is_read ? 'unread' : ''} tone-${toneOf(item.notifications_type)}`}
                key={item.id}
                onClick={() => void handleOpen(item)}
              >
                <span>
                  <strong>{item.title}</strong>
                  <p>{item.message}</p>
                  <small>
                    {categoryOf(item.notifications_type)} · {formatTime(item.created_at)} ·{' '}
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label="Delete notification"
                      style={{ textDecoration: 'underline', cursor: 'pointer' }}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDelete(item);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          event.stopPropagation();
                          void handleDelete(item);
                        }
                      }}
                    >
                      Delete
                    </span>
                  </small>
                </span>
                {!item.is_read && <i />}
              </button>
            ))}
            {items.length < total && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}>
                <ActionButton variant="secondary" onClick={() => void handleLoadMore()} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : `Load more (${total - items.length} remaining)`}
                </ActionButton>
              </div>
            )}
          </div>
        </OperatorPanel>
      </div>
    </>
  );
}
