import { adminDisplayText, adminDetailText } from '../../utils/adminDisplayText';
import { OperatorLoadingState } from '../../../operator/components/OperatorLoadingState';
import { useEffect, useState } from 'react';
import { CreditCard, RotateCcw, ReceiptText, TrendingUp } from 'lucide-react';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { AdminSummaryCard } from '../../components/AdminSummaryCard';
import { AdminPageShell } from '../../components/AdminPageShell';
import { adminOperationsApi, apiError } from '../../api/adminOperationsApi';
import { record, extractRows, field, amount, money, timestamp, type JsonRow } from '../../api/adminFinanceAdapter';

// Financial Overview is read from Backend only. Missing numeric fields are shown as '—', not 0.
// OpenAPI publishes an empty financial-overview response schema: never substitute browser figures.
export function ExpensesPage() {
  const [report, setReport] = useState<JsonRow | null>(null);
  const [stockReport, setStockReport] = useState<JsonRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function refresh() {
    setLoading(true);
    const [finance, stock] = await Promise.allSettled([
      adminOperationsApi.financialOverview(), adminOperationsApi.stockFinanceReport(),
    ]);
    setReport(finance.status === 'fulfilled' ? record(record(finance.value).data ?? finance.value) : null);
    setStockReport(stock.status === 'fulfilled' ? record(record(stock.value).data ?? stock.value) : null);
    setError([
      finance.status === 'rejected' ? `Financial overview: ${apiError(finance.reason)}` : '',
      stock.status === 'rejected' ? `Stock finance report: ${apiError(stock.reason)}` : '',
    ].filter(Boolean).join(' · '));
    setLoading(false);
  }
  useEffect(() => { void refresh(); }, []);
  const reportValue = (...names: string[]) => report ? amount(report, ...names) : null;
  const gross = reportValue('gross_collected', 'gross_revenue', 'paid_revenue', 'total_revenue');
  const refunds = reportValue('completed_refunds', 'total_refunds', 'refunded_amount');
  const costs = reportValue('total_acquisition_cost', 'recorded_acquisition_cost', 'total_expenses');
  const directNet = reportValue('net_revenue', 'net_after_costs', 'net_amount');
  // Only compute if ALL source values are present; Backend's 'total_expenses' may include refunds,
  // so prefer explicit net from Backend and never double-subtract unknown categories.
  const net = directNet;
  const expenseBreakdown = record(report?.expenses_by_category ?? stockReport?.expenses_by_category);
  const rowsFrom = (payload: JsonRow | null) => {
    if (!payload) return [] as JsonRow[];
    try { return extractRows(payload, ['transaction_history', 'history', 'transactions', 'expenses', 'records']); }
    catch { return [] as JsonRow[]; }
  };
  const entries = rowsFrom(stockReport).length ? rowsFrom(stockReport) : rowsFrom(report);
  const breakdownEntries = Object.entries(expenseBreakdown).filter(([, value]) => typeof value === 'number' && Number.isFinite(value));

  return <AdminPageShell title="Financial Overview" description="Review payment revenue, refunds and inventory costs. These figures do not represent bank balances.">
    {loading && <OperatorLoadingState label="Loading financial reports…" />}
    {error && <p role="alert" className="mb-3 text-sm text-red-500">{error} <button type="button" className="text-button" onClick={() => void refresh()}>Retry</button></p>}
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AdminSummaryCard label="Gross Collected" value={money(gross)} note="Recorded payment revenue" icon={CreditCard} />
      <AdminSummaryCard label="Completed Refunds" value={money(refunds)} note="Refunds completed" icon={RotateCcw} />
      <AdminSummaryCard label="Recorded Acquisition Cost" value={money(costs)} note="Recorded inventory expenses" icon={ReceiptText} />
      <AdminSummaryCard label="Net After Recorded Costs" value={money(net)} note="Available when net figures are recorded" icon={TrendingUp} />
    </div>
    <OperatorPanel title="Acquisition costs by category" eyebrow="COST BREAKDOWN">
      <div className="table-wrap"><table><thead><tr><th>Category</th><th>Recorded amount</th></tr></thead><tbody>
        {breakdownEntries.map(([category, value]) => <tr key={category}><td>{category.replace(/_/g, ' ')}</td><td><strong>{money(value as number)}</strong></td></tr>)}
        {!loading && !breakdownEntries.length && <tr><td colSpan={2}>No cost breakdown available.</td></tr>}
      </tbody></table></div>
    </OperatorPanel>
    <div className="mt-4"><OperatorPanel title="Recorded cost history" eyebrow="FINANCIAL HISTORY">
      <div className="table-wrap"><table><thead><tr><th>Date</th><th>Source</th><th>Category</th><th>Description</th><th>Recorded cost</th></tr></thead><tbody>
        {entries.map((item, i) => <tr key={`${field(item, 'id', 'reference_id')}-${i}`}>
          <td>{timestamp(item, 'date', 'created_at', 'timestamp')}</td><td>{field(item, 'source_id', 'reference_id', 'order_id')}</td>
          <td>{field(item, 'category', 'type', 'reason')}</td><td>{adminDisplayText(field(item, 'description', 'message'))}</td>
          <td><strong>{money(amount(item, 'amount_vnd', 'amount', 'total'))}</strong></td>
        </tr>)}
        {!loading && !entries.length && <tr><td colSpan={5}>No cost history available.</td></tr>}
      </tbody></table></div>
    </OperatorPanel></div>
    {(report || stockReport) && <details className="mt-3 rounded-lg border border-[var(--admin-border)] p-3 text-xs">
      <summary className="cursor-pointer">View financial report details</summary>
      <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-all">{adminDetailText({ financial_overview: report, stock_finance_report: stockReport })}</pre>
    </details>}
  </AdminPageShell>;
}
