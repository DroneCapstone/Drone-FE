import { useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ActionButton } from '../../../components/ui/ActionButton';
import { Icon } from '../../../components/ui/Icon';
import { AreaChart } from '../components/AreaChart';
import { MetricCard } from '../components/MetricCard';
import { OperationalStateBar } from '../components/OperationalStateBar';
import { OperatorPanel } from '../components/OperatorPanel';
import { PageHeader } from '../components/PageHeader';
import { PlanningQueue } from '../components/PlanningQueue';
import { operatorHubs } from '../data/hubMockData';
import { getOrderPlanningBadge, getPickupState, isActionablePlanningState } from '../utils/deliveryPlanning';
import { getMissionPreflight } from '../utils/missionPreflight';
import { loadOperatorFleet } from '../utils/operatorFleetStorage';
import { loadOperatorMissions } from '../utils/operatorMissionStorage';
import { loadOperatorOrders } from '../utils/operatorOrderStorage';

export function DashboardPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'Today' | 'Week' | 'Month'>('Today');
  const orders = useMemo(() => loadOperatorOrders(), []);
  const missions = useMemo(() => loadOperatorMissions(), []);
  const fleet = useMemo(() => loadOperatorFleet(), []);

  const readyOrders = orders.filter((order) => isActionablePlanningState(getOrderPlanningBadge(order, missions)));
  const planningOverdue = orders.filter((order) => getOrderPlanningBadge(order, missions) === 'Planning Overdue');
  const contactRequired = orders.filter((order) => getPickupState(order) === 'Contact Required');
  const finalReminder = orders.filter((order) => getPickupState(order) === 'Final Reminder');
  const disposalRequired = orders.filter((order) => getPickupState(order) === 'Disposal Required');
  const activeMissions = missions.filter((mission) => mission.status === 'In Progress');
  const scheduledMissions = missions.filter((mission) => mission.status === 'Scheduled');
  const completedMissions = missions.filter((mission) => mission.status === 'Completed');
  const failedMissions = missions.filter((mission) => mission.status === 'Failed' || mission.status === 'Cancelled');

  const departureItems = scheduledMissions.map((mission) => ({
    mission,
    evaluation: getMissionPreflight(
      mission,
      orders.find((order) => order.id === mission.orderId),
      fleet.find((drone) => drone.id === mission.droneId),
      operatorHubs,
      missions,
    ),
  }));
  const readyDeparture = departureItems.find((item) => item.evaluation.state === 'Ready for Departure');
  const departureHold = departureItems.find((item) => item.evaluation.state === 'Departure Hold');

  const periodData = {
    Today: { total: String(missions.length), delta: 'Live mission data', labels: ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'] },
    Week: { total: '32', delta: '+6.8% vs last week', labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
    Month: { total: '128', delta: '+4.1% vs last month', labels: ['W1', 'W2', 'W3', 'W4', 'Today', 'Forecast'] },
  }[period];

  const needsAttentionCount = planningOverdue.length + contactRequired.length + finalReminder.length + disposalRequired.length + (departureHold ? 1 : 0);

  return (
    <>
      <PageHeader
        section="dashboard"
        action={
          <>
            {/* REPORT FEATURE DISABLED — snapshot export kept for future re-enable. */}
            {/* <ActionButton variant="secondary">Export snapshot</ActionButton> */}
            <ActionButton onClick={() => navigate('/operator/orders/ready')}>View planning queue</ActionButton>
          </>
        }
      />

      <OperationalStateBar />

      <div className="dashboard-grid lower primary-operations">
        <OperatorPanel title="Ready for planning" eyebrow="ORDER QUEUE" action={<NavLink className="text-button" to="/operator/orders/ready">View all</NavLink>}>
          <PlanningQueue orders={orders} missions={missions} />
        </OperatorPanel>

        <OperatorPanel title="Needs attention" eyebrow="ACTION REQUIRED" action={<span className="counter">{needsAttentionCount} open</span>}>
          <div className="alert-list">
            {planningOverdue[0] && (
              <button className="alert-row danger" type="button" onClick={() => navigate(`/operator/orders/${planningOverdue[0].id}`)}>
                <span className="alert-icon"><Icon name="clock" /></span><div><strong>Mission planning overdue</strong><small>{planningOverdue[0].id} · create a Flight Mission</small></div><Icon name="chevron" size={15} />
              </button>
            )}
            {departureHold && (
              <button className="alert-row danger" type="button" onClick={() => navigate(`/operator/missions/${departureHold.mission.id}`)}>
                <span className="alert-icon"><Icon name="wind" /></span><div><strong>Departure hold</strong><small>{departureHold.mission.id} · pre-flight check requires review</small></div><Icon name="chevron" size={15} />
              </button>
            )}
            {readyDeparture && (
              <button className="alert-row warning" type="button" onClick={() => navigate(`/operator/missions/${readyDeparture.mission.id}`)}>
                <span className="alert-icon"><Icon name="mission" /></span><div><strong>Mission ready for departure</strong><small>{readyDeparture.mission.id} · Operator Start Mission required</small></div><Icon name="chevron" size={15} />
              </button>
            )}
            {contactRequired[0] && (
              <button className="alert-row warning" type="button" onClick={() => navigate(`/operator/orders/${contactRequired[0].id}`)}>
                <span className="alert-icon"><Icon name="clock" /></span><div><strong>Customer contact required</strong><small>{contactRequired[0].id} · expected pickup time passed</small></div><Icon name="chevron" size={15} />
              </button>
            )}
            {finalReminder[0] && (
              <button className="alert-row warning" type="button" onClick={() => navigate(`/operator/orders/${finalReminder[0].id}`)}>
                <span className="alert-icon"><Icon name="bell" /></span><div><strong>Final pickup reminder</strong><small>{finalReminder[0].id} · holding deadline is near</small></div><Icon name="chevron" size={15} />
              </button>
            )}
            {disposalRequired[0] && (
              <button className="alert-row danger" type="button" onClick={() => navigate(`/operator/orders/${disposalRequired[0].id}`)}>
                <span className="alert-icon"><Icon name="clock" /></span><div><strong>Disposal required</strong><small>{disposalRequired[0].id} · awaiting physical confirmation at Destination Hub</small></div><Icon name="chevron" size={15} />
              </button>
            )}
            <button className="alert-row warning" type="button" onClick={() => navigate('/operator/operations/incidents')}>
              <span className="alert-icon"><Icon name="wind" /></span><div><strong>Mission incident requires monitoring</strong><small>MSN-3110 · replacement drone active</small></div><Icon name="chevron" size={15} />
            </button>
          </div>
        </OperatorPanel>
      </div>

      {/* <div className="dashboard-section-label"><span>TODAY’S OPERATING BASELINE</span><small>Order planning, Mission execution, and Hub pickup handoff</small></div> */}

      <div className="metric-grid">
        <MetricCard label="Ready for planning" value={String(readyOrders.length).padStart(2, '0')} delta="Action" note={`${planningOverdue.length} planning overdue`} />
        <MetricCard label="Active missions" value={String(activeMissions.length).padStart(2, '0')} delta="Live" note={`${scheduledMissions.length} scheduled next`} />
        <MetricCard label="Pickup exceptions" value={String(contactRequired.length + finalReminder.length + disposalRequired.length).padStart(2, '0')} delta="Follow up" note={`${disposalRequired.length} disposal required`} />
        <MetricCard label="Completed missions" value={`${completedMissions.length}`} delta="Today" note="Hub-to-Hub delivery execution" />
      </div>

      <div className="dashboard-grid">
        <OperatorPanel
          title="Mission throughput"
          eyebrow="OPERATING PERIOD"
          className="chart-panel"
          action={<div className="segmented">{(['Today', 'Week', 'Month'] as const).map((item) => <button key={item} type="button" className={period === item ? 'active' : ''} onClick={() => setPeriod(item)}>{item}</button>)}</div>}
        >
          <div className="chart-summary"><strong>{periodData.total}</strong><span>total missions</span><span className="summary-delta">{periodData.delta}</span></div>
          <AreaChart orange variant="throughput" unit="missions / hour" yLabels={['40', '30', '20', '10']} pointLabel="Mission activity" />
          <div className="chart-labels">{periodData.labels.map((label) => <span key={label}>{label}</span>)}</div>
        </OperatorPanel>

        <OperatorPanel title="Flight Mission status" eyebrow="CURRENT" action={<NavLink className="text-button" to="/operator/missions/all">View all</NavLink>}>
          <div className="donut-wrap">
            <div className="donut"><div><strong>{missions.length}</strong><span>Total</span></div></div>
            <div className="donut-legend">
              <span><i className="green" />Completed <b>{completedMissions.length}</b></span>
              <span><i className="orange" />In progress <b>{activeMissions.length}</b></span>
              <span><i className="blue" />Scheduled <b>{scheduledMissions.length}</b></span>
              <span><i className="red" />Cancelled / Failed <b>{failedMissions.length}</b></span>
            </div>
          </div>
        </OperatorPanel>
      </div>
    </>
  );
}
