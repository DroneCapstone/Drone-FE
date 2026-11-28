import { OperatorTable, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../operator/components/OperatorTable";
import { invalidateAdminReads } from '../../api/adminHttp';
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
    {error && <p role="alert" className="mb-3 text-sm text-red-500">{error} <button type="button" className="text-button" onClick={() => { invalidateAdminReads(); void refresh(); }}>Retry</button></p>}
    {!loading && !error && <OperatorPanel className="flush-panel">
      <AdminToolbar searchValue={query} onSearchChange={setQuery} placeholder="Search refund, payment, order or customer…" filters={<AdminSelect value={status} onChange={e => setStatus(e.target.value)}><option value="all">All status</option><option value="PENDING">Pending</option><option value="COMPLETED">Completed</option><option value="FAILED">Failed</option></AdminSelect>} meta={`${visible.length} ${visible.length === 1 ? 'refund' : 'refunds'}`} />
      <div className="table-wrap"><OperatorTable><TableHeader><TableRow><TableHead>Refund</TableHead><TableHead>Payment</TableHead><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead>Processed</TableHead></TableRow></TableHeader><TableBody>
        {visible.map((row, i) => <TableRow key={`${field(row, 'id', 'refund_id', 'order_id')}-${i}`}>
          <TableCell><strong>{field(row, 'id', 'refund_id')}</strong><small>{timestamp(row, 'requested_at', 'created_at')}</small></TableCell>
          <TableCell>{field(row, 'payment_id', 'transaction_id')}</TableCell><TableCell>{field(row, 'order_id')}</TableCell><TableCell>{field(row, 'customer_name', 'sender_name', 'customer_email')}</TableCell>
          <TableCell>{money(amount(row, 'refund_amount', 'amount', 'amount_vnd'))}</TableCell><TableCell>{field(row, 'refund_reason', 'reason')}</TableCell>
          <TableCell><StatusBadge tone={statusOf(row) === 'COMPLETED' ? 'success' : statusOf(row) === 'FAILED' ? 'danger' : 'warning'}>{statusOf(row)}</StatusBadge></TableCell>
          <TableCell>{timestamp(row, 'refund_at', 'processed_at', 'updated_at')}</TableCell>
        </TableRow>)}
        {!loading && !error && !visible.length && <TableRow><TableCell colSpan={8} className="p-5 text-center">{hasFilters ? 'No refunds match your filters.' : 'No refunds yet.'}</TableCell></TableRow>}
      </TableBody></OperatorTable></div>
    </OperatorPanel>}
  </AdminPageShell>;
}
