import { Fragment, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { EligibleDroneCard } from '../../components/EligibleDroneCard';
import { OperatorPanel } from '../../components/OperatorPanel';
import { operatorHubs } from '../../data/hubMockData';
import type { MissionStatus } from '../../types/operator';
import { getBasicDroneEligibility } from '../../utils/droneEligibility';
import { getDroneDisplayCode } from '../../utils/droneDisplay';
import { getMissionPreflight } from '../../utils/missionPreflight';
import { formatMissionTime } from '../../utils/missionTiming';
import { loadOperatorFleet } from '../../utils/operatorFleetStorage';
import { loadOperatorMissions, reassignMissionDrone, updateMission } from '../../utils/operatorMissionStorage';
import { getOperatorOrder, markOrderNeedsReplanning, updateOperatorOrderStatus } from '../../utils/operatorOrderStorage';
import { MissionPageShell } from './MissionPageShell';

const progressOrder: MissionStatus[] = ['Scheduled', 'In Progress', 'Completed'];

function hubName(hubId: string) {
  return operatorHubs.find((hub) => hub.id === hubId)?.name ?? hubId;
}

export function MissionDetailPage() {
  const navigate = useNavigate();
  const { missionId } = useParams();
  const initialMission = useMemo(() => loadOperatorMissions().find((item) => item.id === missionId), [missionId]);
  const [mission, setMission] = useState(initialMission);
  const [replaceOpen, setReplaceOpen] = useState(false);

  if (!mission) {
    return <MissionPageShell active="/operator/missions/all"><OperatorPanel><div className="operator-empty-state">Mission not found.</div></OperatorPanel></MissionPageShell>;
  }

  const order = getOperatorOrder(mission.orderId);
  const originHub = operatorHubs.find((hub) => hub.id === mission.originHubId);
  const destinationHub = operatorHubs.find((hub) => hub.id === mission.destinationHubId);
  const relayHubs = (mission.relayHubIds ?? []).map((hubId) => operatorHubs.find((hub) => hub.id === hubId)).filter(Boolean);
  const fleet = loadOperatorFleet();
  const assignedDrone = fleet.find((drone) => drone.id === mission.droneId);
  const otherMissions = loadOperatorMissions().filter((item) => item.id !== mission.id);
  const replacementCandidates = fleet.filter((drone) => drone.hubId === mission.originHubId && drone.id !== mission.droneId);
  const preflight = getMissionPreflight(mission, order, assignedDrone, otherMissions);

  const applyMissionUpdate = (updates: Parameters<typeof updateMission>[1]) => {
    const updated = updateMission(mission.id, updates);
    if (updated) setMission(updated);
  };

  const handleStart = () => {
    if (!preflight.canStart) return;
    const startedAt = new Date().toISOString();
    const legs = mission.legs?.map((leg, index) => ({
      ...leg,
      status: index === 0 ? 'In Progress' as const : 'Pending' as const,
    }));
    if (order) updateOperatorOrderStatus(order.id, 'In Delivery');
    applyMissionUpdate({ status: 'In Progress', actualStartedAt: startedAt, legs });
  };

  const handleCancel = () => {
    // Cancelling a Mission does not cancel the Order. The Pending Order moves into Needs Replanning.
    if (order && order.status !== 'Cancelled') markOrderNeedsReplanning(order.id);
    applyMissionUpdate({ status: 'Cancelled' });
  };

  const handleReplaceDrone = (droneId: string, droneName: string) => {
    const updated = reassignMissionDrone(
      mission.id,
      droneId,
      droneName,
      'Serious alert escalated to Technical Incident; replacement aircraft assigned',
    );
    if (updated) {
      setMission(updated);
      setReplaceOpen(false);
    }
  };

  const handleFail = () => {
    if (order && order.status !== 'Cancelled') markOrderNeedsReplanning(order.id);
    applyMissionUpdate({ status: 'Failed' });
  };

  const currentIndex = progressOrder.indexOf(mission.status);
  const isTerminalException = mission.status === 'Cancelled' || mission.status === 'Failed';

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
                {mission.status === 'Scheduled' && <ActionButton variant="secondary" onClick={handleCancel}>Cancel mission</ActionButton>}
                {mission.status === 'Scheduled' && (
                  <ActionButton icon="play" disabled={!preflight.canStart} onClick={handleStart}>
                    Start mission
                  </ActionButton>
                )}
                {mission.status === 'In Progress' && <ActionButton variant="secondary" onClick={() => setReplaceOpen((value) => !value)}>Replace drone</ActionButton>}
                {mission.status === 'In Progress' && <ActionButton variant="danger" onClick={handleFail}>End as failed</ActionButton>}
                {mission.status === 'In Progress' && <ActionButton variant="secondary" onClick={() => navigate('/operator/operations/live')}>Track live</ActionButton>}
                {mission.status !== 'Cancelled' && <ActionButton variant="secondary" onClick={() => navigate(`/operator/ai/mission-analysis?orderId=${mission.orderId}&droneId=${mission.droneId}&routeId=${mission.routeId}`)}>AI analysis</ActionButton>}
              </div>
            </div>

            {!isTerminalException && (
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
                            ? mission.actualStartedAt ? `Started ${new Date(mission.actualStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Awaiting start'
                            : mission.actualCompletedAt ? `Done ${new Date(mission.actualCompletedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : `ETA ${mission.eta}`}
                      </small>
                    </span>
                    {index < progressOrder.length - 1 && <b />}
                  </Fragment>
                ))}
              </div>
            )}
          </OperatorPanel>

          {mission.status === 'Scheduled' && (
            <OperatorPanel title="Final Validation">
              <div className="preflight-grid preflight-grid-compact">
                {preflight.checks.map((check) => (
                  <div className={check.passed ? 'pass' : 'hold'} key={check.label}>
                    <i><Icon name={check.passed ? 'check' : 'clock'} size={14} /></i>
                    <span><strong>{check.label}</strong><small>{check.detail}</small></span>
                  </div>
                ))}
              </div>
              {!preflight.withinStartWindow && (
                <p className="section-note">Start Mission becomes available within 15 minutes of the planned start, after all four conditions pass.</p>
              )}
              {preflight.packageDeadlineExpired && (
                <p className="section-note danger-note">The 3-hour package handoff window expired. This Mission is cancelled by the system and the Order returns for replanning.</p>
              )}
            </OperatorPanel>
          )}

          {replaceOpen && mission.status === 'In Progress' && (
            <OperatorPanel title="Replace drone" eyebrow="SERIOUS ALERT → TECHNICAL INCIDENT → RECOVERY">
              <p className="section-note">Temporary issues stay as operational alerts and the Mission continues. A serious issue is escalated to a Technical Incident; replacing the aircraft keeps the Delivery Mission In Progress unless recovery is impossible.</p>
              <div className="eligible-drone-grid">
                {replacementCandidates.map((drone) => {
                  const eligibility = getBasicDroneEligibility(drone, mission.originHubId, order?.payloadKg ?? 0, otherMissions);
                  return <EligibleDroneCard key={drone.id} drone={drone} eligibility={eligibility} onSelect={() => handleReplaceDrone(drone.id, getDroneDisplayCode(drone))} />;
                })}
              </div>
              {replacementCandidates.length === 0 && <div className="operator-empty-state">No replacement drones are available at the Origin Hub.</div>}
            </OperatorPanel>
          )}

          <OperatorPanel title="Mission route" eyebrow={mission.status === 'In Progress' ? 'LIVE DELIVERY PATH' : 'MISSION PLAN'}>
            <div className="mission-route-flow">
              <div className="mission-route-node">
                <small>Origin Hub</small>
                <strong>{originHub?.name ?? mission.originHubId}</strong>
              </div>
              {relayHubs.map((hub) => hub && (
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
                <strong>{destinationHub?.name ?? mission.destinationHubId}</strong>
              </div>
            </div>

            {mission.legs && mission.legs.length > 1 && (
              <div className="mission-leg-list">
                {mission.legs.map((leg, index) => (
                  <div key={leg.id}>
                    <span><small>Leg {index + 1}</small><strong>{hubName(leg.fromHubId)} → {hubName(leg.toHubId)}</strong></span>
                    <StatusBadge tone={leg.status === 'Completed' ? 'success' : leg.status === 'In Progress' ? 'warning' : 'neutral'}>{leg.status}</StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </OperatorPanel>
        </div>

        <aside className="detail-side">
          <OperatorPanel title="Linked order">
            <div className="linked-record compact">
              <div><strong>{mission.orderId}</strong><small>{order?.packageLabel ?? 'Customer order'}</small></div>
              <button type="button" className="row-action" onClick={() => navigate(`/operator/orders/${mission.orderId}`)}>View order</button>
            </div>
          </OperatorPanel>

          {mission.assignmentHistory && mission.assignmentHistory.length > 0 && (
            <OperatorPanel title="Assignment history">
              <div className="assignment-history">
                {mission.assignmentHistory.map((entry) => (
                  <div key={`${entry.droneId}-${entry.replacedAt}`}><strong>{entry.droneName}</strong><small>{entry.reason} · {new Date(entry.replacedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div>
                ))}
              </div>
            </OperatorPanel>
          )}

          <OperatorPanel title="Mission details">
            <dl className="key-values">
              <div><dt>Drone</dt><dd>{mission.drone}</dd></div>
              <div><dt>Payload</dt><dd>{order ? `${order.payloadKg} kg` : '—'}</dd></div>
              <div><dt>Origin Hub</dt><dd>{originHub?.name ?? mission.originHubId}</dd></div>
              <div><dt>Origin package</dt><dd>{order?.originHubReceivedAt ? `Received · ${formatMissionTime(order.originHubReceivedAt)}` : 'Awaiting package'}</dd></div>
              <div><dt>Relay Hub</dt><dd>{relayHubs.length ? relayHubs.map((hub) => hub?.name).join(' → ') : 'Not required'}</dd></div>
              <div><dt>Destination Hub</dt><dd>{destinationHub?.name ?? mission.destinationHubId}</dd></div>
              <div><dt>Route</dt><dd>{mission.routeId} · {mission.route.split(' · ')[0].replace(`${mission.routeId} `, '')}</dd></div>
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
