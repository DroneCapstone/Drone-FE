import { invalidateAdminReads } from '../../api/adminHttp';
import { AdminSelect } from '../../components/AdminSelect';
import { useSearchParams } from 'react-router-dom';
import { adminDisplayText } from '../../utils/adminDisplayText';
import { OperatorLoadingState } from '../../../operator/components/OperatorLoadingState';
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
import { adminUsersApi, type AdminApiUser } from '../../api/adminUsersApi';
import { extractRows, field, amount, money, timestamp, type JsonRow } from '../../api/adminFinanceAdapter';

const statusOf = (row: JsonRow) => field(row, 'payment_status', 'status').toUpperCase();
const orderOf = (row: JsonRow) => field(row, 'order_id', 'orderId');
const paymentOf = (row: JsonRow) => field(row, 'payment_id', 'transaction_id', 'id');
const customerIdOf = (row: JsonRow) => field(row, 'customer_id', 'user_id');
const amountOf = (row: JsonRow) => amount(row, 'amount', 'amount_vnd', 'total_amount', 'paid_amount');
const paidAt = (row: JsonRow) => timestamp(row, 'paid_at', 'payment_at');
const statusTone = (row: JsonRow) => statusOf(row) === 'PAID' ? 'success' as const : statusOf(row) === 'FAILED' ? 'danger' as const : statusOf(row) === 'PENDING' ? 'warning' as const : 'neutral' as const;
const canRefund = (row: JsonRow) => statusOf(row) === 'PAID' && orderOf(row) !== '—';
const shortId = (id: string) => id.length > 18 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;

