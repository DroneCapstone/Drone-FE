import { adminDisplayText, adminDetailText } from '../../utils/adminDisplayText';
import { OperatorLoadingState } from '../../../operator/components/OperatorLoadingState';
import { useEffect, useState } from 'react';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { AdminPageShell } from '../../components/AdminPageShell';
import { AdminToolbar } from '../../components/AdminToolbar';
import { adminOperationsApi, apiError, type AuditApi } from '../../api/adminOperationsApi';
import { ActionButton } from '../../../../components/ui/ActionButton';

/** BE audit.user_id is the actor, NOT the account which was modified. */
export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AuditApi[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true; setLoading(true);
    void adminOperationsApi.audit(page).then((result) => {
      if (!live) return;
      if (!Array.isArray(result.items) || typeof result.total !== 'number') throw new Error('Unexpected Audit Logs response.');
      setItems(result.items); setTotal(result.total); setError('');
    }).catch((cause: unknown) => { if (live) setError(apiError(cause)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [page]);
  const visible = items.filter((log) => `${adminDisplayText(log.action)} ${log.resource_table ?? ''} ${log.user_id ?? ''} ${JSON.stringify(log.details_json ?? {})}`.toLowerCase().includes(query.toLowerCase()));
  return <AdminPageShell title="Audit Logs" description="Review recorded actions and the users who performed them.">
    {error && <p role="alert" className="mb-4 text-sm text-red-500">{error}</p>}
    <OperatorPanel className="flush-panel">
      <AdminToolbar searchValue={query} onSearchChange={setQuery} placeholder="Search action, actor or resource on this page…" meta={`${visible.length} shown · ${total} total records`}/>
      {loading && <OperatorLoadingState label="Loading audit logs…" />}
      <div className="table-wrap"><table><thead><tr><th>Time</th><th>Actor ID</th><th>Action</th><th>Resource</th><th>Event details</th></tr></thead><tbody>
        {visible.map((log) => <tr key={log.id}><td>{new Date(log.created_at).toLocaleString('en-GB')}</td><td><strong>{log.user_id ?? 'System'}</strong></td><td>{adminDisplayText(log.action)}</td><td>{adminDisplayText(log.resource_table)}</td><td><small>{log.details_json ? adminDetailText(log.details_json) : '—'}</small></td></tr>)}
        {!loading && visible.length === 0 && <tr><td colSpan={5}>No audit entries found.</td></tr>}
      </tbody></table></div>
      <div className="flex items-center justify-end gap-3 border-t border-border p-4"><ActionButton variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Previous</ActionButton><span className="text-xs">Page {page} / {Math.max(1, Math.ceil(total / 30))}</span><ActionButton variant="secondary" disabled={page * 30 >= total || loading} onClick={() => setPage((p) => p + 1)}>Next</ActionButton></div>
    </OperatorPanel>
  </AdminPageShell>;
}
