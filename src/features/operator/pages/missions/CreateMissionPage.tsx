import { useState } from 'react';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { OperatorPanel } from '../../components/OperatorPanel';
import { MissionPageShell } from './MissionPageShell';

export function CreateMissionPage() {
  const [toast, setToast] = useState('');
  const showToast = () => { setToast('Mission draft created successfully'); setTimeout(() => setToast(''), 2400); };
  return <MissionPageShell active="/operator/missions/create">
    <form className="form-grid" onSubmit={(event) => { event.preventDefault(); showToast(); }}>
      <OperatorPanel title="Mission brief" eyebrow="STEP 01"><div className="fields two"><label><span>Mission name</span><input required defaultValue="Harbor medical relay"/></label><label><span>Mission type</span><select><option>Priority delivery</option><option>Inspection</option><option>Recovery</option></select></label><label className="wide"><span>Operational objective</span><textarea defaultValue="Deliver temperature-controlled medical payload to Harbor Station 04."/></label></div></OperatorPanel>
      <OperatorPanel title="Route & schedule" eyebrow="STEP 02"><div className="fields two"><label><span>Origin</span><input defaultValue="SGN Central Hub"/></label><label><span>Destination</span><input defaultValue="Harbor Station 04"/></label><label><span>Departure</span><input type="datetime-local" defaultValue="2026-09-15T14:30"/></label><label><span>Priority</span><select><option>High</option><option>Normal</option><option>Emergency</option></select></label></div><div className="route-preview"><Icon name="pin"/><span>SGN Central Hub</span><i/><span>Harbor Station 04</span><strong>18.4 km</strong></div></OperatorPanel>
      <OperatorPanel title="Aircraft & payload" eyebrow="STEP 03"><div className="fields two"><label><span>Aircraft</span><select><option>AX-17 · Ready · 96%</option><option>AX-04 · Ready · 100%</option></select></label><label><span>Payload weight</span><div className="input-suffix"><input type="number" defaultValue="4.8"/><span>kg</span></div></label></div><div className="prediction-strip"><span>Pre-flight estimate</span><strong>28 min</strong><span>·</span><strong>23% energy</strong><StatusBadge tone="success">Low risk</StatusBadge></div></OperatorPanel>
      <div className="form-actions"><ActionButton variant="ghost">Save draft</ActionButton><ActionButton type="submit">Continue to review</ActionButton></div>
    </form>
    {toast && <div className="toast"><Icon name="check"/>{toast}</div>}
  </MissionPageShell>;
}
