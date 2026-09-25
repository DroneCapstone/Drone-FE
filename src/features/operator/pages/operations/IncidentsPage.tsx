import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ActionButton } from '../../../../components/ui/ActionButton';
import { DropdownSelect } from '../../../../components/ui/DropdownSelect';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';

import { OperatorPanel } from '../../components/OperatorPanel';
import {
  healthTone,
  liveAircraft,
  type LiveAircraft,
} from '../../data/liveOperationsMockData';

import { OperationPageShell } from './OperationPageShell';
import './operations-enhanced.css';

type IncidentMode = 'list' | 'create' | 'detail';

type IncidentRow = {
  id: string;
  title: string;
  aircraft: string;
  missionId: string;
  severity: 'Critical' | 'Major' | 'Minor';
  tone: 'danger' | 'warning' | 'info';
  age: string;
  state: string;
};

const initialIncidentRows: IncidentRow[] = [
  {
    id: 'INC-041',
    title: 'Motor temperature exceeded safe threshold',
    aircraft: 'AX-12',
    missionId: 'MSN-3088',
    severity: 'Critical',
    tone: 'danger',
    age: '8 min ago',
    state: 'Technician review',
  },
  {
    id: 'INC-039',
    title: 'Persistent flight-control deviation',
    aircraft: 'NX-06',
    missionId: 'MSN-3079',
    severity: 'Major',
    tone: 'warning',
    age: '24 min ago',
    state: 'Monitoring',
  },
  {
    id: 'INC-037',
    title: 'Battery discharge outside expected range',
    aircraft: 'AX-03',
    missionId: 'MSN-3068',
    severity: 'Major',
    tone: 'warning',
    age: '1 h ago',
    state: 'Technician review',
  },
];

const incidentCandidates = liveAircraft.filter(
  (aircraft) => aircraft.incidentPolicy === 'recommended',
);

const candidateLabel = (aircraft: LiveAircraft) =>
  `${aircraft.id} · ${aircraft.missionId}`;

const buildIncidentTitle = (aircraft: LiveAircraft) =>
  aircraft.anomaly ?? 'Technical anomaly detected';

const buildIncidentDescription = (aircraft: LiveAircraft) => {
  const detected = aircraft.detectedAt ? ` at ${aircraft.detectedAt}` : '';
  const duration = aircraft.anomalyDuration
    ? ` The condition has persisted for ${aircraft.anomalyDuration}.`
    : '';

  return `During mission ${aircraft.missionId}, ${aircraft.id} reported ${(
    aircraft.anomaly ?? 'an abnormal telemetry condition'
  ).toLowerCase()}${detected}.${duration} ${aircraft.aiAssessment} ${
    aircraft.incidentReason ?? ''
  }`.replace(/\s+/g, ' ').trim();
};

