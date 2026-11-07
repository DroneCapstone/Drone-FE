import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DropdownSelect } from '../../../../components/ui/DropdownSelect';
import { Icon } from '../../../../components/ui/Icon';
import { DroneAvailabilityTable } from '../../components/DroneAvailabilityTable';
import { OperatorPanel } from '../../components/OperatorPanel';
import { OPERATOR_PAGE_SIZE, OperatorPagination } from '../../components/OperatorPagination';
import { useFleetDronesQuery } from '../../hooks/useFleetQueries';
import { useMissionHubsQuery, useMissionMiniHubsQuery } from '../../hooks/useMissionQueries';
import type { Hub, TechnicalStatus } from '../../types/operator';
import { FleetHubPageShell } from './FleetHubPageShell';

const ALL_HUBS = 'All hubs';
const ALL_MODELS = 'All models';

export function DroneAvailabilityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [technicalFilter, setTechnicalFilter] = useState('All status');
  const [modelFilter, setModelFilter] = useState(ALL_MODELS);
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
  const {
    data: apiMiniHubs = [],
    isLoading: miniHubsLoading,
    error: miniHubsError,
    refetch: refetchMiniHubs,
  } = useMissionMiniHubsQuery();

  const hubs = useMemo<Hub[]>(
    () => [...apiHubs, ...apiMiniHubs].map((hub) => ({
      id: hub.id,
      name: hub.name,
      area: '',
      address: hub.address ?? '',
      latitude: 0,
      longitude: 0,
      status: 'Active',
    })),
    [apiHubs, apiMiniHubs],
  );

  const requestedHubId = searchParams.get('hub');
  const hubFilter = requestedHubId && hubs.some((hub) => hub.id === requestedHubId)
    ? requestedHubId
    : ALL_HUBS;

  const selectedHub = hubs.find((hub) => hub.id === hubFilter);

  // Only include models reported by the Fleet API; no hardcoded choices.
  const models = useMemo(
    () => [...new Set(fleet.map((drone) => drone.model?.trim()).filter((model): model is string => Boolean(model)))].sort((a, b) => a.localeCompare(b)),
    [fleet],
  );

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
      const matchesModel = modelFilter === ALL_MODELS || drone.model?.trim() === modelFilter;

      const matchesTechnical =
        technicalFilter === 'All status' ||
        drone.technicalStatus === (technicalFilter as TechnicalStatus);

      return matchesQuery && matchesHub && matchesModel && matchesTechnical;
    }),
    [fleet, hubFilter, modelFilter, query, technicalFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / OPERATOR_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedDrones = filtered.slice(
    (currentPage - 1) * OPERATOR_PAGE_SIZE,
    currentPage * OPERATOR_PAGE_SIZE,
  );

  const loading = fleetLoading || hubsLoading || miniHubsLoading;
  const error = fleetError ?? hubsError ?? miniHubsError;

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
            value={modelFilter}
            options={[ALL_MODELS, ...models]}
            onChange={(value) => { setModelFilter(value); setPage(1); }}
            ariaLabel="Drone model"
          />

          <DropdownSelect
            value={technicalFilter}
            options={['All status', 'Available', 'In Flight', 'Maintenance']}
            onChange={(value) => { setTechnicalFilter(value); setPage(1); }}
            ariaLabel="Drone status"
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
              onClick={() => {
                void refetchFleet();
                void refetchHubs();
                void refetchMiniHubs();
              }}
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
