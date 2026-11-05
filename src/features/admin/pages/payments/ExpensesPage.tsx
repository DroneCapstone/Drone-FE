import { useEffect, useState, type FormEvent } from 'react';
import { CreditCard, RotateCcw, ReceiptText, TrendingUp } from 'lucide-react';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Dialog,DialogContent,DialogTitle } from '../../../../components/ui/Dialog';
import { OperatorPanel } from '../../../operator/components/OperatorPanel';
import { AdminSummaryCard } from "../../components/AdminSummaryCard";
import { AdminPageShell } from '../../components/AdminPageShell';
import { getAdminHubs } from '../../services/adminStore';
import { addPrototypeExpense,getPrototypeExpenses,getPrototypePayments,getPrototypeRefunds,type PrototypeExpense } from '../../services/prototypeWorkflow';
import { formatVnd } from '../../utils/adminDisplay';
const empty=()=>({category:'SPARE_PART' as PrototypeExpense['category'],amountVnd:0,description:'',hubId:''});
export function ExpensesPage(){
  const [,setVersion]=useState(0),[form,setForm]=useState<ReturnType<typeof empty>|null>(null),[error,setError]=useState('');
  useEffect(()=>{const f=()=>setVersion(v=>v+1);window.addEventListener('admin-data-updated',f);return()=>window.removeEventListener('admin-data-updated',f);},[]);
  const entries=getPrototypeExpenses(),payments=getPrototypePayments(),refunds=getPrototypeRefunds();
  const gross=payments.filter(p=>p.status==='PAID'||p.status==='REFUNDED').reduce((sum,p)=>sum+p.amountVnd,0);
  const refunded=refunds.filter(r=>r.status==='COMPLETED').reduce((sum,r)=>sum+r.amountVnd,0);
  const expenses=entries.reduce((sum,e)=>sum+e.amountVnd,0);
  const submit=(event:FormEvent)=>{event.preventDefault();if(!form)return;try{addPrototypeExpense({...form,hubId:form.hubId||undefined});setForm(null);setError('');}catch(e){setError(e instanceof Error?e.message:'Invalid amount');}};
  return <AdminPageShell title="Financial overview" description="Prototype income and expenses. Manual records are not accounting entries or physical inventory transactions." actions={<ActionButton icon="plus" onClick={()=>setForm(empty())}>Record expense</ActionButton>}>
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AdminSummaryCard label="Gross paid" value={formatVnd(gross)} note="Includes paid then refunded transactions" icon={CreditCard} />
      <AdminSummaryCard label="Completed refunds" value={formatVnd(refunded)} note="Full refunds processed" icon={RotateCcw} />
      <AdminSummaryCard label="Recorded expenses" value={formatVnd(expenses)} note="Manual prototype records" icon={ReceiptText} />
      <AdminSummaryCard label="Net demo cash flow" value={formatVnd(gross - refunded - expenses)} note="Gross less refunds and expenses" icon={TrendingUp} />
    </div>
    <OperatorPanel title="Expenses" eyebrow="MANUAL PROTOTYPE RECORDS"><div className="table-wrap"><table><thead><tr><th>Date</th><th>Category</th><th>Hub</th><th>Description</th><th>Amount</th></tr></thead><tbody>{entries.map(e=><tr key={e.id}><td>{new Date(e.date).toLocaleString('en-GB')}</td><td>{e.category.replace('_',' ')}</td><td>{getAdminHubs().find(h=>h.id===e.hubId)?.name||'System'}</td><td>{e.description}</td><td>{formatVnd(e.amountVnd)}</td></tr>)}{entries.length===0&&<tr><td colSpan={5} className="text-center">No expenses recorded. Equipment replacement approval alone does not create a cash expense.</td></tr>}</tbody></table></div></OperatorPanel>
    <Dialog open={Boolean(form)} onOpenChange={open=>!open&&setForm(null)}><DialogContent>{form&&<form className="p-5" onSubmit={submit}><DialogTitle className="text-lg font-semibold">Record expense (demo)</DialogTitle><div className="fields two mt-4"><label><span>Category</span><select value={form.category} onChange={e=>setForm({...form,category:e.target.value as PrototypeExpense['category']})}><option value="DRONE">Drone</option><option value="BATTERY">Battery</option><option value="SPARE_PART">Spare parts</option><option value="OTHER">Other</option></select></label><label><span>Amount (VND)</span><input type="number" min={1} required value={form.amountVnd} onChange={e=>setForm({...form,amountVnd:Number(e.target.value)})}/></label><label><span>Hub (optional)</span><select value={form.hubId} onChange={e=>setForm({...form,hubId:e.target.value})}><option value="">System</option>{getAdminHubs().map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</select></label><label><span>Description</span><input required value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label></div>{error&&<p role="alert" className="mt-3 text-red-500">{error}</p>}<div className="form-actions mt-5"><ActionButton type="button" variant="secondary" onClick={()=>setForm(null)}>Cancel</ActionButton><ActionButton type="submit">Save expense</ActionButton></div></form>}</DialogContent></Dialog>
  </AdminPageShell>;
}
