import { useState } from "react";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { OperatorPanel } from "../../../operator/components/OperatorPanel";
import { AdminPageShell } from "../../components/AdminPageShell";
import { AdminToolbar } from "../../components/AdminToolbar";
import { getPrototypeRefunds } from "../../services/prototypeWorkflow";
import { formatVnd } from "../../utils/adminDisplay";

export function RefundsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const visible = getPrototypeRefunds().filter((refund) => `${refund.id} ${refund.paymentId} ${refund.orderId} ${refund.customerName}`.toLowerCase().includes(query.toLowerCase()) && (status === "all" || refund.status === status));

  return (
    <AdminPageShell title="Refunds" description="Track full-refund requests and processing status. Partial refunds and disputes remain out of scope.">
      <OperatorPanel className="flush-panel">
        <AdminToolbar searchValue={query} onSearchChange={setQuery} placeholder="Search refund, payment, order or customer…" filters={<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All status</option><option value="PENDING">Pending</option><option value="COMPLETED">Completed</option><option value="FAILED">Failed</option></select>} meta={`${visible.length} refunds`} />
        <div className="table-wrap"><table><thead><tr><th>Refund</th><th>Payment</th><th>Order</th><th>Customer</th><th>Amount</th><th>Reason</th><th>Status</th><th>Processed</th></tr></thead><tbody>
          {visible.map((refund) => <tr key={refund.id}><td><strong>{refund.id}</strong><small>{new Date(refund.requestedAt).toLocaleString("en-GB")}</small></td><td>{refund.paymentId}</td><td>{refund.orderId}</td><td>{refund.customerName}</td><td>{formatVnd(refund.amountVnd)}</td><td>{refund.reason}</td><td><StatusBadge tone={refund.status === "COMPLETED" ? "success" : refund.status === "FAILED" ? "danger" : "warning"}>{refund.status}</StatusBadge></td><td>{refund.processedAt ? new Date(refund.processedAt).toLocaleString("en-GB") : "—"}</td></tr>)}
        </tbody></table></div>
      </OperatorPanel>
    </AdminPageShell>
  );
}
