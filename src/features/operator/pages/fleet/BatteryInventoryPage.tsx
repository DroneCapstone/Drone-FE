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

function batteryStatusTone(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'ready') return 'success' as const;
  if (['charging', 'in use', 'reserved'].includes(normalized)) return 'info' as const;
  if (['replaced', 'inactive', 'damaged', 'faulty', 'retired'].includes(normalized)) return 'danger' as const;
  return 'neutral' as const;
}

function getBatteryHubName(
  battery: OperatorBattery,
  drones: OperatorDrone[],
  hubNameById: Map<string, string>,
) {
  if (battery.droneId) {
    const drone = drones.find((item) => item.id === battery.droneId);
    const hubId = getBatteryHubId(battery, drones);
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
  const [page, setPage] = useState(1);

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
  const models = useMemo(() => [...new Set(batteries.map((item) => item.model).filter((model): model is string => Boolean(model)))].sort(), [batteries]);
  // Operational availability is separate from the technical `status` field.
  // Do not label `Active` as `Ready`: BE reports them independently.
  const statuses = useMemo(() => [...new Set(batteries.map((item) => item.availableStatus).filter((value): value is string => Boolean(value)))].sort(), [batteries]);

  const filtered = useMemo(() => batteries.filter((battery) => {
    const matchesQuery = `${battery.id} ${battery.serialNumber} ${battery.model ?? ''} ${battery.droneId ?? ''}`
      .toLowerCase().includes(search.trim().toLowerCase());
    const matchesHub = hubFilter === ALL_HUBS || getBatteryHubId(battery, drones) === hubFilter;
    const matchesModel = modelFilter === ALL_MODELS || battery.model === modelFilter;
    const matchesStatus = statusFilter === ALL_STATUSES || battery.availableStatus === statusFilter;
    return matchesQuery && matchesHub && matchesModel && matchesStatus;
  }), [batteries, drones, hubFilter, modelFilter, search, statusFilter]);

  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / OPERATOR_PAGE_SIZE)));
  const visible = filtered.slice((currentPage - 1) * OPERATOR_PAGE_SIZE, currentPage * OPERATOR_PAGE_SIZE);
  const loading = batteriesLoading || dronesLoading || hubsLoading || miniHubsLoading;
  const error = batteriesError ?? dronesError ?? hubsError ?? miniHubsError;

  const changeHub = (hubId: string) => {
    const next = new URLSearchParams(searchParams);
    if (hubId === ALL_HUBS) next.delete('hub');
    else next.set('hub', hubId);
    setSearchParams(next);
    setPage(1);
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
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
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
            onChange={(value) => { setModelFilter(value); setPage(1); }}
            ariaLabel="Battery model"
          />
          <DropdownSelect
            value={statusFilter}
            options={[ALL_STATUSES, ...statuses]}
            onChange={(value) => { setStatusFilter(value); setPage(1); }}
            ariaLabel="Battery availability"
          />
          <span className="toolbar-spacer" />
          <small>{batteriesFetching ? 'Refreshing…' : `Total batteries: ${filtered.length}`}</small>
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
            <div className="table-wrap battery-inventory-table-wrap">
              <table className="battery-inventory-table">
                <colgroup>
                  <col /> {/* Battery ID */}
                  <col /> {/* Battery model */}
                  <col /> {/* Hub name */}
                  <col /> {/* Capacity */}
                  <col /> {/* Charge */}
                  <col /> {/* Status */}
                </colgroup>
                <thead>
                  <tr>
                    <th>Battery</th>
                    <th>Model</th>
                    <th>Hub</th>
                    <th>Capacity</th>
                    <th>Charge</th>
                    <th>Availability</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((battery) => (
                    <tr key={battery.id}>
                      <td><strong>{battery.id}</strong></td>
                      <td>{battery.model || '—'}</td>
                      <td>{getBatteryHubName(battery, drones, hubNameById)}</td>
                      <td>{Number.isFinite(battery.capacityWh) ? `${battery.capacityWh.toLocaleString()} Wh` : '—'}</td>
                      <td>{Number.isFinite(battery.chargeLevelPct) ? `${battery.chargeLevelPct}%` : '—'}</td>
                      <td title={`Technical status: ${battery.status || 'Unknown'}`}>
                        {battery.availableStatus
                          ? <StatusBadge tone={batteryStatusTone(battery.availableStatus)}>{battery.availableStatus}</StatusBadge>
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <OperatorPagination
              currentPage={currentPage}
              totalItems={filtered.length}
              itemLabel="batteries"
              onPageChange={setPage}
            />
          </>
        )}
      </OperatorPanel>
    </FleetHubPageShell>
  );
}
