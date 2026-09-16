import { useState } from 'react';
import { ActionButton } from '../../../components/ui/ActionButton';
import { Icon } from '../../../components/ui/Icon';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { OperatorPanel } from '../components/OperatorPanel';
import { PageHeader } from '../components/PageHeader';

type ReportFormat = 'PDF' | 'CSV' | 'XLSX';

export function ReportsPage() {
  const [generated, setGenerated] = useState(false);
  const [format, setFormat] = useState<ReportFormat>('PDF');

  return <>
    <PageHeader section="reports"/>
    <div className="report-grid">
      <OperatorPanel title="Quick report">
        <div className="fields">
          <label><span>Report type</span><select><option>Weekly operations summary</option><option>Energy performance</option><option>Incident audit</option><option>Mission compliance</option></select></label>
          <label><span>Reporting period</span><select><option>Sep 08 — Sep 15, 2026</option><option>September 2026</option><option>Q3 2026</option></select></label>
          <label><span>File format</span><div className="format-picker">{(['PDF', 'CSV', 'XLSX'] as const).map((item) => <button type="button" className={format === item ? 'active' : ''} onClick={() => { setFormat(item); setGenerated(false); }} key={item}>{item}</button>)}</div></label>
        </div>
        <ActionButton onClick={() => setGenerated(true)}>Generate report</ActionButton>
        {generated && <div className="generated-message"><Icon name="check"/><span><strong>Report is ready</strong><small>Weekly_Operations_Sep15.{format.toLowerCase()} · 2.8 MB</small></span><ActionButton variant="secondary">Download</ActionButton></div>}
      </OperatorPanel>
      <OperatorPanel title="Scheduled reports">
        <div className="schedule-row"><span><strong>Weekly operations</strong><small>Every Monday · 08:00</small></span><StatusBadge tone="success">Active</StatusBadge></div>
        <div className="schedule-row"><span><strong>Monthly energy audit</strong><small>1st of every month · 09:00</small></span><StatusBadge tone="success">Active</StatusBadge></div>
      </OperatorPanel>
    </div>
    <OperatorPanel title="Recent reports" className="flush-panel">
      <div className="report-list">{[
        ['Weekly Operations · Sep 08–15','PDF · 2.8 MB','Today, 08:02'],
        ['Incident Audit · August 2026','PDF · 4.1 MB','Sep 01, 09:12'],
        ['Energy Performance · Q3','XLSX · 1.6 MB','Aug 30, 16:44'],
      ].map((row) => <div key={row[0]}><span><strong>{row[0]}</strong><small>{row[1]}</small></span><small>{row[2]}</small><span className="report-ready">Ready</span></div>)}</div>
    </OperatorPanel>
  </>;
}
