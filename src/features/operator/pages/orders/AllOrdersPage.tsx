import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DropdownSelect } from '../../../../components/ui/DropdownSelect';
import { Icon } from '../../../../components/ui/Icon';
import { OperatorPanel } from '../../components/OperatorPanel';
import { OPERATOR_PAGE_SIZE, OperatorPagination } from '../../components/OperatorPagination';
import { OrderTable } from '../../components/OrderTable';
import { useOperatorOrdersQuery } from '../../hooks/useOrderQueries';
import type { OrderStatus } from '../../types/operator';
import {
  getOrderPlanningBadge,
  isActionablePlanningState,
  sortOrdersByPlanningPriority,
} from '../../utils/deliveryPlanning';
import { loadOperatorMissions } from '../../utils/operatorMissionStorage';
import { OrderPageShell } from './OrderPageShell';

const STATUS_TO_API: Record<
  string,
  'PENDING' | 'IN_DELIVERY' | 'DELIVERED_TO_HUB' | 'CANCELLED' | undefined
> = {
  'All statuses': undefined,
  Pending: 'PENDING',
  'In Delivery': 'IN_DELIVERY',
  'Delivered to Hub': 'DELIVERED_TO_HUB',
  Cancelled: 'CANCELLED',
};

export function AllOrdersPage() {
  const location = useLocation();
  const readyOnly = location.pathname.endsWith('/ready');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [deliveryMode, setDeliveryMode] = useState('All delivery modes');
  const [page, setPage] = useState(1);
  const missions = useMemo(() => loadOperatorMissions(), []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const {
    data: orders = [],
    error,
    isLoading,
    isFetching,
    refetch,
  } = useOperatorOrdersQuery({
    search: debouncedQuery || undefined,
    status: STATUS_TO_API[status],
  });

  const filtered = sortOrdersByPlanningPriority(orders, missions).filter((order) => {
    const matchesMode =
      deliveryMode === 'All delivery modes' || order.deliveryMode === deliveryMode;
    const matchesReady =
      !readyOnly ||
      isActionablePlanningState(getOrderPlanningBadge(order, missions));

    return matchesMode && matchesReady;
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
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search orders…"
            />
          </div>
          <DropdownSelect
            value={status}
            options={[
              'All statuses',
              'Pending',
              'In Delivery',
              'Delivered to Hub',
              'Cancelled',
            ]}
            onChange={(value) => {
              setStatus(value as OrderStatus | 'All statuses');
              setPage(1);
            }}
            ariaLabel="Order status"
          />
          <DropdownSelect
            value={deliveryMode}
            options={['All delivery modes', 'Express', 'Scheduled']}
            onChange={(value) => {
              setDeliveryMode(value);
              setPage(1);
            }}
            ariaLabel="Delivery mode"
          />
          <span className="toolbar-spacer" />
          <small>{isFetching ? 'Loading…' : `${filtered.length} orders`}</small>
        </div>

        {error ? (
          <div className="operator-empty-state">
            <strong>Unable to load Orders</strong>
            <span>{error instanceof Error ? error.message : 'Could not load orders.'}</span>
            <button
              type="button"
              className="row-action"
              onClick={() => void refetch()}
            >
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <div className="operator-empty-state">Loading Orders…</div>
        ) : filtered.length === 0 ? (
          <div className="operator-empty-state">No Orders match the current filters.</div>
        ) : (
          <>
            <OrderTable orders={paginatedOrders} missions={missions} />
            <OperatorPagination
              currentPage={currentPage}
              totalItems={filtered.length}
              itemLabel="orders"
              onPageChange={setPage}
            />
          </>
        )}
      </OperatorPanel>
    </OrderPageShell>
  );
}
