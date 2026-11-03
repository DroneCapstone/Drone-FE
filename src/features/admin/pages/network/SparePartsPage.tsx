import { useEffect,useMemo,useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Dialog,DialogContent,DialogTitle } from '../../../../components/ui/Dialog';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { AdminPageShell } from '../../components/AdminPageShell';
import { AdminToolbar } from '../../components/AdminToolbar';
import { getAdminHubs } from '../../services/adminStore';
import { getSpareParts,saveSparePart,type SparePart } from '../../services/prototypeWorkflow';
const blank=():SparePart=>({id:'',name:'',compatibleModels:'',unitCostVnd:0,active:true,stockByHub:{}});
export function SparePartsPage(){
  const [version,setVersion]=useState(0),[query,setQuery]=useState(''),[editing,setEditing]=useState<SparePart|null>(null),[error,setError]=useState('');
  useEffect(()=>{const fn=()=>setVersion(v=>v+1);window.addEventListener('admin-data-updated',fn);return()=>window.removeEventListener('admin-data-updated',fn);},[]);
  const parts=useMemo(()=>getSpareParts(),[version]);const hubs=getAdminHubs();
  const visible=parts.filter(p=>`${p.id} ${p.name} ${p.compatibleModels}`.toLowerCase().includes(query.toLowerCase()));
  const save=(e:FormEvent)=>{e.preventDefault();if(!editing)return;try{const id=editing.id||`PART-${Date.now()}`;saveSparePart({...editing,id,name:editing.name.trim(),stockByHub:Object.fromEntries(Object.entries(editing.stockByHub).map(([hub,qty])=>[hub,Math.max(0,Math.trunc(Number(qty)||0))]))});setEditing(null);setError('');}catch(x){setError(x instanceof Error?x.message:'Invalid entry');}};
  return <AdminPageShell title="Spare Parts" description="Manage core drone components, compatible models and prototype inventory by hub." actions={<><ActionButton variant="secondary" onClick={()=>{setEditing(blank());setError('');}} icon="plus">Add spare part</ActionButton></>}>
    <div className="mb-4 flex flex-wrap gap-3 text-sm"><Link className="text-button" to="/admin/network/drones">Back to Drone Management</Link><Link className="text-button" to="/admin/approvals?type=PART">Review replacement requests</Link></div>
    <OperatorPanel className="flush-panel"><AdminToolbar searchValue={query} onSearchChange={setQuery} placeholder="Search parts or compatible models…" meta={`${visible.length} of ${parts.length} categories`}/>
      <div className="table-wrap"><table><thead><tr><th>Part ID</th><th>Component</th><th>Compatible models</th><th>Total stock</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {visible.map(p=><tr key={p.id}><td>{p.id}</td><td><strong>{p.name}</strong></td><td>{p.compatibleModels||'—'}</td><td><strong>{Object.values(p.stockByHub).reduce((s,v)=>s+v,0)}</strong><small>Across {hubs.length} hubs</small></td><td><StatusBadge tone={p.active?'success':'neutral'}>{p.active?'Active':'Inactive'}</StatusBadge></td><td><ActionButton variant="ghost" onClick={()=>{setEditing({...p,stockByHub:{...p.stockByHub}});setError('');}}>Edit</ActionButton></td></tr>)}
      </tbody></table></div></OperatorPanel>
      <Dialog open={Boolean(editing)} onOpenChange={open=>!open&&setEditing(null)}><DialogContent>{editing&&<form onSubmit={save} className="p-5"><DialogTitle className="text-lg font-semibold">{editing.id?'Edit spare part':'Add spare part'}</DialogTitle><div className="fields two mt-4">
        <label><span>Component name</span><input required value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></label>
        <label><span>Compatible drone models</span><input required value={editing.compatibleModels} onChange={e=>setEditing({...editing,compatibleModels:e.target.value})}/></label>
        <label><span>Unit cost (VND)</span><input min={0} type="number" value={editing.unitCostVnd} onChange={e=>setEditing({...editing,unitCostVnd:Math.max(0,Number(e.target.value))})}/></label>
        <label><span>Availability</span><select value={editing.active?'ACTIVE':'INACTIVE'} onChange={e=>setEditing({...editing,active:e.target.value==='ACTIVE'})}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
      </div><h3 className="mt-4 mb-2 font-semibold">Stock at hubs</h3><div className="fields two">{hubs.map(h=><label key={h.id}><span>{h.name}</span><input type="number" min={0} step={1} value={editing.stockByHub[h.id]??0} onChange={e=>setEditing({...editing,stockByHub:{...editing.stockByHub,[h.id]:Math.max(0,Math.trunc(Number(e.target.value)))}})}/></label>)}</div>
      {error&&<p className="my-2 text-red-500" role="alert">{error}</p>}<div className="form-actions mt-5"><ActionButton type="button" variant="secondary" onClick={()=>setEditing(null)}>Cancel</ActionButton><ActionButton type="submit">Save part</ActionButton></div>
      </form>}</DialogContent></Dialog>
  </AdminPageShell>;
}
