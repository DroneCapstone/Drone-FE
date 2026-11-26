import { AdminSelect } from '../../components/AdminSelect';
import { Bell, CheckCheck, ChevronLeft, ChevronRight, CreditCard, Plane, ShieldAlert, TriangleAlert, Trash2, Wrench, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationTarget } from '../../utils/adminNotificationTarget';
import { useEffect, useState } from 'react';
import { OperatorLoadingState } from '../../../operator/components/OperatorLoadingState';
import { AdminPageShell } from '../../components/AdminPageShell';
import { adminOperationsApi, apiError, type NotificationApi, type NotificationPageApi, type NotificationType } from '../../api/adminOperationsApi';
import { adminDisplayText } from '../../utils/adminDisplayText';
import './AdminNotificationsPage.css';

const PAGE_SIZE = 20;
const REFRESH_MS = 60_000;
const types: { value: NotificationType; label: string }[] = [
  { value: 'Mission_Status', label: 'Mission Status' },
  { value: 'Payment', label: 'Payment' },
  { value: 'System_Alert', label: 'System Alert' },
  { value: 'AI_Warning', label: 'AI Warning' },
  { value: 'Maintenance', label: 'Maintenance' },
];
type ReadFilter = 'all' | 'unread' | 'read';
type LoadResult = { key: string; data: NotificationPageApi | null; error: string };
const typeLabel = (value: string) => types.find(type => type.value === value)?.label ?? adminDisplayText(value).replace(/_/g, ' ');
const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-GB');
};

function notificationVisual(item: NotificationApi) {
  switch (item.notifications_type) {
    case 'Payment': return { Icon: CreditCard, style: 'notification-icon-payment' };
    case 'Mission_Status': return { Icon: Plane, style: 'notification-icon-mission' };
    case 'Maintenance': return { Icon: Wrench, style: 'notification-icon-maintenance' };
    case 'AI_Warning': return { Icon: TriangleAlert, style: 'notification-icon-warning' };
    case 'System_Alert': return /low[\s_-]+stock|out[\s_-]+of[\s_-]+stock/i.test(`${item.title} ${item.message}`)
      ? { Icon: Package, style: 'notification-icon-alert' }
      : { Icon: ShieldAlert, style: 'notification-icon-alert' };
    default: return { Icon: Bell, style: 'notification-icon-default' };
  }
}

