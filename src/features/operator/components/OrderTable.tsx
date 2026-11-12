import { useNavigate } from 'react-router-dom';
import './order-priority.css';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { Mission, Order, PlanningState, Tone } from '../types/operator';
import {
  formatDeliveryWindow,
  getDeliveryMission,
  getOrderPlanningBadge,
  canCreateMissionForOrder,
} from '../utils/deliveryPlanning';

function planningTone(state: PlanningState): Tone {
  if (state === 'Ready for Planning') return 'warning';
  if (state === 'Needs Replanning') return 'danger';
  if (state === 'Planned') return 'info';
  return 'neutral';
}

function hubName(hubId: string, apiName?: string) {
  if (apiName) return apiName;
  if (!hubId) return 'Hub data unavailable';
  return hubId;
}

function receivedTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format BE-provided planning deadline offsets for the compact Orders table.
 * Keep planning/deadline business rules on BE: this function changes text only.
 */
function formatCompactMinutes(value: number): string {
  const total = Math.max(0, Math.ceil(value));
  if (total >= 1440) {
    // At day-scale, round the remainder up to hours to avoid a long 3-unit label.
    const roundedHours = Math.ceil(total / 60);
    const days = Math.floor(roundedHours / 24);
    const hours = roundedHours % 24;
    return `${days}d${hours ? ` ${hours}h` : ''}`;
  }
  if (total >= 60) {
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    return `${hours}h${minutes ? ` ${minutes}m` : ''}`;
  }
  return `${total}m`;
}

type PlanningTime = { label: string; overdue: boolean };

function formatPlanningTime(order: Order): PlanningTime | undefined {
  const slack = order.slackMinutes;
  if (order.isOverdue === true || (slack !== undefined && slack <= 0)) {
    const overdue = order.overdueMinutes !== undefined && order.overdueMinutes > 0
      ? order.overdueMinutes
      : slack !== undefined ? Math.max(0, -slack) : 0;
    return {
      label: overdue > 0 ? `Overdue by ${formatCompactMinutes(overdue)}` : 'Deadline reached',
      overdue: true,
    };
  }
  // Don't invent a deadline when BE has not returned planning slack.
  if (slack === undefined || !Number.isFinite(slack)) return undefined;
  return { label: `${formatCompactMinutes(slack)} left`, overdue: false };
}

export function OrderTable({
  orders,
  missions,
  startIndex = 0,
}: {
  orders: Order[];
  missions: Mission[];
  startIndex?: number;
}) {
  const navigate = useNavigate();

  return (
    <div className="table-wrap">
      <table className="order-table">
        <thead>
          <tr>
            <th scope="col" className="order-number-heading">No.</th>
            <th>Order</th>
            <th className="order-route-heading">Hub Point</th>
            <th>Package</th>
            <th className="order-delivery-time-heading">Delivery Time</th>
            <th className="order-planning-heading">Planning Status</th>
            <th className="order-action-heading" />
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => {
            const planning = getOrderPlanningBadge(order, missions);
            const deliveryMission = getDeliveryMission(order.id, missions);
            const canCreate = canCreateMissionForOrder(order, missions);
            const planningTime = canCreate ? formatPlanningTime(order) : undefined;

            let action = 'Open';
            let target = `/operator/orders/${order.id}`;

            if (deliveryMission) {
              action = 'View mission';
              target = `/operator/missions/${deliveryMission.id}`;
            } else if (canCreate) {
              action = planning === 'Needs Replanning' ? 'Replan mission' : 'Create mission';
              target = `/operator/missions/create?orderId=${order.id}`;
            } else if (order.status === 'Delivered to Hub' || order.status === 'Cancelled') {
              action = 'View';
            }

            return (
              <tr key={order.id} onClick={() => navigate(`/operator/orders/${order.id}`)}>
                <td className="order-number-cell">{startIndex + index + 1}</td>
                <td>
                  <strong>{order.id}</strong>
                  <small>{order.deliveryMode} · {order.status}</small>
                </td>
                <td className="order-route-cell">
                  <strong>
                    {order.originHubId || order.destinationHubId
                      ? `${hubName(order.originHubId, order.originHubName)} → ${hubName(order.destinationHubId, order.destinationHubName)}`
                      : 'Hub data unavailable'}
                  </strong>
                </td>
                <td className="order-package-cell">
                  {order.packageLabel}
                  <small>{order.payloadKg} kg · {order.packageType}</small>
                  <small className={(order.originPackageReceived || order.originHubReceivedAt) ? 'package-received-text' : 'package-awaiting-text'}>
                    {(order.originPackageReceived || order.originHubReceivedAt) ? `Received at Drop-off Point${order.originHubReceivedAt ? ` · ${receivedTime(order.originHubReceivedAt)}` : ''}` : 'Awaiting package at Drop-off Point'}
                  </small>
                </td>
                <td className="order-delivery-time-cell">
                  <strong>{formatDeliveryWindow(order)}</strong>
                </td>
                <td className="order-planning-cell">
                  <div className="order-delivery-meta">
                    {planning && <StatusBadge tone={planningTone(planning)}>{planning}</StatusBadge>}
                    {!planning && order.status !== 'Pending' && <small>{order.status}</small>}
                  </div>
                  {planningTime && (
                    <small className={`operator-order-priority${planningTime.overdue ? ' operator-order-priority--overdue' : ''}`}>
                      {planningTime.label}
                    </small>
                  )}
                </td>
                <td className="order-action-cell">
                  <button
                    type="button"
                    className="row-action"
                    onClick={(event) => { event.stopPropagation(); navigate(target); }}
                  >
                    {action}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
