import { Bell, CheckCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdminPageShell } from '../../components/AdminPageShell';
import { adminOperationsApi, apiError, type NotificationApi } from '../../api/adminOperationsApi';

export function AdminNotificationsPage() {
  const [items, setItems] = useState<NotificationApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function refresh() {
    setLoading(true);
    try { setItems(await adminOperationsApi.notifications()); setError(''); }
    catch (cause) { setError(apiError(cause)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  async function markOne(item: NotificationApi) {
    if (item.is_read || saving) return;
    setSaving(true);
    try { await adminOperationsApi.markNotification(item.id); await refresh(); }
    catch (cause) { setError(apiError(cause)); }
    finally { setSaving(false); }
  }
  async function markAll() {
    if (saving) return;
    setSaving(true);
    try { await adminOperationsApi.markNotificationsRead(); await refresh(); }
    catch (cause) { setError(apiError(cause)); }
    finally { setSaving(false); }
  }
  return <AdminPageShell title="Admin notifications" description="Notifications belonging to the current Admin account, loaded from Backend." actions={<button type="button" disabled={saving || loading || !items.some((item) => !item.is_read)} onClick={() => void markAll()} className="inline-flex items-center gap-2 rounded-lg border border-[var(--admin-border)] px-3 py-2 text-[12px]"><CheckCheck size={14}/>Mark all read</button>}>
    {error && <p role="alert" className="mb-3 text-sm text-red-500">{error} <button type="button" className="text-button" onClick={() => void refresh()}>Retry</button></p>}
    {loading && <p className="text-sm text-muted-foreground">Loading notifications…</p>}
    <div className="space-y-3">{items.map((item) => <button key={item.id} disabled={saving || item.is_read} type="button" onClick={() => void markOne(item)} className={`flex w-full gap-3 rounded-xl border p-4 text-left ${item.is_read ? 'border-[var(--admin-border)] bg-[var(--admin-surface)] opacity-70' : 'border-orange-500/20 bg-orange-500/[0.04]'}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--admin-surface-2)] text-orange-500"><Bell size={16}/></span>
      <span className="min-w-0 flex-1"><strong className="text-[13px]">{item.title}</strong><span className="block mt-1 text-[12px] text-[var(--admin-muted)]">{item.message}</span><span className="block mt-2 text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">{item.notifications_type} · {new Date(item.created_at).toLocaleString('en-GB')}</span></span>
      <span className="text-[11px]">{item.is_read ? 'Read' : 'Unread'}</span>
    </button>)}
    {!loading && items.length === 0 && <p className="p-4 text-sm text-muted-foreground">No notifications.</p>}</div>
  </AdminPageShell>;
}
