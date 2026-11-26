import { AdminDateRangePicker } from '../../components/AdminDateRangePicker';
import { AdminSelect } from '../../components/AdminSelect';
import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Download, FileSpreadsheet, MessageSquare, Plane, RotateCw, Star, Wallet } from 'lucide-react';
import { OperatorLoadingState } from '../../../operator/components/OperatorLoadingState';
import { AdminPageShell } from '../../components/AdminPageShell';
import { AdminApiError } from '../../api/adminOperationsApi';
import { adminReportsApi, type ReportKind, type MissionReportStatus, type RatingFilter } from '../../api/adminReportsApi';
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

type ReportTab = 'performance' | 'feedback';
const ratingPageSize = 20;
const reviewDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};
export function AdminReportsPage() {
  const [tab, setTab] = useState<ReportTab>('performance');
  const [rating, setRating] = useState<RatingFilter>('');
  const [page, setPage] = useState(0);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const invalidExportRange = !!exportFrom && !!exportTo && exportFrom > exportTo;
  const exportRange = { from_date: exportFrom || undefined, to_date: exportTo || undefined };
  const ratingSummary = useReport('rating-summary', () => adminReportsApi.ratings('', 1, 0), tab === 'feedback');
  const ratingRows = useReport(`rating-${rating}-${page}`, () => adminReportsApi.ratings(rating, ratingPageSize + 1, page * ratingPageSize), tab === 'feedback');
  const changeRating = (value: RatingFilter) => { setRating(value); setPage(0); };

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
  }, tab === 'performance' && !chartRangeError);
  const missions = useReport(`missions-${chartKey}`, async () => {
    const rows = await adminReportsApi.missions(chartDays);
    return custom ? filterChartDates(rows, chartFrom, chartTo) : rows;
  }, tab === 'performance' && !chartRangeError);
  const cancellations = useReport(`cancellations-${from}-${to}`, () => adminReportsApi.cancellations(range), tab === 'performance' && !invalidRange);
  async function download(kind: ReportKind) {
    if (downloading || (kind !== 'fleet' && invalidExportRange)) return;
    setDownloading(kind); setDownloadError('');
    try { await adminReportsApi.exportCsv(kind, exportRange, status); }
    catch (error) { setDownloadError(reportError(error, 'Unable to download report. Please try again.')); }
    finally { setDownloading(null); }
  }
  const exports: { kind: ReportKind; label: string; icon: typeof Wallet }[] = [
    { kind: 'revenue', label: 'Revenue report', icon: Wallet },
    { kind: 'missions', label: 'Mission report', icon: FileSpreadsheet },
    { kind: 'fleet', label: 'Fleet report', icon: Plane },
  ];
  return <AdminPageShell title="Reports" actions={<button type="button" className="button button-secondary" onClick={() => { if (tab === 'performance') { if (!chartRangeError) { revenue.retry(); missions.retry(); } if (!invalidRange) cancellations.retry(); } else if (tab === 'feedback') { ratingSummary.retry(); ratingRows.retry(); } }}><RotateCw size={15} /> Refresh</button>}>
    <div className="admin-reports">
      <nav className="report-tabs" aria-label="Reports navigation">
        {([{ id: 'performance', label: 'Performance' }, { id: 'feedback', label: 'Customer Feedback' }] as const).map(item => <button key={item.id} type="button" className={tab === item.id ? 'active' : undefined} aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </nav>
      {tab === 'performance' && <>
      <div className="report-section-head"><h2>Performance</h2><div className="report-range report-performance-range"><label className="report-inline-field">Period<AdminSelect value={period} onChange={e => setPeriod(e.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="custom">Custom range</option></AdminSelect></label>{custom && <AdminDateRangePicker label="Performance date range" from={chartFrom} to={chartTo} max={today} onChange={(start, end) => { setChartFrom(start); setChartTo(end); }} />}</div></div>
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
      <div className="report-section-head report-range-head"><h2>Cancellation statistics</h2><div className="report-range"><AdminDateRangePicker label="Cancellation date range" from={from} to={to} onChange={(start, end) => { setFrom(start); setTo(end); }} /><button type="button" className="button button-secondary" onClick={() => { setFrom(''); setTo(''); }}>Clear</button></div></div>
      {invalidRange && <p className="report-validation" role="alert">End date must be on or after the start date.</p>}
      <div>
        <Panel title="Cancellation reasons">{invalidRange ? <p className="report-message">Select a valid date range.</p> : <ReportContent state={cancellations} label="cancellation statistics">{data => <>
          <div className="report-metrics"><div><span>Cancelled orders</span><strong>{count(data.total)}</strong></div></div>
          {data.reasons.length ? <div className="report-reasons">{data.reasons.slice(0, 5).map((row, i) => <div key={`${row.reason}-${i}`}><div className="report-reason-label"><span>{adminDisplayText(row.reason).replace(/_/g, ' ')}</span><strong>{count(row.count)}{data.total > 0 ? ` · ${(row.count / data.total * 100).toFixed(1)}%` : ''}</strong></div><div className="report-track"><div style={{ width: `${data.total > 0 ? Math.min(100, row.count / data.total * 100) : 0}%` }} /></div></div>)}</div> : <p className="report-message">{data.total === 0 ? 'No cancelled orders for this period.' : 'No cancellation reasons available.'}</p>}
          {data.reasons.length > 5 && <details className="report-details"><summary>All cancellation reasons</summary><div className="report-table-scroll"><table><thead><tr><th>Reason</th><th>Orders</th></tr></thead><tbody>{data.reasons.map((row, i) => <tr key={`${row.reason}-${i}`}><td>{adminDisplayText(row.reason).replace(/_/g, ' ')}</td><td>{count(row.count)}</td></tr>)}</tbody></table></div></details>}
        </>}</ReportContent>}</Panel>
      </div>
        <div className="report-section-head"><h2>Export reports</h2><div className="report-range"><AdminDateRangePicker label="Export date range" from={exportFrom} to={exportTo} onChange={(start, end) => { setExportFrom(start); setExportTo(end); }} /><button type="button" className="button button-secondary" onClick={() => { setExportFrom(''); setExportTo(''); setStatus(''); }}>Clear</button></div></div>
        {invalidExportRange && <p className="report-validation" role="alert">End date must be on or after the start date.</p>}
        <Panel title="CSV reports">
          <div className="report-exports">{exports.map(({ kind, label, icon: Icon }) => <div key={kind} className="report-export-row"><Icon size={19} className="report-export-icon" /><div className="report-export-name"><strong>{label}</strong>{kind === 'fleet' && <span>All drones</span>}{kind === 'missions' && <label className="report-status-filter"><span>Status</span><AdminSelect aria-label="Mission status" value={status} onChange={e => setStatus(e.target.value as MissionReportStatus)}><option value="">All statuses</option><option value="Completed">Completed</option><option value="Failed">Failed</option><option value="Cancelled">Cancelled</option></AdminSelect></label>}</div><button type="button" className="button button-secondary report-download" aria-label={`Download ${label.toLowerCase()} as CSV`} disabled={downloading !== null || (invalidExportRange && kind !== 'fleet')} onClick={() => void download(kind)}><Download size={15} />{downloading === kind ? 'Downloading…' : 'CSV'}</button></div>)}</div>
          {downloadError && <p className="report-validation" role="alert">{downloadError}</p>}
        </Panel>
      </>}
      {tab === 'feedback' && <>
        <ReportContent state={ratingSummary} label="rating statistics">{data => <>
          <div className="report-grid report-feedback-metrics">
            <section className="report-panel"><div className="report-panel-head"><h2>Total Ratings</h2><MessageSquare size={18} className="report-export-icon" /></div><strong>{count(data.total)}</strong></section>
            <section className="report-panel"><div className="report-panel-head"><h2>Average Rating</h2><Star size={18} className="report-export-icon" /></div><strong>{data.average === null ? '—' : data.average.toFixed(1)}{data.average !== null && <small> / 5</small>}</strong></section>
          </div>
          <Panel title="Rating Distribution">
            {data.total === 0 ? <p className="report-message">No ratings yet.</p> : data.distribution === null ? <p className="report-message">Rating distribution is unavailable.</p> : <div className="report-rating-distribution">
              {data.distribution.map(row => { const value = String(row.stars) as RatingFilter; const percent = row.count / data.total * 100; return <button type="button" key={row.stars} className={`report-rating-row${rating === value ? ' active' : ''}`} aria-pressed={rating === value} onClick={() => changeRating(rating === value ? '' : value)}><span className="report-star-label">{row.stars}<Star size={15} /></span><span className="report-track"><span style={{ width: `${percent}%` }} /></span><span className="report-rating-count">{count(row.count)}</span><span className="report-rating-percent">{percent.toFixed(1)}%</span></button>; })}
            </div>}
          </Panel>
        </>}</ReportContent>
        <Panel title="Customer Reviews" action={<AdminSelect aria-label="Filter by rating" value={rating} onChange={e => changeRating(e.target.value as RatingFilter)}><option value="">All ratings</option>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} {n === 1 ? 'star' : 'stars'}</option>)}</AdminSelect>}>
          <ReportContent state={ratingRows} label="customer reviews">{data => {
            const visible = data.ratings.slice(0, ratingPageSize);
            const hasNext = data.ratings.length > ratingPageSize;
            return <>
              {visible.length ? <div className="report-table-scroll"><table className="report-review-table"><thead><tr><th>Order</th><th>Customer</th><th>Rating</th><th>Comment</th><th>Date</th></tr></thead><tbody>{visible.map(review => <tr key={review.id}><td>{review.order_id}</td><td>{review.customer_id}</td><td><span className="report-star-label">{review.rating}.0<Star size={15} /></span></td><td className="report-review-comment">{review.comment.trim() || '—'}</td><td>{reviewDate(review.created_at)}</td></tr>)}</tbody></table></div> : <p className="report-message">No reviews found.</p>}
              {(visible.length > 0 || page > 0) && <div className="report-pagination"><span>{visible.length ? `Showing ${count(page * ratingPageSize + 1)}–${count(page * ratingPageSize + visible.length)} reviews` : 'No reviews on this page'}</span><div><button type="button" className="button button-secondary" aria-label="Previous page" disabled={page === 0} onClick={() => setPage(n => Math.max(0, n - 1))}><ChevronLeft size={16} /></button><span>Page {page + 1}</span><button type="button" className="button button-secondary" aria-label="Next page" disabled={!hasNext} onClick={() => setPage(n => n + 1)}><ChevronRight size={16} /></button></div></div>}
            </>;
          }}</ReportContent>
        </Panel>
      </>}
    </div>
  </AdminPageShell>;
}
