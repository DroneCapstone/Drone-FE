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
  getOrderPlanningBadge,
  sortOrdersByPlanningPriority,
} from '../../utils/deliveryPlanning';
import { OrderPageShell } from './OrderPageShell';

const ALL_PLANNING_STATES = 'All planning states';
const ALL_DELIVERY_MODES = 'All delivery modes';

// Filter exclusively by the five planning states defined by BE.
// Do not mix Order status (PENDING/AT_HUB/...) into this dropdown.
const PLANNING_STATES = [
  'Waiting for package',     // WAITING_PACKAGE
  'Ready for Planning',      // READY_FOR_PLANNING
  'Planned',                 // PLANNED
  'Future',                  // FUTURE
  'Needs Replanning',        // NEEDS_REPLANNING
] as const;

export function AllOrdersPage() {
  const location = useLocation();
  // Legacy /orders/ready links still open the same page, with its filter applied.
  const readyLink = location.pathname.endsWith('/ready');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState(() => readyLink ? 'Ready for Planning' : ALL_PLANNING_STATES);
  const [deliveryMode, setDeliveryMode] = useState(ALL_DELIVERY_MODES);
  const [page, setPage] = useState(1);
  const { data: missions = [] } = useMissionListQuery();

  useEffect(() => {
    setStatus(readyLink ? 'Ready for Planning' : ALL_PLANNING_STATES);
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
  });

  // Keep all Orders in the unfiltered view; actionable Orders come first.
  // Planning filters remain available now that the top tabs are removed.
  const filtered = sortOrdersByPlanningPriority(
    orders.filter((order) => {
      const matchesMode = deliveryMode === ALL_DELIVERY_MODES || order.deliveryMode === deliveryMode;
      const matchesState = status === ALL_PLANNING_STATES
        || getOrderPlanningBadge(order, missions) === status;
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
            options={[ALL_PLANNING_STATES, ...PLANNING_STATES]}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            ariaLabel="Filter planning state"
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
