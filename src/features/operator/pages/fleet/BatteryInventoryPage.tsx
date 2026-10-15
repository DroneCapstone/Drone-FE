import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DropdownSelect } from '../../../../components/ui/DropdownSelect';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { OperatorPanel } from '../../components/OperatorPanel';
import { OPERATOR_PAGE_SIZE, OperatorPagination } from '../../components/OperatorPagination';
import { useFleetBatteriesQuery, useFleetDronesQuery } from '../../hooks/useFleetQueries';
import { useMissionHubsQuery, useMissionMiniHubsQuery } from '../../hooks/useMissionQueries';
import type { OperatorBattery, OperatorDrone } from '../../types/operator';
import { getBatteryHubId } from '../../utils/fleetInventory';
import { FleetHubPageShell } from './FleetHubPageShell';

const ALL_HUBS = 'All hubs';
const ALL_MODELS = 'All models';
const ALL_STATUSES = 'All statuses';
const ALL_PLACEMENTS = 'All placements';

function placement(battery: OperatorBattery) {
  return battery.droneId ? 'Installed' : battery.currentHubId ? 'In hub storage' : 'Unknown';
}

function batteryStatusTone(status: string) {
  const normalized = status.trim().toLowerCase();
  if (['active', 'available', 'ready'].includes(normalized)) return 'success' as const;
  if (['charging', 'reserved'].includes(normalized)) return 'info' as const;
  if (['inactive', 'damaged', 'faulty', 'retired'].includes(normalized)) return 'danger' as const;
  return 'neutral' as const;
}

function getBatteryLocation(
  battery: OperatorBattery,
  drones: OperatorDrone[],
  hubNameById: Map<string, string>,
) {
  if (battery.droneId) {
    const drone = drones.find((item) => item.id === battery.droneId);
    const hubId = getBatteryHubId(battery, drones);
    if (drone?.technicalStatus === 'In Flight') return 'In flight';
    return hubId ? hubNameById.get(hubId) ?? drone?.hubName ?? hubId : '—';
  }
  return battery.currentHubId
    ? hubNameById.get(battery.currentHubId) ?? battery.hubName ?? battery.currentHubId
    : '—';
}

