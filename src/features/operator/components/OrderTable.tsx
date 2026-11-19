import { OperatorTable, TableHeader, TableBody, TableRow, TableHead, TableCell } from './OperatorTable';
import { useNavigate } from 'react-router-dom';
import './order-priority.css';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { Mission, Order, PlanningState, Tone } from '../types/operator';
import {
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

// Operator Orders show English date labels without changing API timestamps.
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric',
});
const shortDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short',
});
const timeFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit', minute: '2-digit', hour12: false,
});

function formatDropOffReceived(value?: string) {
  if (!value) return undefined;
  const receivedAt = new Date(value);
  if (!Number.isFinite(receivedAt.getTime())) return undefined;
  return {
    short: `${shortDateFormat.format(receivedAt)}, ${timeFormat.format(receivedAt)}`,
    full: `${dateFormat.format(receivedAt)}, ${timeFormat.format(receivedAt)}`,
  };
}

function formatOrderDeliveryWindow(order: Order) {
  const { start, end } = order.currentEstimatedWindow;
  if (!start || !end) return undefined;
  const from = new Date(start);
  const to = new Date(end);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) return undefined;

  const fromDate = dateFormat.format(from);
  const toDate = dateFormat.format(to);
  return {
    date: fromDate === toDate ? fromDate : `${fromDate} – ${toDate}`,
    hours: `${timeFormat.format(from)}–${timeFormat.format(to)}`,
  };
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
      <OperatorTable className="order-table">
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className="order-number-heading">No.</TableHead>
            <TableHead>Order</TableHead>
            <TableHead className="order-route-heading">Hub Point</TableHead>
            <TableHead>Package</TableHead>
            <TableHead className="order-delivery-time-heading">Delivery Time</TableHead>
            <TableHead className="order-planning-heading">Planning Status</TableHead>
            <TableHead className="order-action-heading">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order, index) => {
            const planning = getOrderPlanningBadge(order, missions);
            const deliveryMission = getDeliveryMission(order.id, missions);
            const canCreate = canCreateMissionForOrder(order, missions);
            const planningTime = canCreate ? formatPlanningTime(order) : undefined;
            const received = formatDropOffReceived(order.originHubReceivedAt);
            const hasDropOffReceipt = Boolean(order.originPackageReceived || order.originHubReceivedAt);
            const deliveryWindow = formatOrderDeliveryWindow(order);

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
              <TableRow key={order.id} onClick={() => navigate(`/operator/orders/${order.id}`)}>
                <TableCell className="order-number-cell">{startIndex + index + 1}</TableCell>
                <TableCell>
                  <strong>{order.id}</strong>
                  <small>{order.deliveryMode}</small>
                </TableCell>
                <TableCell className="order-route-cell">
                  <strong>
                    {order.originHubId || order.destinationHubId
                      ? `${hubName(order.originHubId, order.originHubName)} → ${hubName(order.destinationHubId, order.destinationHubName)}`
                      : 'Hub data unavailable'}
                  </strong>
                  {hasDropOffReceipt && (
                    <small
                      className="order-dropoff-received"
                      title={received ? `Received at Drop-off Point: ${received.full}` : 'Received at Drop-off Point'}
                    >
                      Drop-off received{received ? ` · ${received.short}` : ''}
                    </small>
                  )}
                </TableCell>
                <TableCell className="order-package-cell">
                  {order.packageLabel}
                  <small>{order.payloadKg} kg</small>
                </TableCell>
                <TableCell className="order-delivery-time-cell">
                  {deliveryWindow ? (
                    <>
                      <strong>{deliveryWindow.date}</strong>
                      <small>{deliveryWindow.hours}</small>
                    </>
                  ) : <span>—</span>}
                </TableCell>
                <TableCell className="order-planning-cell">
                  <div className="order-delivery-meta">
                    {planning && <StatusBadge tone={planningTone(planning)}>{planning}</StatusBadge>}
                    {!planning && (
                      <small className={canCreate ? 'order-actionable-status' : undefined}>{order.status}</small>
                    )}
                  </div>
                  {planningTime && (
                    <small className={`operator-order-priority${planningTime.overdue ? ' operator-order-priority--overdue' : ''}`}>
                      {planningTime.label}
                    </small>
                  )}
                </TableCell>
                <TableCell className="order-action-cell">
                  <button
                    type="button"
                    className="row-action"
                    onClick={(event) => { event.stopPropagation(); navigate(target); }}
                  >
                    {action}
                  </button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </OperatorTable>
    </div>
  );
}
