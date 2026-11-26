import { adminResourceJson } from '../../utils/adminAssetFields';
import { AdminSelect } from '../../components/AdminSelect';
import { useSearchParams } from 'react-router-dom';
import { OperatorLoadingState } from '../../../operator/components/OperatorLoadingState';
import { useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { AdminPageShell } from '../../components/AdminPageShell';
import { AdminToolbar } from '../../components/AdminToolbar';
import { adminOperationsApi, apiError } from '../../api/adminOperationsApi';
import { extractRows, field, amount, money, timestamp, type JsonRow } from '../../api/adminFinanceAdapter';

// GET /payments/refunds is the only data source. Previous prototype refunds are unused.
export function RefundsPage() {
  const [params] = useSearchParams();
  const initialQuery = params.get('q') ?? '';
  const [items, setItems] = useState<JsonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState('all');
  useEffect(() => { setQuery(initialQuery); setStatus('all'); }, [initialQuery]);
  async function refresh() {
    setLoading(true);
    try { setItems(extractRows(await adminOperationsApi.refunds(), ['refunds'])); setError(''); }
    catch (cause) { setItems([]); setError(apiError(cause)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  const statusOf = (row: JsonRow) => field(row, 'refund_status', 'status').toUpperCase();
  const hasFilters = query.trim().length > 0 || status !== 'all';
  const visible = useMemo(() => items.filter(row =>
    (status === 'all' || status === statusOf(row)) && adminResourceJson(row).toLowerCase().includes(query.trim().toLowerCase())), [items, query, status]);
  return <AdminPageShell title="Refunds" description="Track refund requests and their processing status. Final settlement is confirmed by the payment provider.">
    {loading && <OperatorLoadingState label="Loading refunds…" />}
    {error && <p role="alert" className="mb-3 text-sm text-red-500">{error} <button type="button" className="text-button" onClick={() => void refresh()}>Retry</button></p>}
    {!loading && !error && <OperatorPanel className="flush-panel">
      <AdminToolbar searchValue={query} onSearchChange={setQuery} placeholder="Search refund, payment, order or customer…" filters={<AdminSelect value={status} onChange={e => setStatus(e.target.value)}><option value="all">All status</option><option value="PENDING">Pending</option><option value="COMPLETED">Completed</option><option value="FAILED">Failed</option></AdminSelect>} meta={`${visible.length} ${visible.length === 1 ? 'refund' : 'refunds'}`} />
      <div className="table-wrap"><table><thead><tr><th>Refund</th><th>Payment</th><th>Order</th><th>Customer</th><th>Amount</th><th>Reason</th><th>Status</th><th>Processed</th></tr></thead><tbody>
        {visible.map((row, i) => <tr key={`${field(row, 'id', 'refund_id', 'order_id')}-${i}`}>
          <td><strong>{field(row, 'id', 'refund_id')}</strong><small>{timestamp(row, 'requested_at', 'created_at')}</small></td>
          <td>{field(row, 'payment_id', 'transaction_id')}</td><td>{field(row, 'order_id')}</td><td>{field(row, 'customer_name', 'sender_name', 'customer_email')}</td>
          <td>{money(amount(row, 'refund_amount', 'amount', 'amount_vnd'))}</td><td>{field(row, 'refund_reason', 'reason')}</td>
          <td><StatusBadge tone={statusOf(row) === 'COMPLETED' ? 'success' : statusOf(row) === 'FAILED' ? 'danger' : 'warning'}>{statusOf(row)}</StatusBadge></td>
          <td>{timestamp(row, 'refund_at', 'processed_at', 'updated_at')}</td>
        </tr>)}
        {!loading && !error && !visible.length && <tr><td colSpan={8} className="p-5 text-center">{hasFilters ? 'No refunds match your filters.' : 'No refunds yet.'}</td></tr>}
      </tbody></table></div>
    </OperatorPanel>}
  </AdminPageShell>;
}
