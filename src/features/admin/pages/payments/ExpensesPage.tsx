import { useEffect, useState } from 'react';
import { CreditCard, RotateCcw, ReceiptText, TrendingUp } from 'lucide-react';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { AdminSummaryCard } from '../../components/AdminSummaryCard';
import { AdminPageShell } from '../../components/AdminPageShell';
import { getPrototypeExpenses, getPrototypePayments, getPrototypeRefunds } from '../../services/prototypeWorkflow';
import { formatVnd } from '../../utils/adminDisplay';

/** Browser-local financial illustration; NOT a bank ledger or live PayOS reconciliation. */
export function ExpensesPage() {
  const [, setVersion] = useState(0);
  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1);
    window.addEventListener('admin-data-updated', refresh);
    return () => window.removeEventListener('admin-data-updated', refresh);
  }, []);

  const records = getPrototypeExpenses();
  const payments = getPrototypePayments();
  const refunds = getPrototypeRefunds();
  // A refunded payment was originally captured too: count it in gross once.
  const grossPaid = payments.filter((payment) => payment.status === 'PAID' || payment.status === 'REFUNDED')
    .reduce((sum, payment) => sum + payment.amountVnd, 0);
  const refundsCompleted = refunds.filter((refund) => refund.status === 'COMPLETED')
    .reduce((sum, refund) => sum + refund.amountVnd, 0);
  const recordedCosts = records.reduce((sum, record) => sum + record.amountVnd, 0);
  const netRecorded = grossPaid - refundsCompleted - recordedCosts;
  const categories = [
    { key: 'DRONE', name: 'Drones' },
    { key: 'BATTERY', name: 'New batteries' },
    { key: 'SPARE_PART', name: 'Spare parts' },
    { key: 'OTHER', name: 'Other / legacy' },
  ] as const;
  return <AdminPageShell
    title="Financial Overview"
    description="Demo financial records: customer payments and refunds are samples; acquisition costs are internal estimates, not cash transfers."
  >
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AdminSummaryCard label="Gross Collected (demo)" value={formatVnd(grossPaid)} note="Paid + later refunded payments counted once" icon={CreditCard} />
      <AdminSummaryCard label="Completed Refunds (demo)" value={formatVnd(refundsCompleted)} note="Simulated refunds, not confirmed bank payouts" icon={RotateCcw} />
      <AdminSummaryCard label="Recorded Acquisition Cost" value={formatVnd(recordedCosts)} note="Internal reference costs; legacy records included" icon={ReceiptText} />
      <AdminSummaryCard label="Net After Recorded Costs" value={formatVnd(netRecorded)} note="Illustrative calculation; NOT bank balance or profit" icon={TrendingUp} />
    </div>
    {/* <div className="mb-4 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4 text-sm text-[var(--admin-muted)]">
      <strong className="text-[var(--admin-text)]">Demo only.</strong>{' '}
      Gross collected − completed simulated refunds − recorded acquisition costs = illustrative net.
      The system neither transfers supplier money nor reads a bank account balance.
      Stock distribution or replacement approval must not record the purchase expense a second time.
    </div> */}
    <OperatorPanel title="Acquisition costs by category" eyebrow="INTERNAL RECORDS · NOT BANK PAYMENTS">
      <div className="table-wrap"><table><thead><tr><th>Category</th><th>Recorded amount</th></tr></thead>
        <tbody>{categories.map(({ key, name }) => <tr key={key}><td>{name}</td><td><strong>{formatVnd(records.filter((record) => record.category === key).reduce((sum, record) => sum + record.amountVnd, 0))}</strong></td></tr>)}</tbody>
      </table></div>
    </OperatorPanel>
    <div className="mt-4">
      <OperatorPanel title="Recorded cost history" eyebrow="ONE RECORD PER INVENTORY RECEIPT / BATCH">
        <div className="table-wrap"><table><thead><tr><th>Date</th><th>Source</th><th>Category</th><th>Description</th><th>Recorded cost</th></tr></thead>
          <tbody>{records.map((record) => <tr key={record.id}>
            <td>{new Date(record.date).toLocaleString('en-GB')}</td>
            <td>{record.sourceId ?? 'Legacy manual record'}</td>
            <td>{record.category.replace('_', ' ')}</td>
            <td>{record.description}<small>{record.recordType === 'RECORDED' ? 'Internal acquisition · not paid via bank' : 'Legacy prototype record · payment not verified here'}</small></td>
            <td><strong>{formatVnd(record.amountVnd)}</strong></td>
          </tr>)}
            {records.length === 0 && <tr><td colSpan={5} className="text-center">No recorded acquisition cost. Adding received spare parts or new batteries will create a cost record automatically.</td></tr>}
          </tbody>
        </table></div>
      </OperatorPanel>
    </div>
  </AdminPageShell>;
}
