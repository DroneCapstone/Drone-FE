import { useEffect, useMemo, useState } from 'react';
import { CreditCard, CircleCheck, Clock3, CircleX } from 'lucide-react';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Dialog, DialogTitle } from '../../../../components/ui/Dialog';
import { AdminDialogContent as DialogContent } from '../../components/AdminDialogContent';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { AdminSummaryCard } from '../../components/AdminSummaryCard';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { AdminPageShell } from '../../components/AdminPageShell';
import { AdminToolbar } from '../../components/AdminToolbar';
import { adminOperationsApi, apiError } from '../../api/adminOperationsApi';
import { extractRows, field, amount, money, timestamp, type JsonRow } from '../../api/adminFinanceAdapter';

// The Backend currently publishes no response schema for GET /payments/transactions.
// Render only fields actually supplied by its response. Never fall back to prototype payments.
export function TransactionsPage() {
  const [items, setItems] = useState<JsonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<JsonRow | null>(null);
  const [reason, setReason] = useState('');

  async function refresh() {
    setLoading(true);
    try {
      setItems(extractRows(await adminOperationsApi.transactions(), ['transactions', 'payments']));
      setError('');
    } catch (cause) { setItems([]); setError(apiError(cause)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  const statusOf = (row: JsonRow) => field(row, 'payment_status', 'status').toUpperCase();
  const orderOf = (row: JsonRow) => field(row, 'order_id', 'orderId');
  const amountOf = (row: JsonRow) => amount(row, 'amount', 'amount_vnd', 'total_amount', 'paid_amount');
  const visible = useMemo(() => items.filter(row =>
    (status === 'all' || statusOf(row) === status)
    && JSON.stringify(row).toLowerCase().includes(query.toLowerCase())), [items, query, status]);
  const settled = items.filter(row => ['PAID', 'REFUNDED'].includes(statusOf(row)));
  const knownAmount = items.every(row => statusOf(row) !== '—') && settled.every(row => amountOf(row) !== null);
  const collected = settled.reduce((sum, row) => sum + (amountOf(row) ?? 0), 0);

  async function refund() {
    if (!selected || saving || !reason.trim() || statusOf(selected) !== 'PAID') return;
    const orderId = orderOf(selected);
    if (orderId === '—') { setError('This Backend payment row has no order_id to refund.'); return; }
    if (!window.confirm(`Submit a REAL refund for order ${orderId}? This action can affect customer funds and cannot be undone in the browser.`)) return;
    setSaving(true); setError('');
    try {
      const result = await adminOperationsApi.refundOrder(orderId, { reason: reason.trim() });
      setSelected(null); setReason('');
      setNotice(result.message || `Backend received refund request for order ${orderId}.`);
      await refresh();
    } catch (cause) { setError(apiError(cause)); }
    finally { setSaving(false); }
  }

  return <AdminPageShell title="Transactions" description="Payment transactions returned by Backend.">
    {loading && <p className="mb-3 text-xs text-[var(--admin-muted)]">Loading payments from Backend…</p>}
    {error && !selected && <p role="alert" className="mb-3 text-sm text-red-500">{error} <button type="button" className="text-button" onClick={() => void refresh()}>Retry</button></p>}
    {notice && <p role="status" className="mb-3 text-sm text-green-600">{notice}</p>}
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AdminSummaryCard label="Gross collected" value={knownAmount ? money(collected) : '—'} note="Backend paid/refunded transactions with known amounts" icon={CreditCard} />
      <AdminSummaryCard label="Paid" value={items.filter(row => statusOf(row) === 'PAID').length} note="Successful transactions" icon={CircleCheck} />
      <AdminSummaryCard label="Pending" value={items.filter(row => statusOf(row) === 'PENDING').length} note="Awaiting confirmation" icon={Clock3} />
      <AdminSummaryCard label="Failed / refunded" value={items.filter(row => ['FAILED', 'REFUNDED'].includes(statusOf(row))).length} note="No new capture" icon={CircleX} />
    </div>
    <OperatorPanel className="flush-panel">
      <AdminToolbar searchValue={query} onSearchChange={setQuery} placeholder="Search transaction, order or customer…" filters={<select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All status</option><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="FAILED">Failed</option><option value="REFUNDED">Refunded</option></select>} meta={`${visible.length} of ${items.length} transactions`} />
      <div className="table-wrap"><table><thead><tr><th>Transaction</th><th>Order</th><th>Customer</th><th>Amount</th><th>Status</th><th>Method</th><th>Paid at</th><th>Action</th></tr></thead><tbody>
        {visible.map((row, index) => <tr key={`${field(row, 'id', 'transaction_id', 'payment_id')}-${index}`}>
          <td><strong>{field(row, 'id', 'transaction_id', 'payment_id')}</strong><small>{field(row, 'provider_reference', 'provider_transaction_id', 'provider_payment_id')}</small></td>
          <td>{orderOf(row)}</td>
          <td><strong>{field(row, 'customer_name', 'sender_name', 'full_name')}</strong><small>{field(row, 'customer_email', 'sender_email', 'email')}</small></td>
          <td>{money(amountOf(row))}</td>
          <td><StatusBadge tone={statusOf(row) === 'PAID' ? 'success' : statusOf(row) === 'FAILED' ? 'danger' : statusOf(row) === 'PENDING' ? 'warning' : 'neutral'}>{statusOf(row)}</StatusBadge></td>
          <td>{field(row, 'payment_method', 'method', 'gateway', 'provider')}</td>
          <td>{timestamp(row, 'paid_at', 'payment_at', 'created_at')}</td>
          <td><ActionButton variant="ghost" disabled={statusOf(row) !== 'PAID' || orderOf(row) === '—'} onClick={() => { setSelected(row); setReason(''); setError(''); }}>Refund</ActionButton>
            <details><summary className="text-button text-xs">Backend record</summary><pre className="max-w-xs overflow-auto whitespace-pre-wrap break-all text-[11px]">{JSON.stringify(row, null, 2)}</pre></details>
          </td>
        </tr>)}
        {!loading && !visible.length && <tr><td colSpan={8} className="p-5 text-center">No Backend transactions returned.</td></tr>}
      </tbody></table></div>
    </OperatorPanel>
    <Dialog open={!!selected} onOpenChange={open => { if (!open && !saving) setSelected(null); }}>
      {selected && <DialogContent><div className="p-5">
        <DialogTitle className="text-lg font-semibold">Refund order {orderOf(selected)}?</DialogTitle>
        <p className="mt-2 text-sm text-muted-foreground">This sends a real refund request to Backend for order {orderOf(selected)}, not a local simulation. The Backend/payment provider determines the final settlement.</p>
        <label className="mt-4 block text-sm"><span>Reason for refund *</span><textarea rows={3} maxLength={500} className="mt-2 w-full rounded-lg border border-[var(--admin-border)] p-2" required value={reason} onChange={e => setReason(e.target.value)} /></label>
        {error && <p role="alert" className="mt-2 text-sm text-red-500">{error}</p>}
        <div className="form-actions mt-5"><ActionButton variant="secondary" disabled={saving} onClick={() => setSelected(null)}>Cancel</ActionButton><ActionButton variant="danger" disabled={saving || !reason.trim()} onClick={() => void refund()}>{saving ? 'Submitting…' : 'Confirm Refund'}</ActionButton></div>
      </div></DialogContent>}
    </Dialog>
  </AdminPageShell>;
}
