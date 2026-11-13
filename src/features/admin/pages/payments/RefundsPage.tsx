import { useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { AdminPageShell } from '../../components/AdminPageShell';
import { AdminToolbar } from '../../components/AdminToolbar';
import { adminOperationsApi, apiError } from '../../api/adminOperationsApi';
import { extractRows, field, amount, money, timestamp, type JsonRow } from '../../api/adminFinanceAdapter';

// GET /payments/refunds is the only data source. Previous prototype refunds are unused.
export function RefundsPage() {
  const [items, setItems] = useState<JsonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  async function refresh() {
    setLoading(true);
    try { setItems(extractRows(await adminOperationsApi.refunds(), ['refunds'])); setError(''); }
    catch (cause) { setItems([]); setError(apiError(cause)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  const statusOf = (row: JsonRow) => field(row, 'refund_status', 'status').toUpperCase();
  const visible = useMemo(() => items.filter(row =>
    (status === 'all' || status === statusOf(row)) && JSON.stringify(row).toLowerCase().includes(query.toLowerCase())), [items, query, status]);
  return <AdminPageShell title="Refunds" description="Refund records returned by Backend. Bank settlement must be verified with the payment provider.">
    {loading && <p className="mb-3 text-xs text-[var(--admin-muted)]">Loading refunds from Backend…</p>}
    {error && <p role="alert" className="mb-3 text-sm text-red-500">{error} <button type="button" className="text-button" onClick={() => void refresh()}>Retry</button></p>}
    <OperatorPanel className="flush-panel">
      <AdminToolbar searchValue={query} onSearchChange={setQuery} placeholder="Search refund, payment, order or customer…" filters={<select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All status</option><option value="PENDING">Pending</option><option value="COMPLETED">Completed</option><option value="FAILED">Failed</option></select>} meta={`${visible.length} refunds`} />
      <div className="table-wrap"><table><thead><tr><th>Refund</th><th>Payment</th><th>Order</th><th>Customer</th><th>Amount</th><th>Reason</th><th>Status</th><th>Processed</th></tr></thead><tbody>
        {visible.map((row, i) => <tr key={`${field(row, 'id', 'refund_id', 'order_id')}-${i}`}>
          <td><strong>{field(row, 'id', 'refund_id')}</strong><small>{timestamp(row, 'requested_at', 'created_at')}</small></td>
          <td>{field(row, 'payment_id', 'transaction_id')}</td><td>{field(row, 'order_id')}</td><td>{field(row, 'customer_name', 'sender_name', 'customer_email')}</td>
          <td>{money(amount(row, 'refund_amount', 'amount', 'amount_vnd'))}</td><td>{field(row, 'refund_reason', 'reason')}</td>
          <td><StatusBadge tone={statusOf(row) === 'COMPLETED' ? 'success' : statusOf(row) === 'FAILED' ? 'danger' : 'warning'}>{statusOf(row)}</StatusBadge></td>
          <td>{timestamp(row, 'refund_at', 'processed_at', 'updated_at')}</td>
        </tr>)}
        {!loading && !visible.length && <tr><td colSpan={8} className="p-5 text-center">No Backend refunds returned.</td></tr>}
      </tbody></table></div>
    </OperatorPanel>
  </AdminPageShell>;
}
