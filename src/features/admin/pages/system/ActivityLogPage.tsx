import { Activity, RefreshCw, Search } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { AdminPageShell } from '../../components/AdminPageShell';
import { LogsPagination } from '../../components/LogsPagination';
import { adminLogsApi, type ActivityLogFilters, type ActivityLogItem } from '../../api/adminLogsApi';

const PAGE_SIZE = 20;
const formatDate = (date: string) => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleString('en-GB');
};
const blankFilters = (): ActivityLogFilters => ({ user_id: '', action: '', role: '', resource_type: '', status: undefined });

export function ActivityLogPage() {
  const [draft, setDraft] = useState<ActivityLogFilters>(blankFilters);
  const [filters, setFilters] = useState<ActivityLogFilters>(blankFilters);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [items, setItems] = useState<ActivityLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    void adminLogsApi.activity({ ...filters, page, page_size: PAGE_SIZE })
      .then(response => { if (live) { setItems(response.items); setTotal(response.total); } })
      .catch((cause: unknown) => {
        if (live) { setItems([]); setTotal(0); setError(cause instanceof Error ? cause.message : 'Unable to load Activity Logs.'); }
      })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [page, filters, refreshKey]);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1); setFilters({ ...draft });
  }
  function reset() { const empty = blankFilters(); setDraft(empty); setFilters(empty); setPage(1); }

  return <AdminPageShell
    title="Activity Logs"
    description="Recorded user actions across Admin, Operator, Technician and Customer accounts."
    actions={<ActionButton variant="secondary" disabled={loading} onClick={() => setRefreshKey(k => k + 1)}><RefreshCw size={15}/> Refresh</ActionButton>}
  >
    <div className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
      <form onSubmit={apply} className="border-b border-[var(--admin-border)] p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="min-w-0 text-[11px] font-semibold text-[var(--admin-muted)]">User ID or email
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-[var(--admin-border)] px-3"><Search size={14}/><input className="w-full min-w-0 bg-transparent py-2 text-[12px] font-normal outline-none" placeholder="Search account…" value={draft.user_id ?? ''} onChange={e => setDraft({ ...draft, user_id: e.target.value })}/></div>
          </label>
          <label className="min-w-0 text-[11px] font-semibold text-[var(--admin-muted)]">Action
            <input className="mt-1 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-[12px] font-normal outline-none" placeholder="LOGIN, CREATE_ORDER…" value={draft.action ?? ''} onChange={e => setDraft({ ...draft, action: e.target.value })}/>
          </label>
          <label className="min-w-0 text-[11px] font-semibold text-[var(--admin-muted)]">Role
            <select className="mt-1 w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-[12px] font-normal" value={draft.role ?? ''} onChange={e => setDraft({ ...draft, role: e.target.value })}>
              <option value="">All roles</option><option value="ADMIN">Admin</option><option value="OPERATOR">Operator</option><option value="TECHNICIAN">Technician</option><option value="CUSTOMER">Customer</option>
            </select>
          </label>
          <label className="min-w-0 text-[11px] font-semibold text-[var(--admin-muted)]">Resource type
            <input className="mt-1 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-[12px] font-normal outline-none" placeholder="order, mission, drone…" value={draft.resource_type ?? ''} onChange={e => setDraft({ ...draft, resource_type: e.target.value })}/>
          </label>
          <label className="min-w-0 text-[11px] font-semibold text-[var(--admin-muted)]">Status
            <select className="mt-1 w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-[12px] font-normal" value={draft.status ?? ''} onChange={e => setDraft({ ...draft, status: (e.target.value || undefined) as ActivityLogFilters['status'] })}>
              <option value="">All statuses</option><option value="success">Success</option><option value="failed">Failed</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2"><span className="text-xs text-[var(--admin-muted)]">Filters apply to all records on Backend.</span><div className="flex gap-2"><ActionButton variant="secondary" onClick={reset} disabled={loading}>Reset</ActionButton><ActionButton type="submit" disabled={loading}>Apply filters</ActionButton></div></div>
      </form>
      {error && <p role="alert" className="border-b border-[var(--admin-border)] p-4 text-sm text-red-600">{error}</p>}
      {loading && <p role="status" className="p-5 text-sm text-[var(--admin-muted)]">Loading Activity Logs from Backend…</p>}
      {!loading && !error && <div className="divide-y divide-[var(--admin-border)]">
        {items.map(log => <div key={log.id} className="flex items-start gap-3 px-4 py-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-orange-500/10 text-orange-500"><Activity size={17}/></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2"><strong className="break-all text-[13px]">{log.user_email || log.user_id || 'System / unknown user'}</strong><time dateTime={log.created_at} className="text-[11px] text-[var(--admin-muted)]">{formatDate(log.created_at)}</time></div>
            <div className="mt-1 flex flex-wrap items-center gap-2"><span className="font-medium text-[12px]">{log.action.replace(/_/g, ' ')}</span><StatusBadge tone={log.status.toLowerCase() === 'success' ? 'success' : log.status.toLowerCase() === 'failed' ? 'danger' : 'neutral'}>{log.status}</StatusBadge></div>
            {log.description && <p className="mt-2 text-[12px] text-[var(--admin-text)]">{log.description}</p>}
            <p className="mt-1 text-[11px] text-[var(--admin-muted)]">{log.role ?? '—'} · {log.resource_type ?? '—'}{log.resource_id ? ` / ${log.resource_id}` : ''}</p>
          </div>
        </div>)}
        {items.length === 0 && <p className="p-5 text-sm text-[var(--admin-muted)]">No Activity Logs match these filters.</p>}
      </div>}
      {!error && !loading && <LogsPagination page={page} pageSize={PAGE_SIZE} total={total} loading={loading} onPageChange={setPage}/>}
    </div>
  </AdminPageShell>;
}
