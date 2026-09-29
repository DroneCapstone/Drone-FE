import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { operatorHubs } from '../data/hubMockData';
import type { Mission, Order, PlanningState, Tone } from '../types/operator';
import {
  formatDeliveryWindow,
  getDeliveryMission,
  getOrderPlanningBadge,
  isActionablePlanningState,
} from '../utils/deliveryPlanning';

function planningTone(state: PlanningState): Tone {
  if (state === 'Ready for Planning') return 'warning';
  if (state === 'Needs Replanning') return 'danger';
  if (state === 'Planned') return 'info';
  return 'neutral';
}

function hubName(hubId: string) {
  if (!hubId) return 'Hub data unavailable';
  return operatorHubs.find((hub) => hub.id === hubId)?.name ?? hubId;
}

function receivedTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function OrderTable({ orders, missions }: { orders: Order[]; missions: Mission[] }) {
  const navigate = useNavigate();

  return (
    <div className="table-wrap">
      <table className="order-table">
        <thead>
          <tr>
            <th>Order</th>
            <th className="order-route-heading">Origin Hub → Destination Hub</th>
            <th>Package</th>
            <th>Estimated delivery</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const planning = getOrderPlanningBadge(order, missions);
            const deliveryMission = getDeliveryMission(order.id, missions);
            const canCreate = isActionablePlanningState(planning);

            let action = 'Open';
            let target = `/operator/orders/${order.id}`;

            if (deliveryMission) {
              action = 'View mission';
              target = `/operator/missions/${deliveryMission.id}`;
            } else if (canCreate) {
              action = 'Create mission';
              target = `/operator/missions/create?orderId=${order.id}`;
            } else if (order.status === 'Delivered to Hub' || order.status === 'Cancelled') {
              action = 'View';
            }

            return (
              <tr key={order.id} onClick={() => navigate(`/operator/orders/${order.id}`)}>
                <td>
                  <strong>{order.id}</strong>
                  <small>{order.deliveryMode} · {order.status}</small>
                </td>
                <td className="order-route-cell">
                  <strong>
                    {order.originHubId || order.destinationHubId
                      ? `${hubName(order.originHubId)} → ${hubName(order.destinationHubId)}`
                      : 'Hub data unavailable'}
                  </strong>
                </td>
                <td>
                  {order.packageLabel}
                  <small>{order.payloadKg} kg · {order.packageType}</small>
                  <small className={order.originHubReceivedAt ? 'package-received-text' : 'package-awaiting-text'}>
                    {order.originHubReceivedAt ? `Received at Origin · ${receivedTime(order.originHubReceivedAt)}` : 'Awaiting package at Origin Hub'}
                  </small>
                </td>
                <td>
                  <strong>{formatDeliveryWindow(order)}</strong>
                  <div className="order-delivery-meta">
                    {planning && <StatusBadge tone={planningTone(planning)}>{planning}</StatusBadge>}
                    {!planning && order.status !== 'Pending' && <small>{order.status}</small>}
                  </div>
                </td>
                <td>
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
