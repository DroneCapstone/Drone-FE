import { useMemo, useState } from "react";
import { ActionButton } from "../../../../components/ui/ActionButton";
import { Dialog, DialogContent, DialogTitle } from "../../../../components/ui/Dialog";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { MetricCard } from "../../../operator/components/MetricCard";
import { OperatorPanel } from "../../../operator/components/OperatorPanel";
import { AdminPageShell } from "../../components/AdminPageShell";
import { AdminToolbar } from "../../components/AdminToolbar";
import { adminPayments } from "../../data/adminData";
import type { AdminPayment } from "../../types";
import { formatVnd, paymentTone } from "../../utils/adminDisplay";

export function TransactionsPage() {
  const [items, setItems] = useState<AdminPayment[]>(adminPayments);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<AdminPayment | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);

  const visible = useMemo(() => items.filter((payment) => `${payment.id} ${payment.orderId} ${payment.customerName} ${payment.customerEmail}`.toLowerCase().includes(query.toLowerCase()) && (status === "all" || payment.status === status)), [items, query, status]);
  const revenue = items.filter((item) => item.status === "PAID" || item.status === "REFUNDED").reduce((sum, item) => sum + item.amountVnd, 0);

  const refund = () => {
    if (!selected?.refundable) return;
    setItems((current) => current.map((item) => item.id === selected.id ? { ...item, status: "REFUNDED", refundable: false, refundBlockReason: "Transaction has already been refunded.", refundedAt: new Date().toISOString() } : item));
    setRefundOpen(false);
    setSelected(null);
  };

  return (
    <AdminPageShell title="Transactions" description="Read payment activity linked to delivery orders and initiate full refunds when Backend eligibility allows it.">
      <div className="metric-grid">
        <MetricCard label="Captured revenue" value={formatVnd(revenue)} delta="Payments" tone="success" note="Paid and refunded sample" />
        <MetricCard label="Paid" value={String(items.filter((i) => i.status === "PAID").length)} delta="Captured" tone="success" note="Successful transactions" />
        <MetricCard label="Pending" value={String(items.filter((i) => i.status === "PENDING").length)} delta="Review" tone="warning" note="Awaiting confirmation" />
        <MetricCard label="Failed / refunded" value={String(items.filter((i) => i.status === "FAILED" || i.status === "REFUNDED").length)} delta="Closed" tone="neutral" note="No new capture" />
      </div>

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
            <td><ActionButton variant="ghost" onClick={() => { setSelected(payment); setRefundOpen(true); }} disabled={!payment.refundable}>Refund</ActionButton></td>
          </tr>)}
        </tbody></table></div>
      </OperatorPanel>

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <div className="p-5">
            <DialogTitle className="text-lg font-semibold">Refund {selected?.id}?</DialogTitle>
            <p className="mt-2 text-sm text-muted-foreground">Full refund of {selected ? formatVnd(selected.amountVnd) : ""}. Production eligibility and refund execution must be authorized by Backend.</p>
            <div className="form-actions mt-5"><ActionButton variant="secondary" onClick={() => setRefundOpen(false)}>Cancel</ActionButton><ActionButton variant="danger" onClick={refund}>Confirm refund</ActionButton></div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
