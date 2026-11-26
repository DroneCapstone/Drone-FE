import { AdminSelect } from '../../components/AdminSelect';
import { adminDisplayText, adminErrorText } from '../../utils/adminDisplayText';
import { OperatorLoadingState } from '../../../operator/components/OperatorLoadingState';
import { RefreshCw } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { AdminPageShell } from '../../components/AdminPageShell';
import { LogsPagination } from '../../components/LogsPagination';
import { AdminToolbar } from '../../components/AdminToolbar';
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
        if (live) { setItems([]); setTotal(0); setError(adminErrorText(cause, 'Unable to load system logs. Please try again.')); }
      })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [page, filters, refreshKey]);

  function apply(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setPage(1); setFilters({ ...draft }); }
  function reset() { const empty = blankFilters(); setDraft(empty); setFilters(empty); setPage(1); }
  const tone = (level: string): 'info' | 'warning' | 'danger' | 'neutral' =>
    ['ERROR', 'CRITICAL'].includes(level.toUpperCase()) ? 'danger' : level.toUpperCase() === 'WARNING' ? 'warning' : level.toUpperCase() === 'INFO' ? 'info' : 'neutral';

  return <AdminPageShell title="System Logs" description="Monitor system events, warnings and errors."
    actions={<ActionButton variant="secondary" disabled={loading} onClick={() => setRefreshKey(k => k + 1)}><RefreshCw size={15} /> Refresh</ActionButton>}
  >
    <div className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
      <form onSubmit={apply}>
        <AdminToolbar
          searchValue={draft.source ?? ''}
          onSearchChange={(value) => setDraft(current => ({ ...current, source: value }))}
          placeholder="Search source…"
          filters={<>
            <AdminSelect aria-label="Filter by level" value={draft.level ?? ''} onChange={event => setDraft(current => ({ ...current, level: (event.target.value || undefined) as SystemLogFilters['level'] }))}>
              <option value="">All levels</option><option>INFO</option><option>WARNING</option><option>ERROR</option><option>CRITICAL</option>
            </AdminSelect>
            {/* <input
              className="h-[37px] min-w-[180px] px-3 text-[13px]"
              aria-label="Filter by event"
              placeholder="Event…"
              value={draft.event ?? ''}
              onChange={event => setDraft(current => ({ ...current, event: event.target.value }))}
            /> */}
            {/* <ActionButton type="button" variant="secondary" onClick={reset} disabled={loading}>Reset</ActionButton> */}
            <ActionButton type="submit" disabled={loading}>Apply filters</ActionButton>
          </>}
        />
      </form>
      {error && <p role="alert" className="border-b border-[var(--admin-border)] p-4 text-sm text-red-600">{error}</p>}
      {loading && <OperatorLoadingState label="Loading system logs…" />}
      {!loading && !error && <div className="table-wrap"><table>
        <thead><tr><th>Time</th><th>Source</th><th>Event</th><th>Level</th><th>Message</th></tr></thead>
        <tbody>
          {items.map(log => <tr key={log.id}>
            <td className="whitespace-nowrap">{formatDate(log.created_at)}</td>
            <td><strong>{adminDisplayText(log.source)}</strong></td>
            <td>{adminDisplayText(log.event.replace(/_/g, ' '))}</td>
            <td><StatusBadge tone={tone(log.level)}>{log.level}</StatusBadge></td>
            <td className="min-w-[260px] max-w-2xl"><small className="whitespace-normal break-words">{adminDisplayText(log.message)}</small></td>
          </tr>)}
          {items.length === 0 && <tr><td colSpan={5} className="p-5 text-center">No system logs match your filters.</td></tr>}
        </tbody>
      </table></div>}
      {!error && !loading && <LogsPagination page={page} pageSize={PAGE_SIZE} total={total} loading={loading} onPageChange={setPage} />}
    </div>
  </AdminPageShell>;
}
