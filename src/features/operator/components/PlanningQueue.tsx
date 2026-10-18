import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { Mission, Order } from '../types/operator';
import { formatDeliveryWindow, getOrderPlanningBadge, canCreateMissionForOrder, sortOrdersByPlanningPriority } from '../utils/deliveryPlanning';

export function PlanningQueue({ orders, missions, limit = 4 }: { orders: Order[]; missions: Mission[]; limit?: number }) {
  const navigate = useNavigate();
  const actionable = sortOrdersByPlanningPriority(orders, missions)
    .filter((order) => canCreateMissionForOrder(order, missions))
    .slice(0, limit);

  if (actionable.length === 0) {
    return <div className="operator-empty-state">No Orders require mission planning right now.</div>;
  }

  return (
    <div className="planning-queue">
      {actionable.map((order) => {
        const state = getOrderPlanningBadge(order, missions);
        return (
          <div className="planning-queue-row" key={order.id}>
            <div><strong>{order.id}</strong><small>{order.deliveryMode} · {formatDeliveryWindow(order)} · {order.payloadKg} kg</small></div>
            {state && <StatusBadge tone="warning">{state}</StatusBadge>}
            <button type="button" className="row-action" onClick={() => navigate(`/operator/missions/create?orderId=${order.id}`)}>Create mission</button>
          </div>
        );
      })}
    </div>
  );
}
