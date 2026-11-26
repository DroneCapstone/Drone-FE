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
        if (live) { setItems([]); setTotal(0); setError(adminErrorText(cause, 'Unable to load activity logs. Please try again.')); }
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
    description="Review user actions and their outcomes."
    actions={<ActionButton variant="secondary" disabled={loading} onClick={() => setRefreshKey(k => k + 1)}><RefreshCw size={15} /> Refresh</ActionButton>}
  >
    <div className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
      <form onSubmit={apply}>
        <AdminToolbar
          searchValue={draft.user_id ?? ''}
          onSearchChange={(value) => setDraft(current => ({ ...current, user_id: value }))}
          placeholder="Search user ID or email…"
          filters={<>
            {/* <input
              className="h-[37px] min-w-[150px] px-3 text-[13px]"
              aria-label="Filter by action"
              placeholder="Action…"
              value={draft.action ?? ''}
              onChange={event => setDraft(current => ({ ...current, action: event.target.value }))}
            /> */}
            <AdminSelect aria-label="Filter by role" value={draft.role ?? ''} onChange={event => setDraft(current => ({ ...current, role: event.target.value }))}>
              <option value="">All roles</option><option value="ADMIN">Admin</option><option value="OPERATOR">Operator</option><option value="TECHNICIAN">Technician</option><option value="CUSTOMER">Customer</option>
            </AdminSelect>
            {/* <input
              className="h-[37px] min-w-[150px] px-3 text-[13px]"
              aria-label="Filter by resource type"
              placeholder="Resource type…"
              value={draft.resource_type ?? ''}
              onChange={event => setDraft(current => ({ ...current, resource_type: event.target.value }))}
            /> */}
            <AdminSelect aria-label="Filter by status" value={draft.status ?? ''} onChange={event => setDraft(current => ({ ...current, status: (event.target.value || undefined) as ActivityLogFilters['status'] }))}>
              <option value="">All statuses</option><option value="success">Success</option><option value="failed">Failed</option>
            </AdminSelect>
            {/* <ActionButton type="button" variant="secondary" onClick={reset} disabled={loading}>Reset</ActionButton> */}
            <ActionButton type="submit" disabled={loading}>Apply filters</ActionButton>
          </>}
        />
      </form>
      {error && <p role="alert" className="border-b border-[var(--admin-border)] p-4 text-sm text-red-600">{error}</p>}
      {loading && <OperatorLoadingState label="Loading activity logs…" />}
      {!loading && !error && <div className="table-wrap"><table>
        <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Role</th><th>Resource</th><th>Status</th><th>Description</th></tr></thead>
        <tbody>
          {items.map(log => <tr key={log.id}>
            <td className="whitespace-nowrap">{formatDate(log.created_at)}</td>
            <td><strong>{log.user_email || '—'}</strong><small>{log.user_id || 'System / unknown user'}</small></td>
            <td>{adminDisplayText(log.action.replace(/_/g, ' '))}</td>
            <td>{log.role ?? '—'}</td>
            <td><strong>{adminDisplayText(log.resource_type)}</strong><small>{log.resource_id ?? ''}</small></td>
            <td><StatusBadge tone={log.status.toLowerCase() === 'success' ? 'success' : log.status.toLowerCase() === 'failed' ? 'danger' : 'neutral'}>{log.status}</StatusBadge></td>
            <td className="min-w-[220px] max-w-md"><small className="whitespace-normal break-words">{adminDisplayText(log.description)}</small></td>
          </tr>)}
          {items.length === 0 && <tr><td colSpan={7} className="p-5 text-center">No activity logs match your filters.</td></tr>}
        </tbody>
      </table></div>}
      {!error && !loading && <LogsPagination page={page} pageSize={PAGE_SIZE} total={total} loading={loading} onPageChange={setPage} />}
    </div>
  </AdminPageShell>;
}
