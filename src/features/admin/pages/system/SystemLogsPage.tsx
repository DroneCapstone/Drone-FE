import { RefreshCw, ServerCog } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { AdminPageShell } from '../../components/AdminPageShell';
import { LogsPagination } from '../../components/LogsPagination';
import { adminLogsApi, type SystemLogFilters, type SystemLogItem } from '../../api/adminLogsApi';

const PAGE_SIZE = 50;
const blankFilters = (): SystemLogFilters => ({ source: '', event: '', level: undefined });
const formatDate = (date: string) => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleString('en-GB');
};

export function SystemLogsPage() {
  const [draft, setDraft] = useState<SystemLogFilters>(blankFilters);
  const [filters, setFilters] = useState<SystemLogFilters>(blankFilters);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [items, setItems] = useState<SystemLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    void adminLogsApi.system({ ...filters, page, page_size: PAGE_SIZE })
      .then(response => { if (live) { setItems(response.items); setTotal(response.total); } })
      .catch((cause: unknown) => {
        if (live) { setItems([]); setTotal(0); setError(cause instanceof Error ? cause.message : 'Unable to load System Logs.'); }
      })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [page, filters, refreshKey]);

  function apply(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setPage(1); setFilters({ ...draft }); }
  function reset() { const empty = blankFilters(); setDraft(empty); setFilters(empty); setPage(1); }
  const tone = (level: string): 'info' | 'warning' | 'danger' | 'neutral' =>
    ['ERROR', 'CRITICAL'].includes(level.toUpperCase()) ? 'danger' : level.toUpperCase() === 'WARNING' ? 'warning' : level.toUpperCase() === 'INFO' ? 'info' : 'neutral';

  return <AdminPageShell title="System Logs" description="Automatic platform events: background workers, scheduled tasks and errors."
    actions={<ActionButton variant="secondary" disabled={loading} onClick={() => setRefreshKey(k => k + 1)}><RefreshCw size={15}/> Refresh</ActionButton>}
  >
    <div className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
      <form onSubmit={apply} className="border-b border-[var(--admin-border)] p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="text-[11px] font-semibold text-[var(--admin-muted)]">Worker / source
            <input className="mt-1 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-[12px] font-normal outline-none" placeholder="run_deadline_alert_watcher…" value={draft.source ?? ''} onChange={e => setDraft({ ...draft, source: e.target.value })}/>
          </label>
          <label className="text-[11px] font-semibold text-[var(--admin-muted)]">Level
            <select className="mt-1 w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-[12px] font-normal" value={draft.level ?? ''} onChange={e => setDraft({ ...draft, level: (e.target.value || undefined) as SystemLogFilters['level'] })}>
              <option value="">All levels</option><option>INFO</option><option>WARNING</option><option>ERROR</option><option>CRITICAL</option>
            </select>
          </label>
          <label className="text-[11px] font-semibold text-[var(--admin-muted)]">Event
            <input className="mt-1 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-[12px] font-normal outline-none" placeholder="WORKER_RUN, MISSION_AUTO_CANCEL…" value={draft.event ?? ''} onChange={e => setDraft({ ...draft, event: e.target.value })}/>
          </label>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2"><span className="text-xs text-[var(--admin-muted)]">Server-side filters</span><div className="flex gap-2"><ActionButton variant="secondary" onClick={reset} disabled={loading}>Reset</ActionButton><ActionButton type="submit" disabled={loading}>Apply filters</ActionButton></div></div>
      </form>
      {error && <p role="alert" className="border-b border-[var(--admin-border)] p-4 text-sm text-red-600">{error}</p>}
      {loading && <p role="status" className="p-5 text-sm text-[var(--admin-muted)]">Loading System Logs from Backend…</p>}
      {!loading && !error && <div className="divide-y divide-[var(--admin-border)]">
        {items.map(log => <article key={log.id} className="flex items-start gap-3 px-4 py-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-orange-500/10 text-orange-500"><ServerCog size={17}/></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2"><strong className="break-all text-[12px]">{log.source}</strong><time dateTime={log.created_at} className="text-[11px] text-[var(--admin-muted)]">{formatDate(log.created_at)}</time></div>
            <div className="mt-1 flex flex-wrap items-center gap-2"><span className="text-[12px] font-semibold">{log.event.replace(/_/g, ' ')}</span><StatusBadge tone={tone(log.level)}>{log.level}</StatusBadge></div>
            <p className="mt-2 break-words text-[12px] text-[var(--admin-text)]">{log.message}</p>
          </div>
        </article>)}
        {items.length === 0 && <p className="p-5 text-sm text-[var(--admin-muted)]">No System Logs match these filters.</p>}
      </div>}
      {!error && !loading && <LogsPagination page={page} pageSize={PAGE_SIZE} total={total} loading={loading} onPageChange={setPage}/>}
    </div>
  </AdminPageShell>;
}
