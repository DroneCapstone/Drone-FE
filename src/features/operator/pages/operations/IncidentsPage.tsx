import { formatRouteName, formatBackendLabel } from '../../utils/displayEnglish';
import { useEffect, useMemo, useState } from 'react';
import { OperatorLoadingState } from '../../components/OperatorLoadingState';
import { useSearchParams } from 'react-router-dom';

import { ActionButton } from '../../../../components/ui/ActionButton';
import { DropdownSelect } from '../../../../components/ui/DropdownSelect';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';

import type { LiveTrackingDrone } from '../../api/missionApi';
import { OperatorPanel } from '../../components/OperatorPanel';
import {
  useCreateIncidentMutation,
  useIncidentQuery,
  useIncidentsQuery,
  useLiveTrackingQuery,
  useUpdateIncidentStatusMutation,
} from '../../hooks/useMissionQueries';

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

const healthTone: Record<LiveTrackingDrone['health'], 'danger' | 'warning' | 'success'> = {
  Critical: 'danger',
  Attention: 'warning',
  Normal: 'success',
};

const candidateLabel = (aircraft: LiveTrackingDrone) =>
  `${aircraft.id} · ${aircraft.missionId}`;

const buildIncidentTitle = (aircraft: LiveTrackingDrone) =>
  aircraft.anomaly ?? 'Technical anomaly detected';

const buildIncidentDescription = (aircraft: LiveTrackingDrone) => {
  const detected = aircraft.detectedAt ? ` at ${aircraft.detectedAt}` : '';
  const duration = aircraft.anomalyDuration
    ? ` The condition has persisted for ${aircraft.anomalyDuration}.`
    : '';

  return `During mission ${aircraft.missionId}, ${aircraft.id} reported ${(
    aircraft.anomaly ?? 'an abnormal telemetry condition'
  ).toLowerCase()}${detected}.${duration} ${aircraft.aiAssessment} ${aircraft.incidentReason ?? ''}`
    .replace(/\s+/g, ' ')
    .trim();
};

function incidentTone(severity: IncidentRow['severity']): IncidentRow['tone'] {
  if (severity === 'Critical') return 'danger';
  if (severity === 'Minor') return 'info';
  return 'warning';
}

