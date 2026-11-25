import { useEffect, useState, type ReactNode } from 'react';
import { Download, FileSpreadsheet, Plane, RotateCw, Wallet } from 'lucide-react';
import { OperatorLoadingState } from '../../../operator/components/OperatorLoadingState';
import { AdminPageShell } from '../../components/AdminPageShell';
import { AdminApiError } from '../../api/adminOperationsApi';
import { adminReportsApi, type ReportKind, type MissionReportStatus } from '../../api/adminReportsApi';
import { adminDisplayText } from '../../utils/adminDisplayText';
import './AdminReportsPage.css';

type LoadState<T> = { key: string; phase: 'loading' | 'success' | 'error'; data?: T; error?: string };
function useReport<T>(key: string, load: () => Promise<T>, enabled = true) {
  const [state, setState] = useState<LoadState<T>>({ key, phase: 'loading' });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setState({ key, phase: 'loading' });
    load().then(data => { if (active) setState({ key, phase: 'success', data }); })
      .catch(error => { if (active) setState({ key, phase: 'error', error: reportError(error, 'Unable to load report. Please try again.') }); });
    return () => { active = false; };
    // The key contains every request parameter; the inline loader need not be stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, retry, enabled]);
  const current: LoadState<T> = state.key === key ? state : { key, phase: 'loading' };
  return { ...current, retry: () => setRetry(v => v + 1) };
}
function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="report-panel"><div className="report-panel-head"><h2>{title}</h2>{action}</div>{children}</section>;
}
function ReportContent<T>({ state, label, children }: { state: ReturnType<typeof useReport<T>>; label: string; children: (data: T) => ReactNode }) {
  if (state.phase === 'loading') return <OperatorLoadingState label={`Loading ${label}…`} compact />;
  if (state.phase === 'error') return <div className="report-message" role="alert"><span>{state.error}</span><button className="text-button" type="button" onClick={state.retry}>Retry</button></div>;
  return state.data === undefined ? null : <>{children(state.data)}</>;
}
function reportError(error: unknown, fallback: string) {
  if (error instanceof AdminApiError) {
    if (error.status === 401) return 'Your session has expired. Please sign in again.';
    if (error.status === 403) return 'You do not have permission to access this report.';
    if (error.status === 0) return 'Unable to connect. Check your connection and try again.';
  }
  return fallback;
}
const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND', currencyDisplay: 'code', maximumFractionDigits: 0 }).format(n);
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const daysBefore = (days: number) => { const date = new Date(); date.setDate(date.getDate() - days); return localDate(date); };
const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86400000;
function chartRequestDays(today: string, from: string) { return dayNumber(today) - dayNumber(from) + 1; }
function filterChartDates<T extends { date: string }>(rows: T[], from: string, to: string) { return rows.filter(row => row.date >= from && row.date <= to); }
const count = (n: number) => n.toLocaleString('en-US');
const compact = (n: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
const dateLabel = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const series = [{ label: 'Completed', color: '#16A36A' }, { label: 'Failed', color: '#E05252' }, { label: 'Cancelled', color: '#9CA3AF' }];

type ChartRow = { date: string; values: number[]; missionCount?: number };
function DailyChart({ rows, labels, currency = false }: { rows: ChartRow[]; labels: { label: string; color: string }[]; currency?: boolean }) {
  if (!rows.length) return <p className="report-message">No data for this period.</p>;
  const max = Math.max(1, ...rows.map(row => row.values.reduce((a, b) => a + b, 0)));
  const step = Math.max(1, Math.ceil(max / 4));
  const limit = step * 4;
  const width = Math.max(480, rows.length * 12 + 64);
  const left = 58, top = 10, height = 150, plot = width - left - 12;
  const slot = plot / rows.length;
  const bar = Math.min(28, slot * 0.68);
  const tickEvery = Math.max(1, Math.ceil(rows.length / 6));
  return <>
    <div className="report-legend">{labels.map(item => <span key={item.label}><i style={{ background: item.color }} />{item.label}</span>)}{currency && <span className="report-unit">VND</span>}</div>
    <div className="report-chart-scroll">
      <svg viewBox={`0 0 ${width} 190`} style={{ minWidth: width }} role="img" aria-label={currency ? 'Daily revenue bar chart' : 'Daily mission status stacked bar chart'}>
        {[0, 1, 2, 3, 4].map(i => { const y = top + height - i * height / 4; return <g key={i}><line x1={left} x2={width - 12} y1={y} y2={y} stroke="var(--admin-border, var(--border))" /><text x={left - 8} y={y + 4} textAnchor="end" className="report-axis">{compact(i * step)}</text></g>; })}
        {rows.map((row, i) => { let cumulative = 0; const x = left + slot * (i + 0.5); return <g key={`${row.date}-${i}`}><title>{row.date}: {row.values.map((n, j) => `${labels[j].label}: ${currency ? money(n) : count(n)}`).join(' · ')}{row.missionCount !== undefined ? ` · Missions: ${count(row.missionCount)}` : ''}</title>{row.values.map((v, j) => { const h = v / limit * height; cumulative += h; return <rect key={j} x={x - bar / 2} y={top + height - cumulative} width={bar} height={h} fill={labels[j].color} />; })}{(i % tickEvery === 0 || i === rows.length - 1 && (i % tickEvery) > 1) && <text x={x} y={top + height + 17} textAnchor="middle" className="report-axis">{dateLabel(row.date)}</text>}</g>; })}
      </svg>
    </div>
    <details className="report-details"><summary>Daily breakdown</summary><div className="report-table-scroll"><table><thead><tr><th>Date</th>{labels.map(s => <th key={s.label}>{s.label}</th>)}{currency && <th>Missions</th>}</tr></thead><tbody>{rows.map((r, i) => <tr key={`${r.date}-${i}`}><td>{r.date}</td>{r.values.map((v, j) => <td key={j}>{currency ? money(v) : count(v)}</td>)}{currency && <td>{r.missionCount === undefined ? "—" : count(r.missionCount)}</td>}</tr>)}</tbody></table></div></details>
  </>;
}

export function AdminReportsPage() {
  const [period, setPeriod] = useState('30');
  const [chartFrom, setChartFrom] = useState(() => daysBefore(29));
  const [chartTo, setChartTo] = useState(() => localDate(new Date()));
  const today = localDate(new Date());
  const custom = period === 'custom';
  const chartRangeError = custom && (!chartFrom || !chartTo ? 'Select a start and end date.' : chartFrom > chartTo ? 'End date must be on or after the start date.' : chartTo > today || chartFrom > today ? 'Dates cannot be in the future.' : '');
  const chartDays = custom ? chartRangeError ? 0 : chartRequestDays(today, chartFrom) : Number(period);
  const chartKey = custom ? `${chartFrom}-${chartTo}-${chartDays}` : period;

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState<MissionReportStatus>('');
  const [downloading, setDownloading] = useState<ReportKind | null>(null);
  const [downloadError, setDownloadError] = useState('');
  const invalidRange = !!from && !!to && from > to;
  const range = { from_date: from || undefined, to_date: to || undefined };
  const revenue = useReport(`revenue-${chartKey}`, async () => {
    const rows = await adminReportsApi.revenue(chartDays);
    return custom ? filterChartDates(rows, chartFrom, chartTo) : rows;
  }, !chartRangeError);
  const missions = useReport(`missions-${chartKey}`, async () => {
    const rows = await adminReportsApi.missions(chartDays);
    return custom ? filterChartDates(rows, chartFrom, chartTo) : rows;
  }, !chartRangeError);
  const cancellations = useReport(`cancellations-${from}-${to}`, () => adminReportsApi.cancellations(range), !invalidRange);
  async function download(kind: ReportKind) {
    if (downloading || (kind !== 'fleet' && invalidRange)) return;
    setDownloading(kind); setDownloadError('');
    try { await adminReportsApi.exportCsv(kind, range, status); }
    catch (error) { setDownloadError(reportError(error, 'Unable to download report. Please try again.')); }
    finally { setDownloading(null); }
  }
  const exports: { kind: ReportKind; label: string; icon: typeof Wallet }[] = [
    { kind: 'revenue', label: 'Revenue report', icon: Wallet },
    { kind: 'missions', label: 'Mission report', icon: FileSpreadsheet },
    { kind: 'fleet', label: 'Fleet report', icon: Plane },
  ];
  return <AdminPageShell title="Reports" actions={<button type="button" className="button button-secondary" onClick={() => { if (!chartRangeError) { revenue.retry(); missions.retry(); } if (!invalidRange) cancellations.retry(); }}><RotateCw size={15} /> Refresh</button>}>
    <div className="admin-reports">
      <div className="report-section-head"><h2>Performance</h2><div className="report-range report-performance-range"><label className="report-inline-field">Period<select value={period} onChange={e => setPeriod(e.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="custom">Custom range</option></select></label>{custom && <><label className="report-inline-field">From Date<input lang="en-GB" type="date" value={chartFrom} max={today} onChange={e => setChartFrom(e.target.value)} /></label><label className="report-inline-field">To Date<input lang="en-GB" type="date" value={chartTo} max={today} onChange={e => setChartTo(e.target.value)} /></label></>}</div></div>
      {chartRangeError && <p className="report-validation" role="alert">{chartRangeError}</p>}
      <div className="report-grid">
        <Panel title="Revenue">{chartRangeError ? <p className="report-message">Select a valid date range.</p> : <ReportContent state={revenue} label="revenue">{data => <>
          {data.length > 0 && <div className="report-metrics"><div><span>Total revenue</span><strong>{money(data.reduce((sum, row) => sum + row.revenue, 0))}</strong></div><div><span>Missions</span><strong>{count(data.reduce((sum, row) => sum + row.mission_count, 0))}</strong></div></div>}
          <DailyChart rows={data.map(row => ({ date: row.date, values: [row.revenue], missionCount: row.mission_count }))} labels={[{ label: 'Revenue', color: '#FF6B00' }]} currency />
        </>}</ReportContent>}</Panel>
        <Panel title="Mission performance">{chartRangeError ? <p className="report-message">Select a valid date range.</p> : <ReportContent state={missions} label="missions">{data => <>
          {data.length > 0 && <div className="report-metrics">{series.map(({ label, color }, i) => <div key={label}><span>{label}</span><strong style={{ color }}>{count(data.reduce((sum, row) => sum + [row.completed, row.failed, row.cancelled][i], 0))}</strong></div>)}</div>}
          <DailyChart rows={data.map(row => ({ date: row.date, values: [row.completed, row.failed, row.cancelled] }))} labels={series} />
        </>}</ReportContent>}</Panel>
      </div>
      <div className="report-section-head report-range-head"><h2>Cancellation &amp; exports</h2><div className="report-range"><label className="report-inline-field">From Date<input lang="en-GB" type="date" value={from} onChange={e => setFrom(e.target.value)} /></label><label className="report-inline-field">To Date<input lang="en-GB" type="date" value={to} onChange={e => setTo(e.target.value)} /></label><button type="button" className="button button-secondary" onClick={() => { setFrom(''); setTo(''); setStatus(''); }}>Clear</button></div></div>
      {invalidRange && <p className="report-validation" role="alert">End date must be on or after the start date.</p>}
      <div className="report-grid">
        <Panel title="Cancellation reasons">{invalidRange ? <p className="report-message">Select a valid date range.</p> : <ReportContent state={cancellations} label="cancellation statistics">{data => <>
          <div className="report-metrics"><div><span>Cancelled orders</span><strong>{count(data.total)}</strong></div></div>
          {data.reasons.length ? <div className="report-reasons">{data.reasons.slice(0, 5).map((row, i) => <div key={`${row.reason}-${i}`}><div className="report-reason-label"><span>{adminDisplayText(row.reason).replace(/_/g, ' ')}</span><strong>{count(row.count)}{data.total > 0 ? ` · ${(row.count / data.total * 100).toFixed(1)}%` : ''}</strong></div><div className="report-track"><div style={{ width: `${data.total > 0 ? Math.min(100, row.count / data.total * 100) : 0}%` }} /></div></div>)}</div> : <p className="report-message">{data.total === 0 ? 'No cancelled orders for this period.' : 'No cancellation reasons available.'}</p>}
          {data.reasons.length > 5 && <details className="report-details"><summary>All cancellation reasons</summary><div className="report-table-scroll"><table><thead><tr><th>Reason</th><th>Orders</th></tr></thead><tbody>{data.reasons.map((row, i) => <tr key={`${row.reason}-${i}`}><td>{adminDisplayText(row.reason).replace(/_/g, ' ')}</td><td>{count(row.count)}</td></tr>)}</tbody></table></div></details>}
        </>}</ReportContent>}</Panel>
        <Panel title="Export reports">
          <div className="report-exports">{exports.map(({ kind, label, icon: Icon }) => <div key={kind} className="report-export-row"><Icon size={19} className="report-export-icon" /><div className="report-export-name"><strong>{label}</strong>{kind === 'fleet' && <span>All drones</span>}{kind === 'missions' && <label className="report-status-filter"><span>Status</span><select aria-label="Mission status" value={status} onChange={e => setStatus(e.target.value as MissionReportStatus)}><option value="">All statuses</option><option value="Completed">Completed</option><option value="Failed">Failed</option><option value="Cancelled">Cancelled</option></select></label>}</div><button type="button" className="button button-secondary report-download" aria-label={`Download ${label.toLowerCase()} as CSV`} disabled={downloading !== null || (invalidRange && kind !== 'fleet')} onClick={() => void download(kind)}><Download size={15} />{downloading === kind ? 'Downloading…' : 'CSV'}</button></div>)}</div>
          {downloadError && <p className="report-validation" role="alert">{downloadError}</p>}
        </Panel>
      </div>
    </div>
  </AdminPageShell>;
}
