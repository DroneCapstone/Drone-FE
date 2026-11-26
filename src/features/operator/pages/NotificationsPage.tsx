import { useEffect, useState } from 'react';
import { Bell, CheckCheck, ChevronLeft, ChevronRight, CreditCard, Package, Plane, ShieldAlert, TriangleAlert, Trash2, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ActionButton } from '../../../components/ui/ActionButton';
import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import type { OperatorNotification } from '../api/notificationApi';
import { OperatorLoadingState } from '../components/OperatorLoadingState';
import { PageHeader } from '../components/PageHeader';
import {
  useClearReadOperatorNotificationsMutation,
  useDeleteOperatorNotificationMutation,
  useMarkAllOperatorNotificationsReadMutation,
  useMarkOperatorNotificationReadMutation,
  useOperatorNotificationsQuery,
  useOperatorUnreadCountQuery,
} from '../hooks/useNotificationQueries';
import './operator-notifications.css';

type ReadFilter = 'all' | 'unread' | 'read';
const TYPES = [
  { value: 'all', label: 'All types' },
  { value: 'Mission_Status', label: 'Mission Status' },
  { value: 'Payment', label: 'Payment' },
  { value: 'System_Alert', label: 'System Alert' },
  { value: 'AI_Warning', label: 'AI Warning' },
  { value: 'Maintenance', label: 'Maintenance' },
];
const ORDER_CODE_PATTERN = /(?:^|[^A-Z0-9])(ORD-\d{8}-\d+)(?!\d)/i;

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
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-GB');
}

