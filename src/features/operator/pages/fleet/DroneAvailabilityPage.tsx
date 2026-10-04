import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DropdownSelect } from '../../../../components/ui/DropdownSelect';
import { Icon } from '../../../../components/ui/Icon';
import { DroneAvailabilityTable } from '../../components/DroneAvailabilityTable';
import { OperatorPanel } from '../../components/OperatorPanel';
import { OPERATOR_PAGE_SIZE, OperatorPagination } from '../../components/OperatorPagination';
import { useFleetDronesQuery } from '../../hooks/useFleetQueries';
import { useMissionHubsQuery } from '../../hooks/useMissionQueries';
import type { Hub, TechnicalStatus } from '../../types/operator';
import { FleetHubPageShell } from './FleetHubPageShell';

const ALL_HUBS = 'All hubs';

export function DroneAvailabilityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [technicalFilter, setTechnicalFilter] = useState('All technical');
  const [page, setPage] = useState(1);

  const {
    data: fleet = [],
    isLoading: fleetLoading,
    isFetching: fleetFetching,
    error: fleetError,
    refetch: refetchFleet,
  } = useFleetDronesQuery();
  const {
    data: apiHubs = [],
    isLoading: hubsLoading,
    error: hubsError,
    refetch: refetchHubs,
  } = useMissionHubsQuery();

  const hubs = useMemo<Hub[]>(
    () => apiHubs.map((hub) => ({
      id: hub.id,
      name: hub.name,
      area: '',
      address: hub.address ?? '',
      latitude: hub.latitude ?? 0,
      longitude: hub.longitude ?? 0,
      status: 'Active',
    })),
    [apiHubs],
  );

  const requestedHubId = searchParams.get('hub');
  const hubFilter = requestedHubId && hubs.some((hub) => hub.id === requestedHubId)
    ? requestedHubId
    : ALL_HUBS;

  const selectedHub = hubs.find((hub) => hub.id === hubFilter);

  const handleHubChange = (hubId: string) => {
    const nextParams = new URLSearchParams(searchParams);

    if (hubId === ALL_HUBS) {
      nextParams.delete('hub');
    } else {
      nextParams.set('hub', hubId);
    }

    setSearchParams(nextParams);
    setPage(1);
  };

  const filtered = useMemo(
    () => fleet.filter((drone) => {
      const matchesQuery = `${drone.name} ${drone.displayId} ${drone.id} ${drone.model}`
        .toLowerCase()
        .includes(query.toLowerCase());

      const matchesHub = hubFilter === ALL_HUBS || drone.hubId === hubFilter;

      const matchesTechnical =
        technicalFilter === 'All technical' ||
        drone.technicalStatus === (technicalFilter as TechnicalStatus);

      return matchesQuery && matchesHub && matchesTechnical;
    }),
    [fleet, hubFilter, query, technicalFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / OPERATOR_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedDrones = filtered.slice(
    (currentPage - 1) * OPERATOR_PAGE_SIZE,
    currentPage * OPERATOR_PAGE_SIZE,
  );

  const loading = fleetLoading || hubsLoading;
  const error = fleetError ?? hubsError;

  return (
    <FleetHubPageShell active="/operator/fleet-hubs/drones">
      <OperatorPanel className="flush-panel">
        <div className="toolbar">
          <div className="filter-search">
            <Icon name="search" />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="Search drones…"
            />
          </div>

          <DropdownSelect
            value={hubFilter}
            options={[
              { value: ALL_HUBS, label: ALL_HUBS },
              ...hubs.map((hub) => ({
                value: hub.id,
                label: hub.name,
              })),
            ]}
            onChange={handleHubChange}
            ariaLabel="Hub"
          />

          <DropdownSelect
            value={technicalFilter}
            options={['All technical', 'Available', 'Maintenance']}
            onChange={(value) => { setTechnicalFilter(value); setPage(1); }}
            ariaLabel="Technical status"
          />

          <span className="toolbar-spacer" />
          <small>
            {fleetFetching ? 'Refreshing…' : `${selectedHub ? `${selectedHub.name} · ` : ''}${filtered.length} drones`}
          </small>
        </div>

        {error ? (
          <div className="operator-empty-state">
            <strong>Unable to load Fleet</strong>
            <span>{error instanceof Error ? error.message : 'Could not load fleet data.'}</span>
            <button
              type="button"
              className="row-action"
              onClick={() => { void refetchFleet(); void refetchHubs(); }}
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="operator-empty-state">Loading Fleet…</div>
        ) : filtered.length === 0 ? (
          <div className="operator-empty-state">No drones match the current filters.</div>
        ) : (
          <>
            <DroneAvailabilityTable drones={paginatedDrones} hubs={hubs} />
            <OperatorPagination
              currentPage={currentPage}
              totalItems={filtered.length}
              itemLabel="drones"
              onPageChange={setPage}
            />
          </>
        )}
      </OperatorPanel>
    </FleetHubPageShell>
  );
}
