import { invalidateAdminReads } from '../../api/adminHttp';
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

  return <AdminPageShell
    title="Activity Logs"
    description="Review user actions and their outcomes."
    actions={<ActionButton variant="secondary" disabled={loading} onClick={() => { invalidateAdminReads('/admin/activity-logs'); setRefreshKey(k => k + 1); }}><RefreshCw size={15} /> Refresh</ActionButton>}
  >
    <OperatorPanel className="flush-panel admin-logs-panel">
      <form onSubmit={apply}>
        <AdminToolbar
          searchValue={draft.user_id ?? ''}
          onSearchChange={(value) => setDraft(current => ({ ...current, user_id: value }))}
          placeholder="Search user ID or email…"
          filters={<>
            <AdminSelect aria-label="Filter by role" value={draft.role ?? ''} onChange={event => setDraft(current => ({ ...current, role: event.target.value }))}>
              <option value="">All roles</option><option value="ADMIN">Admin</option><option value="OPERATOR">Operator</option><option value="TECHNICIAN">Technician</option><option value="CUSTOMER">Customer</option>
            </AdminSelect>
            <AdminSelect aria-label="Filter by status" value={draft.status ?? ''} onChange={event => setDraft(current => ({ ...current, status: (event.target.value || undefined) as ActivityLogFilters['status'] }))}>
              <option value="">All statuses</option><option value="success">Success</option><option value="failed">Failed</option>
            </AdminSelect>
            <ActionButton type="submit" disabled={loading}>Apply filters</ActionButton>
          </>}
        />
      </form>
      {error && <p role="alert" className="border-b border-[var(--border)] p-4 text-sm text-red-600">{error}</p>}
      {loading && <OperatorLoadingState label="Loading activity logs…" />}
      {!loading && !error && <OperatorTable className="admin-logs-table" aria-label="Activity logs">
        <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Role</TableHead><TableHead>Resource</TableHead><TableHead>Description</TableHead><TableHead className="admin-log-pinned">Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {items.map(log => <TableRow key={log.id}>
            <TableCell className="whitespace-nowrap">{formatDate(log.created_at)}</TableCell>
            <TableCell><span className="admin-log-primary">{log.user_email || log.user_id || 'System / unknown user'}</span></TableCell>
            <TableCell>{adminDisplayText(log.action.replace(/_/g, ' '))}</TableCell>
            <TableCell>{log.role ?? '—'}</TableCell>
            <TableCell><span className="admin-log-primary">{adminDisplayText(log.resource_type)}</span>{log.resource_id && <span className="admin-log-secondary"> · {log.resource_id}</span>}</TableCell>
            <TableCell className="admin-log-message-cell"><span className="admin-log-message" title={adminDisplayText(log.description)}>{adminDisplayText(log.description)}</span></TableCell>
            <TableCell className="admin-log-pinned"><StatusBadge tone={log.status.toLowerCase() === 'success' ? 'success' : log.status.toLowerCase() === 'failed' ? 'danger' : 'neutral'}>{log.status}</StatusBadge></TableCell>
          </TableRow>)}
          {items.length === 0 && <TableRow><TableCell colSpan={7} className="admin-log-empty">{Object.values(filters).some(Boolean) ? 'No activity logs match your filters.' : 'No activity logs yet.'}</TableCell></TableRow>}
        </TableBody>
      </OperatorTable>}
      {!error && !loading && <LogsPagination page={page} pageSize={PAGE_SIZE} total={total} loading={loading} onPageChange={setPage} />}
    </OperatorPanel>
  </AdminPageShell>;
}