export function BatteryInventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [modelFilter, setModelFilter] = useState(ALL_MODELS);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);
  const [placementFilter, setPlacementFilter] = useState(ALL_PLACEMENTS);
  const [page, setPage] = useState(1);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const { data: batteries = [], isLoading: batteriesLoading, isFetching: batteriesFetching, error: batteriesError, refetch: refetchBatteries } = useFleetBatteriesQuery();
  const { data: drones = [], isLoading: dronesLoading, error: dronesError, refetch: refetchDrones } = useFleetDronesQuery();
  const { data: apiHubs = [], isLoading: hubsLoading, error: hubsError, refetch: refetchHubs } = useMissionHubsQuery();
  const { data: apiMiniHubs = [], isLoading: miniHubsLoading, error: miniHubsError, refetch: refetchMiniHubs } = useMissionMiniHubsQuery();

  const hubs = useMemo(() => {
    const byId = new Map<string, string>();
    [...apiHubs, ...apiMiniHubs].forEach((hub) => byId.set(String(hub.id), hub.name));
    return [...byId.entries()].map(([id, name]) => ({ id, name }));
  }, [apiHubs, apiMiniHubs]);
  const hubNameById = useMemo(() => new Map(hubs.map((hub) => [hub.id, hub.name])), [hubs]);

  const requestedHubId = searchParams.get('hub');
  const hubFilter = requestedHubId && hubs.some((hub) => hub.id === requestedHubId)
    ? requestedHubId : ALL_HUBS;
  const selectedHub = hubs.find((hub) => hub.id === hubFilter);
  const models = useMemo(() => [...new Set(batteries.map((item) => item.model).filter((model): model is string => Boolean(model)))].sort(), [batteries]);
  const statuses = useMemo(() => [...new Set(batteries.map((item) => item.status))].sort(), [batteries]);

  const filtered = useMemo(() => batteries.filter((battery) => {
    const matchesQuery = `${battery.id} ${battery.serialNumber} ${battery.model ?? ''} ${battery.droneId ?? ''}`
      .toLowerCase().includes(search.trim().toLowerCase());
    const matchesHub = hubFilter === ALL_HUBS || getBatteryHubId(battery, drones) === hubFilter;
    const matchesModel = modelFilter === ALL_MODELS || battery.model === modelFilter;
    const matchesStatus = statusFilter === ALL_STATUSES || battery.status === statusFilter;
    const matchesPlacement = placementFilter === ALL_PLACEMENTS || placement(battery) === placementFilter;
    return matchesQuery && matchesHub && matchesModel && matchesStatus && matchesPlacement;
  }), [batteries, drones, hubFilter, modelFilter, placementFilter, search, statusFilter]);

  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / OPERATOR_PAGE_SIZE)));
  const visible = filtered.slice((currentPage - 1) * OPERATOR_PAGE_SIZE, currentPage * OPERATOR_PAGE_SIZE);
  const selectedBattery = filtered.find((battery) => battery.id === detailsId);
  const loading = batteriesLoading || dronesLoading || hubsLoading || miniHubsLoading;
  const error = batteriesError ?? dronesError ?? hubsError ?? miniHubsError;

  const changeHub = (hubId: string) => {
    const next = new URLSearchParams(searchParams);
    if (hubId === ALL_HUBS) next.delete('hub');
    else next.set('hub', hubId);
    setSearchParams(next);
    setPage(1);
    setDetailsId(null);
  };

  return (
    <FleetHubPageShell active="/operator/fleet-hubs/batteries">
      <OperatorPanel className="flush-panel">
        <div className="toolbar battery-inventory-toolbar">
          <div className="filter-search">
            <Icon name="search" />
            <input
              aria-label="Search batteries"
              placeholder="Search batteries…"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); setDetailsId(null); }}
            />
          </div>
          <DropdownSelect
            value={hubFilter}
            options={[{ value: ALL_HUBS, label: ALL_HUBS }, ...hubs.map((hub) => ({ value: hub.id, label: hub.name }))]}
            onChange={changeHub}
            ariaLabel="Hub"
          />
          <DropdownSelect
            value={modelFilter}
            options={[ALL_MODELS, ...models]}
            onChange={(value) => { setModelFilter(value); setPage(1); setDetailsId(null); }}
            ariaLabel="Battery model"
          />
          <DropdownSelect
            value={statusFilter}
            options={[ALL_STATUSES, ...statuses]}
            onChange={(value) => { setStatusFilter(value); setPage(1); setDetailsId(null); }}
            ariaLabel="Battery status"
          />
          <DropdownSelect
            value={placementFilter}
            options={[ALL_PLACEMENTS, 'In hub storage', 'Installed', 'Unknown']}
            onChange={(value) => { setPlacementFilter(value); setPage(1); setDetailsId(null); }}
            ariaLabel="Battery placement"
          />
          <span className="toolbar-spacer" />
          <small>{batteriesFetching ? 'Refreshing…' : `${selectedHub ? `${selectedHub.name} · ` : ''}${filtered.length} batteries`}</small>
        </div>

        {error ? (
          <div className="operator-empty-state">
            <strong>Unable to load battery inventory</strong>
            <span>{error instanceof Error ? error.message : 'Could not load inventory data.'}</span>
            <button type="button" className="row-action" onClick={() => {
              void refetchBatteries(); void refetchDrones(); void refetchHubs(); void refetchMiniHubs();
            }}>Retry</button>
          </div>
        ) : loading ? (
          <div className="operator-empty-state">Loading batteries…</div>
        ) : filtered.length === 0 ? (
          <div className="operator-empty-state">No batteries match the current filters.</div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Battery</th>
                    <th>Model</th>
                    <th>Hub</th>
                    <th>Location</th>
                    <th>Capacity</th>
                    <th>Charge</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((battery) => (
                    <tr key={battery.id}>
                      <td><strong>{battery.id}</strong></td>
                      <td>{battery.model || '—'}</td>
                      <td>{getBatteryLocation(battery, drones, hubNameById)}</td>
                      <td>{battery.droneId ? `Installed · Drone ${battery.droneId}` : battery.currentHubId ? 'Hub storage' : 'Unknown'}</td>
                      <td>{battery.capacityWh.toLocaleString()} Wh</td>
                      <td>{battery.chargeLevelPct}%</td>
                      <td><StatusBadge tone={batteryStatusTone(battery.status)}>{battery.status}</StatusBadge></td>
                      <td>
                        <button
                          type="button"
                          className="row-action"
                          onClick={() => setDetailsId(detailsId === battery.id ? null : battery.id)}
                          aria-expanded={detailsId === battery.id}
                        >{detailsId === battery.id ? 'Hide details' : 'View details'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedBattery && (
              <section className="battery-inventory-detail" aria-label={`Battery ${selectedBattery.id} details`}>
                <div className="battery-inventory-detail-head">
                  <h3>{selectedBattery.id}</h3>
                  <button type="button" className="row-action" onClick={() => setDetailsId(null)}>Close</button>
                </div>
                <dl className="battery-inventory-detail-grid">
                  <div><dt>Serial number</dt><dd>{selectedBattery.serialNumber}</dd></div>
                  <div><dt>Battery model</dt><dd>{selectedBattery.model || '—'}</dd></div>
                  <div><dt>Capacity</dt><dd>{selectedBattery.capacityWh.toLocaleString()} Wh</dd></div>
                  <div><dt>Charge level</dt><dd>{selectedBattery.chargeLevelPct}%</dd></div>
                  <div><dt>Status</dt><dd>{selectedBattery.status}</dd></div>
                  <div><dt>Current hub</dt><dd>{getBatteryLocation(selectedBattery, drones, hubNameById)}</dd></div>
                  <div><dt>Installed on</dt><dd>{selectedBattery.droneId ? `Drone ${selectedBattery.droneId}` : '—'}</dd></div>
                </dl>
              </section>
            )}
            <OperatorPagination
              currentPage={currentPage}
              totalItems={filtered.length}
              itemLabel="batteries"
              onPageChange={(nextPage) => { setPage(nextPage); setDetailsId(null); }}
            />
          </>
        )}
      </OperatorPanel>
    </FleetHubPageShell>
  );
}