function visualOf(item: OperatorNotification) {
  switch (item.notifications_type) {
    case 'Payment': return { Icon: CreditCard, style: 'payment' };
    case 'Mission_Status': return { Icon: Plane, style: 'mission' };
    case 'Maintenance': return { Icon: Wrench, style: 'maintenance' };
    case 'AI_Warning': return { Icon: TriangleAlert, style: 'warning' };
    case 'System_Alert': return /low[\s_-]+stock|out[\s_-]+of[\s_-]+stock/i.test(`${item.title} ${item.message}`)
      ? { Icon: Package, style: 'alert' } : { Icon: ShieldAlert, style: 'alert' };
    default: return { Icon: Bell, style: 'default' };
  }
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ReadFilter>('all');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const query = useOperatorNotificationsQuery(page, {
    ...(filter === 'all' ? {} : { is_read: filter === 'read' }),
    ...(type === 'all' ? {} : { notification_type: type }),
  });
  const unread = useOperatorUnreadCountQuery();
  const markOne = useMarkOperatorNotificationReadMutation();
  const markAll = useMarkAllOperatorNotificationsReadMutation();
  const deleteOne = useDeleteOperatorNotificationMutation();
  const clearRead = useClearReadOperatorNotificationsMutation();
  const saving = markOne.isPending || markAll.isPending || deleteOne.isPending || clearRead.isPending;
  const data = query.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  const correctingPage = Boolean(data && page > totalPages);
  const loading = query.isPending || correctingPage;
  const busy = loading || saving;
  const first = data?.items.length ? (data.page - 1) * data.page_size + 1 : 0;
  const last = data && first ? first + data.items.length - 1 : 0;
  const unreadCount = unread.data;

  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
  }, [data, page, totalPages]);

  function resetPage() {
    setPage(1); setExpanded([]); setError(''); setNotice('');
  }
  function changePage(next: number) {
    setPage(next); setExpanded([]); setError(''); setNotice('');
  }
  async function mutate(action: () => Promise<unknown>, success = '') {
    if (busy) return false;
    setError(''); setNotice('');
    try {
      await action();
      if (success) setNotice(success);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update notifications. Please try again.');
      return false;
    }
  }
  async function openNotification(item: OperatorNotification) {
    if (busy) return;
    if (!item.is_read && !(await mutate(() => markOne.mutateAsync(item.id)))) return;
    const target = targetOf(item);
    if (target) navigate(target);
  }

  return <>
    <PageHeader section="notifications" action={<>
      <ActionButton variant="secondary" disabled={busy} onClick={() => {
        if (window.confirm('Delete all read notifications?')) void mutate(() => clearRead.mutateAsync(), 'Read notifications cleared.');
      }}>Clear read</ActionButton>
      <ActionButton variant="secondary" disabled={busy || unreadCount === 0} onClick={() => void mutate(() => markAll.mutateAsync(), 'All notifications marked as read.')}>Mark all as read</ActionButton>
    </>} />
    <div className="operator-notifications">
      <div className="opn-toolbar">
        <div className="opn-tabs" aria-label="Read status">
          {(['all', 'unread', 'read'] as const).map(value => <button key={value} type="button" disabled={saving} aria-pressed={filter === value} onClick={() => { setFilter(value); resetPage(); }} className="opn-tab">{value === 'all' ? 'All' : value === 'unread' ? 'Unread' : 'Read'}</button>)}
        </div>
        <DropdownSelect ariaLabel="Notification type" value={type} options={TYPES} disabled={saving} onChange={value => { setType(value); resetPage(); }} className="opn-type-filter" />
      </div>
      {error && <p role="alert" className="opn-error">{error}</p>}
      {notice && <p role="status" className="opn-notice">{notice}</p>}
      <section className="opn-list" aria-label="Notification list" aria-busy={busy}>
        {loading ? <OperatorLoadingState label="Loading notifications..." /> : query.isError && !data ? <div role="alert" className="opn-empty opn-error">Unable to load notifications. Please try again. <ActionButton variant="secondary" onClick={() => void query.refetch()}>Retry</ActionButton></div> : data && <>
          {data.items.length === 0 ? <div className="opn-empty">{filter === 'unread' && type === 'all' ? 'No unread notifications.' : filter === 'all' && type === 'all' ? 'No notifications.' : 'No notifications match your filters.'}</div> : <div className="opn-rows">
            {data.items.map(item => {
              const { Icon, style } = visualOf(item);
              const actionable = Boolean(targetOf(item)) || !item.is_read;
              const isExpanded = expanded.includes(item.id);
              const canExpand = item.message.length > 160 || item.message.includes('\n');
              return <div key={item.id} className={`opn-row${item.is_read ? '' : ' is-unread'}${actionable ? ' is-navigable' : ''}`}
                onClick={actionable ? event => {
                  if (event.target instanceof Element && event.target.closest('button, a, input, select, textarea')) return;
                  void openNotification(item);
                } : undefined}>
                <span className={`opn-type-icon opn-icon-${style}`} aria-hidden="true"><Icon size={16}/></span>
                <div className="opn-copy">
                  <div className="opn-heading">
                    {actionable ? <button type="button" className="opn-title-action" disabled={busy} onClick={() => void openNotification(item)}>{item.title}</button> : <strong>{item.title}</strong>}
                    {!item.is_read && <span className="opn-unread-dot" aria-label="Unread"/>}
                  </div>
                  <p className={`opn-message${!isExpanded && canExpand ? ' is-clamped' : ''}`}>{item.message}</p>
                  <p className="opn-meta">{TYPES.find(entry => entry.value === item.notifications_type)?.label ?? item.notifications_type.replace(/_/g, ' ')} · {formatTime(item.created_at)}</p>
                  {canExpand && <button type="button" aria-expanded={isExpanded} className="opn-text-action" onClick={() => setExpanded(old => isExpanded ? old.filter(id => id !== item.id) : [...old, item.id])}>{isExpanded ? 'Show less' : 'Show more'}</button>}
                </div>
                <div className="opn-actions">
                  {!item.is_read && <button type="button" disabled={busy} title="Mark as read" aria-label="Mark as read" className="opn-icon-button" onClick={() => void mutate(() => markOne.mutateAsync(item.id))}><CheckCheck size={15}/></button>}
                  <button type="button" disabled={busy} title="Delete notification" aria-label="Delete notification" className="opn-icon-button" onClick={() => {
                    if (window.confirm('Delete this notification?')) void mutate(() => deleteOne.mutateAsync(item.id), 'Notification deleted.');
                  }}><Trash2 size={15}/></button>
                </div>
              </div>;
            })}
          </div>}
          <div className="opn-pagination">
            <span>{first ? `Showing ${first}–${last} of ${data.total} notifications` : '0 notifications'}</span>
            <div className="opn-page-controls">
              <button type="button" className="opn-icon-button" aria-label="Previous page" disabled={busy || page <= 1} onClick={() => changePage(page - 1)}><ChevronLeft size={16}/></button>
              <span>Page {page} of {totalPages}</span>
              <button type="button" className="opn-icon-button" aria-label="Next page" disabled={busy || page >= totalPages} onClick={() => changePage(page + 1)}><ChevronRight size={16}/></button>
            </div>
          </div>
        </>}
      </section>
    </div>
  </>;
}
