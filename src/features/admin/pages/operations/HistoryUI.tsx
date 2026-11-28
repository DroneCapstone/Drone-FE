import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, History, Image, RefreshCw, X } from 'lucide-react';
import { AdminPageShell } from '../../components/AdminPageShell';
import { AdminDialogContent } from '../../components/AdminDialogContent';
import { AdminToolbar } from '../../components/AdminToolbar';
import { AdminSelect } from '../../components/AdminSelect';
import { AdminDateRangePicker, calendarDateKey } from '../../components/AdminDateRangePicker';
import { OperatorLoadingState } from '../../../operator/components/OperatorLoadingState';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { OperatorPagination, OPERATOR_PAGE_SIZE } from '../../../operator/components/OperatorPagination';
import { OperatorTable, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../operator/components/OperatorTable';
import { Dialog, DialogTitle } from '../../../../components/ui/Dialog';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { adminErrorText } from '../../utils/adminDisplayText';
import { invalidateAdminReads } from '../../api/adminHttp';
import { adminOperationsApi } from '../../api/adminOperationsApi';
import { canonical, validTime, type HistoryEvent } from '../../api/adminHistoryApi';
import './admin-history.css';
export const BASE = '/admin/operations';
export const paths = { missions: `${BASE}/missions`, swaps: `${BASE}/missions/swaps`, packages: `${BASE}/packages`, maintenance: `${BASE}/maintenance`, alerts: `${BASE}/maintenance/alerts` };
export const detailPath = (type: 'missions' | 'packages' | 'maintenance', id: string) => `${BASE}/${type}/${encodeURIComponent(id)}`;
export const replayPath = (id: string) => `${detailPath('missions', id)}/replay`;
export function withQuery(path: string, filters: Record<string, string>) { const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)); return path + (q.size ? '?' + q : ''); }
export type LoadResult<T> = {
    data?: T;
    error?: string;
    loading: boolean;
    reload: () => void;
};
export function useLoad<T>(key: string, load: () => Promise<T>, enabled = true): LoadResult<T> {
    const loader = useRef(load);
    loader.current = load;
    const [revision, setRevision] = useState(0);
    const [state, setState] = useState<{
        key: string;
        revision: number;
        data?: T;
        error?: string;
        loading: boolean;
    }>({ key, revision, loading: true });
    useEffect(() => { if (!enabled)
        return; let live = true; setState({ key, revision, loading: true }); void loader.current().then(data => { if (live)
        setState({ key, revision, data, loading: false }); }).catch((e: unknown) => { if (live)
        setState({ key, revision, error: adminErrorText(e, 'Unable to load records. Please try again.'), loading: false }); }); return () => { live = false; }; }, [key, revision, enabled]);
    const current = enabled && state.key === key && state.revision === revision ? state : { loading: enabled, data: undefined, error: undefined };
    return { ...current, reload: () => { invalidateAdminReads(); setRevision(x => x + 1); } };
}
export function LoadState({ loading, error, reload, label = 'Loading records…' }: {
    loading: boolean;
    error?: string;
    reload: () => void;
    label?: string;
}) { return loading ? <OperatorLoadingState label={label}/> : error ? <div className="ah-message" role="alert">{error} <button type="button" className="text-button" onClick={reload}>Retry</button></div> : null; }
export function dateText(s?: string) { const parsed = validTime(s ?? ''); return parsed ? new Date(parsed).toLocaleString('en-GB') : '—'; }
export function pct(n?: number) { return n !== undefined && n >= 0 && n <= 100 ? `${n}%` : '—'; }
export function Badge({ value }: {
    value: string;
}) { const s = canonical(value); return <StatusBadge tone={['COMPLETED', 'RESOLVED', 'SUCCESS', 'DELIVERED'].includes(s) ? 'success' : ['FAILED', 'CRITICAL', 'OVERDUE'].includes(s) ? 'danger' : ['IN_PROGRESS', 'FLYING'].includes(s) ? 'info' : ['PENDING', 'SCHEDULED', 'WARNING'].includes(s) ? 'warning' : 'neutral'}>{value || '—'}</StatusBadge>; }
export function useHubs() { const q = useLoad('history-hubs', adminOperationsApi.hubs); return { hubs: q.data ?? [], name: (id: string) => q.data?.find(h => String(h.id) === id)?.name || id || '—' }; }
export function HistoryShell({ title, children, back, refresh }: {
    title: string;
    children: ReactNode;
    back?: string;
    refresh?: () => void;
}) { return <AdminPageShell title={title} hideSectionTabs actions={refresh ? <ActionButton variant="secondary" onClick={refresh}><RefreshCw size={15}/>Refresh</ActionButton> : undefined}><div className="admin-history">{back && <Link className="ah-back" to={back}><ArrowLeft size={15}/>Back</Link>}{children}</div></AdminPageShell>; }
export function HistoryTabs({ entries, active }: {
    entries: [
        string,
        string
    ][];
    active: string;
}) { const { search, state } = useLocation(); return <nav className="subtabs" aria-label="History navigation">{entries.map(([label, path]) => <Link key={path} to={path + search} state={state} className={active === path ? 'active' : undefined} aria-current={active === path ? 'page' : undefined}>{label}</Link>)}</nav>; }
export function useHistoryFilters() { const { state } = useLocation(); const [p, setP] = useSearchParams(); const set = (k: string, v: string) => { const next = new URLSearchParams(p); v ? next.set(k, v) : next.delete(k); setP(next, { replace: true, state }); }; return { p, set, clear: () => setP(new URLSearchParams(), { replace: true, state }) }; }
export type Filters = ReturnType<typeof useHistoryFilters>;
export function ScopeFilters({ filters }: {
    filters: Filters;
}) { const { p, set, clear } = filters; const values = ['drone', 'hub', 'battery', 'mission'].filter(k => p.get(k)); return values.length ? <div className="ah-scope">{values.map(k => <span key={k} className="ah-filter-chip">{k[0].toUpperCase() + k.slice(1)}: {p.get(k)}<button aria-label={`Remove ${k} filter`} onClick={() => set(k, '')}><X size={13}/></button></span>)}<button className="text-button" onClick={clear}>Clear filters</button></div> : null; }
export function useTableFilters() { const [search, setSearch] = useState(''), [status, setStatus] = useState(''), [from, setFrom] = useState(''), [to, setTo] = useState(''); return { search, setSearch, status, setStatus, from, to, setDates: (a: string, b: string) => { setFrom(a); setTo(b); }, match: (values: string[], at?: string, state?: string) => { const d = at && Number.isFinite(Date.parse(at)) ? calendarDateKey(new Date(at)) : ''; return values.join(' ').toLowerCase().includes(search.trim().toLowerCase()) && (!status || state === status) && (!from || Boolean(d && d >= from)) && (!to || Boolean(d && d <= to)); } }; }
export function HistoryToolbar({ f, statuses = [], count, placeholder = 'Search records…', extra }: {
    f: ReturnType<typeof useTableFilters>;
    statuses?: string[];
    count: number;
    placeholder?: string;
    extra?: ReactNode;
}) { return <AdminToolbar searchValue={f.search} onSearchChange={f.setSearch} placeholder={placeholder} meta={`${count} records`} filters={<>{statuses.length > 0 && <AdminSelect aria-label="Status" value={f.status} onChange={e => f.setStatus(e.target.value)}><option value="">All statuses</option>{statuses.map(s => <option key={s} value={s}>{s}</option>)}</AdminSelect>}{extra}<AdminDateRangePicker from={f.from} to={f.to} onChange={f.setDates} label="Date range"/>{(f.from || f.to) && <button className="text-button" onClick={() => f.setDates('', '')}>Clear dates</button>}</>}/>; }
export function HistoryTable<T>({ headers, items, render, toolbar, empty = 'No records found.', className = '', filterKey = '' }: {
    headers: string[];
    items: T[];
    render: (item: T, index: number) => ReactNode;
    toolbar?: ReactNode;
    empty?: string;
    className?: string;
    filterKey?: string;
}) { const [page, setPage] = useState(1); useEffect(() => setPage(1), [filterKey]); const current = Math.min(page, Math.max(1, Math.ceil(items.length / OPERATOR_PAGE_SIZE))); return <OperatorPanel className="flush-panel ah-table-panel">{toolbar}<div className="table-wrap"><OperatorTable className={`admin-pinned-actions ${className}`}><TableHeader><TableRow>{headers.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{items.slice((current - 1) * OPERATOR_PAGE_SIZE, current * OPERATOR_PAGE_SIZE).map((r, i) => render(r, (current - 1) * OPERATOR_PAGE_SIZE + i))}{!items.length && <TableRow><TableCell colSpan={headers.length} className="ah-empty">{empty}</TableCell></TableRow>}</TableBody></OperatorTable></div><OperatorPagination currentPage={current} totalItems={items.length} onPageChange={setPage} itemLabel="records"/></OperatorPanel>; }
export function Facts({ values }: {
    values: [
        string,
        ReactNode
    ][];
}) { return <dl className="ah-facts">{values.map(([label, v]) => <div key={label}><dt>{label}</dt><dd>{v || '—'}</dd></div>)}</dl>; }
export function Partial({ partial }: {
    partial?: boolean;
}) { return partial ? <p className="ah-message" role="status">Some records could not be loaded. The results may be incomplete.</p> : null; }
export function EvidenceViewer({ event, onClose }: {
    event: HistoryEvent | null;
    onClose: () => void;
}) { const [index, setIndex] = useState(0); useEffect(() => setIndex(0), [event?.id]); const current = Math.min(index, Math.max(0, (event?.photos.length ?? 1) - 1)); return <Dialog open={!!event} onOpenChange={o => { if (!o)
    onClose(); }}><AdminDialogContent className="ah-evidence-dialog" aria-describedby={undefined}>{event && <><header className="ah-evidence-head"><DialogTitle>Operation Evidence</DialogTitle><ActionButton variant="secondary" onClick={onClose} aria-label="Close"><X size={16}/></ActionButton></header><div className="ah-evidence-body"><strong>{event.stage}</strong>{event.photos.length ? <><div className="ah-photo" key={event.photos[current]}><img src={event.photos[current]} alt={`${event.stage} — photo ${current + 1}`} onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.classList.add('ah-photo-error'); }}/></div><div className="ah-photo-controls"><ActionButton variant="secondary" disabled={current === 0} onClick={() => setIndex(current - 1)} aria-label="Previous photo"><ChevronLeft size={16}/></ActionButton><span>{current + 1} / {event.photos.length}</span><ActionButton variant="secondary" disabled={current === event.photos.length - 1} onClick={() => setIndex(current + 1)} aria-label="Next photo"><ChevronRight size={16}/></ActionButton></div><div className="ah-thumbs">{event.photos.map((url, i) => <button key={url} aria-label={`Photo ${i + 1}`} aria-current={current === i ? 'true' : undefined} onClick={() => setIndex(i)}><img src={url} alt="" loading="lazy"/></button>)}</div></> : <div className="ah-empty">No photos recorded.</div>}<Facts values={[...(event.order?[["Order",event.order] as [string,ReactNode]]:[]), ...(event.workOrder?[["Work order",event.workOrder] as [string,ReactNode]]:[]), ["Mission", event.mission], ["Hub", event.hub], ["Recorded by", event.actor], ["Recorded at", dateText(event.at)], ["Note", event.note]]}/>{event.checklist != null && <Checklist value={event.checklist}/>}</div></>}</AdminDialogContent></Dialog>; }
