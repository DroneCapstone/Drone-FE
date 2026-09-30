import { Fragment } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { OperatorPanel } from '../../components/OperatorPanel';
import {
  useMissionDetailQuery,
  useMissionHubCheckpointsQuery,
  useMissionHubsQuery,
  useMissionMiniHubsQuery,
} from '../../hooks/useMissionQueries';
import { useOperatorOrderQuery } from '../../hooks/useOrderQueries';
import type { MissionStatus } from '../../types/operator';
import { formatMissionTime } from '../../utils/missionTiming';
import { MissionPageShell } from './MissionPageShell';

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
  const { data: apiMiniHubs } = useMissionMiniHubsQuery();
  const { data: hubCheckpoints } = useMissionHubCheckpointsQuery(missionKey);

  if (isMissionLoading) {
    return (
      <MissionPageShell active="/operator/missions/all">
        <OperatorPanel>
          <div className="operator-empty-state">Loading Mission…</div>
        </OperatorPanel>
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

  const hubs = [...(apiHubs ?? []), ...(apiMiniHubs ?? [])];
  const originHub = hubs.find((hub) => hub.id === mission.originHubId);
  const destinationHub = hubs.find((hub) => hub.id === mission.destinationHubId);
  const relayHubs = (mission.relayHubIds ?? [])
    .map((hubId) => hubs.find((hub) => hub.id === hubId))
    .filter((hub): hub is NonNullable<typeof hub> => Boolean(hub));

  const currentIndex = progressOrder.indexOf(mission.status);
  const isTerminalException = mission.status === 'Cancelled' || mission.status === 'Failed';

  const hubName = (hubId: string) =>
    hubs.find((hub) => hub.id === hubId)?.name ?? hubId;

  return (
    <MissionPageShell active="/operator/missions/all">
      <div className="detail-layout">
        <div className="detail-main">
          <OperatorPanel>
            <div className="mission-hero">
              <div>
                <StatusBadge tone={mission.tone}>{mission.status}</StatusBadge>
                <h2>{mission.name}</h2>
                <p>{mission.id}</p>
              </div>

              <div className="mission-hero-actions">
                {mission.status === 'In Progress' && (
                  <ActionButton
                    variant="secondary"
                    onClick={() => navigate('/operator/operations/live')}
                  >
                    Track live
                  </ActionButton>
                )}

                {mission.status !== 'Cancelled' && (
                  <ActionButton
                    variant="secondary"
                    onClick={() =>
                      navigate(
                        `/operator/ai/mission-analysis?orderId=${mission.orderId}&droneId=${mission.droneId}&routeId=${mission.routeId}`,
                      )
                    }
                  >
                    AI analysis
                  </ActionButton>
                )}
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

          <OperatorPanel title="Mission route" eyebrow={mission.status === 'In Progress' ? 'LIVE DELIVERY PATH' : 'MISSION PLAN'}>
            <div className="mission-route-flow">
              <div className="mission-route-node">
                <small>Origin Hub</small>
                <strong>{originHub?.name || mission.originHubId || '—'}</strong>
              </div>

              {relayHubs.map((hub) => (
                <Fragment key={hub.id}>
                  <span className="mission-route-arrow">→</span>
                  <div className="mission-route-node relay">
                    <small>Relay Hub</small>
                    <strong>{hub.name}</strong>
                    <span>Technical stop</span>
                  </div>
                </Fragment>
              ))}

              <span className="mission-route-arrow">→</span>
              <div className="mission-route-node">
                <small>Destination Hub</small>
                <strong>{destinationHub?.name || mission.destinationHubId || '—'}</strong>
              </div>
            </div>

            {mission.legs && mission.legs.length > 0 && (
              <div className="mission-leg-list">
                {mission.legs.map((leg, index) => (
                  <div key={leg.id}>
                    <span>
                      <small>Leg {index + 1}</small>
                      <strong>{hubName(leg.fromHubId)} → {hubName(leg.toHubId)}</strong>
                    </span>
                    <StatusBadge tone={leg.status === 'Completed' ? 'success' : leg.status === 'In Progress' ? 'warning' : 'neutral'}>
                      {leg.status}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            )}

            {hubCheckpoints && hubCheckpoints.length > 0 && (
              <div className="mission-leg-list">
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
          <OperatorPanel title="Linked order">
            <div className="linked-record compact">
              <div>
                <strong>{mission.orderId}</strong>
                <small>{order?.packageLabel ?? 'Order data unavailable'}</small>
              </div>
              <button
                type="button"
                className="row-action"
                onClick={() => navigate(`/operator/orders/${mission.orderId}`)}
              >
                View order
              </button>
            </div>
          </OperatorPanel>

          <OperatorPanel title="Mission details">
            <dl className="key-values">
              <div><dt>Drone</dt><dd>{mission.drone || mission.droneId || '—'}</dd></div>
              <div><dt>Payload</dt><dd>{order ? `${order.payloadKg} kg` : '—'}</dd></div>
              <div><dt>Origin Hub</dt><dd>{originHub?.name || mission.originHubId || '—'}</dd></div>
              <div><dt>Origin package</dt><dd>{order?.originHubReceivedAt ? `Received · ${formatMissionTime(order.originHubReceivedAt)}` : 'Awaiting package'}</dd></div>
              <div><dt>Relay Hub</dt><dd>{relayHubs.length ? relayHubs.map((hub) => hub.name).join(' → ') : 'Not required'}</dd></div>
              <div><dt>Destination Hub</dt><dd>{destinationHub?.name || mission.destinationHubId || '—'}</dd></div>
              <div><dt>Route</dt><dd>{mission.routeId || '—'}{mission.route ? ` · ${mission.route}` : ''}</dd></div>
              <div><dt>Planned start</dt><dd>{formatMissionTime(mission.plannedStartAt)}</dd></div>
              <div><dt>Estimated arrival</dt><dd>{formatMissionTime(mission.estimatedArrivalAt)}</dd></div>
              <div><dt>Predicted duration</dt><dd>{mission.predictedDurationMin} min</dd></div>
              <div><dt>Energy</dt><dd>{mission.estimatedEnergyWh.toFixed(1)} Wh</dd></div>
              <div><dt>Battery use</dt><dd>{mission.batteryConsumptionPct}%</dd></div>
              <div><dt>Battery after</dt><dd>{mission.battery}%</dd></div>
            </dl>
          </OperatorPanel>
        </aside>
      </div>
    </MissionPageShell>
  );
}
