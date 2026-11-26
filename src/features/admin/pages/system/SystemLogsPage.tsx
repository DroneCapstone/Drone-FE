import { AdminSelect } from '../../components/AdminSelect';
import { adminDisplayText, adminErrorText } from '../../utils/adminDisplayText';
import { OperatorLoadingState } from '../../../operator/components/OperatorLoadingState';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { OperatorTable, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../operator/components/OperatorTable';
import './AdminLogsTable.css';
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
  const tone = (level: string): 'info' | 'warning' | 'danger' | 'neutral' =>
    ['ERROR', 'CRITICAL'].includes(level.toUpperCase()) ? 'danger' : level.toUpperCase() === 'WARNING' ? 'warning' : level.toUpperCase() === 'INFO' ? 'info' : 'neutral';

  return <AdminPageShell title="System Logs" description="Monitor system events, warnings and errors."
    actions={<ActionButton variant="secondary" disabled={loading} onClick={() => setRefreshKey(k => k + 1)}><RefreshCw size={15} /> Refresh</ActionButton>}
  >
    <OperatorPanel className="flush-panel admin-logs-panel">
      <form onSubmit={apply}>
        <AdminToolbar
          searchValue={draft.source ?? ''}
          onSearchChange={(value) => setDraft(current => ({ ...current, source: value }))}
          placeholder="Search source…"
          filters={<>
            <AdminSelect aria-label="Filter by level" value={draft.level ?? ''} onChange={event => setDraft(current => ({ ...current, level: (event.target.value || undefined) as SystemLogFilters['level'] }))}>
              <option value="">All levels</option><option>INFO</option><option>WARNING</option><option>ERROR</option><option>CRITICAL</option>
            </AdminSelect>
            <ActionButton type="submit" disabled={loading}>Apply filters</ActionButton>
          </>}
        />
      </form>
      {error && <p role="alert" className="border-b border-[var(--border)] p-4 text-sm text-red-600">{error}</p>}
      {loading && <OperatorLoadingState label="Loading system logs…" />}
      {!loading && !error && <OperatorTable className="admin-logs-table" aria-label="System logs">
        <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Source</TableHead><TableHead>Event</TableHead><TableHead>Message</TableHead><TableHead className="admin-log-pinned">Level</TableHead></TableRow></TableHeader>
        <TableBody>
          {items.map(log => <TableRow key={log.id}>
            <TableCell className="whitespace-nowrap">{formatDate(log.created_at)}</TableCell>
            <TableCell><span className="admin-log-primary">{adminDisplayText(log.source)}</span></TableCell>
            <TableCell>{adminDisplayText(log.event.replace(/_/g, ' '))}</TableCell>
            <TableCell className="admin-log-message-cell"><span className="admin-log-message" title={adminDisplayText(log.message)}>{adminDisplayText(log.message)}</span></TableCell>
            <TableCell className="admin-log-pinned"><StatusBadge tone={tone(log.level)}>{log.level}</StatusBadge></TableCell>
          </TableRow>)}
          {items.length === 0 && <TableRow><TableCell colSpan={5} className="admin-log-empty">{Object.values(filters).some(Boolean) ? 'No system logs match your filters.' : 'No system logs yet.'}</TableCell></TableRow>}
        </TableBody>
      </OperatorTable>}
      {!error && !loading && <LogsPagination page={page} pageSize={PAGE_SIZE} total={total} loading={loading} onPageChange={setPage} />}
    </OperatorPanel>
  </AdminPageShell>;
}