export function TransactionsPage() {
  const [params] = useSearchParams();
  const initialQuery = params.get('q') ?? '';
  const [items, setItems] = useState<JsonRow[]>([]);
  const [users, setUsers] = useState<AdminApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [refundError, setRefundError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<JsonRow | null>(null);
  const [detail, setDetail] = useState<JsonRow | null>(null);
  const [reason, setReason] = useState('');
  useEffect(() => { setQuery(initialQuery); setStatus('all'); }, [initialQuery]);

  async function refresh() {
    setLoading(true); setError('');
    try { setItems(extractRows(await adminOperationsApi.transactions(), ['transactions', 'payments'])); }
    catch (cause) { setItems([]); setError(apiError(cause)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    let active = true;
    // Resolve names in a single request. A failed lookup must not hide payments.
    void adminUsersApi.listUsers().then(value => { if (active) setUsers(value); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const userMap = useMemo(() => new Map(users.map(user => [user.id, user])), [users]);
  const customerName = (row: JsonRow) => {
    const supplied = field(row, 'customer_name', 'sender_name', 'full_name');
    return supplied !== '—' ? supplied : userMap.get(customerIdOf(row))?.full_name?.trim() || '';
  };
  const customerText = (row: JsonRow) => customerName(row) || shortId(customerIdOf(row));
  const visible = items.filter(row => {
    const user = userMap.get(customerIdOf(row));
    const search = query.trim().toLowerCase();
    return (status === 'all' || statusOf(row) === status) &&
      [orderOf(row), paymentOf(row), customerIdOf(row), customerName(row), user?.email ?? ''].some(value => value.toLowerCase().includes(search));
  });
  const settled = items.filter(row => ['PAID', 'REFUNDED'].includes(statusOf(row)));
  const knownAmount = items.every(row => statusOf(row) !== '—') && settled.every(row => amountOf(row) !== null);
  const collected = settled.reduce((sum, row) => sum + (amountOf(row) ?? 0), 0);

  function beginRefund(row: JsonRow) {
    if (!canRefund(row) || saving) return;
    setSelected(row); setDetail(null); setReason(''); setRefundError(''); setNotice('');
  }
  async function refund() {
    if (!selected || saving || !reason.trim() || !canRefund(selected)) return;
    const orderId = orderOf(selected);
    if (!window.confirm(`Submit a full refund for order ${orderId}? This action affects customer funds and cannot be undone here.`)) return;
    setSaving(true); setRefundError('');
    try {
      const result = await adminOperationsApi.refundOrder(orderId, { reason: reason.trim() });
      setSelected(null); setReason('');
      setNotice(adminDisplayText(result?.message, `Refund request submitted for order ${orderId}.`));
      await refresh();
    } catch (cause) { setRefundError(apiError(cause)); }
    finally { setSaving(false); }
  }

  return <AdminPageShell title="Transactions">
    {notice && <p role="status" className="mb-3 text-sm text-green-600">{notice}</p>}
    {loading ? <OperatorLoadingState label="Loading transactions..." /> : error ?
      <OperatorPanel><div role="alert" className="flex flex-wrap items-center justify-center gap-3 p-6 text-sm text-red-500">{error}<ActionButton variant="secondary" onClick={() => { invalidateAdminReads(); void refresh(); }}>Retry</ActionButton></div></OperatorPanel> : <>
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AdminSummaryCard label="Gross collected" value={knownAmount ? money(collected) : '—'} icon={CreditCard} />
      <AdminSummaryCard label="Paid" value={items.filter(row => statusOf(row) === 'PAID').length} icon={CircleCheck} />
      <AdminSummaryCard label="Pending" value={items.filter(row => statusOf(row) === 'PENDING').length} icon={Clock3} />
      <AdminSummaryCard label="Failed / refunded" value={items.filter(row => ['FAILED', 'REFUNDED'].includes(statusOf(row))).length} icon={CircleX} />
    </div>
    <OperatorPanel className="flush-panel">
      <AdminToolbar searchValue={query} onSearchChange={setQuery} placeholder="Search order, payment or customer..." filters={<AdminSelect value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="FAILED">Failed</option><option value="REFUNDED">Refunded</option></AdminSelect>} meta={`${visible.length} of ${items.length} transactions`} />
      <div className="table-wrap"><table><thead><tr><th>Order ID</th><th>Customer</th><th>Amount</th><th>Status</th><th>Paid at</th><th>Action</th></tr></thead><tbody>
        {visible.map((row, index) => <tr key={`${paymentOf(row)}-${index}`} className="cursor-pointer" tabIndex={0} title="Double-click to view transaction details" aria-label={`Order ${orderOf(row)}. Press Enter to view transaction details.`} onDoubleClick={event => { if (!(event.target instanceof Element && event.target.closest('button, a'))) setDetail(row); }} onKeyDown={event => { if (event.target === event.currentTarget && event.key === 'Enter') { event.preventDefault(); setDetail(row); } }}>
          <td><strong>{orderOf(row) !== '—' ? orderOf(row) : paymentOf(row)}</strong></td>
          <td><span title={customerIdOf(row) !== '—' ? customerIdOf(row) : undefined} className="break-words">{customerText(row)}</span></td>
          <td className="whitespace-nowrap">{money(amountOf(row))}</td>
          <td><StatusBadge tone={statusTone(row)}>{statusOf(row)}</StatusBadge></td>
          <td className="whitespace-nowrap">{paidAt(row)}</td>
          <td>{canRefund(row) ? <ActionButton variant="secondary" disabled={saving} onClick={() => beginRefund(row)}>Refund</ActionButton> : <span aria-label="Refund unavailable">—</span>}</td>
        </tr>)}
        {!visible.length && <tr><td colSpan={6} className="p-5 text-center">{items.length === 0 ? 'No transactions yet.' : 'No transactions match your filters.'}</td></tr>}
      </tbody></table></div>
    </OperatorPanel>
    </>}
    <Dialog open={!!detail} onOpenChange={open => { if (!open) setDetail(null); }}>
      {detail && <DialogContent><div className="p-5">
        <DialogTitle className="text-lg font-semibold">Transaction Details</DialogTitle>
        <dl className="mt-4 divide-y divide-border text-sm">
          {[
            ['Order ID', orderOf(detail)],
            ...(paymentOf(detail) !== orderOf(detail) ? [['Payment ID', paymentOf(detail)]] : []),
            ['Customer', customerName(detail) || customerIdOf(detail)],
            ...(customerName(detail) && customerIdOf(detail) !== '—' ? [['Customer ID', customerIdOf(detail)]] : []),
            ['Amount', money(amountOf(detail))],
            ['Created at', timestamp(detail, 'created_at')],
            ['Paid at', paidAt(detail)],
            ...(amount(detail, 'refund_amount') != null ? [['Refund amount', money(amount(detail, 'refund_amount'))]] : []),
            ...(field(detail, 'refund_at') !== '—' ? [['Refunded at', timestamp(detail, 'refund_at')]] : []),
            ...(field(detail, 'refund_reason') !== '—' ? [['Refund reason', adminDisplayText(field(detail, 'refund_reason'))]] : []),
          ].map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(100px,1fr)_minmax(0,2fr)] gap-3 py-2"><dt className="text-muted-foreground">{label}</dt><dd className="break-words text-right font-medium">{value}</dd></div>)}
          <div className="flex justify-between gap-3 py-2"><dt className="text-muted-foreground">Status</dt><dd><StatusBadge tone={statusTone(detail)}>{statusOf(detail)}</StatusBadge></dd></div>
        </dl>
        <div className="form-actions mt-5"><ActionButton variant="secondary" onClick={() => setDetail(null)}>Close</ActionButton></div>
      </div></DialogContent>}
    </Dialog>
    <Dialog open={!!selected} onOpenChange={open => { if (!open && !saving) setSelected(null); }}>
      {selected && <DialogContent><div className="p-5">
        <DialogTitle className="text-lg font-semibold">Refund Order</DialogTitle>
        <dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Order ID</dt><dd className="font-medium">{orderOf(selected)}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Payment amount</dt><dd className="font-semibold">{money(amountOf(selected))}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Refund type</dt><dd>Full refund</dd></div></dl>
        <label className="mt-4 block text-sm"><span>Reason for refund *</span><textarea rows={3} maxLength={500} className="mt-2 w-full rounded-md border border-border p-2" required value={reason} onChange={e => setReason(e.target.value)} /></label>
        {refundError && <p role="alert" className="mt-2 text-sm text-red-500">{refundError}</p>}
        <div className="form-actions mt-5"><ActionButton variant="secondary" disabled={saving} onClick={() => setSelected(null)}>Cancel</ActionButton><ActionButton variant="secondary" disabled={saving || !reason.trim()} onClick={() => void refund()}>{saving ? 'Submitting...' : 'Confirm Refund'}</ActionButton></div>
      </div></DialogContent>}
    </Dialog>
  </AdminPageShell>;
}
