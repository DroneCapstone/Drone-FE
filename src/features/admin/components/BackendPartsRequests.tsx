import { OperatorLoadingState } from '../../operator/components/OperatorLoadingState';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ActionButton } from '../../../components/ui/ActionButton';
import { Dialog, DialogTitle } from '../../../components/ui/Dialog';
import { AdminDialogContent as DialogContent } from './AdminDialogContent';
import { OperatorPanel } from '../../operator/components/OperatorPanel';
import { adminBackend, messageOf, type LivePartRequest, type LiveHub } from '../api/adminBackend';

/** BE's PART request approval is NOT the same workflow as demo Battery supply. */
export function BackendPartsRequests() {
  const [requests,setRequests]=useState<LivePartRequest[]>([]);const [hubs,setHubs]=useState<LiveHub[]>([]);
  const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [notice,setNotice]=useState('');
  const [selected,setSelected]=useState<LivePartRequest|null>(null);const [note,setNote]=useState('');
  const [saving,setSaving]=useState(false);const [version,setVersion]=useState(0);
  useEffect(()=>{let cancelled=false;setLoading(true);setError('');Promise.all([adminBackend.partRequests(),adminBackend.hubs()]).then(([r,h])=>{if(!cancelled){setRequests(r);setHubs(h);}}).catch(e=>{if(!cancelled)setError(messageOf(e));}).finally(()=>{if(!cancelled)setLoading(false);});return ()=>{cancelled=true;};},[version]);
  const hubName=(id:number)=>hubs.find(h=>h.id===id)?.name||String(id);
  const review=async(approve:boolean)=>{if(!selected||saving)return;setSaving(true);setError('');try{
    if(!approve&&!note.trim())throw new Error('Enter a reason for rejection.');
    await adminBackend.reviewPartRequest(selected.id,approve,note.trim());
    setNotice(`Part request #${selected.id} ${approve?'reviewed':'rejected'} successfully.`);setSelected(null);setNote('');setVersion(v=>v+1);
  }catch(e){setError(messageOf(e));}finally{setSaving(false);}};
  return <OperatorPanel className="flush-panel" title="Spare Part Requests">
    {loading&&<OperatorLoadingState label="Loading part requests…" />}
    {error&&!selected&&<p role="alert" className="p-3 text-sm text-red-500">{error}<button type="button" className="ml-2 underline" onClick={()=>setVersion(v=>v+1)}>Retry</button></p>}
    {notice&&<p role="status" className="p-3 text-sm text-emerald-600">{notice}</p>}
    <div className="table-wrap"><table><thead><tr><th>Request</th><th>Component</th><th>Receiving Hub</th><th>Qty</th><th>Status</th><th>Action</th></tr></thead><tbody>
      {requests.map(r=><tr key={r.id}><td><strong>PR-{r.id}</strong><small>{r.created_at?new Date(r.created_at).toLocaleString('en-GB'):'—'}</small></td>
        <td><strong>{r.part_name||`Category ${r.part_category_id}`}</strong><small>{r.drone_id||'—'}</small></td>
        <td>{hubName(r.hub_id)}</td><td>{r.quantity_needed}</td><td>{r.status.replaceAll('_',' ')}</td>
        <td><ActionButton variant="secondary" onClick={()=>{setSelected(r);setNote(r.admin_note||'');setError('');}}>View details</ActionButton></td>
      </tr>)}{!requests.length&&!loading&&<tr><td colSpan={6}>No part requests.</td></tr>}
    </tbody></table></div>
    <Dialog open={Boolean(selected)} onOpenChange={o=>!o&&!saving&&setSelected(null)}>{selected&&<DialogContent><div className="border-b border-border p-5"><DialogTitle>Part Request PR-{selected.id}</DialogTitle></div><div className="space-y-3 p-5 text-sm">
      <div><strong>Component:</strong> {selected.part_name||selected.part_category_id}</div><div><strong>Drone:</strong> {selected.drone_id||'—'}</div>
      <div><strong>Hub:</strong> {hubName(selected.hub_id)}</div><div><strong>Technician ID:</strong> {selected.requested_by}</div>
      <div><strong>Quantity:</strong> {selected.quantity_needed} · <strong>Stock at Hub:</strong> {selected.hub_stock_available??'Unknown'}</div>
      <div><strong>Status:</strong> {selected.status}</div><div><strong>Reported issue:</strong> {selected.description}</div>
      {['PENDING','WAITING_STOCK'].includes(selected.status.toUpperCase())&&<><label className="block"><span className="block mb-1">Admin note / reason</span><textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} className="w-full rounded-md border border-border p-2"/></label>
      <p className="text-xs text-muted-foreground">Approval depends on available Hub stock. If stock is insufficient, receive or transfer stock before trying again.</p>
      <Link className="text-button" to="/admin/network/spare-parts" onClick={()=>setSelected(null)}>Manage stock</Link></>}
      {error&&<p role="alert" className="text-red-500">{error}</p>}
    </div><div className="form-actions border-t border-border p-5"><ActionButton variant="secondary" onClick={()=>setSelected(null)}>Close</ActionButton>
      {['PENDING','WAITING_STOCK'].includes(selected.status.toUpperCase())&&<><ActionButton variant="danger" disabled={saving} onClick={()=>review(false)}>Reject</ActionButton><ActionButton disabled={saving} onClick={()=>review(true)}>Approve</ActionButton></>}
    </div></DialogContent>}</Dialog>
  </OperatorPanel>;
}
