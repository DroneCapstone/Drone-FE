import { Fragment, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { EligibleDroneCard } from '../../components/EligibleDroneCard';
import { OperatorPanel } from '../../components/OperatorPanel';
import { operatorHubs } from '../../data/hubMockData';
import type { MissionStatus, Tone } from '../../types/operator';
import { getBasicDroneEligibility } from '../../utils/droneEligibility';
import { getDroneDisplayCode } from '../../utils/droneDisplay';
import { getMissionPreflight } from '../../utils/missionPreflight';
import { formatMissionTime } from '../../utils/missionTiming';
import { loadOperatorFleet } from '../../utils/operatorFleetStorage';
import { loadOperatorMissions, reassignMissionDrone, updateMission } from '../../utils/operatorMissionStorage';
import { getOperatorOrder, markOrderReadyForPickup } from '../../utils/operatorOrderStorage';
import { MissionPageShell } from './MissionPageShell';

const progressOrder: MissionStatus[] = ['Scheduled', 'In Progress', 'Completed'];

function departureTone(state: 'Scheduled' | 'Ready for Departure' | 'Departure Hold'): Tone {
  if (state === 'Ready for Departure') return 'success';
  if (state === 'Departure Hold') return 'danger';
  return 'info';
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
  const fleet = loadOperatorFleet();
  const assignedDrone = fleet.find((drone) => drone.id === mission.droneId);
  const otherMissions = loadOperatorMissions().filter((item) => item.id !== mission.id);
  const replacementCandidates = fleet.filter((drone) => drone.hubId === mission.originHubId && drone.id !== mission.droneId);
  const preflight = getMissionPreflight(mission, order, assignedDrone, operatorHubs, otherMissions);

  const applyMissionUpdate = (updates: Parameters<typeof updateMission>[1]) => {
    const updated = updateMission(mission.id, updates);
    if (updated) setMission(updated);
  };

  const handleStart = () => {
    if (!preflight.canStart) return;
    applyMissionUpdate({ status: 'In Progress', actualStartedAt: new Date().toISOString() });
  };

  const handleComplete = () => {
    const completedAt = new Date().toISOString();
    if (order) markOrderReadyForPickup(order.id);
    applyMissionUpdate({ status: 'Completed', actualCompletedAt: completedAt });
  };

  const handleCancel = () => {
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
                {mission.status === 'In Progress' && <ActionButton icon="check" onClick={handleComplete}>Complete delivery</ActionButton>}
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
            // <OperatorPanel title="Pre-flight recheck" eyebrow="FINAL OPERATOR VALIDATION">
            <OperatorPanel title="Final Validation">
              {/* <div className="preflight-head">
                <StatusBadge tone={departureTone(preflight.state)}>{preflight.state}</StatusBadge>
                <span>
                  {!preflight.withinStartWindow
                    ? `Pre-flight window opens ${Math.max(0, preflight.minutesToStart - 15)} min before Start Mission becomes available.`
                    : preflight.canStart
                      ? 'All checks passed. Operator can start the Mission when operationally ready.'
                      : 'One or more checks failed. Mission remains Scheduled and must not start.'}
                </span>
              </div> */}
              <div className="preflight-grid">
                {preflight.checks.map((check) => (
                  <div className={check.passed ? 'pass' : 'hold'} key={check.label}>
                    <i><Icon name={check.passed ? 'check' : 'clock'} size={14} /></i>
                    <span><strong>{check.label}</strong><small>{check.detail}</small></span>
                  </div>
                ))}
              </div>
              {/* <p className="section-note">Mission status does not change automatically at plannedStartAt. Operator Start Mission is the final dispatch action; only then does the Mission become In Progress.</p> */}
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

          <OperatorPanel title="Route" eyebrow={mission.status === 'In Progress' ? 'LIVE POSITION' : 'MISSION PLAN'}>
            <div className="detail-map mini-map">
              <div className="map-grid" />
              <div className="route-line route-detail" />
              <span className="map-point origin">A</span>
              <span className="map-point destination">B</span>
              {mission.status === 'In Progress' && <span className="drone-pin detail-pin"><Icon name="drone" size={19} /><b>{mission.drone}</b></span>}
            </div>
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
              <div><dt>Destination Hub</dt><dd>{destinationHub?.name ?? mission.destinationHubId}</dd></div>
              <div><dt>Route</dt><dd>{mission.route}</dd></div>
              <div><dt>Planned start</dt><dd>{formatMissionTime(mission.plannedStartAt)}</dd></div>
              <div><dt>Estimated arrival</dt><dd>{formatMissionTime(mission.estimatedArrivalAt)}</dd></div>
              <div><dt>Predicted duration</dt><dd>{mission.predictedDurationMin} min</dd></div>
              <div><dt>Energy</dt><dd>{mission.estimatedEnergyWh.toFixed(1)} Wh</dd></div>
              <div><dt>Battery use</dt><dd>{mission.batteryConsumptionPct}%</dd></div>
              <div><dt>Battery after</dt><dd>{mission.battery}%</dd></div>
              <div><dt>AI confidence</dt><dd>{mission.confidencePct ? `${mission.confidencePct}%` : '—'}</dd></div>
              <div><dt>Risk</dt><dd>{mission.risk ?? '—'}</dd></div>
            </dl>
          </OperatorPanel>
        </aside>
      </div>
    </MissionPageShell>
  );
}
