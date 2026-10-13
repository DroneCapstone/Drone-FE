import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ActionButton } from '../../../../components/ui/ActionButton';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';

import { OperatorPanel } from '../../components/OperatorPanel';
import type { LiveTrackingDrone } from '../../api/missionApi';
import { useLiveTrackingQuery } from '../../hooks/useMissionQueries';

import { OperationPageShell } from './OperationPageShell';
import './operations-enhanced.css';

type LiveDroneHealth = LiveTrackingDrone['health'];

function formatBattery(drone: LiveTrackingDrone) {
  if (drone.battery !== undefined) return `${drone.battery}%`;
  if (drone.batteryVoltage !== undefined) return `${drone.batteryVoltage} V`;
  return '—';
}
type HealthFilter = 'All' | LiveDroneHealth;

const FILTERS: HealthFilter[] = ['All', 'Critical', 'Attention', 'Normal'];

const healthPriority: Record<LiveDroneHealth, number> = {
  Critical: 0,
  Attention: 1,
  Normal: 2,
};

const healthTone: Record<LiveDroneHealth, 'danger' | 'warning' | 'success'> = {
  Critical: 'danger',
  Attention: 'warning',
  Normal: 'success',
};

export function LiveTrackingPage() {
  const navigate = useNavigate();
  const {
    data: liveTrackingData,
    isLoading,
    error,
  } = useLiveTrackingQuery();
  const liveDrone = liveTrackingData ?? [];

  const [filter, setFilter] = useState<HealthFilter>('All');
  const [selectedDroneId, setSelectedDroneId] = useState('');

  useEffect(() => {
    if (!selectedDroneId && liveDrone[0]) {
      setSelectedDroneId(liveDrone[0].id);
      return;
    }

    if (selectedDroneId && !liveDrone.some((aircraft) => aircraft.id === selectedDroneId)) {
      setSelectedDroneId(liveDrone[0]?.id ?? '');
    }
  }, [liveDrone, selectedDroneId]);

  const sortedDrone = useMemo(
    () =>
      [...liveDrone].sort((a, b) => {
        const healthDiff = healthPriority[a.health] - healthPriority[b.health];
        if (healthDiff !== 0) return healthDiff;
        return a.id.localeCompare(b.id);
      }),
    [liveDrone],
  );

  const filteredDrone = useMemo(
    () =>
      filter === 'All'
        ? sortedDrone
        : sortedDrone.filter((aircraft) => aircraft.health === filter),
    [filter, sortedDrone],
  );

  const selectedDrone =
    liveDrone.find((aircraft) => aircraft.id === selectedDroneId) ??
    liveDrone[0];

  const filterCount = (value: HealthFilter) =>
    value === 'All'
      ? liveDrone.length
      : liveDrone.filter((aircraft) => aircraft.health === value).length;

  const handleFilterChange = (nextFilter: HealthFilter) => {
    setFilter(nextFilter);

    if (nextFilter === 'All' || !selectedDrone) return;

    if (selectedDrone.health !== nextFilter) {
      const firstMatching = sortedDrone.find(
        (aircraft) => aircraft.health === nextFilter,
      );

      if (firstMatching) setSelectedDroneId(firstMatching.id);
    }
  };

  const openIncident = () => {
    if (!selectedDrone?.alertId) return;

    navigate(
      `/operator/operations/incidents?create=1&alertId=${selectedDrone.alertId}`,
    );
  };

  if (isLoading) {
    return (
      <OperationPageShell active="/operator/operations/live">
        <OperatorPanel><div className="operator-empty-state">Loading live aircraft…</div></OperatorPanel>
      </OperationPageShell>
    );
  }

  if (error) {
    return (
      <OperationPageShell active="/operator/operations/live">
        <OperatorPanel><div className="operator-empty-state">{error instanceof Error ? error.message : 'Unable to load live tracking.'}</div></OperatorPanel>
      </OperationPageShell>
    );
  }

  if (!selectedDrone) {
    return (
      <OperationPageShell active="/operator/operations/live">
        <OperatorPanel><div className="operator-empty-state">No drones are currently in flight.</div></OperatorPanel>
      </OperationPageShell>
    );
  }

  return (
    <OperationPageShell active="/operator/operations/live">
      <div className="live-ops-layout">
        <div className="live-ops-main">
          <OperatorPanel className="live-map-panel live-ops-map-panel">
            <div className="map-toolbar">
              <div>
                <StatusBadge tone="success">
                  {liveDrone.length} ACTIVE
                </StatusBadge>
                <span>Updated just now</span>
              </div>

              <div>
                <button type="button" aria-label="Zoom in"><Icon name="plus" /></button>
                <button type="button" aria-label="Zoom out">−</button>
                <button type="button" aria-label="Center map"><Icon name="pin" /></button>
              </div>
            </div>

            <div className="live-map live-ops-map">
              <div className="map-grid" />
              <div className="map-ring live-ops-ring ring-a" />
              <div className="map-ring live-ops-ring ring-b" />
              <span className="map-zone zone-live-a">CONTROL A</span>
              <span className="map-zone zone-live-b">CONTROL B</span>
              <div className="live-track live-track-1" />
              <div className="live-track live-track-2" />
              <div className="live-track live-track-3" />
              <div className="live-track live-track-4" />
              <div className="live-track live-track-5" />

              {liveDrone.map((aircraft) => {
                const healthClass = aircraft.health.toLowerCase();
                const isSelected = aircraft.id === selectedDrone.id;

                return (
                  <button
                    type="button"
                    className={`live-aircraft-marker ${aircraft.mapPosition} health-${healthClass} ${isSelected ? 'selected' : ''}`}
                    key={aircraft.id}
                    onClick={() => setSelectedDroneId(aircraft.id)}
                    aria-label={`Select ${aircraft.id}`}
                  >
                    <Icon name="drone" size={17} />
                    <b>{aircraft.id}</b>
                  </button>
                );
              })}

              <div className="map-legend live-ops-legend">
                <span><i className="green" />Normal</span>
                <span><i className="orange" />Attention</span>
                <span><i className="red" />Critical</span>
              </div>
            </div>
          </OperatorPanel>

          <OperatorPanel className="live-selection-panel">
            <div className="live-selection-head">
              <div className="live-selection-id">
                <span className={`live-selection-icon health-${selectedDrone.health.toLowerCase()}`}>
                  <Icon name="drone" size={19} />
                </span>

                <div>
                  <div className="live-selection-title">
                    <strong>{selectedDrone.id}</strong>
                    <StatusBadge tone={healthTone[selectedDrone.health]}>{selectedDrone.health}</StatusBadge>
                  </div>
                  <small>Delivery {selectedDrone.orderId} · {selectedDrone.route}</small>
                </div>
              </div>

              <div className="live-selection-metrics">
                <span><Icon name="battery" size={16} /><strong>{formatBattery(selectedDrone)}</strong><small>Battery</small></span>
                <span><Icon name="radar" size={16} /><strong>{selectedDrone.signal !== undefined ? `${selectedDrone.signal}%` : '—'}</strong><small>Signal</small></span>
                <span><Icon name="pin" size={16} /><strong>{selectedDrone.altitudeM !== undefined ? `${selectedDrone.altitudeM} m` : '—'}</strong><small>Altitude</small></span>
                <span><Icon name="speed" size={16} /><strong>{selectedDrone.speedKmh !== undefined ? `${selectedDrone.speedKmh} km/h` : '—'}</strong><small>Speed</small></span>
              </div>
            </div>

            <div className={`live-ai-assessment health-${selectedDrone.health.toLowerCase()}`}>
              <div>
                <strong>AI assessment</strong>
                <p>{selectedDrone.aiAssessment}</p>
                {selectedDrone.incidentReason && <small>{selectedDrone.incidentReason}</small>}
              </div>

              <div className="live-ai-actions">
                <ActionButton
                  variant="secondary"
                  onClick={() => navigate(`/operator/operations/telemetry?aircraft=${selectedDrone.id}&missionId=${selectedDrone.missionId}`)}
                >
                  View telemetry
                </ActionButton>

                {selectedDrone.incidentPolicy === 'recommended' ? (
                  <ActionButton onClick={openIncident}>Create incident</ActionButton>
                ) : selectedDrone.health === 'Normal' ? (
                  <span className="live-incident-state">No active anomaly</span>
                ) : (
                  <span className="live-incident-state">Continue monitoring</span>
                )}
              </div>
            </div>
          </OperatorPanel>
        </div>

        <aside className="flight-rail live-aircraft-rail">
          <div className="rail-head live-aircraft-head">
            <strong>Live aircraft</strong>
            <button type="button" aria-label="Filter aircraft"><Icon name="filter" /></button>
          </div>

          <div className="live-health-filters" role="group" aria-label="Drone health filter">
            {FILTERS.map((item) => (
              <button
                type="button"
                key={item}
                className={filter === item ? 'active' : ''}
                onClick={() => handleFilterChange(item)}
              >
                {item !== 'All' && <i className={`health-dot health-${item.toLowerCase()}`} />}
                {item} ({filterCount(item)})
              </button>
            ))}
          </div>

          <div className="live-aircraft-list">
            {filteredDrone.map((aircraft) => {
              const isSelected = selectedDrone.id === aircraft.id;
              const healthClass = aircraft.health.toLowerCase();

              return (
                <button
                  type="button"
                  key={aircraft.id}
                  className={`live-aircraft-card health-${healthClass} ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedDroneId(aircraft.id)}
                >
                  <span className="live-aircraft-card-icon"><Icon name="drone" size={18} /></span>
                  <span className="live-aircraft-card-main">
                    <span className="live-aircraft-card-title">
                      <strong>{aircraft.id}</strong>
                      <StatusBadge tone={healthTone[aircraft.health]}>{aircraft.health}</StatusBadge>
                    </span>
                    <small>Delivery {aircraft.orderId}</small>
                    <small>{aircraft.route}</small>
                    <em className="live-aircraft-state">
                      {aircraft.anomaly ? `${aircraft.anomaly}${aircraft.anomalyDuration ? ` · ${aircraft.anomalyDuration}` : ''}` : 'Operating normally'}
                    </em>
                  </span>
                  <span className="live-aircraft-card-metrics">
                    <span><Icon name="battery" size={14} />{formatBattery(aircraft)}</span>
                    <span><Icon name="radar" size={14} />{aircraft.signal !== undefined ? `${aircraft.signal}%` : '—'}</span>
                    <Icon name="chevron" size={15} />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="live-aircraft-footer">
            <span>Showing {filteredDrone.length} of {liveDrone.length} aircraft</span>
          </div>
        </aside>
      </div>
    </OperationPageShell>
  );
}
