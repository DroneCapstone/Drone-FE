import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DropdownSelect } from '../../../../components/ui/DropdownSelect';
import { Icon } from '../../../../components/ui/Icon';
import { OperatorPanel } from '../../components/OperatorPanel';
import { OPERATOR_PAGE_SIZE, OperatorPagination } from '../../components/OperatorPagination';
import { OrderTable } from '../../components/OrderTable';
import { getOrderPlanningBadge, isActionablePlanningState, sortOrdersByPlanningPriority } from '../../utils/deliveryPlanning';
import { loadOperatorMissions } from '../../utils/operatorMissionStorage';
import { loadOperatorOrders } from '../../utils/operatorOrderStorage';
import { OrderPageShell } from './OrderPageShell';

export function AllOrdersPage() {
  const location = useLocation();
  const readyOnly = location.pathname.endsWith('/ready');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [deliveryMode, setDeliveryMode] = useState('All delivery modes');
  const [page, setPage] = useState(1);
  const orders = useMemo(() => loadOperatorOrders(), []);
  const missions = useMemo(() => loadOperatorMissions(), []);

  const filtered = sortOrdersByPlanningPriority(orders, missions).filter((order) => {
    const matchesQuery = `${order.id} ${order.customerName} ${order.packageLabel} ${order.originHubId} ${order.destinationHubId}`
      .toLowerCase()
      .includes(query.toLowerCase());
    const matchesStatus = status === 'All statuses' || order.status === status;
    const matchesMode = deliveryMode === 'All delivery modes' || order.deliveryMode === deliveryMode;
    const matchesReady = !readyOnly || isActionablePlanningState(getOrderPlanningBadge(order, missions));
    return matchesQuery && matchesStatus && matchesMode && matchesReady;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / OPERATOR_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedOrders = filtered.slice(
    (currentPage - 1) * OPERATOR_PAGE_SIZE,
    currentPage * OPERATOR_PAGE_SIZE,
  );

  return (
    <OrderPageShell active={readyOnly ? '/operator/orders/ready' : '/operator/orders/all'}>
      <OperatorPanel className="flush-panel">
        <div className="toolbar">
          <div className="filter-search">
            <Icon name="search" />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="Search orders…"
            />
          </div>
          <DropdownSelect
            value={status}
            options={['All statuses', 'Pending', 'Ready for Pickup', 'Completed', 'Disposed', 'Cancelled']}
            onChange={(value) => { setStatus(value); setPage(1); }}
            ariaLabel="Order status"
          />
          <DropdownSelect
            value={deliveryMode}
            options={['All delivery modes', 'Express', 'Scheduled']}
            onChange={(value) => { setDeliveryMode(value); setPage(1); }}
            ariaLabel="Delivery mode"
          />
          <span className="toolbar-spacer" />
          <small>{filtered.length} orders</small>
        </div>
        <OrderTable orders={paginatedOrders} missions={missions} />
        <OperatorPagination
          currentPage={currentPage}
          totalItems={filtered.length}
          itemLabel="orders"
          onPageChange={setPage}
        />
      </OperatorPanel>
    </OrderPageShell>
  );
}
