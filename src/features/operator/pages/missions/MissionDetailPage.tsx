import { useNavigate, useParams } from 'react-router-dom';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { OperatorPanel } from '../../components/OperatorPanel';
import { missions } from '../../data/mockOperatorData';
import { MissionPageShell } from './MissionPageShell';

export function MissionDetailPage() {
  const navigate = useNavigate();
  const { missionId } = useParams();
  const mission = missions.find((item) => item.id === missionId) ?? missions[0];
  return <MissionPageShell active="/operator/missions/detail"><div className="detail-layout"><div className="detail-main">
    <OperatorPanel><div className="mission-hero"><div><StatusBadge tone={mission.tone}>{mission.status}</StatusBadge><h2>{mission.name}</h2><p>{mission.id} · Operational mission</p></div><div className="mission-hero-actions"><ActionButton variant="secondary">Actions</ActionButton><ActionButton onClick={() => navigate('/operator/operations/live')}>Track live</ActionButton></div></div><div className="mission-progress"><span className="done"><i><Icon name="check" size={13}/></i>Approved<small>13:42</small></span><b/><span className="done"><i><Icon name="check" size={13}/></i>Launched<small>14:08</small></span><b/><span className="current"><i><Icon name="drone" size={13}/></i>{mission.status}<small>{mission.eta}</small></span><b/><span><i>4</i>Complete<small>Est. 14:36</small></span></div></OperatorPanel>
    <OperatorPanel title="Flight route" eyebrow="LIVE POSITION"><div className="detail-map mini-map"><div className="map-grid"/><div className="route-line route-detail"/><span className="map-point origin">A</span><span className="map-point destination">B</span><span className="drone-pin detail-pin"><Icon name="drone" size={19}/><b>{mission.drone}</b></span></div></OperatorPanel>
  </div><aside className="detail-side"><OperatorPanel title="Flight metrics"><div className="stat-list"><span><Icon name="clock"/><small>Flight time</small><strong>10:24</strong></span><span><Icon name="battery"/><small>Battery</small><strong>{mission.battery}%</strong></span><span><Icon name="speed"/><small>Ground speed</small><strong>54 km/h</strong></span><span><Icon name="wind"/><small>Headwind</small><strong>11 km/h</strong></span></div></OperatorPanel><OperatorPanel title="Mission details"><dl className="key-values"><div><dt>Operator</dt><dd>Alex Kim</dd></div><div><dt>Aircraft</dt><dd>{mission.drone}</dd></div><div><dt>Payload</dt><dd>4.8 kg</dd></div><div><dt>Route</dt><dd>{mission.route}</dd></div></dl></OperatorPanel></aside></div></MissionPageShell>;
}
