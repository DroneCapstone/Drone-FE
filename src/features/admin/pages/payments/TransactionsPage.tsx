import { useEffect, useMemo, useState } from "react";
import { CreditCard, CircleCheck, Clock3, CircleX } from "lucide-react";
import { ActionButton } from "../../../../components/ui/ActionButton";
import { Dialog, DialogTitle } from "../../../../components/ui/Dialog";
import { AdminDialogContent as DialogContent } from "../../components/AdminDialogContent";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { AdminSummaryCard } from "../../components/AdminSummaryCard";
import { OperatorPanel } from "../../../operator/components/OperatorPanel";
import { AdminPageShell } from "../../components/AdminPageShell";
import { AdminToolbar } from "../../components/AdminToolbar";
import { executePrototypeRefund, getPrototypePayments } from "../../services/prototypeWorkflow";
import type { AdminPayment } from "../../types";
import { formatVnd, paymentTone } from "../../utils/adminDisplay";

export function TransactionsPage() {
  const [items, setItems] = useState<AdminPayment[]>(getPrototypePayments());
  useEffect(() => {
    const refresh = () => setItems(getPrototypePayments());
    window.addEventListener('admin-data-updated', refresh);
    return () => window.removeEventListener('admin-data-updated', refresh);
  }, []);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<AdminPayment | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);

  const visible = useMemo(() => items.filter((payment) => `${payment.id} ${payment.orderId} ${payment.customerName} ${payment.customerEmail}`.toLowerCase().includes(query.toLowerCase()) && (status === "all" || payment.status === status)), [items, query, status]);
  const collected = items.filter((item) => item.status === 'PAID' || item.status === 'REFUNDED').reduce((sum, item) => sum + item.amountVnd, 0);

  const refund = () => {
    if (!selected?.refundable) return;
    try { executePrototypeRefund(selected.id, 'Full refund approved by Admin (prototype)'); setItems(getPrototypePayments()); } catch (e) { window.alert(e instanceof Error ? e.message : 'Refund failed.'); return; }
    setRefundOpen(false);
    setSelected(null);
  };

  return (
    <AdminPageShell title="Transactions" description="Demo order payment history. Current rows are browser-local samples, not live PayOS transactions.">
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminSummaryCard label="Gross collected (demo)" value={formatVnd(collected)} note="Includes later refunded payments once · demo" icon={CreditCard} />
        <AdminSummaryCard label="Paid" value={items.filter((i) => i.status === "PAID").length} note="Successful transactions" icon={CircleCheck} />
        <AdminSummaryCard label="Pending" value={items.filter((i) => i.status === "PENDING").length} note="Awaiting confirmation" icon={Clock3} />
        <AdminSummaryCard label="Failed / refunded" value={items.filter((i) => i.status === "FAILED" || i.status === "REFUNDED").length} note="No new capture" icon={CircleX} />
      </div>

      {/* <p className="mb-4 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-3 text-xs text-[var(--admin-muted)]">
        <strong className="text-[var(--admin-text)]">Demo data.</strong> The payment rows are not fetched from PayOS or the Backend. Any refund below is a local simulation and does not send money to a Customer.
      </p> */}
      <OperatorPanel className="flush-panel">
        <AdminToolbar searchValue={query} onSearchChange={setQuery} placeholder="Search transaction, order or customer…" filters={<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All status</option><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="FAILED">Failed</option><option value="REFUNDED">Refunded</option></select>} meta={`${visible.length} of ${items.length} transactions`} />
        <div className="table-wrap"><table><thead><tr><th>Transaction</th><th>Order</th><th>Customer</th><th>Amount</th><th>Status</th><th>Method</th><th>Paid at</th><th>Action</th></tr></thead><tbody>
          {visible.map((payment) => <tr key={payment.id}>
            <td><strong>{payment.id}</strong><small>{payment.providerReference ?? "No provider reference"}</small></td>
            <td>{payment.orderId}</td>
            <td><strong>{payment.customerName}</strong><small>{payment.customerEmail}</small></td>
            <td>{formatVnd(payment.amountVnd)}</td>
            <td><StatusBadge tone={paymentTone(payment.status)}>{payment.status}</StatusBadge></td>
            <td>{payment.paymentMethod}</td>
            <td>{payment.paidAt ? new Date(payment.paidAt).toLocaleString("en-GB") : "—"}</td>
            <td><ActionButton variant="ghost" onClick={() => { setSelected(payment); setRefundOpen(true); }} disabled={!payment.refundable}>Simulate refund</ActionButton></td>
          </tr>)}
        </tbody></table></div>
      </OperatorPanel>

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <div className="p-5">
            <DialogTitle className="text-lg font-semibold">Refund {selected?.id}?</DialogTitle>
            <p className="mt-2 text-sm text-muted-foreground">Simulate a full refund of {selected ? formatVnd(selected.amountVnd) : ""} in browser-local demo records only. No PayOS transfer or real bank refund occurs.</p>
            <div className="form-actions mt-5"><ActionButton variant="secondary" onClick={() => setRefundOpen(false)}>Cancel</ActionButton><ActionButton variant="danger" onClick={refund}>Confirm simulation</ActionButton></div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
