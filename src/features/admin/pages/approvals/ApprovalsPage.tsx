import { useEffect, useMemo, useState } from 'react';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Dialog, DialogContent, DialogTitle } from '../../../../components/ui/Dialog';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { MetricCard } from '../../../operator/components/MetricCard';
import { useSearchParams } from 'react-router-dom';
import { AdminPageShell } from '../../components/AdminPageShell';
import { AdminToolbar } from '../../components/AdminToolbar';
import { getAdminHubs } from '../../services/adminStore';
import { getReplacementRequests, getSpareParts, reviewReplacement, type ReplacementRequest } from '../../services/prototypeWorkflow';

export function ApprovalsPage(){
  const [params] = useSearchParams();
  const [version,setVersion]=useState(0),[type,setType]=useState(()=>params.get('type')==='PART'?'PART':params.get('type')==='BATTERY'?'BATTERY':'ALL'),[status,setStatus]=useState('ALL'),[query,setQuery]=useState('');
  const [selected,setSelected]=useState<ReplacementRequest|null>(null),[note,setNote]=useState(''),[error,setError]=useState('');
  useEffect(()=>{const fn=()=>setVersion(v=>v+1);window.addEventListener('admin-data-updated',fn);return()=>window.removeEventListener('admin-data-updated',fn);},[]);
  const requests=useMemo(()=>getReplacementRequests(),[version]);
  const hubs=getAdminHubs(); const parts=getSpareParts();
  const hubName=(id:string)=>hubs.find(h=>h.id===id)?.name??id;
  const itemName=(r:ReplacementRequest)=>r.type==='PART'?(parts.find(p=>p.id===r.partId)?.name??r.partId):`Battery ${r.batteryId}`;
  const visible=requests.filter(r=>(type==='ALL'||r.type===type)&&(status==='ALL'||r.status===status)&&`${r.id} ${r.technician} ${r.reason} ${r.droneId} ${r.batteryId} ${itemName(r)}`.toLowerCase().includes(query.toLowerCase()));
  const approve=(decision:'APPROVED'|'REJECTED')=>{
    if(!selected)return;
    try {reviewReplacement(selected.id,decision,note);setSelected(null);setNote('');setError('');}catch(e){setError(e instanceof Error?e.message:'Unable to review request.');}
  };
  return <AdminPageShell title="Approvals" description="Review technician requests for drone spare parts and replacement batteries. This workflow is simulated locally.">
    <div className="metric-grid">
      <MetricCard label="Pending" value={String(requests.filter(r=>r.status==='PENDING').length)} delta="Review" tone="warning" note="Waiting for Admin approval"/>
      <MetricCard label="Approved" value={String(requests.filter(r=>r.status==='APPROVED').length)} delta="Supply" tone="info" note="Awaiting physical receipt"/>
      <MetricCard label="Completed" value={String(requests.filter(r=>r.status==='FULFILLED').length)} delta="Received" tone="success" note="Technician confirmed receipt"/>
      <MetricCard label="Rejected" value={String(requests.filter(r=>r.status==='REJECTED').length)} delta="Closed" tone="neutral" note="Review declined"/>
    </div>
    <OperatorPanel className="flush-panel">
      <AdminToolbar searchValue={query} onSearchChange={setQuery} placeholder="Search requests, assets or technician…" meta={`${visible.length} of ${requests.length} requests`} filters={<>
        <select value={type} onChange={e=>setType(e.target.value)}><option value="ALL">All requests</option><option value="PART">Spare parts</option><option value="BATTERY">Batteries</option></select>
        <select value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">All status</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="FULFILLED">Fulfilled</option><option value="REJECTED">Rejected</option></select>
      </>}/>
      <div className="table-wrap"><table><thead><tr><th>Request</th><th>Item</th><th>Target hub</th><th>Requested by</th><th>Quantity</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {visible.map(r=><tr key={r.id}><td><strong>{r.id}</strong><small>{new Date(r.createdAt).toLocaleString('en-GB')}</small></td><td><strong>{itemName(r)}</strong><small>{r.droneId||r.batteryId||r.type}</small></td><td>{hubName(r.hubId)}</td><td>{r.technician}</td><td>{r.quantity}</td><td><StatusBadge tone={r.status==='REJECTED'?'danger':r.status==='PENDING'?'warning':r.status==='FULFILLED'?'success':'info'}>{r.status}</StatusBadge></td><td><ActionButton variant="secondary" onClick={()=>{setSelected(r);setNote(r.adminNote??'');setError('');}}>Review</ActionButton></td></tr>)}
        {!visible.length&&<tr><td colSpan={7} className="text-center">No matching requests. Technician can create one from Hub Supplies or Battery Detail.</td></tr>}
      </tbody></table></div>
    </OperatorPanel>
    <Dialog open={Boolean(selected)} onOpenChange={open=>!open&&setSelected(null)}><DialogContent>{selected&&<div className="p-5">
      <DialogTitle className="text-lg font-semibold">Review {selected.id}</DialogTitle>
      <dl className="key-values mt-4"><div><dt>Replacement</dt><dd>{itemName(selected)}</dd></div><div><dt>Hub</dt><dd>{hubName(selected.hubId)}</dd></div><div><dt>Drone / Battery</dt><dd>{selected.droneId||selected.batteryId||'—'}</dd></div><div><dt>Requested by</dt><dd>{selected.technician}</dd></div><div><dt>Quantity</dt><dd>{selected.quantity}</dd></div><div><dt>Reason</dt><dd>{selected.reason}</dd></div><div><dt>Status</dt><dd>{selected.status}</dd></div></dl>
      <label className="mt-4 block text-sm"><span>Admin note / rejection reason</span><textarea className="mt-2 w-full rounded-md border border-[var(--border)] bg-transparent p-3" rows={3} value={note} disabled={selected.status!=='PENDING'} onChange={e=>setNote(e.target.value)}/></label>
      <p className="my-3 text-xs text-[var(--muted)]">Approval authorizes the replacement supply; receipt and physical installation remain Technician responsibilities.</p>
      {error&&<p role="alert" className="text-sm text-red-500">{error}</p>}
      <div className="form-actions mt-4"><ActionButton variant="secondary" onClick={()=>setSelected(null)}>Close</ActionButton>{selected.status==='PENDING'&&<><ActionButton variant="danger" onClick={()=>approve('REJECTED')}>Reject</ActionButton><ActionButton onClick={()=>approve('APPROVED')}>Approve</ActionButton></>}</div>
    </div>}</DialogContent></Dialog>
  </AdminPageShell>;
}
