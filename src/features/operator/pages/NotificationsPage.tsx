import { useMemo, useState } from 'react';
import { ActionButton } from '../../../components/ui/ActionButton';
import { OperatorPanel } from '../components/OperatorPanel';
import { PageHeader } from '../components/PageHeader';
import type { Tone } from '../types/operator';

export function NotificationsPage() {
  const initial = useMemo(() => [
    {title:'Wind threshold approaching',body:'NX-08 will reach the advisory wind limit near waypoint N-07.',time:'2 min ago',tone:'warning' as Tone,category:'Operational',read:false},
    {title:'Mission MSN-2850 awaits approval',body:'A high-priority supply mission was submitted by Linh Tran.',time:'4 min ago',tone:'info' as Tone,category:'Approvals',read:false},
    {title:'Reserve energy below plan',body:'MX-22 is projected to land with 18% reserve energy.',time:'6 min ago',tone:'danger' as Tone,category:'Operational',read:false},
    {title:'Mission completed successfully',body:'AX-04 completed District 7 resupply with no exceptions.',time:'28 min ago',tone:'success' as Tone,category:'Operational',read:true},
    {title:'Telemetry log validated',body:'Flight log FLT-9179 passed all 24 quality checks.',time:'1 hour ago',tone:'success' as Tone,category:'System',read:true},
  ], []);
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState('All');
  const visibleItems = filter === 'All' ? items : items.filter((item) => item.category === filter);

  return <><PageHeader section="notifications" action={<ActionButton variant="secondary" onClick={() => setItems(items.map((item) => ({...item, read:true})))}>Mark all as read</ActionButton>}/><div className="notification-layout"><OperatorPanel className="flush-panel"><div className="notification-filter">{['All','Operational','System','Approvals'].map((item) => <button type="button" className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} key={item}>{item}{item === 'All' && <span>{items.length}</span>}</button>)}</div><div className="notification-list">{visibleItems.map((item) => { const index = items.indexOf(item); return <button className={`${!item.read?'unread':''} tone-${item.tone}`} key={item.title} onClick={() => setItems(items.map((entry,i) => i===index ? {...entry,read:true} : entry))}><span><strong>{item.title}</strong><p>{item.body}</p><small>{item.category} · {item.time}</small></span>{!item.read&&<i/>}</button>; })}</div></OperatorPanel><OperatorPanel title="Notification settings"><label className="toggle-row"><span><strong>Critical alerts</strong><small>Airspace, energy, and safety events</small></span><input type="checkbox" defaultChecked/></label><label className="toggle-row"><span><strong>Mission updates</strong><small>Approvals and status changes</small></span><input type="checkbox" defaultChecked/></label><label className="toggle-row"><span><strong>System reports</strong><small>Scheduled reports and data jobs</small></span><input type="checkbox"/></label></OperatorPanel></div></>;
}
