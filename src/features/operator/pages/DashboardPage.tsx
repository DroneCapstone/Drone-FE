import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ActionButton } from '../../../components/ui/ActionButton';
import { Icon } from '../../../components/ui/Icon';
import { AreaChart } from '../components/AreaChart';
import { MetricCard } from '../components/MetricCard';
import { OperationalStateBar } from '../components/OperationalStateBar';
import { OperatorPanel } from '../components/OperatorPanel';
import { PageHeader } from '../components/PageHeader';
import { PlanningQueue } from '../components/PlanningQueue';
import { useFleetDronesQuery } from '../hooks/useFleetQueries';
import {
  useMissionActiveFlightsQuery,
  useMissionDashboardKpiQuery,
  useMissionDashboardStatusQuery,
  useMissionListQuery,
} from '../hooks/useMissionQueries';
import { useOperatorOrdersQuery } from '../hooks/useOrderQueries';
import { getOrderPlanningBadge, canCreateMissionForOrder } from '../utils/deliveryPlanning';
import { getMissionPreflight } from '../utils/missionPreflight';

export function DashboardPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'Today' | 'Week' | 'Month'>('Today');

  const { data: orders = [] } = useOperatorOrdersQuery();
  const { data: missions = [] } = useMissionListQuery();
  const { data: fleet = [] } = useFleetDronesQuery();
  const { data: missionKpi } = useMissionDashboardKpiQuery();
  const { data: missionStatus } = useMissionDashboardStatusQuery();
  const { data: activeFlights } = useMissionActiveFlightsQuery();

  const readyOrders = orders.filter((order) =>
    canCreateMissionForOrder(order, missions),
  );
  const needsReplanning = orders.filter(
    (order) => getOrderPlanningBadge(order, missions) === 'Needs Replanning',
  );

  const activeMissions = missions.filter((mission) => mission.status === 'In Progress');
  const scheduledMissions = missions.filter((mission) => mission.status === 'Scheduled');
  const completedMissions = missions.filter((mission) => mission.status === 'Completed');
  const failedMissions = missions.filter(
    (mission) => mission.status === 'Failed' || mission.status === 'Cancelled',
  );

  const activeCount =
    missionKpi?.activeMissions ??
    missionStatus?.inProgress ??
    activeFlights?.length ??
    activeMissions.length;
  const scheduledCount =
    missionKpi?.scheduledMissions ?? missionStatus?.scheduled ?? scheduledMissions.length;
  const completedCount =
    missionKpi?.completedMissions ?? missionStatus?.completed ?? completedMissions.length;
  const failedCount =
    (missionKpi?.failedMissions ?? missionStatus?.failed ?? 0) +
    (missionKpi?.cancelledMissions ?? missionStatus?.cancelled ?? 0) ||
    failedMissions.length;
  const totalMissions =
    missionKpi?.totalMissions ?? missionStatus?.total ?? missions.length;
  const readyPlanningCount = readyOrders.length; // Receipt is required for actionable planning.

  const departureItems = scheduledMissions.map((mission) => ({
    mission,
    evaluation: getMissionPreflight(
      mission,
      orders.find((order) => order.id === mission.orderId),
      fleet.find((drone) => drone.id === mission.droneId),
      missions,
    ),
  }));
  const readyDeparture = departureItems.find(
    (item) => item.evaluation.state === 'Ready for Departure',
  );
  const departureHold = departureItems.find(
    (item) => item.evaluation.state === 'Departure Hold',
  );

  const periodData = {
    Today: {
      total: String(totalMissions),
      delta: 'Live mission API',
      labels: ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
    },
    Week: {
      total: String(totalMissions),
      delta: 'Current mission snapshot',
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    },
    Month: {
      total: String(totalMissions),
      delta: 'Current mission snapshot',
      labels: ['W1', 'W2', 'W3', 'W4', 'Today', 'Current'],
    },
  }[period];

  const needsAttentionCount =
    needsReplanning.length + (departureHold ? 1 : 0) + (readyDeparture ? 1 : 0);

  return (
    <>
      <PageHeader
        section="dashboard"
        action={
          <ActionButton onClick={() => navigate('/operator/orders/ready')}>
            View planning queue
          </ActionButton>
        }
      />

      <OperationalStateBar />

      <div className="dashboard-grid lower primary-operations">
        <OperatorPanel
          title="Ready for planning"
          eyebrow="ORDER QUEUE"
          action={<NavLink className="text-button" to="/operator/orders/ready">View all</NavLink>}
        >
          <PlanningQueue orders={orders} missions={missions} />
        </OperatorPanel>

        <OperatorPanel
          title="Needs attention"
          eyebrow="ACTION REQUIRED"
          action={<span className="counter">{needsAttentionCount} open</span>}
        >
          {needsAttentionCount === 0 ? (
            <div className="operator-empty-state">No Mission action requires attention right now.</div>
          ) : (
            <div className="alert-list">
              {needsReplanning[0] && (
                <button
                  className="alert-row danger"
                  type="button"
                  onClick={() => navigate(`/operator/orders/${needsReplanning[0].id}`)}
                >
                  <span className="alert-icon"><Icon name="clock" /></span>
                  <div>
                    <strong>Order needs replanning</strong>
                    <small>{needsReplanning[0].id} · previous Mission was cancelled</small>
                  </div>
                  <Icon name="chevron" size={15} />
                </button>
              )}
              {departureHold && (
                <button
                  className="alert-row danger"
                  type="button"
                  onClick={() => navigate(`/operator/missions/${departureHold.mission.id}`)}
                >
                  <span className="alert-icon"><Icon name="wind" /></span>
                  <div>
                    <strong>Departure hold</strong>
                    <small>{departureHold.mission.id} · Final Validation is not ready</small>
                  </div>
                  <Icon name="chevron" size={15} />
                </button>
              )}
              {readyDeparture && (
                <button
                  className="alert-row warning"
                  type="button"
                  onClick={() => navigate(`/operator/missions/${readyDeparture.mission.id}`)}
                >
                  <span className="alert-icon"><Icon name="mission" /></span>
                  <div>
                    <strong>Mission ready for departure</strong>
                    <small>{readyDeparture.mission.id} · Final Validation passed</small>
                  </div>
                  <Icon name="chevron" size={15} />
                </button>
              )}
            </div>
          )}
        </OperatorPanel>
      </div>

      <div className="metric-grid">
        <MetricCard
          label="Ready for planning"
          value={String(readyPlanningCount).padStart(2, '0')}
          delta="Action"
          note={`${needsReplanning.length} need replanning`}
        />
        <MetricCard
          label="Active missions"
          value={String(activeCount).padStart(2, '0')}
          delta="Live"
          note="Currently in delivery"
        />
        <MetricCard
          label="Scheduled missions"
          value={String(scheduledCount).padStart(2, '0')}
          delta="Queued"
          note="Waiting for start / Final Validation"
        />
        <MetricCard
          label="Completed missions"
          value={String(completedCount)}
          delta="Current"
          note="Delivered to Pick-up Point"
        />
      </div>

      <div className="dashboard-grid">
        <OperatorPanel
          title="Mission throughput"
          eyebrow="OPERATING PERIOD"
          className="chart-panel"
          action={
            <div className="segmented">
              {(['Today', 'Week', 'Month'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={period === item ? 'active' : ''}
                  onClick={() => setPeriod(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          }
        >
          <div className="chart-summary">
            <strong>{periodData.total}</strong>
            <span>total missions</span>
            <span className="summary-delta">{periodData.delta}</span>
          </div>
          <AreaChart
            orange
            variant="throughput"
            unit="missions / hour"
            yLabels={['40', '30', '20', '10']}
            pointLabel="Mission activity"
          />
          <div className="chart-labels">
            {periodData.labels.map((label) => <span key={label}>{label}</span>)}
          </div>
        </OperatorPanel>

        <OperatorPanel
          title="Flight Mission status"
          eyebrow="CURRENT"
          action={<NavLink className="text-button" to="/operator/missions/all">View all</NavLink>}
        >
          <div className="donut-wrap">
            <div className="donut">
              <div><strong>{totalMissions}</strong><span>Total</span></div>
            </div>
            <div className="donut-legend">
              <span><i className="green" />Completed <b>{completedCount}</b></span>
              <span><i className="orange" />In progress <b>{activeCount}</b></span>
              <span><i className="blue" />Scheduled <b>{scheduledCount}</b></span>
              <span><i className="red" />Cancelled / Failed <b>{failedCount}</b></span>
            </div>
          </div>
        </OperatorPanel>
      </div>
    </>
  );
}