export function AdminNotificationsPage() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<number[]>([]);
  const [filter, setFilter] = useState<ReadFilter>('all');
  const [type, setType] = useState<NotificationType | ''>('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<LoadResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const key = `${filter}:${type}:${page}:${revision}`;
  const current = result?.key === key ? result : null;
  const data = current?.data && Array.isArray(current.data.items) ? current.data : null;
  const loadError = current?.error || (current && !data ? 'Unable to load notifications. Please try again.' : '');
  const loading = !current;
  const busy = loading || saving;
  const reload = () => setRevision(value => value + 1);

  useEffect(() => {
    // Do not refresh over an in-flight read/delete action.
    if (saving) return;
    let active = true;
    let inFlight = false;
    async function load(silent = false) {
      if (!active || inFlight) return;
      inFlight = true;
      try {
        const value = await adminOperationsApi.notifications({
          page, page_size: PAGE_SIZE,
          ...(filter === 'all' ? {} : { is_read: filter === 'read' }),
          ...(type ? { notification_type: type } : {}),
        });
        if (!active) return;
        if (!value || !Array.isArray(value.items) ||
            !Number.isSafeInteger(value.total) || value.total < 0 ||
            !Number.isSafeInteger(value.page) || value.page < 1 ||
            !Number.isSafeInteger(value.page_size) || value.page_size < 1) {
          throw new Error('Unexpected notification response structure.');
        }
        const lastPage = Math.max(1, Math.ceil(value.total / value.page_size));
        if (page > lastPage) { setPage(lastPage); return; }
        setResult({ key, data: value, error: '' });
      } catch {
        if (active) setResult(previous => {
          // Keep the last valid result when a background refresh fails.
          if (silent && previous?.key === key && previous.data) return previous;
          return { key, data: null, error: 'Unable to load notifications. Please try again.' };
        });
      } finally { inFlight = false; }
    }
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true);
    }, REFRESH_MS);
    return () => { active = false; window.clearInterval(timer); };
  }, [key, page, filter, type, saving]);

  function changeFilter(next: ReadFilter) {
    setFilter(next); setPage(1); setExpanded([]); setActionError(''); setNotice('');
  }
  async function mutate(action: () => Promise<unknown>, success: string) {
    if (busy) return;
    setSaving(true); setActionError(''); setNotice('');
    try {
      await action();
      window.dispatchEvent(new Event('admin-notifications-updated'));
      reload();
      if (success) setNotice(success);
    } catch (error) { setActionError(apiError(error)); }
    finally { setSaving(false); }
  }
  function markOne(item: NotificationApi) {
    if (!item.is_read) void mutate(() => adminOperationsApi.markNotification(item.id), '');
  }
  function removeOne(item: NotificationApi) {
    if (busy || !window.confirm('Delete this notification?')) return;
    void mutate(() => adminOperationsApi.deleteNotification(item.id), 'Notification deleted.');
  }
  async function openNotification(item: NotificationApi) {
    const target = notificationTarget(item);
    if (busy || !target) return;
    if (item.is_read) { navigate(target.to); return; }
    setSaving(true); setActionError(''); setNotice('');
    try {
      await adminOperationsApi.markNotification(item.id);
      window.dispatchEvent(new Event('admin-notifications-updated'));
      navigate(target.to);
    } catch (error) { setActionError(apiError(error)); }
    finally { setSaving(false); }
  }
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  const first = data && data.items.length ? (data.page - 1) * data.page_size + 1 : 0;
  const last = data && first ? first + data.items.length - 1 : 0;

  return <AdminPageShell title="Notifications">
    <div className="admin-notifications">
    <div className="notification-toolbar">
      <div className="notification-tabs" aria-label="Read status">
        {(['all', 'unread', 'read'] as const).map(value => <button key={value} type="button" disabled={saving} aria-pressed={filter === value} onClick={() => changeFilter(value)} className="notification-tab">{value === 'all' ? 'All' : value === 'unread' ? 'Unread' : 'Read'}</button>)}
      </div>
      <AdminSelect aria-label="Notification type" value={type} disabled={saving} onChange={event => { setType(event.target.value as NotificationType | ''); setPage(1); setExpanded([]); setActionError(''); setNotice(''); }} className="notification-type-filter">
        <option value="">All types</option>{types.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
      </AdminSelect>
    </div>
    {actionError && <p role="alert" className="mb-3 text-sm text-red-500">{actionError}</p>}
    {notice && <p role="status" className="mb-3 text-sm text-[var(--text)]">{notice}</p>}
    <section className="notification-list" aria-label="Notification list" aria-busy={busy}>
      {loading ? <OperatorLoadingState label="Loading notifications..." /> : loadError ? <div role="alert" className="flex flex-wrap items-center justify-center gap-3 p-8 text-sm text-red-500">{loadError}<button type="button" className="button button-secondary" onClick={reload}>Retry</button></div> : data && <>
        {data.items.length === 0 ? <div className="p-10 text-center text-sm text-[var(--muted)]">{filter === 'unread' && !type ? 'No unread notifications.' : filter === 'all' && !type ? 'No notifications.' : 'No notifications match your filters.'}</div> : <div className="notification-rows">
          {data.items.map(item => {
            const { Icon, style } = notificationVisual(item);
            const target = notificationTarget(item);
            const isExpanded = expanded.includes(item.id);
            const message = adminDisplayText(item.message);
            const canExpand = message.length > 160 || message.includes('\n');
            return <div key={item.id}
              className={`notification-row ${item.is_read ? '' : 'is-unread'}${target ? ' is-navigable' : ''}`}
              tabIndex={target && !busy ? 0 : undefined}
              role={target ? 'group' : undefined}
              aria-label={target ? `${adminDisplayText(item.title)}. ${target.label}. Press Enter to open.` : undefined}
              onDoubleClick={target ? event => {
                // Buttons and other interactive descendants keep their own actions.
                if (busy || (event.target instanceof Element && event.target.closest('button, a, input, select, textarea, [role="button"]'))) return;
                void openNotification(item);
              } : undefined}
              onKeyDown={target ? event => {
                if (event.target !== event.currentTarget || busy || event.repeat || event.key !== 'Enter') return;
                event.preventDefault();
                void openNotification(item);
              } : undefined}>
              <span className={`notification-type-icon ${style}`} aria-hidden="true"><Icon size={16}/></span>
              <div className="min-w-0 flex-1 break-words">
                <div className="flex flex-wrap items-center gap-2"><strong className="text-[14px] font-semibold">{adminDisplayText(item.title)}</strong>{!item.is_read && <span className="h-2 w-2 rounded-full bg-orange-500" aria-label="Unread"/>}</div>
                <p className={`mt-1 whitespace-pre-wrap text-[13px] text-[var(--text)] ${!isExpanded && canExpand ? 'line-clamp-2' : ''}`}>{message}</p>
                <p className="mt-2 text-[12px] text-[var(--muted)]">{typeLabel(item.notifications_type)} · {dateLabel(item.created_at)}</p>
                {canExpand && <div className="mt-2">
                  <button type="button" aria-expanded={isExpanded} className="notification-text-action text-[13px] font-medium text-[var(--muted)]" onClick={() => setExpanded(old => isExpanded ? old.filter(id => id !== item.id) : [...old, item.id])}>{isExpanded ? 'Show less' : 'Show more'}</button>
                </div>}
              </div>
              <div className="notification-actions">
                {!item.is_read && <button type="button" disabled={busy} title="Mark as read" aria-label="Mark as read" className="button button-secondary" onClick={() => markOne(item)}><CheckCheck size={15}/></button>}
                <button type="button" disabled={busy} title="Delete notification" aria-label="Delete notification" className="button button-secondary" onClick={() => removeOne(item)}><Trash2 size={15}/></button>
              </div>
            </div>;
          })}
        </div>}
        <div className="notification-pagination">
          <span>{first ? `Showing ${first}–${last} of ${data.total} notifications` : '0 notifications'}</span>
          <div className="flex items-center gap-2"><button type="button" className="button button-secondary" aria-label="Previous page" disabled={busy || page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}><ChevronLeft size={16}/></button><span>Page {page} of {totalPages}</span><button type="button" className="button button-secondary" aria-label="Next page" disabled={busy || page >= totalPages} onClick={() => setPage(value => value + 1)}><ChevronRight size={16}/></button></div>
        </div>
      </>}
    </section>
    </div>
  </AdminPageShell>;
}
