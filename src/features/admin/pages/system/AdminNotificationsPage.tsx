import { adminDisplayText } from '../../utils/adminDisplayText';
import { OperatorLoadingState } from '../../../operator/components/OperatorLoadingState';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AdminPageShell } from '../../components/AdminPageShell';
import { adminOperationsApi, apiError, type NotificationApi } from '../../api/adminOperationsApi';

const PAGE_SIZE = 50;
const REFRESH_MS = 60_000;

function notifyHeader() { window.dispatchEvent(new Event('admin-notifications-updated')); }

export function AdminNotificationsPage() {
  const [items, setItems] = useState<NotificationApi[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await adminOperationsApi.notificationsPage(1, PAGE_SIZE);
      setItems((current) => silent && current.length > data.items.length
        ? [...data.items, ...current.filter((old) => !data.items.some((item) => item.id === old.id))]
        : data.items);
      if (!silent) setPage(1);
      setTotal(data.total);
      setUnreadCount(data.unread_count);
      setError('');
    }
    catch (cause) { if (!silent) setError(apiError(cause)); }
    finally { if (!silent) setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(true), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);
  async function loadMore() {
    if (saving || loading) return;
    setSaving(true);
    try {
      const data = await adminOperationsApi.notificationsPage(page + 1, PAGE_SIZE);
      setItems((current) => [...current, ...data.items.filter((item) => !current.some((old) => old.id === item.id))]);
      setPage(page + 1);
      setTotal(data.total);
      setUnreadCount(data.unread_count);
    }
    catch (cause) { setError(apiError(cause)); }
    finally { setSaving(false); }
  }
  async function mutate(action: () => Promise<unknown>) {
    if (saving) return;
    setSaving(true);
    try { await action(); await refresh(true); notifyHeader(); setError(''); }
    catch (cause) { setError(apiError(cause)); }
    finally { setSaving(false); }
  }
  const markOne = (item: NotificationApi) => { if (!item.is_read) void mutate(async () => { await adminOperationsApi.markNotification(item.id); setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_read: true } : entry)); }); };
  const markAll = () => void mutate(async () => { await adminOperationsApi.markNotificationsRead(); setItems((current) => current.map((entry) => ({ ...entry, is_read: true }))); });
  const deleteOne = (item: NotificationApi) => void mutate(async () => { await adminOperationsApi.deleteNotification(item.id); setItems((current) => current.filter((entry) => entry.id !== item.id)); });
  const clearRead = () => void mutate(async () => { await adminOperationsApi.clearReadNotifications(); setItems((current) => current.filter((entry) => !entry.is_read)); });
  const hasRead = items.some((item) => item.is_read);
  const actionClass = 'inline-flex items-center gap-2 rounded-lg border border-[var(--admin-border)] px-3 py-2 text-[12px] disabled:opacity-50';
  return <AdminPageShell title="Admin notifications" description="Stay informed about updates and alerts for your account." actions={<div className="flex gap-2">
    <button type="button" disabled={saving || loading || unreadCount === 0} onClick={markAll} className={actionClass}><CheckCheck size={14}/>Mark all read</button>
    <button type="button" disabled={saving || loading || !hasRead} onClick={clearRead} className={actionClass}><Trash2 size={14}/>Clear read</button>
  </div>}>
    {error && <p role="alert" className="mb-3 text-sm text-red-500">{error} <button type="button" className="text-button" onClick={() => void refresh()}>Retry</button></p>}
    {loading && <OperatorLoadingState label="Loading notifications…" />}
    <div className="space-y-3">{items.map((item) => <div key={item.id} className="flex items-stretch gap-2">
      <button disabled={saving || item.is_read} type="button" onClick={() => markOne(item)} className={`flex min-w-0 flex-1 gap-3 rounded-xl border p-4 text-left ${item.is_read ? 'border-[var(--admin-border)] bg-[var(--admin-surface)] opacity-70' : 'border-orange-500/20 bg-orange-500/[0.04]'}`}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--admin-surface-2)] text-orange-500"><Bell size={16}/></span>
        <span className="min-w-0 flex-1"><strong className="text-[13px]">{adminDisplayText(item.title)}</strong><span className="block mt-1 text-[12px] text-[var(--admin-muted)]">{adminDisplayText(item.message)}</span><span className="block mt-2 text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">{adminDisplayText(item.notifications_type)} · {new Date(item.created_at).toLocaleString('en-GB')}</span></span>
        <span className="text-[11px]">{item.is_read ? 'Read' : 'Unread'}</span>
      </button>
      <button type="button" disabled={saving} onClick={() => deleteOne(item)} aria-label="Delete notification" title="Delete notification" className="grid w-10 shrink-0 place-items-center rounded-xl border border-[var(--admin-border)] text-[var(--admin-muted)] hover:text-red-500 disabled:opacity-50"><Trash2 size={14}/></button>
    </div>)}
    {!loading && items.length === 0 && <p className="p-4 text-sm text-muted-foreground">No notifications.</p>}
    {items.length < total && <div className="flex justify-center"><button type="button" disabled={saving || loading} onClick={() => void loadMore()} className={actionClass}>Load more ({total - items.length} remaining)</button></div>}</div>
  </AdminPageShell>;
}
