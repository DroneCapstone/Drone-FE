import { useMemo, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { OPERATOR_PAGE_SIZE, OperatorPagination } from '../../components/OperatorPagination';
import { useMissionHubsQuery, useMissionListQuery, useMissionMiniHubsQuery } from '../../hooks/useMissionQueries';
import type { Mission } from '../../types/operator';
import { RouteTabs } from '../../../../components/ui/RouteTabs';
import { operationTabs } from '../../constants/operatorRoutes';
import './flight-history.css';
import './flight-history-overrides.css';



function validDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
function localDay(value?: string) {
  const d = validDate(value);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fmtDate(value?: string) {
  const d = validDate(value);
  return d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}
function fmtTime(value?: string) {
  const d = validDate(value);
  return d ? d.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
}
function durationSecs(m: Mission): number | null {
  const s = validDate(m.actualStartedAt);
  const e = validDate(m.actualCompletedAt);
  if (!s || !e || e.getTime() < s.getTime()) return null;
  return Math.round((e.getTime() - s.getTime()) / 1000);
}
function fmtDuration(seconds: number | null) {
  if (seconds == null) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function FlightHistoryPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const search = params.get('q') ?? '';
  const from = params.get('date') ?? '';
  const to = from;
  const status = params.get('status') ?? '';
  const drone = params.get('drone') ?? '';
  const hub = params.get('hub') ?? '';
  const { data: missions = [], isLoading, error, refetch, isFetching } = useMissionListQuery();
  const hubsQuery = useMissionHubsQuery();
  const miniHubsQuery = useMissionMiniHubsQuery();
  const hubs = useMemo(() => {
    const unique = new Map<string, string>();
    [...(hubsQuery.data ?? []), ...(miniHubsQuery.data ?? [])].forEach(h => unique.set(String(h.id), h.name));
    return unique;
  }, [hubsQuery.data, miniHubsQuery.data]);

  const records = useMemo(() => missions.filter(m => {
    // A planned mission is not a recorded flight. Cancelled before departure is not a flight.
    // Completed flights remain in history even when list API omits actual timestamps.
    // The UI never fabricates actual departure/arrival times.
    return Boolean(m.actualStartedAt || m.actualCompletedAt) || m.status === 'Completed';
  }).sort((a, b) => {
    const aTime = validDate(a.actualStartedAt || a.actualCompletedAt || a.plannedStartAt || a.createdAt)?.getTime() ?? 0;
    const bTime = validDate(b.actualStartedAt || b.actualCompletedAt || b.plannedStartAt || b.createdAt)?.getTime() ?? 0;
    return bTime - aTime;
  }), [missions]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (key === 'date') { next.delete('from'); next.delete('to'); }
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
    setPage(1);
  };
  const clearFilters = () => { setParams({}); setPage(1); };

  const filtered = useMemo(() => records.filter(m => {
    const date = localDay(m.actualStartedAt || m.actualCompletedAt || m.plannedStartAt || m.createdAt);
    const routeNames = `${hubs.get(m.originHubId) ?? ''} ${hubs.get(m.destinationHubId) ?? ''}`;
    return (!search || `${m.id} ${m.droneId} ${m.drone} ${m.route} ${routeNames}`.toLowerCase().includes(search.trim().toLowerCase()))
      && (!from || (date !== '' && date >= from)) && (!to || (date !== '' && date <= to))
      && (!status || m.status === status)
      && (!drone || m.droneId === drone)
      && (!hub || m.originHubId === hub || m.destinationHubId === hub || Boolean(m.relayHubIds?.includes(hub)));
  }), [records, search, from, to, status, drone, hub, hubs]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / OPERATOR_PAGE_SIZE));
  const paged = filtered.slice((Math.min(page, totalPages) - 1) * OPERATOR_PAGE_SIZE, Math.min(page, totalPages) * OPERATOR_PAGE_SIZE);
  const durations = filtered.map(durationSecs).filter((n): n is number => n !== null);
  const totalSeconds = durations.reduce((a, b) => a + b, 0);
  const uniqueDrones = new Set(filtered.map(m => m.droneId).filter(Boolean)).size;
  const uniqueHubs = new Set(filtered.flatMap(m => [m.originHubId, m.destinationHubId, ...(m.relayHubIds ?? [])]).filter(Boolean)).size;
  const first = filtered[filtered.length - 1];
  const recent = filtered[0];

  return (
    <div className="flight-history-screen">
      <PageHeader section="operations" title="Flight history" subtitle="Search and review recorded missions, playback routes, and operational history." />
      <RouteTabs items={operationTabs} active="/operator/operations/history" />
      <section className="fh-filter-panel" aria-label="Flight history filters">
        <label className="fh-filter fh-search"><span>Search</span><input aria-label="Search history" value={search} onChange={e => setFilter('q', e.target.value)} placeholder="Mission ID, drone or route..." /></label>
        <label className="fh-filter"><span>Date</span><input type="date" aria-label="Filter flights by date" value={from} onChange={e => setFilter('date', e.target.value)} /></label>
        
        <label className="fh-filter"><span>Status</span><select value={status} onChange={e => setFilter('status', e.target.value)}><option value="">All statuses</option><option>Completed</option><option>Failed</option><option>Cancelled</option><option>In Progress</option></select></label>
        <label className="fh-filter"><span>Hub</span><select value={hub} onChange={e => setFilter('hub', e.target.value)}><option value="">All hubs</option>{Array.from(hubs, ([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <button type="button" className="fh-button fh-reset" onClick={clearFilters}>Reset filters</button>
      </section>
      <div className="fh-columns">
        <section className="fh-card fh-table-card">
          <div className="fh-card-head"><h2>Flight history</h2><span>{isFetching ? 'Refreshing…' : `${filtered.length} records`}</span></div>
          {error ? <div className="fh-empty" role="alert"><strong>Unable to load mission history.</strong><p>{error instanceof Error ? error.message : 'Please try again.'}</p><button type="button" className="fh-button" onClick={() => void refetch()}>Retry</button></div>
            : isLoading ? <div className="fh-empty">Loading flight history…</div>
              : filtered.length === 0 ? <div className="fh-empty"><strong>No recorded flights found</strong><p>Try different filters. This list shows completed missions and missions with recorded flight times.</p></div>
                : <>
                  <div className="fh-table-scroll"><table className="fh-table"><thead><tr><th>Date</th><th>Mission</th><th>Drone</th><th>Route</th><th>Start</th><th>End</th><th>Duration</th><th>Status</th><th>Action</th></tr></thead><tbody>
                    {paged.map(m => <tr
                  key={m.id}
                  className="fh-clickable-row"
                  role="link"
                  tabIndex={0}
                  aria-label={`View mission details: ${m.id}`}
                  onClick={event => {
                    if ((event.target as HTMLElement).closest('a, button, input, select')) return;
                    navigate(`/operator/missions/${encodeURIComponent(m.id)}`);
                  }}
                  onKeyDown={event => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/operator/missions/${encodeURIComponent(m.id)}`);
                    }
                  }}
                >
                      <td className="fh-nowrap">{fmtDate(m.actualStartedAt || m.actualCompletedAt || m.plannedStartAt || m.createdAt)}{!m.actualStartedAt && !m.actualCompletedAt && <small>Scheduled date</small>}</td>
                      <td><span className="fh-link fh-strong">{m.id}</span><small>Delivery mission</small></td>
                      <td><span className="fh-link">{m.drone || m.droneId || '—'}</span></td>
                      <td className="fh-route" title={`${hubs.get(m.originHubId) ?? m.originHubId} → ${hubs.get(m.destinationHubId) ?? m.destinationHubId}`}>{hubs.get(m.originHubId) ?? m.originHubId ?? '—'} <span>→</span> {hubs.get(m.destinationHubId) ?? m.destinationHubId ?? '—'}</td>
                      <td className="fh-nowrap">{fmtTime(m.actualStartedAt)}</td><td className="fh-nowrap">{fmtTime(m.actualCompletedAt)}</td>
                      <td className="fh-nowrap fh-numbers">{fmtDuration(durationSecs(m))}</td>
                      <td><span className={`fh-status fh-status-${m.status.toLowerCase().replace(/\s+/g, '-')}`}>{m.status}</span></td>
                      <td><div className="fh-row-actions"><Link className="fh-button" onClick={event => event.stopPropagation()} to={`/operator/operations/history/${encodeURIComponent(m.id)}`}>▶ Replay</Link></div></td>
                    </tr>)}
                  </tbody></table></div>
                  <OperatorPagination currentPage={Math.min(page, totalPages)} totalItems={filtered.length} itemLabel="recorded flights" onPageChange={setPage} />
                </>}
        </section>
        <aside className="fh-card fh-overview"><h2>Flight history overview</h2>
          <div className="fh-summary-metrics"><div><small>Recorded flights</small><strong>{filtered.length}</strong></div><div><small>Flight duration</small><strong>{durations.length ? `${(totalSeconds / 60).toFixed(1)} min` : '—'}</strong></div></div>
          {/* <div className="fh-summary-note">Duration is based on actual start and completion timestamps.</div> */}
          <dl className="fh-stat-list"><div><dt>Last record</dt><dd>{recent ? fmtDate(recent.actualStartedAt || recent.actualCompletedAt || recent.plannedStartAt || recent.createdAt) : '—'}</dd></div><div><dt>Earliest record</dt><dd>{first ? fmtDate(first.actualStartedAt || first.actualCompletedAt || first.plannedStartAt || first.createdAt) : '—'}</dd></div><div><dt>Unique drones</dt><dd>{uniqueDrones}</dd></div><div><dt>Unique hubs</dt><dd>{uniqueHubs}</dd></div><div><dt>GPS distance</dt><dd>See individual replay</dd></div></dl>
          <h3>Quick links</h3>
          <div className="fh-overview-links"><Link className="fh-button" to="/operator/fleet-hubs/drones">View drone fleet →</Link><Link className="fh-button" to="/operator/fleet-hubs/hubs">View hub network →</Link></div>
        </aside>
      </div>
      {/* <p className="fh-navigation-note">Flight history is the central Operations page. Open it from a drone or hub using <code>?drone=ID</code> or <code>?hub=ID</code> to pre-filter the records.</p> */}
    </div>
  );
}
