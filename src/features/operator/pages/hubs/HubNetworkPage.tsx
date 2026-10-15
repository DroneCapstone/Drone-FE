import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { HubCard } from '../../components/HubCard';
import { OperatorPanel } from '../../components/OperatorPanel';
import { OperatorPagination } from '../../components/OperatorPagination';
import { useFleetBatteriesQuery, useFleetDronesQuery } from '../../hooks/useFleetQueries';
import { useMissionHubsQuery, useMissionMiniHubsQuery } from '../../hooks/useMissionQueries';
import { countBatteriesAtHub } from '../../utils/fleetInventory';
import { FleetHubPageShell } from '../fleet/FleetHubPageShell';

const HUBS_PER_PAGE = 9;

export function HubNetworkPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data: apiHubs, isLoading: hubsLoading, error: hubsError } = useMissionHubsQuery();
  const { data: apiMiniHubs, isLoading: miniHubsLoading, error: miniHubsError } = useMissionMiniHubsQuery();
  const { data: fleet = [], isLoading: fleetLoading, error: fleetError } = useFleetDronesQuery();
  const { data: batteries = [], isLoading: batteriesLoading, error: batteriesError } = useFleetBatteriesQuery();

  const batteryCountsReady = !batteriesLoading && !fleetLoading && !batteriesError && !fleetError;
  const hubs = [...(apiHubs ?? []), ...(apiMiniHubs ?? [])].map((hub) => {
    const hubFleet = fleet.filter((drone) => drone.hubId === String(hub.id));
    return {
      id: String(hub.id),
      name: hub.name,
      area: '',
      address: hub.address ?? '',
      latitude: hub.latitude ?? 0,
      longitude: hub.longitude ?? 0,
      status: 'Active' as const,
      totalDrones: hub.totalDrones ?? (!fleetLoading && !fleetError ? hubFleet.length : null),
      totalBatteries: batteryCountsReady ? countBatteriesAtHub(batteries, fleet, String(hub.id)) : null,
    };
  });

  const loading = hubsLoading || miniHubsLoading;
  const error = hubsError ?? miniHubsError;
  const totalPages = Math.max(1, Math.ceil(hubs.length / HUBS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedHubs = hubs.slice(
    (currentPage - 1) * HUBS_PER_PAGE,
    currentPage * HUBS_PER_PAGE,
  );

  const openHubTab = (tab: 'drones' | 'batteries', hubId: string) => {
    navigate(`/operator/fleet-hubs/${tab}?hub=${encodeURIComponent(hubId)}`);
  };

  return (
    <FleetHubPageShell active="/operator/fleet-hubs/hubs">
      <OperatorPanel
        title="Hub network"
        action={<NavLink className="text-button" to="/operator/fleet-hubs/drones">View all drones</NavLink>}
      >
        {loading ? (
          <div className="operator-empty-state">Loading hubs…</div>
        ) : error ? (
          <div className="operator-empty-state">
            {error instanceof Error ? error.message : 'Unable to load hubs.'}
          </div>
        ) : hubs.length === 0 ? (
          <div className="operator-empty-state">No hubs were returned by the Backend.</div>
        ) : (
          <>
            {batteriesError || fleetError ? (
              <p className="hub-resource-notice" role="status">
                Battery totals are unavailable because inventory data could not be loaded. Drone and Hub information remains accessible.
              </p>
            ) : null}
            <div className="hub-grid hub-network-grid">
              {paginatedHubs.map((hub) => (
                <HubCard
                  key={hub.id}
                  hub={hub}
                  totalDrones={hub.totalDrones}
                  totalBatteries={hub.totalBatteries}
                  showArea={false}
                  onSelectDrones={() => openHubTab('drones', hub.id)}
                  onSelectBatteries={() => openHubTab('batteries', hub.id)}
                />
              ))}
            </div>
            <OperatorPagination
              currentPage={currentPage}
              totalItems={hubs.length}
              itemLabel="hubs"
              pageSize={HUBS_PER_PAGE}
              className="operator-pagination--grid"
              onPageChange={setPage}
            />
          </>
        )}
      </OperatorPanel>
    </FleetHubPageShell>
  );
}
