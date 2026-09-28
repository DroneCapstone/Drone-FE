import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { HubCard } from '../../components/HubCard';
import { OperatorPanel } from '../../components/OperatorPanel';
import { OPERATOR_PAGE_SIZE, OperatorPagination } from '../../components/OperatorPagination';
import { operatorHubs } from '../../data/hubMockData';
import { loadOperatorFleet } from '../../utils/operatorFleetStorage';
import { hasActiveMissionForDrone, loadOperatorMissions } from '../../utils/operatorMissionStorage';
import { FleetHubPageShell } from '../fleet/FleetHubPageShell';

export function HubNetworkPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const fleet = loadOperatorFleet();
  const missions = loadOperatorMissions();
  const totalPages = Math.max(1, Math.ceil(operatorHubs.length / OPERATOR_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedHubs = operatorHubs.slice(
    (currentPage - 1) * OPERATOR_PAGE_SIZE,
    currentPage * OPERATOR_PAGE_SIZE,
  );

  const openHubDrones = (hubId: string) => {
    navigate(`/operator/fleet-hubs/drones?hub=${encodeURIComponent(hubId)}`);
  };

  return (
    <FleetHubPageShell active="/operator/fleet-hubs/hubs">
      <OperatorPanel
        title="Hub network"
        action={
          <NavLink className="text-button" to="/operator/fleet-hubs/drones">
            View all drones
          </NavLink>
        }
      >
        <div className="hub-grid hub-network-grid">
          {paginatedHubs.map((hub) => {
            const hubDrones = fleet.filter((drone) => drone.hubId === hub.id);
            const readyDrones = hubDrones.filter(
              (drone) =>
                drone.technicalStatus === 'Available' &&
                !hasActiveMissionForDrone(drone.id, missions),
            );

            return (
              <HubCard
                key={hub.id}
                hub={hub}
                totalDrones={hubDrones.length}
                readyDrones={readyDrones.length}
                showArea={false}
                onSelect={() => openHubDrones(hub.id)}
              />
            );
          })}
        </div>

        <OperatorPagination
          currentPage={currentPage}
          totalItems={operatorHubs.length}
          itemLabel="hubs"
          className="operator-pagination--grid"
          onPageChange={setPage}
        />
      </OperatorPanel>
    </FleetHubPageShell>
  );
}
