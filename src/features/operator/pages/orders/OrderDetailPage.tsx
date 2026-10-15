import { useNavigate, useParams } from 'react-router-dom';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { OperatorPanel } from '../../components/OperatorPanel';
import { useMissionListQuery } from '../../hooks/useMissionQueries';
import { useOperatorOrderQuery } from '../../hooks/useOrderQueries';
import type { Tone } from '../../types/operator';
import {
  formatDeliveryWindow,
  getDeliveryMission,
  getOrderPlanningBadge,
  isActionablePlanningState,
} from '../../utils/deliveryPlanning';
import { formatMissionTime } from '../../utils/missionTiming';
import { OrderPageShell } from './OrderPageShell';

function hubName(hubId: string, apiName?: string) {
  return apiName || hubId || 'Hub data unavailable';
}

function orderTone(status: string): Tone {
  if (status === 'Delivered to Hub') return 'success';
  if (status === 'Cancelled') return 'danger';
  if (status === 'In Delivery') return 'warning';
  return 'info';
}

export function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const { data: missions = [] } = useMissionListQuery();
  const {
    data: order,
    error,
    isLoading,
    refetch,
  } = useOperatorOrderQuery(orderId);

  if (isLoading) {
    return (
      <OrderPageShell active="/operator/orders/all">
        <OperatorPanel>
          <div className="operator-empty-state">Loading Order…</div>
        </OperatorPanel>
      </OrderPageShell>
    );
  }

  if (error) {
    return (
      <OrderPageShell active="/operator/orders/all">
        <OperatorPanel>
          <div className="operator-empty-state">
            <strong>Unable to load Order</strong>
            <span>{error instanceof Error ? error.message : 'Could not load order.'}</span>
            <button type="button" className="row-action" onClick={() => void refetch()}>
              Retry
            </button>
          </div>
        </OperatorPanel>
      </OrderPageShell>
    );
  }

  if (!order) {
    return (
      <OrderPageShell active="/operator/orders/all">
        <OperatorPanel>
          <div className="operator-empty-state">Order not found.</div>
        </OperatorPanel>
      </OrderPageShell>
    );
  }

  const deliveryMission = getDeliveryMission(order.id, missions);
  const planning = getOrderPlanningBadge(order, missions);
  const actionable = isActionablePlanningState(planning);

  return (
    <OrderPageShell active="/operator/orders/all">
      <div className="detail-layout">
        <div className="detail-main">
          <OperatorPanel>
            <div className="mission-hero">
              <div>
                <StatusBadge tone={orderTone(order.status)}>{order.status}</StatusBadge>
                <h2>{order.id}</h2>
                <p>{order.customerName} · {order.packageLabel} · {order.deliveryMode}</p>
              </div>
              <div className="mission-hero-actions">
                {deliveryMission && <ActionButton onClick={() => navigate(`/operator/missions/${deliveryMission.id}`)}>View delivery mission</ActionButton>}
                {!deliveryMission && order.status === 'Pending' && (
                  <ActionButton disabled={!actionable} onClick={() => navigate(`/operator/missions/create?orderId=${order.id}`)}>
                    Create mission
                  </ActionButton>
                )}
              </div>
            </div>
          </OperatorPanel>

          <OperatorPanel title="Delivery request" eyebrow="CUSTOMER ORDER">
            <dl className="review-values">
              <div><dt>Delivery mode</dt><dd>{order.deliveryMode}</dd></div>
              <div><dt>Drop-off Point</dt><dd>{hubName(order.originHubId, order.originHubName)}</dd></div>
              <div><dt>Pick-up Point</dt><dd>{hubName(order.destinationHubId, order.destinationHubName)}</dd></div>
              <div>
                <dt>Origin package</dt>
                <dd>{order.originHubReceivedAt ? <>Received at Hub<br /><small>{formatMissionTime(order.originHubReceivedAt)}</small></> : 'Awaiting package'}</dd>
              </div>
              <div><dt>Package</dt><dd>{order.packageLabel}</dd></div>
              <div><dt>Package type</dt><dd>{order.packageType}</dd></div>
              <div><dt>Payload</dt><dd>{order.payloadKg} kg</dd></div>
              <div><dt>Estimated delivery</dt><dd>{formatDeliveryWindow(order)}</dd></div>
              <div><dt>Planning opens</dt><dd>{formatMissionTime(order.planningAt)}</dd></div>
              <div><dt>Planning state</dt><dd>{planning ?? 'Closed'}</dd></div>
              {order.destinationHubReceivedAt && (
                <div><dt>Received at Pick-up Point</dt><dd>{formatMissionTime(order.destinationHubReceivedAt)}</dd></div>
              )}
            </dl>
          </OperatorPanel>

          <OperatorPanel title="Flight Mission" eyebrow="ORDER → DELIVERY MISSION">
            {!deliveryMission ? (
              <div className="linked-record">
                <div>
                  <strong>{planning ?? 'No active Mission'}</strong>
                  <small>
                    {planning === 'Ready for Planning'
                      ? 'Planning is open. Operator can create the Mission now.'
                      : planning === 'Needs Replanning'
                        ? 'The previous Mission ended before delivery. The system/customer must provide a new delivery window before another Mission is created.'
                        : planning === 'Future'
                          ? `The system will surface this Order when planning opens ${formatMissionTime(order.planningAt)}.`
                          : 'No further Operator planning is required.'}
                  </small>
                </div>
                {planning && (
                  <StatusBadge tone={planning === 'Ready for Planning' ? 'warning' : planning === 'Needs Replanning' ? 'danger' : 'neutral'}>
                    {planning}
                  </StatusBadge>
                )}
                {actionable && <button className="row-action" type="button" onClick={() => navigate(`/operator/missions/create?orderId=${order.id}`)}>Create mission</button>}
              </div>
            ) : (
              <div className="linked-mission-list">
                <button type="button" onClick={() => navigate(`/operator/missions/${deliveryMission.id}`)}>
                  <span><small>DELIVERY</small><strong>{deliveryMission.id}</strong><em>{deliveryMission.drone} · {deliveryMission.routeId}</em></span>
                  <StatusBadge tone={deliveryMission.tone}>{deliveryMission.status}</StatusBadge>
                </button>
              </div>
            )}
          </OperatorPanel>

          {order.status === 'Delivered to Hub' && (
            <OperatorPanel title="Operator handoff complete" eyebrow="Pick-up Point">
              <div className="notification-policy-note">
                <strong>Package delivered to {hubName(order.destinationHubId, order.destinationHubName)}</strong>
                <span>Operator scope ends after the Pick-up Point confirms package receipt. Customer pickup, reminders, and post-delivery handling are managed by the Hub/Technician workflow and automated system notifications.</span>
              </div>
            </OperatorPanel>
          )}
        </div>

        <aside className="detail-side">
          <OperatorPanel title="Customer">
            <dl className="key-values">
              <div><dt>Name</dt><dd>{order.customerName}</dd></div>
              <div><dt>Phone</dt><dd>{order.customerPhone}</dd></div>
              <div><dt>Requested date</dt><dd>{order.requestedDate}</dd></div>
              <div><dt>Delivery mode</dt><dd>{order.deliveryMode}</dd></div>
            </dl>
          </OperatorPanel>
        </aside>
      </div>
    </OrderPageShell>
  );
}
