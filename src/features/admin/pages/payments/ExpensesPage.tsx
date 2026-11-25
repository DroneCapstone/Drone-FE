import { OperatorLoadingState } from '../../../operator/components/OperatorLoadingState';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, RotateCcw, TrendingUp } from 'lucide-react';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { AdminSummaryCard } from '../../components/AdminSummaryCard';
import { AdminPageShell } from '../../components/AdminPageShell';
import { adminOperationsApi, apiError } from '../../api/adminOperationsApi';
import { record, amount, money, type JsonRow } from '../../api/adminFinanceAdapter';

// Only delivery payments and completed refunds are in scope.
export function ExpensesPage() {
  const [report, setReport] = useState<JsonRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function refresh() {
    setLoading(true); setError('');
    try {
      const response = await adminOperationsApi.financialOverview();
      setReport(record(record(response).data ?? response));
    } catch (cause) { setReport(null); setError(apiError(cause)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  const gross = report ? amount(report, 'paid_revenue', 'gross_collected', 'gross_revenue') : null;
  const refunds = report ? amount(report, 'completed_refunds') : null;
  // Do not use net_after_costs or total_expenses: those include inventory expenses.
  const net = gross != null && refunds != null ? gross - refunds : null;
  return <AdminPageShell title="Financial Overview">
    {loading ? <OperatorLoadingState label="Loading financial overview…" /> : error ?
      <p role="alert" className="mb-3 text-sm text-red-500">{error} <button type="button" className="text-button" onClick={() => void refresh()}>Retry</button></p> : <>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AdminSummaryCard label="Gross Collected" value={money(gross)} icon={CreditCard} />
        <AdminSummaryCard label="Completed Refunds" value={money(refunds)} icon={RotateCcw} />
        <AdminSummaryCard label="Revenue After Refunds" value={money(net)} icon={TrendingUp} />
      </div>
      <OperatorPanel title="Payment records">
        <div className="flex flex-wrap gap-3 p-4">
          <Link className="button button-secondary" to="/admin/payments/transactions">View transactions</Link>
          <Link className="button button-secondary" to="/admin/payments/refunds">View refunds</Link>
        </div>
      </OperatorPanel>
    </>}
  </AdminPageShell>;
}
