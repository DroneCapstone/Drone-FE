import { useState } from 'react';
import { ActionButton } from '../../../components/ui/ActionButton';
import { Icon } from '../../../components/ui/Icon';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { OperatorPanel } from '../components/OperatorPanel';
import { PageHeader } from '../components/PageHeader';

export function ProfilePage() {
  const [saved, setSaved] = useState(false);
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  return <><PageHeader section="profile"/><div className="profile-layout"><aside className="profile-card"><div className="profile-avatar">AK</div><h2>Alex Kim</h2><p>Lead Flight Operator</p><StatusBadge tone="success">On duty</StatusBadge><div className="profile-meta"><span><small>Operator ID</small><strong>OP-0174</strong></span><span><small>Control center</small><strong>SGN Central</strong></span><span><small>Clearance</small><strong>Level 4</strong></span></div></aside><div className="profile-main"><OperatorPanel title="Personal information"><div className="fields two"><label><span>Full name</span><input defaultValue="Alex Kim"/></label><label><span>Call sign</span><input defaultValue="AERO-17"/></label><label><span>Email address</span><input type="email" defaultValue="alex.kim@aeroops.io"/></label><label><span>Phone</span><input defaultValue="+84 90 288 1740"/></label><label><span>Time zone</span><select><option>Asia/Ho Chi Minh (UTC+7)</option></select></label><label><span>Language</span><select><option>English</option><option>Tiếng Việt</option></select></label></div><div className="form-actions"><ActionButton onClick={save}>Save changes</ActionButton></div></OperatorPanel><OperatorPanel title="Console preferences"><label className="toggle-row"><span><strong>Compact data tables</strong><small>Show more rows on operational screens</small></span><input type="checkbox"/></label><label className="toggle-row"><span><strong>Audible critical alerts</strong><small>Play a sound for severity-one events</small></span><input type="checkbox" defaultChecked/></label><label className="toggle-row"><span><strong>Auto-open live tracking</strong><small>Focus active aircraft after launch</small></span><input type="checkbox" defaultChecked/></label></OperatorPanel></div></div>{saved&&<div className="toast"><Icon name="check"/>Profile changes saved</div>}</>;
}
