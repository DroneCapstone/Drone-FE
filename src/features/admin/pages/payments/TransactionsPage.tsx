import { useMemo, useState } from "react";
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
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<AdminPayment | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);

  const visible = useMemo(() => items.filter((payment) => `${payment.id} ${payment.orderId} ${payment.customerName} ${payment.customerEmail}`.toLowerCase().includes(query.toLowerCase()) && (status === "all" || payment.status === status)), [items, query, status]);
  const revenue = items.filter((item) => item.status === "PAID").reduce((sum, item) => sum + item.amountVnd, 0);

  const refund = () => {
    if (!selected?.refundable) return;
    try {executePrototypeRefund(selected.id, 'Full refund approved by Admin (prototype)');setItems(getPrototypePayments());}catch(e){window.alert(e instanceof Error?e.message:'Refund failed.');return;}
    setRefundOpen(false);
    setSelected(null);
  };

  return (
    <AdminPageShell title="Transactions" description="Read payment activity linked to delivery orders and initiate full refunds when Backend eligibility allows it.">
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminSummaryCard label="Captured revenue" value={formatVnd(revenue)} note="Paid transactions after refunds (demo)" icon={CreditCard} />
        <AdminSummaryCard label="Paid" value={items.filter((i) => i.status === "PAID").length} note="Successful transactions" icon={CircleCheck} />
        <AdminSummaryCard label="Pending" value={items.filter((i) => i.status === "PENDING").length} note="Awaiting confirmation" icon={Clock3} />
        <AdminSummaryCard label="Failed / refunded" value={items.filter((i) => i.status === "FAILED" || i.status === "REFUNDED").length} note="No new capture" icon={CircleX} />
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
            <p className="mt-2 text-sm text-muted-foreground">Full refund of {selected ? formatVnd(selected.amountVnd) : ""}. Production eligibility and refund execution must be authorized.</p>
            <div className="form-actions mt-5"><ActionButton variant="secondary" onClick={() => setRefundOpen(false)}>Cancel</ActionButton><ActionButton variant="danger" onClick={refund}>Confirm refund</ActionButton></div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