function formatIncidentAge(value?: string) {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} h ago`;
}

export function IncidentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: liveTrackingData, isLoading: liveLoading } = useLiveTrackingQuery();
  const { data: incidentsData, isLoading: incidentsLoading, error: incidentsError } = useIncidentsQuery();
  const createIncidentMutation = useCreateIncidentMutation();
  const updateIncidentStatusMutation = useUpdateIncidentStatusMutation();

  const liveDrone = liveTrackingData ?? [];
  const incidentCandidates = liveDrone.filter(
    (aircraft) => aircraft.incidentPolicy === 'recommended',
  );

  const requestedAlertId = searchParams.get('alertId');
  const requestedCandidate = incidentCandidates.find(
    (aircraft) => aircraft.alertId === requestedAlertId,
  );

  const [mode, setMode] = useState<IncidentMode>('list');
  const [query, setQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All severity');
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [incidentTitle, setIncidentTitle] = useState('');
  const [description, setDescription] = useState('');
  const [actionError, setActionError] = useState('');

  const selectedCandidate =
    incidentCandidates.find((aircraft) => aircraft.id === selectedCandidateId) ??
    requestedCandidate ??
    incidentCandidates[0];

  const selectedSeverity: 'Critical' | 'Major' =
    selectedCandidate?.health === 'Critical' ? 'Critical' : 'Major';

  const { data: selectedIncident, isLoading: incidentDetailLoading } = useIncidentQuery(
    mode === 'detail' ? selectedIncidentId : '',
  );

  useEffect(() => {
    if (!requestedCandidate || searchParams.get('create') !== '1') return;
    setSelectedCandidateId(requestedCandidate.id);
    setMode('create');
  }, [requestedCandidate, searchParams]);

  useEffect(() => {
    if (!selectedCandidate) return;
    setIncidentTitle(buildIncidentTitle(selectedCandidate));
    setDescription(buildIncidentDescription(selectedCandidate));
  }, [selectedCandidate]);

  const rows: IncidentRow[] = useMemo(
    () =>
      (incidentsData ?? []).map((incident) => ({
        id: incident.id,
        title: formatBackendLabel(incident.title),
        aircraft: incident.droneId || '—',
        missionId: incident.missionId || '—',
        severity: incident.severity,
        tone: incidentTone(incident.severity),
        age: formatIncidentAge(incident.createdAt ?? incident.detectedAt),
        state: formatBackendLabel(incident.status) || 'Open',
      })),
    [incidentsData],
  );

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

    setActionError('');
    setSelectedCandidateId(candidate.id);
    setMode('create');
    setSearchParams({ create: '1', alertId: candidate.alertId ?? '' });
  };

  const closeCreate = () => {
    setActionError('');
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

  const logIncident = async () => {
    if (!selectedCandidate || !incidentTitle.trim() || !description.trim()) return;
    setActionError('');

    try {
      await createIncidentMutation.mutateAsync({
        missionId: selectedCandidate.missionId,
        droneId: selectedCandidate.id,
        severity: selectedSeverity,
        title: incidentTitle.trim(),
        description: description.trim(),
        detectedAt: selectedCandidate.detectedAt,
      });
      closeCreate();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Unable to create incident.');
    }
  };

  const openDetail = (incidentId: string) => {
    setSelectedIncidentId(incidentId);
    setMode('detail');
    setActionError('');
  };

  const listDetail = rows.find((row) => row.id === selectedIncidentId);
  const detailSeverity = selectedIncident?.severity ?? listDetail?.severity ?? 'Major';
  const detailTitle = selectedIncident?.title ?? listDetail?.title ?? 'Incident';
  const detailMissionId = selectedIncident?.missionId ?? listDetail?.missionId ?? '—';
  const detailDroneId = selectedIncident?.droneId ?? listDetail?.aircraft ?? '—';
  const detailStatus = selectedIncident?.status ?? listDetail?.state ?? 'Open';
  const detailDescription = selectedIncident?.description || 'No incident description is available.';

  const resolveIncident = async () => {
    if (!selectedIncidentId) return;
    setActionError('');
    try {
      await updateIncidentStatusMutation.mutateAsync({
        incidentId: selectedIncidentId,
        status: 'Closed',
      });
      setMode('list');
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Unable to update incident status.');
    }
  };

  return (
    <OperationPageShell active="/operator/operations/incidents">
      {mode === 'list' && (
        <>
          <div className="incident-summary">
            <span><strong>{rows.length}</strong><small>Open incidents</small></span>
            <span><strong>{rows.filter((row) => row.severity === 'Critical').length}</strong><small>High priority</small></span>
            <span><strong>{incidentCandidates.length}</strong><small>Eligible alerts</small></span>
            {/* <ActionButton disabled={liveLoading || incidentCandidates.length === 0} onClick={() => openCreate()}>
              Create incident
            </ActionButton> */}
          </div>

          <OperatorPanel className="flush-panel">
            <div className="toolbar">
              <div className="filter-search">
                <Icon name="search" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search incidents…" />
              </div>
              <DropdownSelect
                value={severityFilter}
                options={['All severity', 'Critical', 'Major', 'Minor']}
                onChange={setSeverityFilter}
                ariaLabel="Incident severity"
              />
            </div>

            {incidentsLoading ? (
              <OperatorLoadingState label="Loading incidents…" />
            ) : incidentsError ? (
              <div className="operator-empty-state">
                {incidentsError instanceof Error ? incidentsError.message : 'Unable to load incidents.'}
              </div>
            ) : visibleRows.length === 0 ? (
              <div className="operator-empty-state">No incidents found.</div>
            ) : (
              <div className="incident-list">
                {visibleRows.map((row) => (
                  <button key={row.id} type="button" onClick={() => openDetail(row.id)}>
                    <span className={`severity-mark ${row.severity === 'Critical' ? 's-1' : row.severity === 'Minor' ? 's-3' : ''}`} />
                    <span>
                      <strong>{row.id} · {row.title}</strong>
                      <small>{row.aircraft} · {row.missionId} · {row.age} · {row.state}</small>
                    </span>
                    <StatusBadge tone={row.tone}>{row.severity}</StatusBadge>
                    <Icon name="chevron" />
                  </button>
                ))}
              </div>
            )}
          </OperatorPanel>
        </>
      )}

      {mode === 'create' && selectedCandidate && (
        <div className="incident-create-stack">
          <OperatorPanel className="incident-source-panel">
            <div className="incident-source-grid">
              <div><small>Drone</small><strong>{selectedCandidate.id}</strong><span>{formatRouteName(selectedCandidate.route)}</span></div>
              <div><small>Mission</small><strong>{selectedCandidate.missionId}</strong><span>Delivery {selectedCandidate.orderId}</span></div>
              <div><small>Detected anomaly</small><strong>{selectedCandidate.anomaly ?? 'Telemetry anomaly'}</strong><span>{selectedCandidate.anomalyDuration ?? '—'}</span></div>
              <div><small>AI assessment</small><strong>{selectedSeverity}</strong><span>Technician inspection recommended</span></div>
            </div>
          </OperatorPanel>

          <OperatorPanel title="Create technical incident" action={<button className="text-button" onClick={closeCreate}>Back to list</button>}>
            <div className="incident-form-note">
              Temporary anomalies are monitored automatically. Only alerts that meet technician-escalation criteria appear in this form.
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
                  <StatusBadge tone={healthTone[selectedCandidate.health]}>{selectedSeverity}</StatusBadge>
                  <small>AI-assessed from telemetry and flight context</small>
                </div>
              </label>

              <label><span>Incident title</span><input value={incidentTitle} onChange={(event) => setIncidentTitle(event.target.value)} placeholder="Incident title" /></label>
              <label><span>Detected at</span><input value={selectedCandidate.detectedAt ?? '—'} readOnly /></label>

              <label className="wide incident-description-field">
                <span className="incident-description-label">
                  <span>Description</span>
                  <span className="incident-ai-draft">AI draft · editable</span>
                  <button type="button" onClick={regenerateDescription}><Icon name="refresh" size={14} />Regenerate</button>
                </span>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={6} />
                <small className="incident-description-help">
                  You can edit the AI-generated description before logging the incident.
                  <span>{description.length}/2000</span>
                </small>
              </label>
            </div>

            {actionError && <div className="auth-error" role="alert">{actionError}</div>}

            <div className="form-actions">
              <ActionButton variant="ghost" onClick={closeCreate}>Cancel</ActionButton>
              <ActionButton disabled={createIncidentMutation.isPending} onClick={() => void logIncident()}>
                {createIncidentMutation.isPending ? 'Logging…' : 'Log incident'}
              </ActionButton>
            </div>
          </OperatorPanel>
        </div>
      )}

      {mode === 'create' && !liveLoading && !selectedCandidate && (
        <OperatorPanel>
          <div className="operator-empty-state">No live alert currently meets the incident escalation criteria.</div>
        </OperatorPanel>
      )}

      {mode === 'detail' && (
        <div className="detail-layout">
          <OperatorPanel className="detail-main">
            <button className="text-button" onClick={() => setMode('list')}>← Back to incidents</button>

            {incidentDetailLoading ? (
              <OperatorLoadingState label="Loading incident…" />
            ) : (
              <>
                <div className="incident-detail-title">
                  <div>
                    <StatusBadge tone={incidentTone(detailSeverity)}>{detailSeverity}</StatusBadge>
                    <h2>{formatBackendLabel(detailTitle)}</h2>
                    <p>{selectedIncidentId} · {detailDroneId} · {formatIncidentAge(selectedIncident?.createdAt ?? selectedIncident?.detectedAt)}</p>
                  </div>
                  <ActionButton
                    variant="secondary"
                    disabled={updateIncidentStatusMutation.isPending || detailStatus.toUpperCase() === 'CLOSED'}
                    onClick={() => void resolveIncident()}
                  >
                    {updateIncidentStatusMutation.isPending ? 'Updating…' : detailStatus.toUpperCase() === 'CLOSED' ? 'Closed' : 'Close incident'}
                  </ActionButton>
                </div>

                {actionError && <div className="auth-error" role="alert">{actionError}</div>}

                <div className="incident-timeline">
                  <span>
                    <i />
                    <div>
                      <strong>Anomaly detected</strong>
                      <small>{selectedIncident?.detectedAt ?? 'Event recorded'}</small>
                      <p>{formatBackendLabel(detailDescription)}</p>
                    </div>
                  </span>
                  <span className="current">
                    <i />
                    <div><strong>{formatBackendLabel(detailStatus)}</strong><small>Current incident status</small></div>
                  </span>
                </div>
              </>
            )}
          </OperatorPanel>

          <OperatorPanel className="detail-side" title="Event context">
            <dl className="key-values">
              <div><dt>Flight</dt><dd>{detailMissionId}</dd></div>
              <div><dt>Drone</dt><dd>{detailDroneId}</dd></div>
              <div><dt>Severity</dt><dd>{detailSeverity}</dd></div>
              <div><dt>Status</dt><dd>{formatBackendLabel(detailStatus)}</dd></div>
            </dl>
          </OperatorPanel>
        </div>
      )}
    </OperationPageShell>
  );
}
