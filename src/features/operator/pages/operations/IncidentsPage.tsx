import { useState } from 'react';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { DropdownSelect } from '../../../../components/ui/DropdownSelect';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { OperatorPanel } from '../../components/OperatorPanel';
import { missions } from '../../data/mockOperatorData';
import { OperationPageShell } from './OperationPageShell';

type IncidentMode = 'list' | 'create' | 'detail';
const incidentRows = [
  { label: 'INC-041 · Telemetry link degradation', severity: 'Major', tone: 'warning' as const },
  { label: 'INC-039 · Unplanned route deviation', severity: 'Critical', tone: 'danger' as const },
  { label: 'INC-037 · Payload sensor warning', severity: 'Major', tone: 'warning' as const },
  { label: 'INC-034 · Elevated motor temperature', severity: 'Minor', tone: 'info' as const },
];

export function IncidentsPage() {
  const [mode, setMode] = useState<IncidentMode>('list');
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState('All severity');
  const visibleRows = incidentRows.filter((row) => row.label.toLowerCase().includes(query.toLowerCase()) && (severity === 'All severity' || row.severity === severity));

  return <OperationPageShell active="/operator/operations/incidents">
    {mode === 'list' && <><div className="incident-summary"><span><strong>7</strong><small>Open incidents</small></span><span><strong>2</strong><small>High priority</small></span><span><strong>11m</strong><small>Avg. response</small></span><ActionButton onClick={() => setMode('create')}>Create incident</ActionButton></div><OperatorPanel className="flush-panel"><div className="toolbar"><div className="filter-search"><Icon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search incidents…"/></div><DropdownSelect value={severity} options={['All severity','Critical','Major','Minor']} onChange={setSeverity} ariaLabel="Incident severity"/></div><div className="incident-list">{visibleRows.map((row) => { const index = incidentRows.indexOf(row); return <button key={row.label} onClick={() => setMode('detail')}><span className={`severity-mark s-${index}`}/><span><strong>{row.label}</strong><small>{missions[index].drone} · {index*14+3} min ago · {index===0?'Investigating':'Monitoring'}</small></span><StatusBadge tone={row.tone}>{row.severity}</StatusBadge><Icon name="chevron"/></button>; })}</div></OperatorPanel></>}
    {mode === 'create' && <OperatorPanel title="Create incident" action={<button className="text-button" onClick={() => setMode('list')}>Back to list</button>}><div className="fields two"><label><span>Incident title</span><input placeholder="Briefly describe the event"/></label><label><span>Related flight</span><select><option>AX-17 · MSN-2841</option><option>NX-08 · MSN-2839</option></select></label><label><span>Severity</span><select><option>Major</option><option>Critical</option><option>Minor</option></select></label><label><span>Event time</span><input type="datetime-local"/></label><label className="wide"><span>Description</span><textarea placeholder="What happened, and what has been done so far?"/></label></div><div className="form-actions"><ActionButton variant="ghost" onClick={() => setMode('list')}>Cancel</ActionButton><ActionButton onClick={() => setMode('list')}>Log incident</ActionButton></div></OperatorPanel>}
    {mode === 'detail' && <div className="detail-layout"><OperatorPanel className="detail-main"><button className="text-button" onClick={() => setMode('list')}>← Back to incidents</button><div className="incident-detail-title"><div><StatusBadge tone="danger">Critical</StatusBadge><h2>Unplanned route deviation</h2><p>INC-039 · NX-08 · Reported 17 minutes ago</p></div><ActionButton variant="secondary">Resolve incident</ActionButton></div><div className="incident-timeline"><span><i/><div><strong>Deviation detected</strong><small>14:21:08 · Automatic telemetry trigger</small><p>Aircraft moved 240m outside the approved corridor near waypoint N-07.</p></div></span><span><i/><div><strong>Operator acknowledged</strong><small>14:22:31 · Alex Kim</small><p>Aircraft instructed to hold current altitude and return to route.</p></div></span><span className="current"><i/><div><strong>Monitoring recovery</strong><small>In progress</small></div></span></div></OperatorPanel><OperatorPanel className="detail-side" title="Event context"><dl className="key-values"><div><dt>Flight</dt><dd>MSN-2839</dd></div><div><dt>Aircraft</dt><dd>NX-08</dd></div><div><dt>Position</dt><dd>10.8542, 106.721</dd></div><div><dt>Altitude</dt><dd>112 m AGL</dd></div><div><dt>Assigned to</dt><dd>Alex Kim</dd></div></dl></OperatorPanel></div>}
  </OperationPageShell>;
}
