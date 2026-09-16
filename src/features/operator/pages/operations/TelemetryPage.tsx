import { useState } from 'react';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { OperatorPanel } from '../../components/OperatorPanel';
import { missions } from '../../data/mockOperatorData';
import { OperationPageShell } from './OperationPageShell';

export function TelemetryPage() {
  const [uploadState, setUploadState] = useState<'idle' | 'validating' | 'validated'>('idle');
  const [fileName, setFileName] = useState('');
  const [showReviewOnly, setShowReviewOnly] = useState(false);
  const validateLog = (file?: File) => {
    if (!file || uploadState === 'validating') return;
    setFileName(file.name);
    setUploadState('validating');
    window.setTimeout(() => setUploadState('validated'), 900);
  };

  return <OperationPageShell active="/operator/operations/telemetry"><div className="telemetry-top">
    <OperatorPanel title="Upload flight logs" eyebrow="DATA INGESTION"><label className={`upload-zone ${uploadState === 'validated' ? 'uploaded' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); validateLog(event.dataTransfer.files[0]); }} aria-busy={uploadState === 'validating'}><input className="visually-hidden" type="file" accept=".csv,.json,.bin" onChange={(event) => validateLog(event.target.files?.[0])}/><span><Icon name={uploadState === 'validated' ? 'check' : uploadState === 'validating' ? 'clock' : 'upload'} size={24}/></span><strong>{uploadState === 'validated' ? `${fileName} ready` : uploadState === 'validating' ? `Validating ${fileName}…` : 'Drop flight logs here or browse'}</strong><small>{uploadState === 'validated' ? 'Schema and checksum passed' : uploadState === 'validating' ? 'Checking timestamps, gaps, and sensor bounds' : 'CSV, JSON, BIN · up to 500 MB'}</small></label></OperatorPanel>
    <OperatorPanel title="Validation status" eyebrow="LAST 24 HOURS"><div className="validation-score"><div className="radial-small"><strong>98.6%</strong></div><div><strong>Data quality</strong><span><i className="green"/>128 valid logs</span><span><i className="orange"/>2 need review</span><span><i className="red"/>0 rejected</span></div></div><div className="validation-issue"><Icon name="alert" size={15}/><span><strong>FLT-9180 · channel 04 gap</strong><small>1.8 seconds missing near waypoint R-12/N07</small></span><button type="button" onClick={() => setShowReviewOnly(true)}>Review</button></div></OperatorPanel>
  </div><OperatorPanel title="Recent flight logs" action={<ActionButton variant="secondary" onClick={() => setShowReviewOnly((value) => !value)}>{showReviewOnly ? 'Show all' : 'Needs review'}</ActionButton>}><div className="table-wrap"><table><thead><tr><th>Flight</th><th>Aircraft</th><th>Duration</th><th>Data points</th><th>Validation</th><th>Uploaded</th><th/></tr></thead><tbody>{missions.slice(0,4).map((mission,index) => ({mission,index})).filter(({index}) => !showReviewOnly || index === 2).map(({mission,index})=><tr key={mission.id}><td><strong>FLT-{9182-index}</strong><small>{mission.id}</small></td><td>{mission.drone}</td><td>{28+index*7}m {12+index*3}s</td><td>{(48-index*3).toFixed(1)}k</td><td><StatusBadge tone={index===2?'warning':'success'}>{index===2?'Review':'Validated'}</StatusBadge></td><td>{index*12+6} min ago</td><td><button className="table-action" aria-label={`View ${mission.id} telemetry`}><Icon name="eye"/></button></td></tr>)}</tbody></table></div></OperatorPanel></OperationPageShell>;
}