export function IncidentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedAlertId = searchParams.get('alertId');
  const requestedCandidate = incidentCandidates.find(
    (aircraft) => aircraft.alertId === requestedAlertId,
  );

  const [mode, setMode] = useState<IncidentMode>(
    searchParams.get('create') === '1' && requestedCandidate ? 'create' : 'list',
  );
  const [rows, setRows] = useState<IncidentRow[]>(initialIncidentRows);
  const [query, setQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All severity');
  const [selectedCandidateId, setSelectedCandidateId] = useState(
    requestedCandidate?.id ?? incidentCandidates[0]?.id ?? '',
  );

  const selectedCandidate =
    incidentCandidates.find((aircraft) => aircraft.id === selectedCandidateId) ??
    incidentCandidates[0];

  const [incidentTitle, setIncidentTitle] = useState(
    selectedCandidate ? buildIncidentTitle(selectedCandidate) : '',
  );
  const [description, setDescription] = useState(
    selectedCandidate ? buildIncidentDescription(selectedCandidate) : '',
  );

  const selectedSeverity =
    selectedCandidate?.health === 'Critical' ? 'Critical' : 'Major';

  useEffect(() => {
    if (!selectedCandidate) return;

    setIncidentTitle(buildIncidentTitle(selectedCandidate));
    setDescription(buildIncidentDescription(selectedCandidate));
  }, [selectedCandidate]);

  const visibleRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesQuery = `${row.id} ${row.title} ${row.aircraft} ${row.missionId}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesSeverity =
          severityFilter === 'All severity' || row.severity === severityFilter;

        return matchesQuery && matchesSeverity;
      }),
    [query, rows, severityFilter],
  );

  const openCreate = (candidateId?: string) => {
    const candidate = candidateId
      ? incidentCandidates.find((aircraft) => aircraft.id === candidateId)
      : incidentCandidates[0];

    if (!candidate) return;

    setSelectedCandidateId(candidate.id);
    setMode('create');
    setSearchParams({ create: '1', alertId: candidate.alertId ?? '' });
  };

  const closeCreate = () => {
    setMode('list');
    setSearchParams({});
  };

  const handleCandidateChange = (value: string) => {
    const candidate = incidentCandidates.find(
      (aircraft) => candidateLabel(aircraft) === value,
    );

    if (!candidate) return;

    setSelectedCandidateId(candidate.id);
    setSearchParams({ create: '1', alertId: candidate.alertId ?? '' });
  };

  const regenerateDescription = () => {
    if (!selectedCandidate) return;
    setDescription(buildIncidentDescription(selectedCandidate));
  };

  const logIncident = () => {
    if (!selectedCandidate || !incidentTitle.trim() || !description.trim()) return;

    const nextIncident: IncidentRow = {
      id: `INC-${String(42 + rows.length).padStart(3, '0')}`,
      title: incidentTitle.trim(),
      aircraft: selectedCandidate.id,
      missionId: selectedCandidate.missionId,
      severity: selectedSeverity,
      tone: selectedSeverity === 'Critical' ? 'danger' : 'warning',
      age: 'Just now',
      state: 'Technician review',
    };

    setRows((current) => [nextIncident, ...current]);
    closeCreate();
  };

  return (
    <OperationPageShell active="/operator/operations/incidents">
      {mode === 'list' && (
        <>
          <div className="incident-summary">
            <span>
              <strong>{rows.length}</strong>
              <small>Open incidents</small>
            </span>
            <span>
              <strong>{rows.filter((row) => row.severity === 'Critical').length}</strong>
              <small>High priority</small>
            </span>
            <span>
              <strong>{incidentCandidates.length}</strong>
              <small>Eligible alerts</small>
            </span>
            <ActionButton onClick={() => openCreate()}>Create incident</ActionButton>
          </div>

          <OperatorPanel className="flush-panel">
            <div className="toolbar">
              <div className="filter-search">
                <Icon name="search" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search incidents…"
                />
              </div>

              <DropdownSelect
                value={severityFilter}
                options={['All severity', 'Critical', 'Major', 'Minor']}
                onChange={setSeverityFilter}
                ariaLabel="Incident severity"
              />
            </div>

            <div className="incident-list">
              {visibleRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setMode('detail')}
                >
                  <span
                    className={`severity-mark ${
                      row.severity === 'Critical'
                        ? 's-1'
                        : row.severity === 'Minor'
                          ? 's-3'
                          : ''
                    }`}
                  />

                  <span>
                    <strong>
                      {row.id} · {row.title}
                    </strong>
                    <small>
                      {row.aircraft} · {row.missionId} · {row.age} · {row.state}
                    </small>
                  </span>

                  <StatusBadge tone={row.tone}>{row.severity}</StatusBadge>
                  <Icon name="chevron" />
                </button>
              ))}
            </div>
          </OperatorPanel>
        </>
      )}

      {mode === 'create' && selectedCandidate && (
        <div className="incident-create-stack">
          <OperatorPanel className="incident-source-panel">
            <div className="incident-source-grid">
              <div>
                <small>Aircraft</small>
                <strong>{selectedCandidate.id}</strong>
                <span>{selectedCandidate.route}</span>
              </div>
              <div>
                <small>Mission</small>
                <strong>{selectedCandidate.missionId}</strong>
                <span>Delivery {selectedCandidate.orderId}</span>
              </div>
              <div>
                <small>Detected anomaly</small>
                <strong>{selectedCandidate.anomaly}</strong>
                <span>{selectedCandidate.anomalyDuration}</span>
              </div>
              <div>
                <small>AI assessment</small>
                <strong>{selectedSeverity}</strong>
                <span>Technician inspection recommended</span>
              </div>
            </div>
          </OperatorPanel>

          <OperatorPanel
            title="Create technical incident"
            action={
              <button className="text-button" onClick={closeCreate}>
                Back to list
              </button>
            }
          >
            <div className="incident-form-note">
              Temporary anomalies are monitored automatically. Only alerts that meet
              technician-escalation criteria appear in this form.
            </div>

            <div className="fields two incident-create-fields">
              <label>
                <span>Related flight</span>
                <DropdownSelect
                  className="w-full min-w-0"
                  value={candidateLabel(selectedCandidate)}
                  options={incidentCandidates.map(candidateLabel)}
                  onChange={handleCandidateChange}
                  ariaLabel="Related flight"
                />
              </label>

              <label>
                <span>Severity</span>
                <div className="incident-readonly-field">
                  <StatusBadge tone={healthTone[selectedCandidate.health]}>
                    {selectedSeverity}
                  </StatusBadge>
                  <small>AI-assessed from telemetry and flight context</small>
                </div>
              </label>

              <label>
                <span>Incident title</span>
                <input
                  value={incidentTitle}
                  onChange={(event) => setIncidentTitle(event.target.value)}
                  placeholder="Incident title"
                />
              </label>

              <label>
                <span>Detected at</span>
                <input
                  value={selectedCandidate.detectedAt ?? 'Just now'}
                  readOnly
                />
              </label>

              <label className="wide incident-description-field">
                <span className="incident-description-label">
                  <span>Description</span>
                  <span className="incident-ai-draft">AI draft · editable</span>
                  <button type="button" onClick={regenerateDescription}>
                    <Icon name="refresh" size={14} />
                    Regenerate
                  </button>
                </span>

                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={2000}
                  rows={6}
                />

                <small className="incident-description-help">
                  You can edit the AI-generated description before logging the incident.
                  <span>{description.length}/2000</span>
                </small>
              </label>
            </div>

            <div className="form-actions">
              <ActionButton variant="ghost" onClick={closeCreate}>
                Cancel
              </ActionButton>
              <ActionButton onClick={logIncident}>Log incident</ActionButton>
            </div>
          </OperatorPanel>
        </div>
      )}

      {mode === 'detail' && (
        <div className="detail-layout">
          <OperatorPanel className="detail-main">
            <button className="text-button" onClick={() => setMode('list')}>
              ← Back to incidents
            </button>

            <div className="incident-detail-title">
              <div>
                <StatusBadge tone="danger">Critical</StatusBadge>
                <h2>Motor temperature exceeded safe threshold</h2>
                <p>INC-041 · AX-12 · Reported 8 minutes ago</p>
              </div>
              <ActionButton variant="secondary">Resolve incident</ActionButton>
            </div>

            <div className="incident-timeline">
              <span>
                <i />
                <div>
                  <strong>Anomaly detected</strong>
                  <small>14:21:08 · Automatic telemetry trigger</small>
                  <p>
                    Motor temperature exceeded the configured safe operating threshold.
                  </p>
                </div>
              </span>
              <span>
                <i />
                <div>
                  <strong>Operator reviewed AI assessment</strong>
                  <small>14:22:31</small>
                  <p>Technical inspection was recommended after landing.</p>
                </div>
              </span>
              <span className="current">
                <i />
                <div>
                  <strong>Technician review</strong>
                  <small>In progress</small>
                </div>
              </span>
            </div>
          </OperatorPanel>

          <OperatorPanel className="detail-side" title="Event context">
            <dl className="key-values">
              <div>
                <dt>Flight</dt>
                <dd>MSN-3088</dd>
              </div>
              <div>
                <dt>Aircraft</dt>
                <dd>AX-12</dd>
              </div>
              <div>
                <dt>Severity</dt>
                <dd>Critical</dd>
              </div>
              <div>
                <dt>Escalation</dt>
                <dd>Technician review</dd>
              </div>
            </dl>
          </OperatorPanel>
        </div>
      )}
    </OperationPageShell>
  );
}
