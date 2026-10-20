import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { OperatorPanel } from '../../components/OperatorPanel';
import { useLiveTrackingQuery, useMissionTelemetryQuery } from '../../hooks/useMissionQueries';
import { OperationPageShell } from './OperationPageShell';

export function TelemetryPage() {
  const [searchParams] = useSearchParams();
  const aircraftId = searchParams.get('aircraft') ?? '';
  const explicitMissionId = searchParams.get('missionId') ?? '';
  const { data: liveTrackingData } = useLiveTrackingQuery();
  const liveDrones = liveTrackingData ?? [];

  const missionId = useMemo(
    () => explicitMissionId || liveDrones.find((item) => item.id === aircraftId)?.missionId || '',
    [aircraftId, explicitMissionId, liveDrones],
  );

  const {
    data: telemetryData,
    isLoading: telemetryLoading,
    error: telemetryError,
  } = useMissionTelemetryQuery(missionId);

  return (
    <OperationPageShell active="/operator/operations/telemetry">
      {!missionId ? (
        <OperatorPanel title="Mission telemetry" eyebrow="">
          <div className="operator-empty-state">
            Select an active aircraft from Live Tracking or open this page with a missionId.
          </div>
        </OperatorPanel>
      ) : (
        <OperatorPanel title={`Mission telemetry · ${missionId}`} eyebrow="">
          {telemetryLoading ? (
            <div className="operator-empty-state">Loading telemetry…</div>
          ) : telemetryError ? (
            <div className="operator-empty-state">
              {telemetryError instanceof Error ? telemetryError.message : 'Unable to load telemetry.'}
            </div>
          ) : telemetryData?.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Recorded</th>
                    <th>Position</th>
                    <th>Altitude</th>
                    <th>Speed</th>
                    <th>Battery</th>
                    <th>Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {telemetryData.slice().reverse().map((point) => (
                    <tr key={point.id}>
                      <td>{point.recordedAt ? new Date(point.recordedAt).toLocaleString() : '—'}</td>
                      <td>
                        {point.latitude != null && point.longitude != null
                          ? `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`
                          : '—'}
                      </td>
                      <td>{point.altitudeM != null ? `${point.altitudeM} m` : '—'}</td>
                      <td>{point.speedKmh != null ? `${point.speedKmh} km/h` : '—'}</td>
                      <td>
                        {point.batteryPct != null
                          ? `${point.batteryPct}%`
                          : point.batteryVoltage != null
                            ? `${point.batteryVoltage} V`
                            : '—'}
                      </td>
                      <td>{point.signalPct != null ? `${point.signalPct}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="operator-empty-state">No telemetry points have been collected for this Mission yet.</div>
          )}
        </OperatorPanel>
      )}
    </OperationPageShell>
  );
}
