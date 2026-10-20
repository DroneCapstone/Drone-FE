import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DropdownSelect } from '../../../../components/ui/DropdownSelect';
import { Icon } from '../../../../components/ui/Icon';
import { OperatorPanel } from '../../components/OperatorPanel';
import { OPERATOR_PAGE_SIZE, OperatorPagination } from '../../components/OperatorPagination';
import { OrderTable } from '../../components/OrderTable';
import { useMissionListQuery } from '../../hooks/useMissionQueries';
import { useOperatorOrdersQuery } from '../../hooks/useOrderQueries';
import {
  canCreateMissionForOrder,
  getOrderPlanningBadge,
  sortOrdersByPlanningPriority,
} from '../../utils/deliveryPlanning';
import { OrderPageShell } from './OrderPageShell';

const ALL_ORDER_STATES = 'All order states';
const ALL_DELIVERY_MODES = 'All delivery modes';

// This single filter replaces the removed Ready-for-planning tab. It covers
// both Order Status and Planning State without changing the backend contract.
const ORDER_STATUSES: Record<string, 'PENDING' | 'AWAITING_DROP_OFF' | 'AT_HUB' | 'IN_DELIVERY' | 'DELIVERED_TO_HUB' | 'CANCELLED'> = {
  Pending: 'PENDING',
  'Awaiting Drop-off': 'AWAITING_DROP_OFF',
  'At Hub': 'AT_HUB',
  'In Delivery': 'IN_DELIVERY',
  'Delivered to Hub': 'DELIVERED_TO_HUB',
  Cancelled: 'CANCELLED',
};

const PLANNING_FILTERS = ['Ready for Planning', 'Needs Replanning', 'Waiting for package', 'Future', 'Planned'];

export function AllOrdersPage() {
  const location = useLocation();
  // Legacy /orders/ready links still open the same page, with its filter applied.
  const readyLink = location.pathname.endsWith('/ready');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState(() => readyLink ? 'Ready for Planning' : ALL_ORDER_STATES);
  const [deliveryMode, setDeliveryMode] = useState(ALL_DELIVERY_MODES);
  const [page, setPage] = useState(1);
  const { data: missions = [] } = useMissionListQuery();

  useEffect(() => {
    setStatus(readyLink ? 'Ready for Planning' : ALL_ORDER_STATES);
    setPage(1);
  }, [readyLink]);

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
    status: ORDER_STATUSES[status],
  });

  // Keep all Orders in the unfiltered view; actionable Orders come first.
  // Planning filters remain available now that the top tabs are removed.
  const filtered = sortOrdersByPlanningPriority(
    orders.filter((order) => {
      const matchesMode = deliveryMode === ALL_DELIVERY_MODES || order.deliveryMode === deliveryMode;
      const matchesState = status === ALL_ORDER_STATES
        || (status === 'Ready for Planning'
          ? canCreateMissionForOrder(order, missions)
          : PLANNING_FILTERS.includes(status)
            ? getOrderPlanningBadge(order, missions) === status
            : order.status === status);
      return matchesMode && matchesState;
    }),
    missions,
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / OPERATOR_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedOrders = filtered.slice(
    (currentPage - 1) * OPERATOR_PAGE_SIZE,
    currentPage * OPERATOR_PAGE_SIZE,
  );

  return (
    <OrderPageShell>
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
              ALL_ORDER_STATES,
              'Ready for Planning',
              'Needs Replanning',
              'Waiting for package',
              'Planned',
              'Future',
              'Pending',
              'Awaiting Drop-off',
              'At Hub',
              'In Delivery',
              'Delivered to Hub',
              'Cancelled',
            ]}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            ariaLabel="Filter order or planning state"
          />
          <DropdownSelect
            value={deliveryMode}
            options={[ALL_DELIVERY_MODES, 'Express', 'Scheduled', 'Normal']}
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
