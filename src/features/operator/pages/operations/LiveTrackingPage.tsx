import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ActionButton } from '../../../../components/ui/ActionButton';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';

import { OperatorPanel } from '../../components/OperatorPanel';
import {
  healthPriority,
  healthTone,
  liveAircraft,
  type LiveDroneHealth,
} from '../../data/liveOperationsMockData';

import { OperationPageShell } from './OperationPageShell';
import './operations-enhanced.css';

type HealthFilter = 'All' | LiveDroneHealth;

const FILTERS: HealthFilter[] = ['All', 'Critical', 'Attention', 'Normal'];

export function LiveTrackingPage() {
  const navigate = useNavigate();

  const [filter, setFilter] = useState<HealthFilter>('All');
  const [selectedAircraftId, setSelectedAircraftId] = useState('AX-17');

  const sortedAircraft = useMemo(
    () =>
      [...liveAircraft].sort((a, b) => {
        const healthDiff = healthPriority[a.health] - healthPriority[b.health];
        if (healthDiff !== 0) return healthDiff;
        return a.id.localeCompare(b.id);
      }),
    [],
  );

  const filteredAircraft = useMemo(
    () =>
      filter === 'All'
        ? sortedAircraft
        : sortedAircraft.filter((aircraft) => aircraft.health === filter),
    [filter, sortedAircraft],
  );

  const selectedAircraft =
    liveAircraft.find((aircraft) => aircraft.id === selectedAircraftId) ??
    liveAircraft[0];

  const filterCount = (value: HealthFilter) =>
    value === 'All'
      ? liveAircraft.length
      : liveAircraft.filter((aircraft) => aircraft.health === value).length;

  const handleFilterChange = (nextFilter: HealthFilter) => {
    setFilter(nextFilter);

    if (nextFilter === 'All') return;

    if (selectedAircraft.health !== nextFilter) {
      const firstMatching = sortedAircraft.find(
        (aircraft) => aircraft.health === nextFilter,
      );

      if (firstMatching) setSelectedAircraftId(firstMatching.id);
    }
  };

  const openIncident = () => {
    if (!selectedAircraft.alertId) return;

    navigate(
      `/operator/operations/incidents?create=1&alertId=${selectedAircraft.alertId}`,
    );
  };

  return (
    <OperationPageShell active="/operator/operations/live">
      <div className="live-ops-layout">
        <div className="live-ops-main">
          <OperatorPanel className="live-map-panel live-ops-map-panel">
            <div className="map-toolbar">
              <div>
                <StatusBadge tone="success">
                  {liveAircraft.length} ACTIVE
                </StatusBadge>
                <span>Updated just now</span>
              </div>

              <div>
                <button type="button" aria-label="Zoom in">
                  <Icon name="plus" />
                </button>
                <button type="button" aria-label="Zoom out">
                  −
                </button>
                <button type="button" aria-label="Center map">
                  <Icon name="pin" />
                </button>
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

              {liveAircraft.map((aircraft) => {
                const healthClass = aircraft.health.toLowerCase();
                const isSelected = aircraft.id === selectedAircraft.id;

                return (
                  <button
                    type="button"
                    className={`live-aircraft-marker ${aircraft.mapPosition} health-${healthClass} ${
                      isSelected ? 'selected' : ''
                    }`}
                    key={aircraft.id}
                    onClick={() => setSelectedAircraftId(aircraft.id)}
                    aria-label={`Select ${aircraft.id}`}
                  >
                    <Icon name="drone" size={17} />
                    <b>{aircraft.id}</b>
                  </button>
                );
              })}

              <div className="map-legend live-ops-legend">
                <span>
                  <i className="green" />
                  Normal
                </span>
                <span>
                  <i className="orange" />
                  Attention
                </span>
                <span>
                  <i className="red" />
                  Critical
                </span>
              </div>
            </div>
          </OperatorPanel>

          <OperatorPanel className="live-selection-panel">
            <div className="live-selection-head">
              <div className="live-selection-id">
                <span
                  className={`live-selection-icon health-${selectedAircraft.health.toLowerCase()}`}
                >
                  <Icon name="drone" size={19} />
                </span>

                <div>
                  <div className="live-selection-title">
                    <strong>{selectedAircraft.id}</strong>
                    <StatusBadge tone={healthTone[selectedAircraft.health]}>
                      {selectedAircraft.health}
                    </StatusBadge>
                  </div>
                  <small>
                    Delivery {selectedAircraft.orderId} · {selectedAircraft.route}
                  </small>
                </div>
              </div>

              <div className="live-selection-metrics">
                <span>
                  <Icon name="battery" size={16} />
                  <strong>{selectedAircraft.battery}%</strong>
                  <small>Battery</small>
                </span>
                <span>
                  <Icon name="radar" size={16} />
                  <strong>{selectedAircraft.signal}%</strong>
                  <small>Signal</small>
                </span>
                <span>
                  <Icon name="pin" size={16} />
                  <strong>{selectedAircraft.altitudeM} m</strong>
                  <small>Altitude</small>
                </span>
                <span>
                  <Icon name="speed" size={16} />
                  <strong>{selectedAircraft.speedKmh} km/h</strong>
                  <small>Speed</small>
                </span>
              </div>
            </div>

            <div
              className={`live-ai-assessment health-${selectedAircraft.health.toLowerCase()}`}
            >
              <div>
                <strong>AI assessment</strong>
                <p>{selectedAircraft.aiAssessment}</p>

                {selectedAircraft.incidentReason && (
                  <small>{selectedAircraft.incidentReason}</small>
                )}
              </div>

              <div className="live-ai-actions">
                <ActionButton
                  variant="secondary"
                  onClick={() =>
                    navigate(
                      `/operator/operations/telemetry?aircraft=${selectedAircraft.id}`,
                    )
                  }
                >
                  View telemetry
                </ActionButton>

                {selectedAircraft.incidentPolicy === 'recommended' ? (
                  <ActionButton onClick={openIncident}>Create incident</ActionButton>
                ) : selectedAircraft.health === 'Normal' ? (
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
            <button type="button" aria-label="Filter aircraft">
              <Icon name="filter" />
            </button>
          </div>

          <div className="live-health-filters" role="group" aria-label="Aircraft health filter">
            {FILTERS.map((item) => (
              <button
                type="button"
                key={item}
                className={filter === item ? 'active' : ''}
                onClick={() => handleFilterChange(item)}
              >
                {item !== 'All' && (
                  <i className={`health-dot health-${item.toLowerCase()}`} />
                )}
                {item} ({filterCount(item)})
              </button>
            ))}
          </div>

          <div className="live-aircraft-list">
            {filteredAircraft.map((aircraft) => {
              const isSelected = selectedAircraft.id === aircraft.id;
              const healthClass = aircraft.health.toLowerCase();

              return (
                <button
                  type="button"
                  key={aircraft.id}
                  className={`live-aircraft-card health-${healthClass} ${
                    isSelected ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedAircraftId(aircraft.id)}
                >
                  <span className="live-aircraft-card-icon">
                    <Icon name="drone" size={18} />
                  </span>

                  <span className="live-aircraft-card-main">
                    <span className="live-aircraft-card-title">
                      <strong>{aircraft.id}</strong>
                      <StatusBadge tone={healthTone[aircraft.health]}>
                        {aircraft.health}
                      </StatusBadge>
                    </span>

                    <small>Delivery {aircraft.orderId}</small>
                    <small>{aircraft.route}</small>

                    <em className="live-aircraft-state">
                      {aircraft.anomaly ? (
                        <>
                          {aircraft.anomaly}
                          {aircraft.anomalyDuration
                            ? ` · ${aircraft.anomalyDuration}`
                            : ''}
                        </>
                      ) : (
                        'Operating normally'
                      )}
                    </em>
                  </span>

                  <span className="live-aircraft-card-metrics">
                    <span>
                      <Icon name="battery" size={14} />
                      {aircraft.battery}%
                    </span>
                    <span>
                      <Icon name="radar" size={14} />
                      {aircraft.signal}%
                    </span>
                    <Icon name="chevron" size={15} />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="live-aircraft-footer">
            <span>
              Showing {filteredAircraft.length} of {liveAircraft.length} aircraft
            </span>
          </div>
        </aside>
      </div>
    </OperationPageShell>
  );
}
