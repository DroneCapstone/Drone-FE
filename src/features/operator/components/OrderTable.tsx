import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { operatorHubs } from '../data/hubMockData';
import type { Mission, Order, PlanningState, Tone } from '../types/operator';
import {
  formatDeliveryWindow,
  getDeliveryMission,
  getOrderPlanningBadge,
  getPickupState,
  isActionablePlanningState,
} from '../utils/deliveryPlanning';

function planningTone(state: PlanningState): Tone {
  if (state === 'Planning Overdue') return 'danger';
  if (state === 'Ready for Planning') return 'warning';
  if (state === 'Awaiting Package') return 'neutral';
  if (state === 'Upcoming') return 'info';
  return 'neutral';
}

function hubName(hubId: string) {
  return operatorHubs.find((hub) => hub.id === hubId)?.name ?? hubId;
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
            const pickupState = getPickupState(order);
            const canCreate = isActionablePlanningState(planning);

            let action = 'Open';
            let target = `/operator/orders/${order.id}`;

            if (order.status === 'Ready for Pickup') {
              action = pickupState === 'Contact Required'
                ? 'Contact customer'
                : pickupState === 'Disposal Required'
                  ? 'View disposal'
                  : 'View pickup';
            } else if (deliveryMission) {
              action = 'View mission';
              target = `/operator/missions/${deliveryMission.id}`;
            } else if (canCreate) {
              action = 'Create mission';
              target = `/operator/missions/create?orderId=${order.id}`;
            } else if (order.status === 'Completed' || order.status === 'Disposed' || order.status === 'Cancelled') {
              action = 'View';
            }

            return (
              <tr key={order.id} onClick={() => navigate(`/operator/orders/${order.id}`)}>
                <td>
                  <strong>{order.id}</strong>
                  <small>{order.deliveryMode}</small>
                </td>
                <td className="order-route-cell">
                  <strong>{hubName(order.originHubId)} → {hubName(order.destinationHubId)}</strong>
                </td>
                <td>{order.packageLabel}<small>{order.payloadKg} kg · {order.packageType}</small></td>
                <td>
                  <strong>{formatDeliveryWindow(order)}</strong>
                  <div className="order-delivery-meta">
                    {planning && <StatusBadge tone={planningTone(planning)}>{planning}</StatusBadge>}
                    {!planning && order.status === 'Ready for Pickup' && pickupState && (
                      <StatusBadge tone={pickupState === 'Disposal Required' ? 'danger' : pickupState === 'Final Reminder' || pickupState === 'Contact Required' ? 'warning' : 'info'}>
                        {pickupState}
                      </StatusBadge>
                    )}
                    {!planning && order.status !== 'Pending' && order.status !== 'Ready for Pickup' && <small>{order.status}</small>}
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