export function Checklist({ value }: {
    value: unknown;
}) { const entries = Array.isArray(value) ? value : Object.entries(typeof value === 'object' && value ? value : {}).map(([label, status]) => ({ label, status })); return entries.length ? <div className="ah-checklist"><h3>Checklist</h3>{entries.map((entry, i) => { if (typeof entry === 'string')
    return <div key={i}>{entry}</div>; const r = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>; const label = r.item_name ?? r.label ?? r.name ?? r.item ?? r.check ?? r.description; const status = r.is_completed ?? r.status ?? r.checked ?? r.completed ?? r.passed; return typeof label === 'string' ? <div key={i}><span>{label}</span><span>{typeof status === 'boolean' ? (status ? 'Checked' : 'Not checked') : typeof status === 'string' ? status : '—'}</span></div> : null; })}</div> : null; }
export function EvidenceButton({ event, onClick }: {
    event: HistoryEvent;
    onClick: () => void;
}) { return <ActionButton variant="secondary" onClick={onClick}><Image size={14}/>{event.photos.length ? `${event.photos.length} photo${event.photos.length === 1 ? '' : 's'}` : 'View evidence'}</ActionButton>; }
export function AssetHistoryLinks({ kind, id }: {
    kind: 'drone' | 'hub' | 'battery';
    id: string;
}) { const location = useLocation(); const links: [
    string,
    string
][] = [['Flight history', paths.missions], ['Battery swaps', paths.swaps], ...(kind === 'hub' ? [['Package handling', paths.packages] as [
            string,
            string
        ]] : []), ...(kind !== 'battery' ? [['Work orders', paths.maintenance] as [
            string,
            string
        ]] : [])]; return <section className="ah-asset-links"><h2><History size={17}/>History</h2><div>{links.map(([label, path]) => <Link key={path} className="button button-secondary" to={withQuery(path, { [kind]: id })} state={{ back: location.pathname + location.search }}>{label}</Link>)}</div></section>; }
export function useBack(fallback: string) { const { state } = useLocation(); const back = (state as {
    back?: unknown;
} | null)?.back; return typeof back === 'string' && back.startsWith('/admin/') ? back : fallback; }
export { TableRow, TableCell };
