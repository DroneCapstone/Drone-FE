import { Fragment } from 'react';
import { OperatorLoadingState } from '../../components/OperatorLoadingState';
import { Clock, Info } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { OperatorPanel } from '../../components/OperatorPanel';
import { isFlightHistoryRecord } from '../../api/flightHistoryEligibility';
import {
  useMissionDetailQuery,
  useMissionHubCheckpointsQuery,
  useMissionHubsQuery,
} from '../../hooks/useMissionQueries';
import { useOperatorOrderQuery } from '../../hooks/useOrderQueries';
import type { MissionStatus } from '../../types/operator';
import { formatMissionTime } from '../../utils/missionTiming';
import { MissionPageShell } from './MissionPageShell';
import './mission-detail-refined.css';

const progressOrder: MissionStatus[] = ['Scheduled', 'In Progress', 'Completed'];

export function MissionDetailPage() {
  const navigate = useNavigate();
  const { missionId } = useParams();
  const missionKey = missionId ?? '';
  const {
    data: mission,
    isLoading: isMissionLoading,
    error: missionError,
  } = useMissionDetailQuery(missionKey);
  const { data: order } = useOperatorOrderQuery(mission?.orderId ?? '');
  const { data: apiHubs } = useMissionHubsQuery();
  const { data: hubCheckpoints } = useMissionHubCheckpointsQuery(missionKey);

  if (isMissionLoading) {
    return (
      <MissionPageShell active="/operator/missions/all">
        <OperatorPanel><OperatorLoadingState label="Loading mission…" /></OperatorPanel>
      </MissionPageShell>
    );
  }
  if (missionError || !mission) {
    return (
      <MissionPageShell active="/operator/missions/all">
        <OperatorPanel>
          <div className="operator-empty-state">
            {missionError instanceof Error ? missionError.message : 'Mission not found.'}
          </div>
        </OperatorPanel>
      </MissionPageShell>
    );
  }

  const hubs = apiHubs ?? [];
  const originHub = hubs.find((hub) => hub.id === mission.originHubId);
  const destinationHub = hubs.find((hub) => hub.id === mission.destinationHubId);
  const relayHubs = (mission.relayHubIds ?? [])
    .map((hubId) => hubs.find((hub) => hub.id === hubId))
    .filter((hub): hub is NonNullable<typeof hub> => Boolean(hub));
  const hubName = (hubId: string) => hubs.find((hub) => hub.id === hubId)?.name ?? hubId;
  const currentIndex = progressOrder.indexOf(mission.status);
  const isTerminalException = mission.status === 'Failed';
  const hasFlightHistory = isFlightHistoryRecord(mission);
  const originName = originHub?.name || mission.originHubId || '—';
  const destinationName = destinationHub?.name || mission.destinationHubId || '—';
  const originBatteryId = mission.legs?.[0]?.batteryId || mission.batteryId || '—';
  const orderCodeStart = mission.orderId ? mission.name.indexOf(mission.orderId) : -1;

  return (
    <MissionPageShell active="/operator/missions/all">
      <div className="detail-layout mission-detail-refined">
        <div className="detail-main">
          <OperatorPanel className="mission-detail-hero-panel">
            <div className="mission-hero">
              <div className="mission-detail-heading">
                {/* Preserve the existing blue Scheduled badge and status tones. */}
                <StatusBadge tone={mission.tone}>{mission.status}</StatusBadge>
                <h2>
                  {orderCodeStart >= 0 ? (
                    <>
                      {mission.name.slice(0, orderCodeStart)}
                      <Link
                        className="mission-detail-order-link"
                        to={`/operator/orders/${encodeURIComponent(mission.orderId)}`}
                        aria-label={`View order ${mission.orderId}`}
                      >
                        {mission.orderId}
                      </Link>
                      {mission.name.slice(orderCodeStart + mission.orderId.length)}
                    </>
                  ) : (
                    <>
                      {mission.name}{' '}
                      <Link
                        className="mission-detail-order-link"
                        to={`/operator/orders/${encodeURIComponent(mission.orderId)}`}
                        aria-label={`View order ${mission.orderId}`}
                      >
                        {mission.orderId}
                      </Link>
                    </>
                  )}
                </h2>
                <p>{mission.id}</p>
              </div>
              <div className="mission-hero-actions">
                {mission.status === 'In Progress' && (
                  <ActionButton variant="secondary" onClick={() => navigate('/operator/operations/live')}>
                    Track live
                  </ActionButton>
                )}
                {hasFlightHistory && (
                  <ActionButton
                    variant="secondary"
                    onClick={() => navigate(`/operator/operations/history?q=${encodeURIComponent(mission.id)}`)}
                  >
                    Flight history
                  </ActionButton>
                )}
                <ActionButton
                  variant="secondary"
                  onClick={() => navigate(`/operator/ai/mission-analysis?${new URLSearchParams({
                    orderId: mission.orderId,
                    droneId: mission.droneId,
                    ...(mission.batteryId ? { batteryId: mission.batteryId } : {}),
                    routeId: mission.routeId,
                    ...(mission.bundledOrderIds?.length ? { bundledOrderIds: mission.bundledOrderIds.join(',') } : {}),
                  }).toString()}`)}
                >
                  AI analysis
                </ActionButton>
              </div>
            </div>

            {!isTerminalException && currentIndex >= 0 && (
              <div className="mission-progress">
                {progressOrder.map((status, index) => (
                  <Fragment key={status}>
                    <span className={index < currentIndex ? 'done' : index === currentIndex ? 'current' : ''}>
                      <i>{index < currentIndex ? <Icon name="check" size={13} /> : index + 1}</i>
                      {status}
                      <small>
                        {status === 'Scheduled'
                          ? `Plan ${new Date(mission.plannedStartAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : status === 'In Progress'
                            ? mission.actualStartedAt
                              ? `Started ${new Date(mission.actualStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              : 'Awaiting start'
                            : mission.actualCompletedAt
                              ? `Done ${new Date(mission.actualCompletedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              : `ETA ${mission.eta}`}
                      </small>
                    </span>
                    {index < progressOrder.length - 1 && <b />}
                  </Fragment>
                ))}
              </div>
            )}
          </OperatorPanel>

          <OperatorPanel className="mission-detail-plan-panel">
            <div className="mission-detail-section-title">
              {/* Only this heading's map icon changes to orange. */}
              <svg className="mission-detail-map-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 6.5 9 3l6 3 6-3v14.5L15 21l-6-3-6 3V6.5Z" />
                <path d="M9 3v15M15 6v15" />
              </svg>
              <h2>Mission plan</h2>
            </div>
            {/* No duplicated “Mission route” subheading. */}
            <div className="mission-route-flow mission-detail-route-flow">
              <div className="mission-route-node mission-detail-route-node">
                <span className="mission-detail-location-mark origin"><Icon name="pin" size={19} /></span>
                <span className="mission-detail-route-label">
                  <small>Drop-off Point</small>
                  <strong>{originName}</strong>
                </span>
              </div>
              {relayHubs.map((hub) => (
                <Fragment key={hub.id}>
                  <span className="mission-route-arrow">→</span>
                  <div className="mission-route-node mission-detail-route-node relay">
                    <span className="mission-detail-location-mark relay"><Icon name="pin" size={19} /></span>
                    <span className="mission-detail-route-label">
                      <small>Relay Hub</small>
                      <strong>{hub.name}</strong>
                      {/* <small>Technical stop</small> */}
                    </span>
                  </div>
                </Fragment>
              ))}
              <span className="mission-route-arrow">→</span>
              <div className="mission-route-node mission-detail-route-node">
                <span className="mission-detail-location-mark destination"><Icon name="pin" size={19} /></span>
                <span className="mission-detail-route-label">
                  <small>Pick-up Point</small>
                  <strong>{destinationName}</strong>
                </span>
              </div>
            </div>

            {mission.legs && mission.legs.length > 0 && (
              <div className="mission-leg-list mission-detail-leg-list">
                {mission.legs.map((leg, index) => (
                  <div key={leg.id}>
                    <span>
                      <small className="mission-detail-leg-label">Leg {index + 1}{leg.isDispatch ? ' · Dispatch · 0 kg' : ''}</small>
                      <strong>{hubName(leg.fromHubId)} → {hubName(leg.toHubId)}</strong>
                      <small className="mission-leg-battery-info">
                        {leg.batteryId
                          ? <>Battery {leg.batteryId}{leg.batteryModel ? ` · ${leg.batteryModel}` : ''}{leg.batteryChargePct !== undefined ? ` · ${leg.batteryChargePct}%` : ''}{leg.batteryEnergyWh !== undefined ? ` · ${leg.batteryEnergyWh.toFixed(1)} Wh` : ''}</>
                          : 'Battery ID unavailable'}
                      </small>
                    </span>
                    <StatusBadge tone={leg.status === 'Completed' ? 'success' : leg.status === 'In Progress' ? 'warning' : 'neutral'}>
                      {leg.status}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            )}
            {hubCheckpoints && hubCheckpoints.length > 0 && (
              <div className="mission-leg-list mission-detail-leg-list">
                {hubCheckpoints.map((checkpoint) => (
                  <div key={checkpoint.id}>
                    <span>
                      <small>Hub checkpoint {checkpoint.sequence}</small>
                      <strong>{checkpoint.hubName || checkpoint.hubId}</strong>
                    </span>
                    <StatusBadge tone="success">Reached</StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </OperatorPanel>
        </div>

        <aside className="detail-side">
          <OperatorPanel className="mission-detail-side-panel">
            <div className="mission-detail-side-title-with-icon">
              <span className="mission-detail-filled-icon mission-detail-info-icon" aria-hidden="true"><Info size={16} /></span>
              <h2 className="mission-detail-side-title">Mission details</h2>
            </div>
            <dl className="key-values mission-detail-facts">
              <div><dt>Drone</dt><dd>{mission.drone || mission.droneId || '—'}</dd></div>
              <div><dt>{mission.legs?.[0]?.isDispatch ? 'Dispatch battery' : 'Origin battery'}</dt><dd>{originBatteryId}</dd></div>
              <div><dt>Payload</dt><dd>{mission.payloadWeightKg !== undefined
                ? `${mission.payloadWeightKg.toFixed(2)} kg`
                : mission.bundledOrderIds?.length ? '—' : order ? `${order.payloadKg} kg` : '—'}</dd></div>
              {(mission.bundledOrderIds?.length || (mission.totalOrdersCount ?? 1) > 1) ? (
                <>
                  <div><dt>Orders</dt><dd>{mission.totalOrdersCount ?? 1 + (mission.bundledOrderIds?.length ?? 0)}</dd></div>
                  {mission.bundledOrderIds && mission.bundledOrderIds.length > 0 && (
                    <div><dt>Bundled orders</dt><dd>{mission.bundledOrderIds.join(', ')}</dd></div>
                  )}
                </>
              ) : null}
              <div><dt>Drop-off Point</dt><dd>{originName}</dd></div>
              <div><dt>Origin package</dt><dd>{order?.originHubReceivedAt ? `Received · ${formatMissionTime(order.originHubReceivedAt)}` : 'Awaiting package'}</dd></div>
              {relayHubs.length > 0 && <div><dt>Relay Hub</dt><dd>{relayHubs.map((hub) => hub.name).join(' → ')}</dd></div>}
              <div><dt>Pick-up Point</dt><dd>{destinationName}</dd></div>
              <div><dt>Route</dt><dd>{mission.routeId || '—'}{mission.route ? ` · ${mission.route}` : ''}</dd></div>
            </dl>
          </OperatorPanel>

          <OperatorPanel className="mission-detail-side-panel">
            <div className="mission-detail-side-title-with-icon">
              <span className="mission-detail-filled-icon" aria-hidden="true"><Clock size={16} /></span>
              <h2 className="mission-detail-side-title">Schedule & performance</h2>
            </div>
            <dl className="key-values mission-detail-facts">
              <div><dt>Planned start</dt><dd>{formatMissionTime(mission.plannedStartAt)}</dd></div>
              <div><dt>Estimated arrival</dt><dd>{formatMissionTime(mission.estimatedArrivalAt)}</dd></div>
              <div><dt>Predicted duration</dt><dd>{mission.predictedDurationMin} min</dd></div>
              <div><dt>Energy (predicted)</dt><dd>{mission.estimatedEnergyWh.toFixed(1)} Wh</dd></div>
              <div><dt>Battery use (predicted)</dt><dd>{mission.batteryConsumptionPct}%</dd></div>
              <div><dt>Battery after</dt><dd>{mission.battery}%</dd></div>
            </dl>
          </OperatorPanel>
        </aside>
      </div>
    </MissionPageShell>
  );
}
