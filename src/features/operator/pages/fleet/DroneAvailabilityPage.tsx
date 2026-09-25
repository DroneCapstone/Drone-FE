import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DropdownSelect } from '../../../../components/ui/DropdownSelect';
import { Icon } from '../../../../components/ui/Icon';
import { DroneAvailabilityTable } from '../../components/DroneAvailabilityTable';
import { OperatorPanel } from '../../components/OperatorPanel';
import { operatorHubs } from '../../data/hubMockData';
import type { TechnicalStatus } from '../../types/operator';
import { loadOperatorFleet } from '../../utils/operatorFleetStorage';
import { FleetHubPageShell } from './FleetHubPageShell';

const ALL_HUBS = 'All hubs';

export function DroneAvailabilityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [technicalFilter, setTechnicalFilter] = useState('All technical');
  const fleet = loadOperatorFleet();

  const requestedHubId = searchParams.get('hub');
  const hubFilter =
    requestedHubId && operatorHubs.some((hub) => hub.id === requestedHubId)
      ? requestedHubId
      : ALL_HUBS;

  const selectedHub = operatorHubs.find((hub) => hub.id === hubFilter);

  const handleHubChange = (hubId: string) => {
    const nextParams = new URLSearchParams(searchParams);

    if (hubId === ALL_HUBS) {
      nextParams.delete('hub');
    } else {
      nextParams.set('hub', hubId);
    }

    setSearchParams(nextParams);
  };

  const filtered = useMemo(
    () =>
      fleet.filter((drone) => {
        const matchesQuery = `${drone.name} ${drone.displayId} ${drone.id} ${drone.model}`
          .toLowerCase()
          .includes(query.toLowerCase());

        const matchesHub =
          hubFilter === ALL_HUBS || drone.hubId === hubFilter;

        const matchesTechnical =
          technicalFilter === 'All technical' ||
          drone.technicalStatus === (technicalFilter as TechnicalStatus);

        return matchesQuery && matchesHub && matchesTechnical;
      }),
    [fleet, hubFilter, query, technicalFilter],
  );

  return (
    <FleetHubPageShell active="/operator/fleet-hubs/drones">
      <OperatorPanel className="flush-panel">
        <div className="toolbar">
          <div className="filter-search">
            <Icon name="search" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search drones…"
            />
          </div>

          <DropdownSelect
            value={hubFilter}
            options={[
              { value: ALL_HUBS, label: ALL_HUBS },
              ...operatorHubs.map((hub) => ({
                value: hub.id,
                label: hub.name,
              })),
            ]}
            onChange={handleHubChange}
            ariaLabel="Hub"
          />

          <DropdownSelect
            value={technicalFilter}
            options={[
              'All technical',
              'Available',
              'Maintenance',
            ]}
            onChange={setTechnicalFilter}
            ariaLabel="Technical status"
          />

          <span className="toolbar-spacer" />
          <small>
            {selectedHub ? `${selectedHub.name} · ` : ''}
            {filtered.length} drones
          </small>
        </div>

        <DroneAvailabilityTable drones={filtered} hubs={operatorHubs} />
      </OperatorPanel>

      {/* <p className="section-note">
        Technical status is synchronized from Technician fleet data. Current mission assignment is checked separately when planning a mission, so a technically available drone cannot be double-assigned.
      </p> */}
    </FleetHubPageShell>
  );
}
