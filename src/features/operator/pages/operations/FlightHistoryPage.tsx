import { formatHubName } from '../../utils/displayEnglish';
import { OperatorTable, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/OperatorTable';
import { useMemo, useState } from 'react';
import { OperatorLoadingState } from '../../components/OperatorLoadingState';
import { OperatorDateInput } from '../../components/OperatorDateInput';
import { useQueries } from '@tanstack/react-query';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { OPERATOR_PAGE_SIZE, OperatorPagination } from '../../components/OperatorPagination';
import { useMissionHubsQuery, useMissionListQuery, useMissionMiniHubsQuery } from '../../hooks/useMissionQueries';
import type { Mission } from '../../types/operator';
import { canReplayFlight, isFlightHistoryRecord, recordedFlightEnd, recordedFlightStart } from '../../api/flightHistoryEligibility';
import { fetchFlightTelemetry, hasReplayableTelemetry, type HistoricalTelemetry } from '../../api/flightHistoryApi';
import { DropdownSelect } from '../../../../components/ui/DropdownSelect';
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
function flightStart(m: Mission) { return recordedFlightStart(m); }
function flightEnd(m: Mission) { return recordedFlightEnd(m); }
/**
 * Flight History shows the GPS *recorded interval*, not the Mission lifecycle
 * interval. BE departure/arrival timestamps may be recorded late, conflict, or
 * use a different timezone. We never invent a flight duration from them.
 * The first/last GPS fix is only the recorded window, NOT proof that the entire
 * physical flight was captured.
 */
function gpsRecordingWindow(points?: HistoricalTelemetry[]) {
  if (!points || !hasReplayableTelemetry(points)) return null;
  const valid = points.filter(p =>
    validDate(p.recordedAt) && p.latitude != null && p.longitude != null &&
    Number.isFinite(p.latitude) && Number.isFinite(p.longitude) &&
    Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180,
  );
  if (valid.length < 2) return null;
  const first = valid[0];
  const last = valid[valid.length - 1];
  const durationMs = Date.parse(last.recordedAt) - Date.parse(first.recordedAt);
  if (!Number.isFinite(durationMs) || durationMs <= 0) return null;
  return { start: first.recordedAt, end: last.recordedAt, durationSeconds: Math.round(durationMs / 1000) };
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
  const [dateResetKey, setDateResetKey] = useState(0);
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

  const records = useMemo(() => missions.filter(isFlightHistoryRecord).sort((a, b) => {
    const aTime = validDate(flightStart(a) || flightEnd(a) || a.plannedStartAt || a.createdAt)?.getTime() ?? 0;
    const bTime = validDate(flightStart(b) || flightEnd(b) || b.plannedStartAt || b.createdAt)?.getTime() ?? 0;
    return bTime - aTime;
  }), [missions]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (key === 'date') { next.delete('from'); next.delete('to'); }
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
    setPage(1);
  };
  const clearFilters = () => { setParams({}); setPage(1); setDateResetKey(key => key + 1); };

  const filtered = useMemo(() => records.filter(m => {
    const date = localDay(flightStart(m) || flightEnd(m));
    const routeNames = `${hubs.get(m.originHubId) ?? ''} ${hubs.get(m.destinationHubId) ?? ''}`;
    return (!search || `${m.id} ${m.droneId} ${m.drone} ${m.route} ${routeNames}`.toLowerCase().includes(search.trim().toLowerCase()))
      && (!from || (date !== '' && date >= from)) && (!to || (date !== '' && date <= to))
      && (!status || m.status === status)
      && (!drone || m.droneId === drone)
      && (!hub || m.originHubId === hub || m.destinationHubId === hub || Boolean(m.relayHubIds?.includes(hub)));
  }), [records, search, from, to, status, drone, hub, hubs]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / OPERATOR_PAGE_SIZE));
  const paged = filtered.slice((Math.min(page, totalPages) - 1) * OPERATOR_PAGE_SIZE, Math.min(page, totalPages) * OPERATOR_PAGE_SIZE);
  // Fetch actual GPS for visible rows. React Query shares this EXACT cache key
  // with Flight Replay, so clicking Replay does not download the same log again.
  // Only visible rows are loaded, avoiding one full telemetry request per mission
  // in the whole database.
  const replayChecks = useQueries({
    queries: paged.map(m => ({
      queryKey: ['operator', 'flight-history', 'telemetry-all', m.id],
      queryFn: () => fetchFlightTelemetry(m.id),
      enabled: canReplayFlight(m),
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    })),
  });
  const gpsWindows = replayChecks.map(q => gpsRecordingWindow(q.data));

  return (
    <div className="flight-history-screen">
      <PageHeader section="operations" title="Flight history" subtitle="Search and review recorded missions, playback routes, and operational history." />
      <RouteTabs items={operationTabs} active="/operator/operations/history" />
      <section className="fh-filter-panel" aria-label="Flight history filters">
        <label className="fh-filter fh-search"><span>Search</span><input aria-label="Search history" value={search} onChange={e => setFilter('q', e.target.value)} placeholder="Mission ID, drone or route..." /></label>
        <div className="fh-filter"><span>Date</span><OperatorDateInput key={dateResetKey} label="Filter flights by date" value={from} onChange={value => setFilter('date', value)} /></div>

        <div className="fh-filter">
          <span>Status</span>
          <DropdownSelect
            value={status || '__all_statuses__'}
            options={[{ value: '__all_statuses__', label: 'All statuses' }, 'Completed', 'Failed']}
            onChange={value => setFilter('status', value === '__all_statuses__' ? '' : value)}
            ariaLabel="Filter flights by status"
            className="w-full min-w-0"
          />
        </div>
        <div className="fh-filter">
          <span>Hub</span>
          <DropdownSelect
            value={hub || '__all_hubs__'}
            options={[{ value: '__all_hubs__', label: 'All hubs' }, ...Array.from(hubs, ([id, name]) => ({ value: id, label: formatHubName(name) || name }))]}
            onChange={value => setFilter('hub', value === '__all_hubs__' ? '' : value)}
            ariaLabel="Filter flights by hub"
            className="w-full min-w-0"
          />
        </div>
        <button type="button" className="fh-button fh-reset" onClick={clearFilters}>Reset filters</button>
      </section>
      <div className="fh-columns">
        <section className="fh-card fh-table-card">
          <div className="fh-card-head"><h2>Flight history</h2><span>{isFetching ? 'Refreshing…' : `${filtered.length} records`}</span></div>
          {error ? <div className="fh-empty" role="alert"><strong>Unable to load mission history.</strong><p>{error instanceof Error ? error.message : 'Please try again.'}</p><button type="button" className="fh-button" onClick={() => void refetch()}>Retry</button></div>
            : isLoading ? <OperatorLoadingState label="Loading flight history…" />
              : filtered.length === 0 ? <div className="fh-empty"><strong>No recorded flights found</strong><p>Try different filters. Only completed missions and failed missions with a recorded take-off appear here. Scheduled and Flying missions are excluded.</p></div>
                : <>
                  <div className="fh-table-scroll"><OperatorTable className="fh-table"><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Mission</TableHead><TableHead>Drone</TableHead><TableHead>Route</TableHead><TableHead title="First recorded GPS fix">Start</TableHead><TableHead title="Last recorded GPS fix">End</TableHead><TableHead title="Recorded GPS interval, not the Mission lifecycle duration">Duration</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader><TableBody>
                    {paged.map((m, index) => <TableRow
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
                      <TableCell className="fh-nowrap">{fmtDate(flightStart(m) || flightEnd(m))}</TableCell>
                      <TableCell><span className="fh-link fh-strong">{m.id}</span></TableCell>
                      <TableCell><span className="fh-link">{m.drone || m.droneId || '—'}</span></TableCell>
                      <TableCell className="fh-route" title={`${formatHubName(hubs.get(m.originHubId)) || m.originHubId} → ${formatHubName(hubs.get(m.destinationHubId)) || m.destinationHubId}`}>{formatHubName(hubs.get(m.originHubId)) || m.originHubId || '—'} <span>→</span> {formatHubName(hubs.get(m.destinationHubId)) || m.destinationHubId || '—'}</TableCell>
                      <TableCell className="fh-nowrap" title="First valid recorded GPS timestamp (not Mission start_time)">{replayChecks[index]?.isLoading ? '…' : fmtTime(gpsWindows[index]?.start)}</TableCell><TableCell className="fh-nowrap" title="Last valid recorded GPS timestamp (not Mission end_time)">{replayChecks[index]?.isLoading ? '…' : fmtTime(gpsWindows[index]?.end)}</TableCell>
                      <TableCell className="fh-nowrap fh-numbers" title="Elapsed time between first and last recorded GPS fix; partial telemetry may not cover the entire flight">{replayChecks[index]?.isLoading ? '…' : fmtDuration(gpsWindows[index]?.durationSeconds ?? null)}</TableCell>
                      <TableCell><span className={`fh-status fh-status-${m.status.toLowerCase().replace(/\s+/g, '-')}`}>{m.status}</span></TableCell>
                      <TableCell><div className="fh-row-actions">{canReplayFlight(m) && gpsWindows[index] ? <Link className="fh-button" onClick={event => event.stopPropagation()} to={`/operator/operations/history/${encodeURIComponent(m.id)}`}>▶ Replay</Link> : <span className="fh-muted-action" title={replayChecks[index]?.isError ? 'Telemetry API failed: ' + String(replayChecks[index]?.error ?? 'Unknown error') : replayChecks[index]?.isLoading ? 'Checking recorded GPS…' : 'No replayable GPS recording for this Mission'}>{replayChecks[index]?.isLoading ? '…' : '—'}</span>}</div></TableCell>
                    </TableRow>)}
                  </TableBody></OperatorTable></div>
                  <OperatorPagination currentPage={Math.min(page, totalPages)} totalItems={filtered.length} itemLabel="recorded flights" onPageChange={setPage} />
                </>}
        </section>
      </div>
      {/* <p className="fh-navigation-note">Flight history is the central Operations page. Open it from a drone or hub using <code>?drone=ID</code> or <code>?hub=ID</code> to pre-filter the records.</p> */}
    </div>
  );
}
